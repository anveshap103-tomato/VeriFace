/**
 * Returns { left, right } blink scores from the first face's blendshapes.
 */
export function getBlinkScores(blendshapes) {
  const categories = blendshapes?.[0]?.categories;
  if (!categories) return null;

  const left =
    categories.find((c) => c.categoryName === "eyeBlinkLeft")?.score ?? 0;
  const right =
    categories.find((c) => c.categoryName === "eyeBlinkRight")?.score ?? 0;

  return { left, right };
}

/**
 * Computes the nose offset relative to the face centre for a single face's landmarks.
 * Returns noseOffset (raw) so the caller can diff against the baseline.
 */
export function computeNoseOffset(landmarks) {
  const nose = landmarks[1];
  const leftSide = landmarks[234];
  const rightSide = landmarks[454];
  const faceCenterX = (leftSide.x + rightSide.x) / 2;
  return nose.x - faceCenterX;
}

/**
 * Returns a positioning guidance string based on face landmarks and relativeOffset.
 * Pure function — no side effects.
 * In the mirrored webcam feed: positive relativeOffset = person's left, negative = person's right.
 */
export function computeGuidance(landmarks, relativeOffset) {
  const centerX =
    landmarks.reduce((sum, p) => sum + p.x, 0) / landmarks.length;
  const centerY =
    landmarks.reduce((sum, p) => sum + p.y, 0) / landmarks.length;

  const left = landmarks[234];
  const right = landmarks[454];
  const top = landmarks[10];
  const bottom = landmarks[152];

  const faceWidth = Math.abs(right.x - left.x);
  const faceHeight = Math.abs(bottom.y - top.y);

  if (faceWidth < 0.15 || faceHeight < 0.2) return "Move closer to the camera.";
  if (faceWidth > 0.65 || faceHeight > 0.8) return "Move a little farther from the camera.";
  if (centerX < 0.35 || centerX > 0.65) return "Move your face toward the center.";
  if (centerY < 0.3 || centerY > 0.7) return "Adjust your face vertically toward the center.";
  if (relativeOffset < -0.035) return "Turn your head slightly to your right.";
  if (relativeOffset > 0.035) return "Turn your head slightly to your left.";
  return "Face detected. Position looks good.";
}
