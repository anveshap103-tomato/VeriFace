
import { useEffect, useRef, useState } from "react";
import "./App.css";

function App() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState("");

  async function startCamera() {
    setError("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera access is unavailable in this environment.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);
    } catch (err) {
      const messages = {
        NotAllowedError:
          "Camera permission denied. Allow camera access in macOS Settings.",
        NotFoundError:
          "No camera was found. Connect or enable a webcam.",
        NotReadableError:
          "The camera is busy or could not be accessed.",
        OverconstrainedError:
          "The camera does not support the requested settings.",
      };

      setError(
        messages[err.name] ||
          `Could not start the camera: ${err.message}`
      );
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
  }

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <main className="app">
      <h1>Face Liveness Detection</h1>
      <p className="subtitle">Local webcam prototype</p>

      <div className="camera-container">
        <video
          ref={videoRef}
          className="camera-preview"
          autoPlay
          muted
          playsInline
        />

        {!cameraActive && (
          <div className="camera-placeholder">
            Camera is off
          </div>
        )}
      </div>

      <p className="status">
        Status: {cameraActive ? "Camera Active" : "Ready"}
      </p>

      {error && <p className="error">{error}</p>}

      <div className="controls">
        <button onClick={startCamera} disabled={cameraActive}>
          Start Camera
        </button>

        <button onClick={stopCamera} disabled={!cameraActive}>
          Stop Camera
        </button>
      </div>

      <p className="privacy-note">
        Camera frames are not uploaded or saved by this prototype.
      </p>
    </main>
  );
}

export default App;
