# Vowel-Controlled Platformer - Final Submission

A platformer game where you control the character using your voice! The game uses formant analysis to detect vowel sounds and convert them into movement controls. This version combines the best elements from our prototypes, featuring:

- Advanced formant analysis for precise voice control
- Smooth physics and movement system
- Beautiful UI with formant visualization
- Challenging level designs
- Automatic level progression
- Visual feedback for formant detection

## Features

- **Voice Controls**:
  - F1 (openness) controls vertical movement
    - Say "AE" (as in "bat") to float up
    - Higher F1 = stronger upward force
    - 400Hz = neutral (no antigravity)
    - 600Hz = cancels gravity
    - Above 600Hz = stronger upward force
  - F2 (front-back) controls horizontal movement
    - Say "EE" (as in "beat") to move right
    - Say "AH" (as in "father") to move left
    - 840Hz = neutral (no movement)
    - Higher F2 = more right movement
    - Lower F2 = more left movement (amplified for better control)

- **Game Features**:
  - Multiple levels with increasing difficulty
  - Obstacles and platforms
  - Portal-based level completion
  - Automatic level progression
  - Visual feedback for formant detection
  - Real-time formant visualization
  - Adjustable movement sensitivity

## Prerequisites

- Python 3.9 or later
- A microphone
- Web browser with WebSocket support

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

1. **Voice Controls**:
   - Say "EE" to move right
   - Say "AH" to move left
   - Say "AE" to float up
   - Volume affects movement strength (louder = stronger movement)

2. **UI Controls**:
   - Use the sliders to adjust movement sensitivity
   - Watch the formant visualization for feedback
   - The game automatically starts after countdown

## Troubleshooting

1. **Microphone Issues**:
   - Ensure your microphone is properly connected and selected
   - Check browser permissions for microphone access
   - Try speaking louder or adjusting your microphone position

2. **Formant Detection Issues**:
   - Adjust the sliders to fine-tune sensitivity
   - Speak clearly and at a consistent volume
   - Watch the formant visualization for feedback
   - Try different vowel sounds if one isn't working well

3. **Server Issues**:
   - Make sure both servers are running
   - Check that ports 8001 and 8765 are available
   - Try restarting the servers
   - Check the console for error messages

## Development Notes

- Built with p5.js for the frontend
- Formant analysis using Parselmouth (Praat)
- WebSocket communication for real-time formant data
- Modular code structure for easy modification
- Configurable vowel points and movement settings

## Credits

- Formant analysis: Parselmouth (Praat)
- Game engine: p5.js
- Level design: Prototype B Ultimate
- Physics and movement: Prototype C
- UI and visualization: Prototype C

## License

This project is open source and available under the MIT License. 