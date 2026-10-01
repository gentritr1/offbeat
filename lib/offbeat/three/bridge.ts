import type {
  BrandPixels,
  SceneAction,
  SceneController,
  SceneEvent,
  SceneState,
} from "./protocol";
let worker: Worker | null = null;
let sequence = 0;
let unavailable = false;
const clients = new Map<number, (event: SceneEvent) => void>();

/** A single worker owns all scene instances; resource ownership is reference-counted there. */
export function connectWorker(
  canvas: HTMLCanvasElement,
  state: SceneState,
  brand: BrandPixels,
  receive: (event: SceneEvent) => void,
): SceneController | null {
  if (
    unavailable ||
    typeof Worker === "undefined" ||
    !canvas.transferControlToOffscreen
  )
    return null;
  if (!worker) {
    try {
      worker = new Worker(new URL("./worker.ts", import.meta.url), {
        type: "module",
        name: "offbeat-speakers",
      });
      worker.onmessage = ({
        data,
      }: MessageEvent<SceneEvent & { id: number }>) =>
        clients.get(data.id)?.(data);
      worker.onerror = (event) => {
        event.preventDefault();
        unavailable = true;
        const listeners = [...clients.values()];
        clients.clear();
        worker?.terminate();
        worker = null;
        listeners.forEach((listener) =>
          listener({ type: "error", message: "Worker unavailable" }),
        );
      };
    } catch {
      unavailable = true;
      return null;
    }
  }
  const id = ++sequence;
  clients.set(id, receive);
  try {
    const offscreen = canvas.transferControlToOffscreen();
    worker.postMessage({ id, type: "init", canvas: offscreen, state, brand }, [
      offscreen,
    ]);
  } catch (error) {
    clients.delete(id);
    if (!clients.size) {
      worker.terminate();
      worker = null;
    }
    throw error;
  }
  let disposed = false;
  return {
    send(action: SceneAction) {
      if (disposed) return;
      worker?.postMessage({ id, ...action });
      if (action.type === "dispose") {
        disposed = true;
        clients.delete(id);
        if (!clients.size) {
          worker?.terminate();
          worker = null;
        }
      }
    },
  };
}

export async function readBrandPixels(): Promise<BrandPixels> {
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  context.font = `700 semi-expanded 76px ${getComputedStyle(document.body).fontFamily}`;
  context.fillStyle = "#ededdf";
  context.fillText("offbeat", 15, 88);
  return {
    data: context.getImageData(0, 0, 512, 128).data,
    width: 512,
    height: 128,
  };
}
