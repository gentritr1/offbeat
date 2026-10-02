import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  acquireResources,
  releaseResources,
  shared,
  environment,
  fabricTexture,
  brandTexture,
  contactTexture,
} from "./resources";
import { activeSteps, keyDepth, spring } from "./motion";
import type {
  SceneState,
  SceneAction,
  SceneEvent,
  SceneController,
  BrandPixels,
} from "./protocol";

export function createSpeakerScene(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  initial: SceneState,
  brandPixels: BrandPixels,
  emit: (event: SceneEvent) => void,
): SceneController {
  const state = { ...initial };
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(state.dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  acquireResources();
  try {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    scene.environment = environment(renderer);
    scene.environmentIntensity = 0.75;
    scene.add(new THREE.HemisphereLight(0xffffff, 0xc4c1bb, 2));
    const key = new THREE.DirectionalLight(0xffffff, 4);
    key.position.set(-4, 8, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xdbe4ff, 1.5);
    fill.position.set(5, 3, -4);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 1.5);
    rim.position.set(-3, 4, -3);
    scene.add(rim);
    const root = new THREE.Group();
    root.rotation.set(0.05, -0.44, -0.04);
    scene.add(root);
    const rubber = new THREE.MeshStandardMaterial({
      color: state.color,
      roughness: 0.58,
      metalness: 0.02,
    });
    const black = shared(
      "material:black",
      () =>
        new THREE.MeshStandardMaterial({
          color: "#1c1d1d",
          roughness: 0.65,
        }),
    );
    const metal = shared(
      "material:metal",
      () =>
        new THREE.MeshStandardMaterial({
          color: "#c5c9c8",
          metalness: 0.95,
          roughness: 0.27,
        }),
    );
    const rubberDark = shared(
      "material:rubberDark",
      () =>
        new THREE.MeshStandardMaterial({
          color: "#282828",
          roughness: 0.9,
        }),
    );
    function box(
      w: number,
      h: number,
      d: number,
      r: number,
      mat: THREE.Material,
      x = 0,
      y = 0,
      z = 0,
      parent: THREE.Object3D = root,
    ) {
      const m = new THREE.Mesh(
        shared(
          `rounded:${w}:${h}:${d}:${r}`,
          () => new RoundedBoxGeometry(w, h, d, 3, r),
        ),
        mat,
      );
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      parent.add(m);
      return m;
    }
    const body = new THREE.Group();
    root.add(body);
    box(4.25, 2.62, 1.7, 0.28, rubber, 0, 0, 0, body);
    const weave = fabricTexture();
    const fabric = shared(
      "material:fabric",
      () =>
        new THREE.MeshStandardMaterial({
          color: "#adadad",
          map: weave,
          bumpMap: weave,
          bumpScale: 0.018,
          roughness: 0.96,
        }),
    );
    const front = new THREE.Group();
    root.add(front);
    box(4.05, 2.42, 0.09, 0.22, fabric, 0, 0, 0.882, front);
    const brandTex = brandTexture(brandPixels);
    const brand = new THREE.Mesh(
      shared(
        "PlaneGeometry:0.77, 0.193",
        () => new THREE.PlaneGeometry(0.77, 0.193),
      ),
      new THREE.MeshBasicMaterial({
        map: brandTex,
        transparent: true,
        depthWrite: false,
      }),
    );
    brand.position.set(-1.33, -0.84, 0.939);
    front.add(brand);
    // The knurled dial turns as one piece (it is the swing control).
    const dialGroup = new THREE.Group();
    dialGroup.position.set(1.05, 1.4, 0.05);
    body.add(dialGroup);
    const dial = new THREE.Mesh(
      shared(
        "CylinderGeometry:0.25, 0.25, 0.18, 64",
        () => new THREE.CylinderGeometry(0.25, 0.25, 0.18, 64),
      ),
      metal,
    );
    dial.castShadow = true;
    dialGroup.add(dial);
    const notches = new THREE.InstancedMesh(
      shared("knurl", () => new THREE.BoxGeometry(0.011, 0.12, 0.012)),
      rubberDark,
      48,
    );
    const notch = new THREE.Object3D();
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      notch.position.set(Math.sin(a) * 0.251, 0, Math.cos(a) * 0.251);
      notch.rotation.y = a;
      notch.updateMatrix();
      notches.setMatrixAt(i, notch.matrix);
    }
    dialGroup.add(notches);
    const marker = new THREE.Mesh(
      new THREE.BoxGeometry(0.022, 0.004, 0.11),
      black,
    );
    marker.position.set(0, 0.092, 0.08);
    dialGroup.add(marker);
    const keys = Array.from({ length: 3 }, (_, i) =>
      box(0.23, 0.09, 0.18, 0.035, black, -1.1 + i * 0.45, 1.345, -0.08, body),
    );
    const ledIdle = new THREE.Color("#d6ef43");
    const ledLive = new THREE.Color("#ee512d");
    const ledMaterial = new THREE.MeshBasicMaterial({ color: ledIdle });
    const led = new THREE.Mesh(
      shared(
        "SphereGeometry:0.03, 16, 16",
        () => new THREE.SphereGeometry(0.03, 16, 16),
      ),
      ledMaterial,
    );
    led.position.set(0.3, 1.326, -0.08);
    body.add(led);
    box(2.82, 1.62, 0.055, 0.24, black, 0, 0, -0.865, body);
    box(0.49, 0.2, 0.02, 0.05, rubberDark, 0, -0.64, -0.91, body);
    box(0.22, 0.08, 0.02, 0.025, metal, 0, -0.64, -0.925, body);
    for (const x of [-1.35, 1.35])
      box(0.6, 0.11, 0.65, 0.045, rubberDark, x, -1.34, 0, body);
    const attach = new THREE.Mesh(
      shared(
        "CylinderGeometry:0.2, 0.2, 0.06, 40",
        () => new THREE.CylinderGeometry(0.2, 0.2, 0.06, 40),
      ),
      black,
    );
    attach.rotation.z = Math.PI / 2;
    attach.position.set(2.15, 0.3, 0);
    body.add(attach);
    const strapCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(2.16, 0.35, 0),
      new THREE.Vector3(2.9, 0.17, 0.03),
      new THREE.Vector3(3.1, -0.35, 0.06),
      new THREE.Vector3(2.8, -0.65, 0.08),
      new THREE.Vector3(2.3, -0.1, 0.02),
      new THREE.Vector3(2.16, 0.3, 0),
    ]);
    const strap = new THREE.Mesh(
      shared(
        "strap",
        () => new THREE.TubeGeometry(strapCurve, 64, 0.078, 8, false),
      ),
      fabric,
    );
    strap.castShadow = true;
    body.add(strap);
    const drivers = new THREE.Group();
    root.add(drivers);
    for (const x of [-0.98, 0.98]) {
      const plate = new THREE.Mesh(
        shared(
          "CylinderGeometry:0.86, 0.86, 0.12, 64",
          () => new THREE.CylinderGeometry(0.86, 0.86, 0.12, 64),
        ),
        black,
      );
      plate.rotation.x = Math.PI / 2;
      plate.position.set(x, 0, 0.95);
      drivers.add(plate);
      const ring = new THREE.Mesh(
        shared(
          "TorusGeometry:0.73, 0.075, 12, 64",
          () => new THREE.TorusGeometry(0.73, 0.075, 12, 64),
        ),
        rubberDark,
      );
      ring.position.set(x, 0, 1.035);
      drivers.add(ring);
      const cone = new THREE.Mesh(
        shared(
          "ConeGeometry:0.69, 0.22, 64",
          () => new THREE.ConeGeometry(0.69, 0.22, 64),
        ),
        new THREE.MeshStandardMaterial({
          color: "#393b3a",
          metalness: 0.5,
          roughness: 0.4,
        }),
      );
      cone.rotation.x = -Math.PI / 2;
      cone.position.set(x, 0, 1.02);
      drivers.add(cone);
      const cap = new THREE.Mesh(
        shared(
          "SphereGeometry:0.26, 32, 16",
          () => new THREE.SphereGeometry(0.26, 32, 16),
        ),
        black,
      );
      cap.scale.z = 0.36;
      cap.position.set(x, 0, 1.15);
      drivers.add(cap);
    }
    drivers.visible = false;

    // Only geometry that never moves relative to the enclosure is merged.
    const fixed = body.children.filter(
      (mesh): mesh is THREE.Mesh =>
        mesh instanceof THREE.Mesh && !keys.includes(mesh) && mesh !== led,
    );
    const batches = new Map<THREE.Material, THREE.Mesh[]>();
    for (const mesh of fixed) {
      if (Array.isArray(mesh.material)) continue;
      const group = batches.get(mesh.material) || [];
      group.push(mesh);
      batches.set(mesh.material, group);
    }
    for (const [material, meshes] of batches) {
      if (meshes.length < 2) continue;
      const geometry = shared(`body:${material.uuid}`, () => {
        const clones = meshes.map((mesh) => {
          mesh.updateMatrix();
          const geometry = mesh.geometry.index
            ? mesh.geometry.toNonIndexed()
            : mesh.geometry.clone();
          return geometry.applyMatrix4(mesh.matrix);
        });
        const merged = mergeGeometries(clones, false)!;
        clones.forEach((g) => g.dispose());
        return merged;
      });
      meshes.forEach((mesh) => body.remove(mesh));
      body.add(new THREE.Mesh(geometry, material));
    }
    const idleStep = new THREE.Color("#434936");
    const activeStep = new THREE.Color("#d6ef43");
    const currentStep = new THREE.Color("#ee512d");
    const sockets = new THREE.InstancedMesh(
      shared(
        "socket",
        () => new THREE.CylinderGeometry(0.077, 0.077, 0.028, 20),
      ),
      black,
      8,
    );
    const diffusers = new THREE.InstancedMesh(
      shared("diffuser", () => new THREE.SphereGeometry(0.058, 16, 12)),
      shared(
        "step:diffuser",
        () =>
          new THREE.MeshBasicMaterial({ color: "white", toneMapped: false }),
      ),
      8,
    );
    const ledTransform = new THREE.Object3D();
    const strip = Array.from({ length: 8 }, (_, i) => {
      ledTransform.position.set(-1.53 + i * 0.437, 1.045, 0.94);
      ledTransform.rotation.x = Math.PI / 2;
      ledTransform.scale.set(1, 1, 1);
      ledTransform.updateMatrix();
      sockets.setMatrixAt(i, ledTransform.matrix);
      const point = new THREE.Object3D();
      point.position.copy(ledTransform.position);
      point.position.z += 0.02;
      body.add(point);
      ledTransform.position.copy(point.position);
      ledTransform.rotation.x = 0;
      ledTransform.scale.z = 0.24;
      ledTransform.updateMatrix();
      diffusers.setMatrixAt(i, ledTransform.matrix);
      diffusers.setColorAt(i, idleStep);
      return point;
    });
    body.add(sockets, diffusers);
    const ground = new THREE.Mesh(
      shared("ground", () => new THREE.PlaneGeometry(6.5, 3.4)),
      shared(
        "shadow",
        () =>
          new THREE.MeshBasicMaterial({
            map: contactTexture(),
            transparent: true,
            depthWrite: false,
            toneMapped: false,
          }),
      ),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.46;
    scene.add(ground);
    let warming = true;
    let yaw = -0.44,
      pitch = 0.05,
      phase = Number(state.exploded),
      frame = 0,
      prev = 0,
      disposed = false,
      first = true;
    let thump = 0,
      glow = 0,
      current = -1,
      active = Array(8).fill(false) as boolean[];
    let stripDirty = true;
    const keyHits = [-Infinity, -Infinity, -Infinity];
    let dialAngle = (-(state.swing - 50) * Math.PI) / 180,
      dialVelocity = 0;
    let dialChanged = performance.now(),
      colorChanged = performance.now(),
      phaseChanged = performance.now();
    const desired = new THREE.Color();
    const vector = new THREE.Vector3();
    const keyStart = new THREE.Vector3();
    const keyEnd = new THREE.Vector3();
    let lastDialX = NaN,
      lastDialY = NaN;
    function project(point: THREE.Vector3) {
      vector.copy(point).project(camera);
      return {
        x: ((vector.x + 1) * state.width) / 2,
        y: ((1 - vector.y) * state.height) / 2,
      };
    }
    function world(mesh: THREE.Object3D) {
      return mesh.getWorldPosition(new THREE.Vector3());
    }
    function wake(continuing = false) {
      if (!disposed && !warming && state.visible && !frame) {
        // An on-demand renderer can sleep for seconds. Only elapsed animation
        // time belongs in damping: do not spend a stale 40ms on the first frame.
        if (!continuing) prev = performance.now();
        frame = requestAnimationFrame(render);
      }
    }
    function resize() {
      renderer.setSize(
        Math.max(1, state.width),
        Math.max(1, state.height),
        false,
      );
      camera.aspect = state.width / Math.max(1, state.height);
      camera.updateProjectionMatrix();
    }
    function render(time: number) {
      frame = 0;
      if (disposed || !state.visible) return;
      // RAF timestamps identify frame start and may slightly precede wake().
      const dt = Math.max(0, Math.min((time - prev) / 1000, 0.04));
      prev = time;
      const immediate = state.reduced || state.instant;
      const k = immediate ? 1 : 1 - Math.exp(-dt * 11);
      desired.set(state.color);
      rubber.color.lerp(desired, time - colorChanged >= 480 ? 1 : k);
      const phaseTarget = Number(state.exploded);
      phase =
        immediate || time - phaseChanged >= (state.exploded ? 550 : 350)
          ? phaseTarget
          : THREE.MathUtils.lerp(
              phase,
              phaseTarget,
              1 - Math.exp(-dt * (state.exploded ? 14 : 20)),
            );
      body.position.z = -phase * 0.55;
      front.position.z = phase * 1.7;
      // Move the detached grille out of the sightline of the drivers it reveals.
      front.position.x = -phase * 1.45;
      front.position.y = -phase * 0.55;
      front.rotation.y = -phase * 0.25;
      // Closed cones sit behind the grille instead of appearing through it at
      // the first visible explode frame. The open position is unchanged.
      drivers.position.z = -0.32 + phase * 0.77;
      drivers.visible = phase > 0.025;
      const baseZ =
        (state.compact ? 9.8 : state.width < 430 ? 10.7 : 9.4) / state.zoom;
      const narrow = state.width < 430;
      camera.position.set(
        0,
        3.1 + phase * 0.5,
        baseZ + phase * (narrow ? 5.5 : 3.2),
      );
      camera.lookAt(narrow ? -phase * 0.45 : 0, 0.05 - phase * 0.15, 0);
      root.rotation.y = THREE.MathUtils.lerp(
        root.rotation.y,
        yaw + state.rotation,
        k,
      );
      root.rotation.x = THREE.MathUtils.lerp(root.rotation.x, pitch, k);
      const dialTarget = (-(state.swing - 50) * Math.PI) / 180;
      if (immediate || time - dialChanged >= 120) {
        dialAngle = dialTarget;
        dialVelocity = 0;
      } else {
        const next = spring(dialAngle, dialVelocity, dialTarget, dt);
        dialAngle = next.position;
        dialVelocity = next.velocity;
      }
      dialGroup.rotation.y = dialAngle;
      thump *= Math.exp(-dt * 25);
      glow *= Math.exp(-dt * 12);
      if (thump < 0.001 || state.reduced) thump = 0;
      if (glow < 0.001) glow = 0;
      const squash = 1 - 0.04 * thump;
      root.scale.set(1 + 0.016 * thump, squash, 1 + 0.016 * thump);
      root.position.y = -1.4 * (1 - squash);
      ledMaterial.color.copy(ledIdle).lerp(ledLive, Math.min(1, glow * 1.4));
      // Key projection only needs the enclosure transform; the renderer updates
      // every child once after key positions are final.
      body.updateWorldMatrix(true, false);
      camera.updateMatrixWorld();
      for (let i = 0; i < keys.length; i++) {
        keys[i].position.y = 1.345;
        const depth = state.reduced ? 0 : keyDepth(time - keyHits[i]);
        if (!depth) continue;
        // Transform only these two points, rather than traversing the entire body
        // once for every key on every frame (including frames with no key press).
        keyStart.copy(keys[i].position).applyMatrix4(body.matrixWorld);
        keyEnd.copy(keys[i].position);
        keyEnd.y -= 1;
        keyEnd.applyMatrix4(body.matrixWorld);
        const a = project(keyStart),
          b = project(keyEnd);
        const travel = Math.max(
          0.037,
          2.2 / Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
        );
        keys[i].position.y -= travel * depth;
      }
      if (stripDirty) {
        strip.forEach((_, i) =>
          diffusers.setColorAt(
            i,
            i === current ? currentStep : active[i] ? activeStep : idleStep,
          ),
        );
        if (diffusers.instanceColor) diffusers.instanceColor.needsUpdate = true;
        stripDirty = false;
      }
      if (first) {
        // A corner scissor misses all driver fragments and cannot warm their GPU
        // pipeline. Draw actual visible fragments behind the loading poster, then
        // repaint the final assembled view within this same animation callback.
        const shown = drivers.visible;
        drivers.visible = true;
        body.visible = false;
        front.visible = false;
        renderer.render(scene, camera);
        body.visible = true;
        front.visible = true;
        drivers.visible = shown;
      }
      renderer.render(scene, camera);
      if (state.diagnostics) {
        const leds = strip.map((mesh) => {
          const center = world(mesh),
            point = project(center),
            edge = project(center.clone().add(new THREE.Vector3(0.058, 0, 0)));
          return {
            ...point,
            radius: Math.hypot(edge.x - point.x, edge.y - point.y),
          };
        });
        emit({
          type: "frame",
          frame: {
            step: current,
            active,
            dial: project(world(dialGroup)),
            leds,
            keys: keys.map((mesh) => project(world(mesh))),
            drawCalls: renderer.info.render.calls,
            triangles: renderer.info.render.triangles,
            swing: state.swing,
            phase,
            orientation: { yaw: root.rotation.y, pitch: root.rotation.x },
          },
        });
      } else if (state.interactiveDial) {
        const point = project(world(dialGroup));
        // Only the studio needs a projected DOM hit target. Other stages send no
        // per-frame traffic; QA-only LED/key projections never run in production.
        if (
          Math.abs(point.x - lastDialX) > 0.1 ||
          Math.abs(point.y - lastDialY) > 0.1 ||
          !Number.isFinite(lastDialX)
        ) {
          lastDialX = point.x;
          lastDialY = point.y;
          emit({ type: "dial", point });
        }
      }
      if (first) {
        first = false;
        emit({ type: "ready" });
      }
      state.instant = false;
      const settling =
        Math.abs(phase - Number(state.exploded)) > 0.0001 ||
        Math.abs(root.rotation.y - yaw - state.rotation) > 0.0001 ||
        Math.abs(root.rotation.x - pitch) > 0.0001 ||
        Math.abs(dialAngle - dialTarget) > 0.00001 ||
        thump > 0 ||
        glow > 0 ||
        (!state.reduced && keyHits.some((hit) => time - hit < 250)) ||
        Math.abs(rubber.color.r - desired.r) +
          Math.abs(rubber.color.g - desired.g) +
          Math.abs(rubber.color.b - desired.b) >
          0.0001;
      if (settling) wake(true);
    }
    function dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frame);
      // Shared geometries/materials live until the last canvas releases the pool.
      const privateGeometries = new Set<THREE.BufferGeometry>();
      const privateMaterials = new Set<THREE.Material>();
      // Scene-private resources are recorded explicitly; pooled resources are released together.
      privateMaterials.add(rubber);
      privateMaterials.add(ledMaterial);
      privateMaterials.add(brand.material);
      for (const mesh of drivers.children)
        if (mesh instanceof THREE.Mesh && mesh.geometry.type === "ConeGeometry")
          privateMaterials.add(mesh.material as THREE.Material);
      privateGeometries.add(marker.geometry);
      privateGeometries.forEach((g) => g.dispose());
      privateMaterials.forEach((m) => m.dispose());
      notches.dispose();
      sockets.dispose();
      diffusers.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      releaseResources();
    }
    const contextLost = (event: Event) => {
      event.preventDefault();
      emit({ type: "error", message: "WebGL context lost" });
      dispose();
    };
    canvas.addEventListener("webglcontextlost", contextLost);
    resize();
    // Compile the driver program without painting an exploded warmup frame.
    drivers.visible = true;
    void renderer
      .compileAsync(scene, camera)
      .then(() => {
        if (!disposed) {
          drivers.visible = false;
          warming = false;
          wake();
        }
      })
      .catch(() => {
        if (!disposed) {
          drivers.visible = false;
          warming = false;
          wake();
        }
      });
    return {
      send(action: SceneAction) {
        if (disposed) return;
        if (action.type === "dispose") {
          canvas.removeEventListener("webglcontextlost", contextLost);
          dispose();
          return;
        }
        if (action.type === "snapshot") {
          renderer.render(scene, camera);
          if ("convertToBlob" in canvas) {
            void canvas
              .convertToBlob({ type: "image/webp", quality: 0.95 })
              .then((blob) => {
                if (!disposed) emit({ type: "poster", blob });
              })
              .catch(() => {});
          } else {
            canvas.toBlob(
              (blob) => {
                if (blob && !disposed) emit({ type: "poster", blob });
              },
              "image/webp",
              0.95,
            );
          }
          return;
        }
        if (action.type === "state") {
          if (
            (action.state.rotation !== undefined &&
              action.state.rotation !== state.rotation) ||
            (action.state.exploded !== undefined &&
              action.state.exploded !== state.exploded)
          ) {
            // A named anatomy view must be predictable after a visitor freely orbits.
            yaw = -0.44;
            pitch = 0.05;
          }
          if (
            action.state.exploded !== undefined &&
            action.state.exploded !== state.exploded
          )
            phaseChanged = performance.now();
          if (
            action.state.color !== undefined &&
            action.state.color !== state.color
          )
            colorChanged = performance.now();
          if (
            action.state.swing !== undefined &&
            action.state.swing !== state.swing
          )
            dialChanged = performance.now();
          const size =
            action.state.width !== undefined ||
            action.state.height !== undefined;
          Object.assign(state, action.state);
          if (size) resize();
        } else if (action.type === "rotate") {
          yaw += action.dx;
          pitch = THREE.MathUtils.clamp(pitch + action.dy, -0.3, 0.45);
          state.instant = Boolean(action.instant);
        } else if (action.type === "home") {
          yaw = -0.44;
          pitch = 0.05;
          state.instant = true;
        } else if (action.type === "pattern") {
          active = activeSteps(action.pattern);
          stripDirty = true;
        } else if (action.type === "beat") {
          current = action.beat.step;
          stripDirty = true;
          const hit = action.beat.tracks;
          if (hit[0] && !state.reduced) thump = 1;
          if (hit.some(Boolean)) glow = 1;
          [hit[0], hit[1], hit[2] || hit[3]].forEach((on, i) => {
            if (on) keyHits[i] = performance.now();
          });
        } else if (action.type === "stop") {
          current = -1;
          stripDirty = true;
          thump = 0;
          glow = 0;
          keyHits.fill(-Infinity);
        }
        wake();
      },
    };
  } catch (error) {
    renderer.dispose();
    renderer.forceContextLoss();
    releaseResources();
    throw error;
  }
}
