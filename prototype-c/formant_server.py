import asyncio
import websockets
import json
import numpy as np
import parselmouth
from parselmouth.praat import call
import wave
import tempfile
import os
from urllib.parse import quote  # Updated import for Python 3

# Formant settings
MIN_F1 = 200   # Minimum expected F1 frequency (Hz)
MAX_F1 = 1000  # Maximum expected F1 frequency (Hz)
MIN_F2 = 700   # Minimum expected F2 frequency (Hz)
MAX_F2 = 2500  # Maximum expected F2 frequency (Hz)
MIN_CONFIDENCE = 0.5  # Increased from 0.3 to 0.5
MIN_AMPLITUDE = 400
FORMANT_SMOOTHING = 0.85  # Increased from 0.7 to 0.85 for more smoothing
SILENCE_THRESHOLD = 200  # Threshold for silence detection
CONFIDENCE_DECAY = 0.95  # How quickly confidence decays in silence

class FormantAnalyzer:
    def __init__(self):
        self.temp_dir = tempfile.mkdtemp()
        self.last_f1 = None
        self.last_f2 = None
        self.last_confidence = 0.0
        self.silence_frames = 0
        
    def analyze_audio(self, audio_data, sample_rate):
        try:
            # Convert audio data to numpy array and check amplitude
            audio_array = np.frombuffer(audio_data, dtype=np.int16)
            current_amplitude = np.abs(audio_array).mean()
            
            # Check for silence
            if current_amplitude < SILENCE_THRESHOLD:
                self.silence_frames += 1
                # Decay confidence in silence
                self.last_confidence *= CONFIDENCE_DECAY
                # Return last known values with decaying confidence
                return {
                    'f1': float(self.last_f1) if self.last_f1 is not None else 0,
                    'f2': float(self.last_f2) if self.last_f2 is not None else 0,
                    'confidence': float(self.last_confidence)
                }
            
            # Reset silence counter if we detect sound
            self.silence_frames = 0
            
            # Save to temporary WAV file
            temp_file = os.path.join(self.temp_dir, "temp.wav")
            with wave.open(temp_file, 'wb') as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)  # 16-bit audio
                wf.setframerate(sample_rate)
                wf.writeframes(audio_data)
            
            # Load the audio file
            sound = parselmouth.Sound(temp_file)
            
            # Extract formants with wider window and more formants
            formants = call(sound, "To Formant (burg)", 0.005, 5, 5500, 0.025, 50)
            
            # Get formant values
            f1_values = []
            f2_values = []
            num_frames = call(formants, "Get number of frames")
            
            for i in range(1, num_frames + 1):
                time = call(formants, "Get time from frame number", i)
                f1 = call(formants, "Get value at time", 1, time, "Hertz", "Linear")
                f2 = call(formants, "Get value at time", 2, time, "Hertz", "Linear")
                
                if (f1 is not None and f2 is not None and
                    MIN_F1 <= f1 <= MAX_F1 and MIN_F2 <= f2 <= MAX_F2):
                    f1_values.append(f1)
                    f2_values.append(f2)
            
            # Calculate mean if we have valid values
            if len(f1_values) > 0 and len(f2_values) > 0:
                mean_f1 = np.mean(f1_values)
                mean_f2 = np.mean(f2_values)
                
                # Calculate confidence based on number of valid measurements and their stability
                confidence = min(1.0, len(f1_values) / num_frames)
                
                # Apply smoothing to both formants and confidence
                if self.last_f1 is not None and self.last_f2 is not None:
                    mean_f1 = mean_f1 * (1 - FORMANT_SMOOTHING) + self.last_f1 * FORMANT_SMOOTHING
                    mean_f2 = mean_f2 * (1 - FORMANT_SMOOTHING) + self.last_f2 * FORMANT_SMOOTHING
                    confidence = confidence * (1 - FORMANT_SMOOTHING) + self.last_confidence * FORMANT_SMOOTHING
                
                self.last_f1 = mean_f1
                self.last_f2 = mean_f2
                self.last_confidence = confidence
                
                # Only return values if confidence is high enough
                if confidence >= MIN_CONFIDENCE:
                    return {
                        'f1': float(mean_f1),
                        'f2': float(mean_f2),
                        'confidence': float(confidence)
                    }
            
        except Exception as e:
            print(f"Error analyzing formants: {e}")
        
        # Return last valid values with low confidence if no good detection
        return {
            'f1': float(self.last_f1) if self.last_f1 is not None else 0,
            'f2': float(self.last_f2) if self.last_f2 is not None else 0,
            'confidence': 0.0
        }

analyzer = FormantAnalyzer()

async def handle_websocket(websocket):
    print(f"New client connected from {websocket.remote_address}")
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                if not isinstance(data, dict) or 'audio' not in data or 'sampleRate' not in data:
                    print("Invalid message format")
                    continue
                
                # Convert audio data to bytes
                audio_array = np.array(data['audio'], dtype=np.int16)
                audio_bytes = audio_array.tobytes()
                sample_rate = int(data['sampleRate'])
                
                # Process audio
                result = analyzer.analyze_audio(audio_bytes, sample_rate)
                await websocket.send(json.dumps(result))
                
            except json.JSONDecodeError:
                print("Invalid JSON received")
            except Exception as e:
                print(f"Error processing message: {e}")
            
    except websockets.exceptions.ConnectionClosed as e:
        print(f"Client disconnected: {e}")
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        print(f"Client connection closed: {websocket.remote_address}")

async def main():
    try:
        server = await websockets.serve(
            handle_websocket, 
            "localhost", 
            8765,
            ping_interval=20,  # Send ping every 20 seconds
            ping_timeout=10,   # Wait 10 seconds for pong response
            close_timeout=10   # Wait 10 seconds for close handshake
        )
        print("Formant analysis server started on ws://localhost:8765")
        await server.wait_closed()
    except Exception as e:
        print(f"Server error: {e}")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nServer stopped by user")
    except Exception as e:
        print(f"Fatal error: {e}") 