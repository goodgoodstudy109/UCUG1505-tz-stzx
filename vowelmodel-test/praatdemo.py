"""
Formant Game Demo - Control a circle with your voice
=============================================

This demo uses Parselmouth to extract F1 and F2 formants from microphone input
and uses them to control a circle's position on the screen.

Requirements:
- Python 3.7+
- parselmouth
- pygame
- numpy
- pyaudio
- scipy

Install with:
pip install praat-parselmouth pygame numpy pyaudio scipy
"""

import parselmouth
from parselmouth.praat import call
import numpy as np
import pygame
import pyaudio
import wave
import threading
import time
import os
import tempfile
import queue
import json
from scipy import signal

# Game settings
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
BACKGROUND_COLOR = (0, 0, 0)
CIRCLE_COLOR = (255, 255, 0)
CIRCLE_RADIUS = 30
FPS = 30
VOWEL_POINT_RADIUS = 10
VOWEL_POINT_COLOR = (0, 100, 100)
VOWEL_LABEL_COLOR = (100, 200, 200)

# Font settings
FONT_SIZE = 24
FONT_NAME = "Arial Unicode MS"  # Font that supports IPA characters

# Audio settings
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 44100
CHUNK = 1024 * 2  # Larger chunk for better formant analysis
RECORD_SECONDS = 0.5  # Record in small chunks for real-time-ish response

# Formant settings
MAX_F1 = 1000  # Maximum expected F1 frequency (Hz)
MIN_F1 = 200   # Minimum expected F1 frequency (Hz)
MAX_F2 = 2500  # Maximum expected F2 frequency (Hz)
MIN_F2 = 700   # Minimum expected F2 frequency (Hz)

# Confidence and noise settings
MIN_CONFIDENCE = 0.3  # Minimum confidence threshold for formant detection
MIN_AMPLITUDE = 400   # Minimum amplitude threshold for valid speech (lowered from 1000)
FORMANT_SMOOTHING = 0.7  # Smoothing factor for formant values (0.0 to 1.0)

# Synthesis settings
SYNTH_DURATION = 0.3  # Duration of synthesized vowel in seconds
SYNTH_FREQUENCY = 150  # Base frequency for synthesis (Hz)
SYNTH_AMPLITUDE = 0.5  # Amplitude of synthesized sound (0.0 to 1.0)
SYNTH_SAMPLE_RATE = 44100  # Sample rate for synthesis
SYNTH_BUFFER_SIZE = 4096  # Size of circular buffer for continuous playback

# Create a queue for communication between threads
formant_queue = queue.Queue()

class VowelPoint:
    def __init__(self, f1, f2, label, x, y):
        self.f1 = f1
        self.f2 = f2
        self.label = label
        self.x = x
        self.y = y
        self.is_dragging = False
        self.drag_offset_x = 0
        self.drag_offset_y = 0

    def contains_point(self, x, y):
        return ((x - self.x) ** 2 + (y - self.y) ** 2) <= VOWEL_POINT_RADIUS ** 2

    def start_drag(self, x, y):
        self.is_dragging = True
        self.drag_offset_x = self.x - x
        self.drag_offset_y = self.y - y

    def stop_drag(self):
        self.is_dragging = False

    def update_position(self, x, y):
        if self.is_dragging:
            self.x = x + self.drag_offset_x
            self.y = y + self.drag_offset_y
            # Update F1 and F2 based on new position
            self.f1 = MIN_F1 + (SCREEN_HEIGHT - self.y) / SCREEN_HEIGHT * (MAX_F1 - MIN_F1)
            self.f2 = MIN_F2 + self.x / SCREEN_WIDTH * (MAX_F2 - MIN_F2)

class FormantAnalyzer:
    def __init__(self):
        self.is_running = False
        self.audio = pyaudio.PyAudio()
        self.temp_dir = tempfile.mkdtemp()
        self.last_f1 = None
        self.last_f2 = None
        
    def start(self):
        """Start the audio recording and analysis thread"""
        self.is_running = True
        self.analysis_thread = threading.Thread(target=self._analyze_audio)
        self.analysis_thread.daemon = True
        self.analysis_thread.start()
        
    def stop(self):
        """Stop the audio recording and analysis"""
        self.is_running = False
        if hasattr(self, 'analysis_thread'):
            self.analysis_thread.join(timeout=1.0)
        self.audio.terminate()
        
    def _analyze_audio(self):
        """Continuously record and analyze audio for formants"""
        stream = self.audio.open(format=FORMAT, channels=CHANNELS,
                                rate=RATE, input=True,
                                frames_per_buffer=CHUNK)
        
        print("* Recording started")
        
        while self.is_running:
            # Record audio chunk
            frames = []
            for i in range(0, int(RATE / CHUNK * RECORD_SECONDS)):
                data = stream.read(CHUNK, exception_on_overflow=False)
                frames.append(data)
                
            # Convert to numpy array and check amplitude
            audio_data = np.frombuffer(b''.join(frames), dtype=np.int16)
            current_amplitude = np.abs(audio_data).mean()
            
            # Only process if amplitude is high enough
            if current_amplitude < MIN_AMPLITUDE:
                formant_queue.put((None, None, 0.0))  # Low confidence
                continue
                
            # Save temporary WAV file
            temp_file = os.path.join(self.temp_dir, "temp.wav")
            wf = wave.open(temp_file, 'wb')
            wf.setnchannels(CHANNELS)
            wf.setsampwidth(self.audio.get_sample_size(FORMAT))
            wf.setframerate(RATE)
            wf.writeframes(b''.join(frames))
            wf.close()
            
            try:
                # Analyze formants with Parselmouth
                sound = parselmouth.Sound(temp_file)
                
                # Get formants
                formants = call(sound, "To Formant (burg)", 0.0025, 5, 5500, 0.025, 50)
                
                # Calculate average F1 and F2 over the sample
                num_frames = call(formants, "Get number of frames")
                
                f1_values = []
                f2_values = []
                
                for frame in range(1, num_frames + 1):
                    # Get time of the frame
                    t = call(formants, "Get time from frame number", frame)
                    
                    # Get F1 and F2 at this time
                    f1 = call(formants, "Get value at time", 1, t, 'Hertz', 'Linear')
                    f2 = call(formants, "Get value at time", 2, t, 'Hertz', 'Linear')
                    
                    # Only add valid measurements (not undefined and within expected ranges)
                    if (not np.isnan(f1) and not np.isnan(f2) and
                        MIN_F1 <= f1 <= MAX_F1 and MIN_F2 <= f2 <= MAX_F2):
                        f1_values.append(f1)
                        f2_values.append(f2)
                
                # Calculate mean if we have valid values
                if len(f1_values) > 0 and len(f2_values) > 0:
                    mean_f1 = np.mean(f1_values)
                    mean_f2 = np.mean(f2_values)
                    
                    # Apply smoothing
                    if self.last_f1 is not None and self.last_f2 is not None:
                        mean_f1 = mean_f1 * (1 - FORMANT_SMOOTHING) + self.last_f1 * FORMANT_SMOOTHING
                        mean_f2 = mean_f2 * (1 - FORMANT_SMOOTHING) + self.last_f2 * FORMANT_SMOOTHING
                    
                    self.last_f1 = mean_f1
                    self.last_f2 = mean_f2
                    
                    # Calculate confidence based on number of valid measurements
                    confidence = min(1.0, len(f1_values) / num_frames)
                    
                    # Put the formants in the queue for the game thread
                    formant_queue.put((mean_f1, mean_f2, confidence))
                    print(f"F1: {mean_f1:.1f} Hz, F2: {mean_f2:.1f} Hz, Confidence: {confidence:.2f}")
                else:
                    formant_queue.put((None, None, 0.0))  # Low confidence
            except Exception as e:
                print(f"Error analyzing formants: {e}")
                formant_queue.put((None, None, 0.0))  # Low confidence
                
        stream.stop_stream()
        stream.close()
        print("* Recording stopped")

class VowelSynthesizer:
    def __init__(self):
        self.audio = pyaudio.PyAudio()
        self.stream = self.audio.open(
            format=pyaudio.paFloat32,
            channels=1,
            rate=SYNTH_SAMPLE_RATE,
            output=True,
            frames_per_buffer=SYNTH_BUFFER_SIZE,
            stream_callback=self._audio_callback
        )
        self.is_playing = False
        self.last_f1 = None
        self.last_f2 = None
        self.buffer = np.zeros(SYNTH_BUFFER_SIZE, dtype=np.float32)
        self.phase = 0
        
    def _generate_glottal_pulse(self, num_samples):
        """Generate a more realistic glottal pulse waveform"""
        t = np.linspace(0, 1, num_samples)
        # Create a more natural glottal pulse shape
        pulse = np.sin(2 * np.pi * t) * (1 - t)
        return pulse
        
    def _audio_callback(self, in_data, frame_count, time_info, status):
        """Callback for continuous audio streaming"""
        if self.last_f1 is None or self.last_f2 is None:
            return (np.zeros(frame_count, dtype=np.float32), pyaudio.paContinue)
            
        # Generate source signal
        source = self._generate_glottal_pulse(frame_count)
        
        # Create formant filters
        # F1 filter (narrower bandwidth for more distinct formants)
        b1, a1 = signal.butter(4, [self.last_f1-30, self.last_f1+30], btype='bandpass', fs=SYNTH_SAMPLE_RATE)
        # F2 filter
        b2, a2 = signal.butter(4, [self.last_f2-60, self.last_f2+60], btype='bandpass', fs=SYNTH_SAMPLE_RATE)
        
        # Apply filters
        vowel = signal.filtfilt(b1, a1, source) * 0.8  # F1 (stronger)
        vowel += signal.filtfilt(b2, a2, source) * 0.4  # F2
        
        # Add some harmonics
        harmonics = np.zeros_like(vowel)
        for i in range(2, 5):  # Add 2nd through 4th harmonics
            harmonics += np.sin(2 * np.pi * SYNTH_FREQUENCY * i * np.arange(frame_count) / SYNTH_SAMPLE_RATE) * (0.3 / i)
        vowel += harmonics * 0.2
        
        # Apply amplitude envelope
        envelope = np.ones(frame_count)
        envelope[0] = 0  # Start at zero
        envelope[-1] = 0  # End at zero
        envelope = signal.savgol_filter(envelope, 5, 2)  # Smooth the envelope
        vowel *= envelope * SYNTH_AMPLITUDE
        
        # Normalize
        vowel = vowel / np.max(np.abs(vowel))
        
        return (vowel.astype(np.float32), pyaudio.paContinue)
        
    def synthesize_vowel(self, f1, f2):
        """Update formant frequencies for synthesis"""
        if self.last_f1 == f1 and self.last_f2 == f2:
            return  # Skip if formants haven't changed
            
        self.last_f1 = f1
        self.last_f2 = f2
        
    def stop(self):
        """Clean up audio resources"""
        self.stream.stop_stream()
        self.stream.close()
        self.audio.terminate()

class FormantGame:
    def __init__(self):
        # Initialize pygame
        pygame.init()
        self.screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
        pygame.display.set_caption('Formant Game Demo')
        self.clock = pygame.time.Clock()
        
        # Circle position (starts in center)
        self.x = SCREEN_WIDTH // 2
        self.y = SCREEN_HEIGHT // 2
        
        # For smooth movement
        self.target_x = self.x
        self.target_y = self.y
        
        # Confidence tracking
        self.current_confidence = 0.0
        
        # Load vowel points from config
        self.vowel_points = self.load_vowel_points()
        
        # Start the formant analyzer
        self.analyzer = FormantAnalyzer()
        
        # Initialize synthesizer
        self.synthesizer = VowelSynthesizer()
        
        # Synthesis mode flag
        self.synthesis_mode = False
        
        # Mouse position for synthesis
        self.mouse_x = 0
        self.mouse_y = 0
        
        # Try to load the font, fall back to default if not available
        try:
            self.font = pygame.font.SysFont(FONT_NAME, FONT_SIZE)
        except:
            print(f"Warning: {FONT_NAME} font not found, using default font")
            self.font = pygame.font.Font(None, FONT_SIZE)

    def load_vowel_points(self):
        try:
            with open('vowelmodel-test/vowel_config.json', 'r') as f:
                config = json.load(f)
                vowel_points = []
                for vowel_data in config['vowels'].values():
                    x, y = self.map_formants_to_position(vowel_data['f1'], vowel_data['f2'])
                    vowel_points.append(VowelPoint(
                        vowel_data['f1'],
                        vowel_data['f2'],
                        vowel_data['label'],
                        x, y
                    ))
                return vowel_points
        except FileNotFoundError:
            print("Config file not found, using default vowel positions")
            return []

    def save_vowel_points(self):
        config = {'vowels': {}}
        for i, point in enumerate(self.vowel_points):
            config['vowels'][f'vowel_{i}'] = {
                'f1': point.f1,
                'f2': point.f2,
                'label': point.label
            }
        with open('vowelmodel-test/vowel_config.json', 'w') as f:
            json.dump(config, f, indent=4)

    def map_formants_to_position(self, f1, f2):
        """Map F1 and F2 formants to screen coordinates"""
        # Map F1 (typically 200-1000 Hz) to Y position (inverted)
        # Higher F1 = lower position on screen
        y = SCREEN_HEIGHT - (f1 - MIN_F1) / (MAX_F1 - MIN_F1) * SCREEN_HEIGHT
        y = max(CIRCLE_RADIUS, min(SCREEN_HEIGHT - CIRCLE_RADIUS, y))
        
        # Map F2 (typically 700-2500 Hz) to X position
        # Higher F2 = more right position
        x = (f2 - MIN_F2) / (MAX_F2 - MIN_F2) * SCREEN_WIDTH
        x = max(CIRCLE_RADIUS, min(SCREEN_WIDTH - CIRCLE_RADIUS, x))
        
        return x, y

    def map_position_to_formants(self, x, y):
        """Convert screen coordinates to F1 and F2 formants"""
        f1 = MIN_F1 + (SCREEN_HEIGHT - y) / SCREEN_HEIGHT * (MAX_F1 - MIN_F1)
        f2 = MIN_F2 + x / SCREEN_WIDTH * (MAX_F2 - MIN_F2)
        return f1, f2

    def run(self):
        """Main game loop"""
        self.analyzer.start()
        running = True
        dragging_point = None
        
        # Instructions
        instructions = [
            "Control the circle with your voice!",
            "Say 'EE' to move up and right (like in 'beat')",
            "Say 'AH' to move down and left (like in 'father')",
            "Say 'OO' to move down and right (like in 'boot')",
            "Say 'AE' to move up and left (like in 'bat')",
            "Drag vowel points to adjust their positions",
            "Press S to toggle synthesis mode",
            "In synthesis mode, move mouse to generate sounds",
            "Press ESC to quit"
        ]
        
        try:
            while running:
                # Process events
                for event in pygame.event.get():
                    if event.type == pygame.QUIT:
                        running = False
                    elif event.type == pygame.KEYDOWN:
                        if event.key == pygame.K_ESCAPE:
                            running = False
                        elif event.key == pygame.K_s:
                            self.synthesis_mode = not self.synthesis_mode
                            print(f"Synthesis mode: {'ON' if self.synthesis_mode else 'OFF'}")
                    elif event.type == pygame.MOUSEBUTTONDOWN:
                        if event.button == 1:  # Left click
                            for point in self.vowel_points:
                                if point.contains_point(event.pos[0], event.pos[1]):
                                    point.start_drag(event.pos[0], event.pos[1])
                                    dragging_point = point
                                    break
                    elif event.type == pygame.MOUSEBUTTONUP:
                        if event.button == 1 and dragging_point:
                            dragging_point.stop_drag()
                            dragging_point = None
                    elif event.type == pygame.MOUSEMOTION:
                        # Update mouse position
                        self.mouse_x, self.mouse_y = event.pos
                        if dragging_point:
                            dragging_point.update_position(event.pos[0], event.pos[1])
                
                # Check for new formant data
                try:
                    while not formant_queue.empty():
                        f1, f2, confidence = formant_queue.get_nowait()
                        self.current_confidence = confidence
                        
                        # Only update position if confidence is high enough
                        if confidence >= MIN_CONFIDENCE and f1 is not None and f2 is not None:
                            self.target_x, self.target_y = self.map_formants_to_position(f1, f2)
                except queue.Empty:
                    pass
                
                # Smooth movement to target
                self.x = self.x * 0.9 + self.target_x * 0.1
                self.y = self.y * 0.9 + self.target_y * 0.1
                
                # Synthesize vowel if in synthesis mode
                if self.synthesis_mode:
                    # Use mouse position for synthesis
                    f1, f2 = self.map_position_to_formants(self.mouse_x, self.mouse_y)
                    self.synthesizer.synthesize_vowel(f1, f2)
                
                # Draw
                self.screen.fill(BACKGROUND_COLOR)
                
                # Draw instructions
                for i, text in enumerate(instructions):
                    text_surface = self.font.render(text, True, (200, 200, 200))
                    self.screen.blit(text_surface, (20, 20 + i * 30))
                
                # Draw mode indicator
                mode_text = f"Synthesis Mode: {'ON' if self.synthesis_mode else 'OFF'}"
                mode_surface = self.font.render(mode_text, True, (200, 200, 200))
                self.screen.blit(mode_surface, (20, SCREEN_HEIGHT - 60))
                
                # Draw confidence meter
                confidence_text = f"Confidence: {self.current_confidence:.2f}"
                confidence_surface = self.font.render(confidence_text, True, (200, 200, 200))
                self.screen.blit(confidence_surface, (20, SCREEN_HEIGHT - 30))
                
                # Draw formant map grid for reference
                grid_color = (50, 50, 50)
                # Horizontal lines for F1
                for f1 in range(MIN_F1, MAX_F1 + 1, 100):
                    y = SCREEN_HEIGHT - (f1 - MIN_F1) / (MAX_F1 - MIN_F1) * SCREEN_HEIGHT
                    pygame.draw.line(self.screen, grid_color, (0, y), (SCREEN_WIDTH, y))
                    # Label
                    if f1 % 200 == 0:
                        label = self.font.render(f"{f1}", True, (100, 100, 100))
                        self.screen.blit(label, (5, y))
                
                # Vertical lines for F2
                for f2 in range(MIN_F2, MAX_F2 + 1, 200):
                    x = (f2 - MIN_F2) / (MAX_F2 - MIN_F2) * SCREEN_WIDTH
                    pygame.draw.line(self.screen, grid_color, (x, 0), (x, SCREEN_HEIGHT))
                    # Label
                    if f2 % 400 == 0:
                        label = self.font.render(f"{f2}", True, (100, 100, 100))
                        self.screen.blit(label, (x, SCREEN_HEIGHT - 20))
                
                # Draw vowel points
                for point in self.vowel_points:
                    pygame.draw.circle(self.screen, VOWEL_POINT_COLOR, (int(point.x), int(point.y)), VOWEL_POINT_RADIUS)
                    label = self.font.render(point.label, True, VOWEL_LABEL_COLOR)
                    self.screen.blit(label, (int(point.x) + 15, int(point.y) - 10))
                
                # Draw the player circle with transparency based on confidence
                alpha = int(255 * self.current_confidence)
                circle_surface = pygame.Surface((CIRCLE_RADIUS * 2, CIRCLE_RADIUS * 2), pygame.SRCALPHA)
                pygame.draw.circle(circle_surface, (*CIRCLE_COLOR, alpha), (CIRCLE_RADIUS, CIRCLE_RADIUS), CIRCLE_RADIUS)
                self.screen.blit(circle_surface, (int(self.x - CIRCLE_RADIUS), int(self.y - CIRCLE_RADIUS)))
                
                pygame.display.flip()
                self.clock.tick(FPS)
        
        finally:
            # Save vowel points before quitting
            self.save_vowel_points()
            # Clean up
            self.analyzer.stop()
            self.synthesizer.stop()
            pygame.quit()


if __name__ == "__main__":
    game = FormantGame()
    game.run()