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

Install with:
pip install praat-parselmouth pygame numpy pyaudio
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

# Game settings
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
BACKGROUND_COLOR = (0, 0, 0)
CIRCLE_COLOR = (255, 255, 0)
CIRCLE_RADIUS = 30
FPS = 30

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
CALIBRATION_TIME = 3.0  # Seconds to calibrate background noise
NOISE_MARGIN = 1.2  # Signal must be this many times louder than background
FORMANT_SMOOTHING = 0.7  # Smoothing factor for formant values (0.0 to 1.0)

# Create a queue for communication between threads
formant_queue = queue.Queue()

class FormantAnalyzer:
    def __init__(self):
        self.is_running = False
        self.audio = pyaudio.PyAudio()
        self.temp_dir = tempfile.mkdtemp()
        self.background_level = None
        self.last_f1 = None
        self.last_f2 = None
        
    def calibrate_background_noise(self):
        """Measure background noise level before starting the game"""
        print("Calibrating background noise... Please be quiet for 3 seconds.")
        stream = self.audio.open(format=FORMAT, channels=CHANNELS,
                                rate=RATE, input=True,
                                frames_per_buffer=CHUNK)
        
        # Collect samples for calibration
        samples = []
        for _ in range(int(CALIBRATION_TIME * RATE / CHUNK)):
            data = stream.read(CHUNK, exception_on_overflow=False)
            samples.append(np.frombuffer(data, dtype=np.int16))
        
        # Calculate RMS of background noise
        all_samples = np.concatenate(samples)
        self.background_level = np.sqrt(np.mean(all_samples**2))
        print(f"Background noise level: {self.background_level:.1f}")
        
        stream.stop_stream()
        stream.close()
        
    def start(self):
        """Start the audio recording and analysis thread"""
        self.calibrate_background_noise()
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
                
            # Convert to numpy array and check intensity
            audio_data = np.frombuffer(b''.join(frames), dtype=np.int16)
            current_level = np.sqrt(np.mean(audio_data**2))
            
            # Only process if significantly above background noise
            if current_level < self.background_level * NOISE_MARGIN:
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
        
        # Start the formant analyzer
        self.analyzer = FormantAnalyzer()
        
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
        
    def run(self):
        """Main game loop"""
        self.analyzer.start()
        running = True
        
        # Instructions
        font = pygame.font.Font(None, 24)
        instructions = [
            "Control the circle with your voice!",
            "Say 'EE' to move up and right (like in 'beat')",
            "Say 'AH' to move down and left (like in 'father')",
            "Say 'OO' to move down and right (like in 'boot')",
            "Say 'AE' to move up and left (like in 'bat')",
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
                
                # Draw
                self.screen.fill(BACKGROUND_COLOR)
                
                # Draw instructions
                for i, text in enumerate(instructions):
                    text_surface = font.render(text, True, (200, 200, 200))
                    self.screen.blit(text_surface, (20, 20 + i * 30))
                
                # Draw confidence meter
                confidence_text = f"Confidence: {self.current_confidence:.2f}"
                confidence_surface = font.render(confidence_text, True, (200, 200, 200))
                self.screen.blit(confidence_surface, (20, SCREEN_HEIGHT - 30))
                
                # Draw formant map grid for reference
                grid_color = (50, 50, 50)
                # Horizontal lines for F1
                for f1 in range(MIN_F1, MAX_F1 + 1, 100):
                    y = SCREEN_HEIGHT - (f1 - MIN_F1) / (MAX_F1 - MIN_F1) * SCREEN_HEIGHT
                    pygame.draw.line(self.screen, grid_color, (0, y), (SCREEN_WIDTH, y))
                    # Label
                    if f1 % 200 == 0:
                        label = font.render(f"{f1}", True, (100, 100, 100))
                        self.screen.blit(label, (5, y))
                
                # Vertical lines for F2
                for f2 in range(MIN_F2, MAX_F2 + 1, 200):
                    x = (f2 - MIN_F2) / (MAX_F2 - MIN_F2) * SCREEN_WIDTH
                    pygame.draw.line(self.screen, grid_color, (x, 0), (x, SCREEN_HEIGHT))
                    # Label
                    if f2 % 400 == 0:
                        label = font.render(f"{f2}", True, (100, 100, 100))
                        self.screen.blit(label, (x, SCREEN_HEIGHT - 20))
                
                # Draw vowel positions for reference
                vowels = {
                    "EE": self.map_formants_to_position(280, 2300),  # /i/ as in "beat"
                    "AE": self.map_formants_to_position(700, 1800),  # /æ/ as in "bat"
                    "AH": self.map_formants_to_position(780, 1100),  # /ɑ/ as in "father"
                    "OO": self.map_formants_to_position(330, 870),   # /u/ as in "boot"
                }
                
                for vowel, (vx, vy) in vowels.items():
                    pygame.draw.circle(self.screen, (0, 100, 100), (int(vx), int(vy)), 10)
                    label = font.render(vowel, True, (100, 200, 200))
                    self.screen.blit(label, (int(vx) + 15, int(vy) - 10))
                
                # Draw the player circle with transparency based on confidence
                alpha = int(255 * self.current_confidence)
                circle_surface = pygame.Surface((CIRCLE_RADIUS * 2, CIRCLE_RADIUS * 2), pygame.SRCALPHA)
                pygame.draw.circle(circle_surface, (*CIRCLE_COLOR, alpha), (CIRCLE_RADIUS, CIRCLE_RADIUS), CIRCLE_RADIUS)
                self.screen.blit(circle_surface, (int(self.x - CIRCLE_RADIUS), int(self.y - CIRCLE_RADIUS)))
                
                pygame.display.flip()
                self.clock.tick(FPS)
        
        finally:
            # Clean up
            self.analyzer.stop()
            pygame.quit()


if __name__ == "__main__":
    game = FormantGame()
    game.run()