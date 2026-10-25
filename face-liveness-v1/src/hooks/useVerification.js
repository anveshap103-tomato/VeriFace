import { useRef, useState } from "react";

// States: "ready" | "checking-face" | "blink" | "turn-left" | "turn-right" | "completed" | "failed" | "inconclusive"

export function useVerification() {
  const [verificationState, setVerificationState] = useState("ready");
  const verificationStateRef = useRef("ready");
  const verificationTimerRef = useRef(null);

  // Callbacks set by useFaceDetection so advanceVerification can trigger challenges
  const startBlinkCb = useRef(null);
  const startLeftCb = useRef(null);
  const startRightCb = useRef(null);

  function setVState(s) {
    verificationStateRef.current = s;
    setVerificationState(s);
  }

  function clearVerificationTimer() {
    clearTimeout(verificationTimerRef.current);
    verificationTimerRef.current = null;
  }

  function startVerification(cameraActive, faceCount) {
    if (!cameraActive || verificationStateRef.current !== "ready") return;
    setVState("checking-face");
  }

  function resetVerification() {
    clearVerificationTimer();
    setVState("ready");
  }

  // Called by useFaceDetection from inside detectFrame with one of:
  // "face-stable" | "face-lost" | "blink-ok" | "left-ok" | "right-ok" | "timeout"
  function advanceVerification(event) {
    const s = verificationStateRef.current;

    if (event === "face-lost") {
      const midSequence = ["blink", "turn-left", "turn-right"].includes(s);
      if (midSequence) {
        clearVerificationTimer();
        setVState("inconclusive");
      }
      return;
    }

    if (event === "face-stable" && s === "checking-face") {
      setVState("blink");
      startBlinkCb.current?.();
      verificationTimerRef.current = setTimeout(() => {
        if (verificationStateRef.current === "blink") {
          clearVerificationTimer();
          setVState("failed");
        }
      }, 10000);
      return;
    }

    if (event === "blink-ok" && s === "blink") {
      clearVerificationTimer();
      setVState("turn-left");
      startLeftCb.current?.();
      verificationTimerRef.current = setTimeout(() => {
        if (verificationStateRef.current === "turn-left") {
          clearVerificationTimer();
          setVState("failed");
        }
      }, 10000);
      return;
    }

    if (event === "left-ok" && s === "turn-left") {
      clearVerificationTimer();
      setVState("turn-right");
      startRightCb.current?.();
      verificationTimerRef.current = setTimeout(() => {
        if (verificationStateRef.current === "turn-right") {
          clearVerificationTimer();
          setVState("failed");
        }
      }, 10000);
      return;
    }

    if (event === "right-ok" && s === "turn-right") {
      clearVerificationTimer();
      setVState("completed");
    }
  }

  return {
    verificationState,
    verificationStateRef,
    startVerification,
    resetVerification,
    advanceVerification,
    startBlinkCb,
    startLeftCb,
    startRightCb,
  };
}
