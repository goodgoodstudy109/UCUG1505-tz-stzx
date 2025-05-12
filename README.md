# Formant Game Demo

A real-time formant analysis game that lets you control a circle using your voice. The game maps your vowel sounds to positions on the screen based on their F1 and F2 formant frequencies.

## Confidence Scoring

The confidence score (0.0 to 1.0) is calculated based on several factors:

1. **Amplitude Threshold**: The audio input must exceed a minimum amplitude threshold (`MIN_AMPLITUDE = 1000`) to be considered valid speech.

2. **Valid Measurements**: For each audio chunk (0.5 seconds), the system counts how many valid formant measurements were obtained. A measurement is considered valid if:
   - Both F1 and F2 values are defined (not NaN)
   - F1 is between 200-1000 Hz
   - F2 is between 700-2500 Hz

3. **Confidence Calculation**: The final confidence score is calculated as:
   ```
   confidence = min(1.0, number_of_valid_measurements / total_number_of_frames)
   ```
   This means that if all frames in the analysis window have valid measurements, the confidence will be 1.0. If only half the frames have valid measurements, the confidence will be 0.5.

4. **Minimum Threshold**: The game only updates the circle position when confidence exceeds `MIN_CONFIDENCE` (0.3).

## Cardinal Vowels

The game displays reference points for the following vowels:

- [i] - High front unrounded vowel (as in "beat")
- [e] - Mid-high front unrounded vowel (as in "bait")
- [ɛ] - Mid-low front unrounded vowel (as in "bet")
- [æ] - Low front unrounded vowel (as in "bat")
- [ɑ] - Low back unrounded vowel (as in "father")
- [ɔ] - Low-mid back rounded vowel (as in "bought")
- [o] - Mid-high back rounded vowel (as in "boat")
- [u] - High back rounded vowel (as in "boot")
- [ə] - Mid central unrounded vowel (schwa, as in "about")

The circle's position is determined by mapping F1 (vertical axis) and F2 (horizontal axis) formant frequencies to screen coordinates. 