
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import { SceneMode } from "./types";

export interface GestureData {
  mode: SceneMode;
  palmCenter: { x: number, y: number } | null;
}

export class GestureService {
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
  landmarker: HandLandmarker | null = null;
  onUpdate: (data: GestureData) => void = () => {};

  constructor(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
    this.video = video;
    this.canvas = canvas;
  }

  async init() {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );
    this.landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
        delegate: "GPU"
      },
      runningMode: "VIDEO",
      numHands: 1
    });

    // Start camera
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 160, height: 120 } 
      });
      this.video.srcObject = stream;
      this.video.addEventListener("loadeddata", () => this.predict());
    }
  }

  private predict() {
    if (!this.landmarker || this.video.readyState < 2) {
      requestAnimationFrame(() => this.predict());
      return;
    }

    const results = this.landmarker.detectForVideo(this.video, performance.now());
    
    if (results.landmarks && results.landmarks.length > 0) {
      const landmarks = results.landmarks[0];
      const mode = this.processGestures(landmarks);
      const palmCenter = { x: landmarks[9].x, y: landmarks[9].y };
      
      this.onUpdate({ mode, palmCenter });
    } else {
      this.onUpdate({ mode: SceneMode.TREE, palmCenter: null });
    }

    requestAnimationFrame(() => this.predict());
  }

  private processGestures(landmarks: any[]): SceneMode {
    const thumb = landmarks[4];
    const index = landmarks[8];
    const wrist = landmarks[0];
    const fingers = [landmarks[12], landmarks[16], landmarks[20]];

    // 1. Pinch Detection
    const pinchDist = Math.hypot(thumb.x - index.x, thumb.y - index.y, thumb.z - index.z);
    if (pinchDist < 0.05) return SceneMode.FOCUS;

    // Calculate average distance of fingertips to wrist
    const dists = [index, ...fingers].map(f => 
      Math.hypot(f.x - wrist.x, f.y - wrist.y, f.z - wrist.z)
    );
    const avgDist = dists.reduce((a, b) => a + b, 0) / dists.length;

    // 2. Fist Detection
    if (avgDist < 0.25) return SceneMode.TREE;

    // 3. Open Hand Detection
    if (avgDist > 0.4) return SceneMode.SCATTER;

    return SceneMode.TREE; // Default fallback
  }
}
