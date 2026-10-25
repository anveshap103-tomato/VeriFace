import { useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { getBlinkScores, computeNoseOffset, computeGuidance } from "../utils/livenessUtils";

const MODEL_PATH = "/models/face_landmarker.task";
const WASM_PATH =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm";

export function useFaceDetection() {

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const animationRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);
  const startingRef = useRef(false);

  const blinkStateRef = useRef("open");
  const blinkCountRef = useRef(0);

  const baselineOffsetRef = useRef(null);

  const challengeActiveRef = useRef(false);
  const challengeTimerRef = useRef(null);

  const headChallengeActiveRef = useRef(false);
  const headChallengeTimerRef = useRef(null);
  const headChallengeStatusRef = useRef("idle");

  const rightChallengeActiveRef = useRef(false);
  const rightChallengeTimerRef = useRef(null);
  const rightChallengeStatusRef = useRef("idle");

  const [cameraActive, setCameraActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [faceCount, setFaceCount] = useState(0);
  const [guidance, setGuidance] = useState("Start your camera to begin.");
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


  function stopCamera() {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    streamRef.current?.getTracks().forEach((t) => t.stop());
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
    setGuidance("Start your camera to begin.");

    blinkStateRef.current = "open";
    blinkCountRef.current = 0;
    setBlinkCount(0);


    baselineOffsetRef.current = null;

    challengeActiveRef.current = false;
    clearTimeout(challengeTimerRef.current);
    challengeTimerRef.current = null;
    setChallengeStatus("idle");
    setChallengeMessage("Start a challenge when you're ready.");

    headChallengeActiveRef.current = false;
    headChallengeStatusRef.current = "idle";
    clearTimeout(headChallengeTimerRef.current);
    headChallengeTimerRef.current = null;
    setHeadChallengeStatus("idle");
    setHeadChallengeMessage("Start a head-turn challenge when ready.");

    rightChallengeActiveRef.current = false;
    rightChallengeStatusRef.current = "idle";
    clearTimeout(rightChallengeTimerRef.current);
    rightChallengeTimerRef.current = null;
    setRightChallengeStatus("idle");
    setRightChallengeMessage("Start a right head-turn challenge when ready.");
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
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });

      streamRef.current = stream;

      const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
      if (!startingRef.current) return;

      const landmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_PATH, delegate: "CPU" },
        runningMode: "VIDEO",
        numFaces: 3,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: false,
      });

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
      stream?.getTracks().forEach((t) => t.stop());
      if (streamRef.current === stream) streamRef.current = null;

      landmarkerRef.current?.close();
      landmarkerRef.current = null;

      const messages = {
        NotAllowedError: "Camera permission denied. Check macOS camera settings.",
        NotFoundError: "No camera was found.",
        NotReadableError: "The camera is busy or could not be accessed.",
      };

      setError(messages[err.name] || `Could not start face detection: ${err.message}`);
      setGuidance("Unable to start.");
    } finally {
      startingRef.current = false;
      setStarting(false);
    }
  }


  function detectBlink(blendshapes) {
    const scores = getBlinkScores(blendshapes);
    if (!scores) return;

    const { left, right } = scores;
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


  function startBlinkChallenge(faceCount) {
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
        setChallengeMessage("Challenge timed out. Please try again.");
      }
    }, 10000);
  }

  function startHeadTurnChallenge(faceCount) {
    if (!cameraActive || faceCount !== 1) {
      setHeadChallengeMessage(
        "Start the camera and make sure exactly one face is visible."
      );
      return;
    }

    clearTimeout(headChallengeTimerRef.current);
    headChallengeActiveRef.current = true;
    headChallengeStatusRef.current = "active";
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

  function startRightTurnChallenge(faceCount) {
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
        const result = landmarker.detectForVideo(video, performance.now());
        detectBlink(result.faceBlendshapes);

        const faces = result.faceLandmarks || [];
        setFaceCount(faces.length);

        if (faces.length === 0) {
          setGuidance("No face detected. Look at the camera.");
        } else if (faces.length > 1) {
          setGuidance("Multiple faces detected. Only one person should be visible.");
        } else {
          const landmarks = faces[0];
          const noseOffset = computeNoseOffset(landmarks);

          if (baselineOffsetRef.current === null) {
            baselineOffsetRef.current = noseOffset;
          }

          const relativeOffset = noseOffset - baselineOffsetRef.current;

          if (
            headChallengeActiveRef.current &&
            headChallengeStatusRef.current === "active" &&
            relativeOffset > 0.06
          ) {
            headChallengeActiveRef.current = false;
            headChallengeStatusRef.current = "completed";
            clearTimeout(headChallengeTimerRef.current);
            setHeadChallengeStatus("completed");
            setHeadChallengeMessage("Left turn detected!");
          }

          if (
            rightChallengeActiveRef.current &&
            rightChallengeStatusRef.current === "active" &&
            relativeOffset < -0.06
          ) {
            rightChallengeActiveRef.current = false;
            rightChallengeStatusRef.current = "completed";
            clearTimeout(rightChallengeTimerRef.current);
            setRightChallengeStatus("completed");
            setRightChallengeMessage("Right turn detected!");
          }

          setGuidance(computeGuidance(landmarks, relativeOffset));
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
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      landmarkerRef.current?.close();
    };
  }, []);

  return {
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
  };
}
