import { useFaceDetection } from "./hooks/useFaceDetection";
import CameraPreview from "./components/CameraPreview";
import DetectionPanel from "./components/DetectionPanel";
import ChallengePanel from "./components/ChallengePanel";
import "./App.css";

function App() {
  const {
    videoRef,
    cameraActive,
    starting,
    error,
    faceCount,
    guidance,
    blinkCount,
    challengeStatus,
    challengeMessage,
    headChallengeStatus,
    headChallengeMessage,
    rightChallengeStatus,
    rightChallengeMessage,
    startCamera,
    stopCamera,
    startBlinkChallenge,
    startHeadTurnChallenge,
    startRightTurnChallenge,
  } = useFaceDetection();

  return (
    <main className="app">
      <h1>Face Liveness Detection</h1>
      <p className="subtitle">Face detection prototype</p>

      <CameraPreview videoRef={videoRef} cameraActive={cameraActive} />

      <DetectionPanel
        faceCount={faceCount}
        blinkCount={blinkCount}
        guidance={guidance}
      />

      <ChallengePanel
        cameraActive={cameraActive}
        faceCount={faceCount}
        challengeStatus={challengeStatus}
        challengeMessage={challengeMessage}
        onStartBlink={() => startBlinkChallenge(faceCount)}
        headChallengeStatus={headChallengeStatus}
        headChallengeMessage={headChallengeMessage}
        onStartHeadLeft={() => startHeadTurnChallenge(faceCount)}
        rightChallengeStatus={rightChallengeStatus}
        rightChallengeMessage={rightChallengeMessage}
        onStartHeadRight={() => startRightTurnChallenge(faceCount)}
      />

      <p className="status">
        Status: {cameraActive ? "Detecting Face" : "Ready"}
      </p>

      {error && <p className="error">{error}</p>}

      <div className="controls">
        <button onClick={startCamera} disabled={starting || cameraActive}>
          {starting ? "Starting..." : "Start Camera"}
        </button>
        <button onClick={stopCamera} disabled={!starting && !cameraActive}>
          Stop Camera
        </button>
      </div>

      <p className="privacy-note">
        Video frames are processed locally and are not saved by this prototype.
      </p>
    </main>
  );
}

export default App;
