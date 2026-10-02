export type Beat = { step: number; tracks: boolean[] };
export type Point = { x: number; y: number };
export type SceneState = {
  color: string;
  exploded: boolean;
  rotation: number;
  swing: number;
  compact: boolean;
  zoom: number;
  width: number;
  height: number;
  dpr: number;
  visible: boolean;
  reduced: boolean;
  instant: boolean;
  diagnostics: boolean;
  interactiveDial: boolean;
};
export type SceneAction =
  | { type: "state"; state: Partial<SceneState> }
  | { type: "rotate"; dx: number; dy: number; instant?: boolean }
  | { type: "home" }
  | { type: "pattern"; pattern: boolean[][] }
  | { type: "beat"; beat: Beat }
  | { type: "stop" }
  | { type: "snapshot" }
  | { type: "dispose" };
export type FrameInfo = {
  step: number;
  active: boolean[];
  dial: Point;
  leds: (Point & { radius: number })[];
  keys: Point[];
  drawCalls: number;
  triangles: number;
  swing: number;
  phase: number;
  orientation: { yaw: number; pitch: number };
};
export type SceneEvent =
  | { type: "frame"; frame: FrameInfo }
  | { type: "dial"; point: Point }
  | { type: "ready" }
  | { type: "poster"; blob: Blob }
  | { type: "error"; message: string };
export type SceneController = { send: (action: SceneAction) => void };
export type BrandPixels = {
  data: Uint8ClampedArray;
  width: number;
  height: number;
};
export type Init = {
  type: "init";
  canvas: OffscreenCanvas;
  state: SceneState;
  brand: BrandPixels;
};
