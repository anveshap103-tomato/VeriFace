import { useEffect, useRef, useState } from "react";
import {
  FaceLandmarker,
  FilesetResolver,
} from "@mediapipe/tasks-vision";
import "./App.css";

const MODEL_PATH = "/models/face_landmarker.task";
const WASM_PATH =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm";

function App() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const animationRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);
  const startingRef = useRef(false);
  const blinkStateRef = useRef("open");
  const blinkCountRef = useRef(0);

  const [cameraActive, setCameraActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [faceCount, setFaceCount] = useState(0);
  const [guidance, setGuidance] = useState(
    "Start your camera to begin."
  );
  const [blinkCount, setBlinkCount] = useState(0);

  function stopCamera() {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    landmarkerRef.current?.close();
    landmarkerRef.current = null;

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    lastVideoTimeRef.current = -1;
    startingRef.current = false;

    setCameraActive(false);
    setStarting(false);
    setFaceCount(0);
    blinkStateRef.current = "open";
    blinkCountRef.current = 0;
    setBlinkCount(0);
    setGuidance("Start your camera to begin.");
  }

  async function startCamera() {
    if (startingRef.current || streamRef.current) return;

    startingRef.current = true;
    setStarting(true);
    setError("");
    setFaceCount(0);
    setGuidance("Requesting camera permission...");

    let stream;

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera access is unavailable.");
      }

      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;

      const vision = await FilesetResolver.forVisionTasks(WASM_PATH);

      if (!startingRef.current) return;

      const landmarker = await FaceLandmarker.createFromOptions(
        vision,
        {
          baseOptions: {
            modelAssetPath: MODEL_PATH,
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          numFaces: 3,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: false,
        }
      );

      if (!startingRef.current) {
        landmarker.close();
        return;
      }

      landmarkerRef.current = landmarker;

      const video = videoRef.current;
      if (!video) throw new Error("Video element is unavailable.");

      video.srcObject = stream;
      await video.play();

      if (!startingRef.current) return;

      setCameraActive(true);
      setGuidance("Looking for a face...");
      detectFrame();
    } catch (err) {
      stream?.getTracks().forEach((track) => track.stop());

      if (streamRef.current === stream) {
        streamRef.current = null;
      }

      landmarkerRef.current?.close();
      landmarkerRef.current = null;

      const messages = {
        NotAllowedError:
          "Camera permission denied. Check macOS camera settings.",
        NotFoundError: "No camera was found.",
        NotReadableError:
          "The camera is busy or could not be accessed.",
      };

      setError(
        messages[err.name] ||
          `Could not start face detection: ${err.message}`
      );

      setGuidance("Unable to start.");
    } finally {
      startingRef.current = false;
      setStarting(false);
    }
  }

  function detectBlink(blendshapes) {
    const categories = blendshapes?.[0]?.categories;

    if (!categories) return;

    const left = categories.find(
      (item) => item.categoryName === "eyeBlinkLeft"
    )?.score ?? 0;

    const right = categories.find(
      (item) => item.categoryName === "eyeBlinkRight"
    )?.score ?? 0;

    const eyesClosed = left > 0.45 && right > 0.45;
    const eyesOpen = left < 0.35 && right < 0.35;

    if (blinkStateRef.current === "open" && eyesClosed) {
      blinkStateRef.current = "closed";
    } else if (blinkStateRef.current === "closed" && eyesOpen) {
      blinkStateRef.current = "open";
      blinkCountRef.current += 1;
      setBlinkCount(blinkCountRef.current);
    }
  }

  function detectFrame() {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;

    if (!video || !landmarker || video.readyState < 2) {
      animationRef.current = requestAnimationFrame(detectFrame);
      return;
    }

    if (video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime;

      try {
        const result = landmarker.detectForVideo(
          video,
          performance.now()
        );
        detectBlink(result.faceBlendshapes);

        const faces = result.faceLandmarks || [];
        setFaceCount(faces.length);

        if (faces.length === 0) {
          setGuidance("No face detected. Look at the camera.");
        } else if (faces.length > 1) {
          setGuidance("Multiple faces detected. Only one person should be visible.");
        } else {
          const landmarks = faces[0];
          const nose = landmarks[1];
          const leftSide = landmarks[234];
          const rightSide = landmarks[454];

          const faceCenterX = (leftSide.x + rightSide.x) / 2;
          const noseOffset = nose.x - faceCenterX;

          const centerX =
            landmarks.reduce((sum, point) => sum + point.x, 0) /
            landmarks.length;

          const centerY =
            landmarks.reduce((sum, point) => sum + point.y, 0) /
            landmarks.length;

          const left = landmarks[234];
          const right = landmarks[454];
          const top = landmarks[10];
          const bottom = landmarks[152];

          const faceWidth = Math.abs(right.x - left.x);
          const faceHeight = Math.abs(bottom.y - top.y);

          if (faceWidth < 0.15 || faceHeight < 0.2) {
            setGuidance("Move closer to the camera.");
          } else if (faceWidth > 0.65 || faceHeight > 0.8) {
            setGuidance("Move a little farther from the camera.");
          } else if (centerX < 0.35) {
            setGuidance("Move your face toward the center.");
          } else if (centerX > 0.65) {
            setGuidance("Move your face toward the center.");
          } else if (centerY < 0.3 || centerY > 0.7) {
            setGuidance("Adjust your face vertically toward the center.");
          }else if (noseOffset < -0.035) {
            setGuidance("Turn your head slightly to your right.");
          } else if (noseOffset > 0.035) {
            setGuidance("Turn your head slightly to your left."); 
          } else {
            setGuidance("Face detected. Position looks good.");
          }
        }
      } catch (err) {
        setError(`Face detection failed: ${err.message}`);
        setGuidance("Detection error. Stop and restart the camera.");
        return;
      }
    }

    animationRef.current = requestAnimationFrame(detectFrame);
  }

  useEffect(() => {
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
      landmarkerRef.current?.close();
    };
  }, []);

  return (
    <main className="app">
      <h1>Face Liveness Detection</h1>
      <p className="subtitle">Face detection prototype</p>

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

      <section className="detection-panel">
        <p>
          <strong>Face count:</strong> {faceCount}
        </p>
        <p><strong>Blinks detected:</strong> {blinkCount}</p>
        <p>
          <strong>Guidance:</strong> {guidance}
        </p>
      </section>

      <p className="status">
        Status: {cameraActive ? "Detecting Face" : "Ready"}
      </p>

      {error && <p className="error">{error}</p>}

      <div className="controls">
        <button onClick={startCamera} disabled={starting || cameraActive}>
          {starting ? "Starting..." : "Start Camera"}
        </button>

        <button
          onClick={stopCamera}
          disabled={!starting && !cameraActive}
        >
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
