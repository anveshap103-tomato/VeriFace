export default function DetectionPanel({ faceCount, blinkCount, guidance }) {
  return (
    <section className="detection-panel">
      <p><strong>Face count:</strong> {faceCount}</p>
      <p><strong>Blinks detected:</strong> {blinkCount}</p>
      <p><strong>Guidance:</strong> {guidance}</p>
    </section>
  );
}
