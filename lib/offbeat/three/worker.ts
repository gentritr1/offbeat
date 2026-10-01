import { createSpeakerScene } from "./scene";
import type { Init, SceneAction, SceneController } from "./protocol";
const scenes = new Map<number, SceneController>();
self.onmessage = (
  event: MessageEvent<(Init | SceneAction) & { id: number }>,
) => {
  const { id, ...message } = event.data;
  try {
    if (message.type === "init") {
      if (typeof requestAnimationFrame !== "function")
        throw new Error("Worker animation frames unavailable");
      const scene = createSpeakerScene(
        message.canvas,
        message.state,
        message.brand,
        (response) => self.postMessage({ id, ...response }),
      );
      scenes.set(id, scene);
    } else {
      scenes.get(id)?.send(message);
      if (message.type === "dispose") scenes.delete(id);
    }
  } catch (error) {
    scenes.get(id)?.send({ type: "dispose" });
    scenes.delete(id);
    self.postMessage({
      id,
      type: "error",
      message: error instanceof Error ? error.message : "Renderer unavailable",
    });
  }
};
