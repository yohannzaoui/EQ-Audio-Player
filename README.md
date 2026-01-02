# EQ Audio Player 🎧

**EQ Audio Player** is a modern, sleek, and high-performance web audio player. It offers a personalized listening experience through an integrated 5-band equalizer, dynamic playlist management, and automatic preference saving.

## ✨ Key Features

### 🎵 Playback & Navigation
- **Comprehensive Controls**: Play, pause, next, and previous.
- **Smart Navigation**: The "Previous" button restarts the song if it has been playing for more than 3 seconds; otherwise, it jumps to the previous track.
- **3-State Repeat Mode**: 
  - ⚪ Disabled (Sequential playback).
  - 🔁 Repeat All (Loop entire playlist).
  - 🔂 Repeat One (Loop current track).

### 🎚️ Audio Equalizer (Web Audio API)
- **5 Frequency Bands**: 60Hz, 250Hz, 1kHz, 4kHz, 16kHz.
- **Precise Tuning**: Gain adjustment from -20dB to +20dB per band.
- **Quick Reset**: One-click button to reset all gains to 0dB.

### 📋 Playlist Management
- **Bulk Loading**: Upload multiple audio files at once.
- **Metadata Support**: Automatic display of title, artist, and album art (powered by `jsmediatags`).
- **Responsive UI**: Scrollable playlist with a clear visual indicator for the currently playing track.

### ⚙️ Customization & Persistence
- **Themes**: Toggle between Dark and Light modes.
- **Localization**: Interface available in English and French.
- **Auto-Save**: Equalizer gains, volume level, language, and theme are automatically saved in your browser's `LocalStorage`.
- **Export/Import**: Save your custom EQ configurations to a `.json` file and restore them anytime.

## 🚀 Quick Setup

1. **Download/Clone** the project files (`index.html`, `style.css`, `script.js`).
2. **Add a Favicon**: Save your icon as `favicon.ico` in the project's root folder.
3. **Launch the App**: Simply open `index.html` in your web browser.

> **Note**: Due to browser security policies (CORS), importing JSON files or accessing certain audio features may require a local server (e.g., using the "Live Server" extension in VS Code).

## 🛠️ Built With

- **HTML5 / CSS3**: Custom structure and styling.
- **Bootstrap 5 & Icons**: Responsive layout framework.
- **Vanilla JavaScript**: Core application logic.
- **Web Audio API**: Real-time audio processing and equalization.
- **jsmediatags**: Metadata extraction from MP3/FLAC files.

---
Crafted for a superior audio experience.