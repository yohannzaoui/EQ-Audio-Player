
---

# EQ Audio Payer - Features Documentation

**EQ Audio Payer** is a professional-grade, web-based music player featuring a real-time 5-band equalizer, theme persistence, and advanced playlist management.

## 🚀 Key Features

### 1. High-Fidelity Audio Engine

* **Web Audio API Integration:** Uses a professional audio context for real-time signal processing.
* **5-Band Graphic Equalizer:** Fine-tune your sound across five specific frequencies:
* **60Hz** (Sub-Bass)
* **250Hz** (Low-Mid)
* **1kHz** (Mid-Range)
* **4kHz** (Presence/High-Mid)
* **16kHz** (Brilliance/Air)


* **Gain Control:** Each band allows for a range of **-20dB to +20dB**.

### 2. Smart Metadata & Visuals

* **Format Detection:** Automatic detection and display of file extensions (MP3, WAV, OGG, M4A, FLAC).
* **ID3 Tag Parsing:** Automatically extracts Song Title, Artist Name, and Album Art directly from the audio files using `jsmediatags`.
* **Dynamic UI:** If no album art is found, the player displays a minimalist music icon.

### 3. Advanced Playback Controls

* **Loop Modes:**
* **Standard:** Plays through the list.
* **Repeat One:** Loops the current track (indicated by a "1" badge).
* **Repeat All:** Loops the entire library.


* **Shuffle:** Randomizes the playback order.
* **Smart Volume:** Includes a mute/unmute toggle by clicking the volume icon and remembers your last volume level.

### 4. Library & Settings Management

* **Bulk Loading:** Import multiple tracks at once via the "LOAD MUSIC" button.
* **Persistent Theme:** Remembers your preference between **Dark Mode** and **Light Mode** using browser local storage.
* **EQ Portability:**
* **Export:** Save your custom EQ settings as a `.json` file.
* **Import:** Load previously saved EQ configurations.
* **Reset:** Instantly return to a "Flat" (0dB) frequency response.



---

## 🛠 Technical Specifications

| Feature | Description |
| --- | --- |
| **Application Name** | **EQ Audio Payer** |
| **Frontend Framework** | Bootstrap 5.3.0 (CSS) |
| **Icons** | Bootstrap Icons |
| **Storage** | `localStorage` for Theme and EQ gains |
| **Audio Processing** | `BiquadFilterNode` (Peaking type) |
| **Supported Formats** | MP3, WAV, OGG, M4A, FLAC |

---

## 🎹 Interaction & Shortcuts

* **Seek:** Click anywhere on the progress bar to jump to a specific time.
* **Volume:** Drag the volume slider for precise adjustment.
* **Library:** Click any track in the "My Library" panel to play it immediately.
* **Auto-Save:** Your language and theme preferences are automatically saved for your next session.

---

**Developed by:** Yohann Zaoui
