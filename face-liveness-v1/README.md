# VeriFace — Face Liveness Detection

VeriFace is a desktop application prototype that demonstrates face liveness detection using a webcam. It guides users through simple facial challenges, such as blinking and turning their head, to demonstrate basic liveness verification.

The project is built with Electron, React, Vite, and MediaPipe Face Landmarker.

> **Disclaimer:** VeriFace is an educational prototype and is not an official Aadhaar authentication system. It does not provide production-grade biometric security or guarantee protection against spoofing attacks.

##  Features

-  Webcam access for real-time facial tracking
-  Blink detection
-  Left and right head-turn detection
-  Timed liveness challenges
-  Visual feedback on challenge progress
-  Desktop application for macOS
-  Face landmark detection using MediaPipe

##  Tech Stack

- **Electron** — Desktop application framework
- **React** — User interface
- **Vite** — Development and build tooling
- **MediaPipe Tasks Vision** — Face landmark detection
- **JavaScript and CSS** — Application logic and styling
- **Electron Builder** — macOS application packaging

##  Download

Download the macOS installer from the shared Google Drive link provided with this project.

**Installer:** `VeriFace-0.0.0-arm64.dmg`

The installer is approximately 127 MB.

### Installation

1. Download the `.dmg` file.
2. Open the downloaded file on a compatible Mac.
3. Follow the installation instructions.
4. Launch VeriFace.
5. Grant camera permission when prompted.
6. Click **Start Camera** to begin the liveness challenges.

**Compatibility:** The current build targets Apple Silicon Macs (`arm64`).

**Internet connection:** An internet connection may be required because MediaPipe resources are loaded from a CDN.

**macOS security:** The application is currently unsigned and not notarized. macOS may display a security warning when you first open it.

##  Run Locally

### Prerequisites

- Node.js and npm
- Git
- A compatible webcam
- Internet access for any externally hosted MediaPipe resources

### Setup

Clone the repository:

```bash
git clone https://github.com/anveshap103-tomato/VeriFace.git
```

Navigate to the application directory:

```bash
cd VeriFace/face-liveness-v1
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev:desktop
```

Use the development and packaging scripts defined in `package.json` to build the production application.

##  How It Works

1. The application requests access to the user's webcam.
2. MediaPipe Face Landmarker tracks facial landmarks.
3. The application detects blinking and head-turn movements.
4. The user completes the displayed challenges within the allotted time.
5. The interface displays the challenge status.

These checks demonstrate basic interaction-based liveness verification. They are not sufficient on their own to establish that a face is genuine.

##  Privacy

- Camera access requires user permission.
- Facial tracking is performed within the application using MediaPipe.
- The prototype is not designed to identify individuals.
- Review the implementation and external resource configuration before using the application with sensitive data.

##  Limitations

- This is a prototype, not a production-ready biometric authentication system.
- Blink and head-movement detection can be vulnerable to presentation attacks.
- The application does not guarantee detection of photographs, videos, masks, or other spoofing methods.
- The current macOS build targets Apple Silicon.
- External MediaPipe resources may require an active internet connection.

##  Future Improvements

- Integrate a dedicated face anti-spoofing model.
- Improve liveness challenge handling and error messages.
- Add model download progress and offline resource support.
- Sign and notarize the macOS application.
- Add support for additional platforms and processor architectures.

