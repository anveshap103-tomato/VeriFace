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
  const baselineOffsetRef = useRef(null);
  const headDirectionRef = useRef("center");
  const headChallengeActiveRef = useRef(false);

  const [cameraActive, setCameraActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [faceCount, setFaceCount] = useState(0);
  const [guidance, setGuidance] = useState(
    "Start your camera to begin."
  );
  const [blinkCount, setBlinkCount] = useState(0);
  const [challengeStatus, setChallengeStatus] = useState("idle");
  const [challengeMessage, setChallengeMessage] = useState(
    "Start a challenge when you're ready."
  );
  const [headChallengeStatus, setHeadChallengeStatus] = useState("idle");
  const [headChallengeMessage, setHeadChallengeMessage] = useState(
    "Start a head-turn challenge when ready."
  );
  const [rightChallengeStatus, setRightChallengeStatus] = useState("idle");
  const [rightChallengeMessage, setRightChallengeMessage] = useState(
    "Start a right head-turn challenge when ready."
  );

const challengeActiveRef = useRef(false);
const challengeTimerRef = useRef(null);
const headChallengeTimerRef = useRef(null);
const headChallengeStatusRef = useRef("idle");
const rightChallengeActiveRef = useRef(false);
const rightChallengeTimerRef = useRef(null);
const rightChallengeStatusRef = useRef("idle");

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
    baselineOffsetRef.current = null;
    headDirectionRef.current = "center";
    challengeActiveRef.current = false;
    setChallengeStatus("idle");
    setChallengeMessage("Start a challenge when you're ready.");
    clearTimeout(challengeTimerRef.current);
    challengeTimerRef.current = null;
    headChallengeActiveRef.current = false;
    headChallengeStatusRef.current = "idle";
    setHeadChallengeStatus("idle");
    setHeadChallengeMessage("Start a head-turn challenge when ready.");
    clearTimeout(headChallengeTimerRef.current);
    headChallengeTimerRef.current = null;
    rightChallengeActiveRef.current = false;
    rightChallengeStatusRef.current = "idle";
    setRightChallengeStatus("idle");
    setRightChallengeMessage("Start a right head-turn challenge when ready.");
    clearTimeout(rightChallengeTimerRef.current);
    rightChallengeTimerRef.current = null;
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
      if (challengeActiveRef.current) {
        challengeActiveRef.current = false;
        clearTimeout(challengeTimerRef.current);
        setChallengeStatus("completed");
        setChallengeMessage("Blink detected! Challenge completed.");
      }
    }
  }

  function startBlinkChallenge() {
    if (!cameraActive || faceCount !== 1) {
      setChallengeMessage(
        "Start the camera and make sure exactly one face is visible."
      );
      return;
    }

    blinkStateRef.current = "open";
    challengeActiveRef.current = true;

    setChallengeStatus("active");
    setChallengeMessage("Please blink naturally.");
    challengeTimerRef.current = setTimeout(() => {
      if (challengeActiveRef.current) {
        challengeActiveRef.current = false;
        setChallengeStatus("failed");
        setChallengeMessage(
          "Challenge timed out. Please try again."
        );
      }
    }, 10000);
  }

  function startHeadTurnChallenge() {
    if (!cameraActive || faceCount !== 1) {
      setHeadChallengeMessage(
        "Start the camera and make sure exactly one face is visible."
      );
      return;
    }

    clearTimeout(headChallengeTimerRef.current);
    headChallengeActiveRef.current = true;
    headChallengeStatusRef.current = "active";
    headDirectionRef.current = "center";

    setHeadChallengeStatus("active");
    setHeadChallengeMessage("Turn your head to your left.");

    headChallengeTimerRef.current = setTimeout(() => {
      if (headChallengeActiveRef.current) {
        headChallengeActiveRef.current = false;
        headChallengeStatusRef.current = "failed";
        setHeadChallengeStatus("failed");
        setHeadChallengeMessage("Challenge timed out. Please try again.");
      }
    }, 10000);
  }

  function startRightTurnChallenge() {
    if (!cameraActive || faceCount !== 1) {
      setRightChallengeMessage(
        "Start the camera and make sure exactly one face is visible."
      );
      return;
    }

    clearTimeout(rightChallengeTimerRef.current);
    rightChallengeActiveRef.current = true;
    rightChallengeStatusRef.current = "active";

    setRightChallengeStatus("active");
    setRightChallengeMessage("Turn your head to your right.");

    rightChallengeTimerRef.current = setTimeout(() => {
      if (rightChallengeActiveRef.current) {
        rightChallengeActiveRef.current = false;
        rightChallengeStatusRef.current = "failed";
        setRightChallengeStatus("failed");
        setRightChallengeMessage("Challenge timed out. Please try again.");
      }
    }, 10000);
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
          if (baselineOffsetRef.current === null) {
            baselineOffsetRef.current = noseOffset;
          }

          // In the mirrored webcam feed: positive relativeOffset = person's left, negative = person's right
          const relativeOffset = noseOffset - baselineOffsetRef.current;
          if (
            headChallengeActiveRef.current &&
            headChallengeStatusRef.current === "active"
          ) {
            if (relativeOffset > 0.06) {
              headChallengeActiveRef.current = false;
              headChallengeStatusRef.current = "completed";
              clearTimeout(headChallengeTimerRef.current);
              setHeadChallengeStatus("completed");
              setHeadChallengeMessage("Left turn detected!");
            }
          }
          if (
            rightChallengeActiveRef.current &&
            rightChallengeStatusRef.current === "active"
          ) {
            if (relativeOffset < -0.06) {
              rightChallengeActiveRef.current = false;
              rightChallengeStatusRef.current = "completed";
              clearTimeout(rightChallengeTimerRef.current);
              setRightChallengeStatus("completed");
              setRightChallengeMessage("Right turn detected!");
            }
          }

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
          }else if (relativeOffset < -0.035) {
            setGuidance("Turn your head slightly to your right.");
          } else if (relativeOffset > 0.035) {
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

      <section className="detection-panel">
        <h2>Head-Turn Challenges</h2>

        <p><strong>Left Turn</strong></p>
        <p>{headChallengeMessage}</p>
        <p>
          <strong>Status:</strong>{" "}
          {headChallengeStatus === "idle"
            ? "Not started"
            : headChallengeStatus === "active"
              ? "Waiting for head turn"
              : headChallengeStatus === "failed"
                ? "Timed Out"
                : "Completed"}
        </p>
        <button
          onClick={startHeadTurnChallenge}
          disabled={!cameraActive || headChallengeStatus === "active"}
        >
          {headChallengeStatus === "idle"
            ? "Start Left-Turn Challenge"
            : headChallengeStatus === "active"
              ? "Waiting..."
              : headChallengeStatus === "completed"
                ? "Completed"
                : "Try Again"}
        </button>

        <p style={{ marginTop: "16px" }}><strong>Right Turn</strong></p>
        <p>{rightChallengeMessage}</p>
        <p>
          <strong>Status:</strong>{" "}
          {rightChallengeStatus === "idle"
            ? "Not started"
            : rightChallengeStatus === "active"
              ? "Waiting for head turn"
              : rightChallengeStatus === "failed"
                ? "Timed Out"
                : "Completed"}
        </p>
        <button
          onClick={startRightTurnChallenge}
          disabled={!cameraActive || rightChallengeStatus === "active"}
        >
          {rightChallengeStatus === "idle"
            ? "Start Right-Turn Challenge"
            : rightChallengeStatus === "active"
              ? "Waiting..."
              : rightChallengeStatus === "completed"
                ? "Completed"
                : "Try Again"}
        </button>
      </section>

      <section className="detection-panel">
        <h2>Active Liveness Challenge</h2>

        <p>{challengeMessage}</p>

        <p>
          <strong>Status:</strong>{" "}
          {challengeStatus === "idle"
            ? "Not started"
            : challengeStatus === "active"
              ? "Waiting for blink"
              : challengeStatus === "failed"
                ?"Timed Out"
                : "Completed"}
        </p>

        <button
          onClick={startBlinkChallenge}
          disabled={!cameraActive || challengeStatus === "active"}
        >
          {challengeStatus === "idle"
            ? "Not started"
            : challengeStatus === "active"
              ? "Waiting for blink"
              : challengeStatus === "completed"
                ? "Completed"
                : "Try Again"}
        </button>
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
