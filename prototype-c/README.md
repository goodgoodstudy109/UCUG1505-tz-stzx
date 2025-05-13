# Vowel-Controlled Platformer

A platformer game where you control the character using your voice! The game uses formant analysis to detect vowel sounds and convert them into movement controls.

## Prerequisites

- Python 3.9 or later
- Node.js (for running a local server)
- A microphone

## Setup Instructions

1. **Create and activate a Python virtual environment**:
   ```bash
   # Windows
   python -m venv venv
   .\venv\Scripts\activate

   # Linux/Mac
   python3 -m venv venv
   source venv/bin/activate
   ```

2. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the servers**:
   - On Windows, simply run:
     ```bash
     .\start_servers.bat
     ```
   - On Linux/Mac, run these commands in separate terminals:
     ```bash
     # Terminal 1 - Start the formant analysis server
     python formant_server.py

     # Terminal 2 - Start the HTTP server
     python -m http.server 8001
     ```

4. **Open the game**:
   - Open your web browser and navigate to:
     ```
     http://localhost:8001
     ```

## Game Controls

- **F1 (openness)**: Controls vertical movement
  - Say "AE" (as in "bat") to float up
  - Higher F1 = stronger upward force
  - 400Hz = neutral (no antigravity)
  - 650Hz = cancels gravity
  - Above 650Hz = stronger upward force

- **F2 (front-back)**: Controls horizontal movement
  - Say "EE" (as in "beat") to move right
  - Say "AH" (as in "father") to move left
  - Higher F2 = more right movement
  - Lower F2 = more left movement

## Troubleshooting

1. **Microphone not working**:
   - Make sure your microphone is properly connected and selected as the default input device
   - Check browser permissions to ensure microphone access is allowed
   - Try refreshing the page

2. **Formant analysis not accurate**:
   - Adjust the sliders in the game to fine-tune the sensitivity
   - Speak clearly and at a consistent volume
   - Try to maintain a consistent distance from the microphone

3. **Server connection issues**:
   - Make sure both servers (formant analysis and HTTP) are running
   - Check that ports 8001 and 8765 are not being used by other applications
   - Try restarting both servers

## Development

- The game is built using p5.js for the frontend
- Formant analysis is handled by a Python server using Parselmouth (Praat)
- The game state and level design are defined in `platformer.js`
- Vowel configurations can be adjusted in `vowel_config.json`

## License

This project is open source and available under the MIT License. 