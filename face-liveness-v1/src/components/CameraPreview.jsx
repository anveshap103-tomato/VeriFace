export default function CameraPreview({ videoRef, cameraActive }) {
  return (
    <div className="camera-container">
      <video
        ref={videoRef}
        className="camera-preview"
        autoPlay
        muted
        playsInline
      />
      {!cameraActive && (
        <div className="camera-placeholder">Camera is off</div>
      )}
    </div>
  );
}
