const VERIFICATION_LABELS = {
  ready: "Ready to start.",
  "checking-face": "Checking for a stable face...",
  blink: "Step 1 of 3: Please blink naturally.",
  "turn-left": "Step 2 of 3: Turn your head to your left.",
  "turn-right": "Step 3 of 3: Turn your head to your right.",
  completed: "Verification passed.",
  failed: "Verification failed — timed out.",
  inconclusive: "Verification inconclusive — face was lost.",
};

function statusLabel(status, waitingText) {
  if (status === "idle") return "Not started";
  if (status === "active") return waitingText;
  if (status === "failed") return "Timed Out";
  return "Completed";
}

export default function ChallengePanel({
  cameraActive,
  faceCount,
  challengeStatus,
  challengeMessage,
  onStartBlink,
  headChallengeStatus,
  headChallengeMessage,
  onStartHeadLeft,
  rightChallengeStatus,
  rightChallengeMessage,
  onStartHeadRight,
  verificationState,
  onStartVerification,
  onRetryVerification,
}) {
  const verificationActive = [
    "checking-face", "blink", "turn-left", "turn-right",
  ].includes(verificationState);

  function renderVerificationResult() {
    if (verificationState === "completed") {
      return <p style={{ color: "#4ade80", fontWeight: 600 }}>✅ Verification Successful! All challenges completed.</p>;
    }
    if (verificationState === "failed") {
      return <p style={{ color: "#f87171", fontWeight: 600 }}>❌ Verification Failed. Please try again.</p>;
    }
    if (verificationState === "inconclusive") {
      return <p style={{ color: "#fbbf24", fontWeight: 600 }}>⚠️ Unable to verify. Please check your camera and face position, then try again.</p>;
    }
    return <p>{VERIFICATION_LABELS[verificationState]}</p>;
  }

  return (
    <>
      <section className="detection-panel">
        <h2>Liveness Verification</h2>
        {renderVerificationResult()}
        <p><strong>Status:</strong> {verificationState}</p>
        {verificationState === "ready" && (
          <button onClick={onStartVerification} disabled={!cameraActive}>
            Start Verification
          </button>
        )}
        {verificationActive && (
          <button disabled>Running...</button>
        )}
        {(verificationState === "failed" || verificationState === "inconclusive") && (
          <button onClick={onRetryVerification} disabled={!cameraActive}>
            Try Again
          </button>
        )}
        {verificationState === "completed" && (
          <button onClick={onRetryVerification} disabled={!cameraActive}>
            Retry Verification
          </button>
        )}
      </section>
      <section className="detection-panel">
        <h2>Head-Turn Challenges</h2>

        <p><strong>Left Turn</strong></p>
        <p>{headChallengeMessage}</p>
        <p><strong>Status:</strong> {statusLabel(headChallengeStatus, "Waiting for head turn")}</p>
        <button
          onClick={onStartHeadLeft}
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
        <p><strong>Status:</strong> {statusLabel(rightChallengeStatus, "Waiting for head turn")}</p>
        <button
          onClick={onStartHeadRight}
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
        <p><strong>Status:</strong> {statusLabel(challengeStatus, "Waiting for blink")}</p>
        <button
          onClick={onStartBlink}
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
    </>
  );
}
