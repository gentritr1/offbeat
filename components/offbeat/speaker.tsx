"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
type Props = {
  color: string;
  exploded?: boolean;
  rotation?: number;
  compact?: boolean;
};
export default function Speaker({
  color,
  exploded = false,
  rotation = 0,
  compact = false,
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const wake = useRef<() => void>(() => {});
  const target = useRef({ color, exploded, rotation });
  target.current = { color, exploded, rotation };
  const [failed, setFailed] = useState(false);
  useEffect(() => wake.current(), [color, exploded, rotation]);
  useEffect(() => {
    if (!host.current) return;
    const node = host.current;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    node.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 3.1, 9.2);
    camera.lookAt(0, 0.05, 0);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, 0.04);
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.75;
    room.dispose();
    pmrem.dispose();
    scene.add(new THREE.HemisphereLight(0xffffff, 0xc4c1bb, 2));
    const key = new THREE.DirectionalLight(0xffffff, 4);
    key.position.set(-4, 8, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -6;
    key.shadow.camera.right = 6;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -6;
    key.shadow.normalBias = 0.025;
    key.shadow.bias = -0.0001;
    key.shadow.radius = 4;
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
      color: target.current.color,
      roughness: 0.58,
      metalness: 0.02,
    });
    const black = new THREE.MeshStandardMaterial({
      color: "#1c1d1d",
      roughness: 0.65,
    });
    const metal = new THREE.MeshStandardMaterial({
      color: "#c5c9c8",
      metalness: 0.95,
      roughness: 0.27,
    });
    const rubberDark = new THREE.MeshStandardMaterial({
      color: "#282828",
      roughness: 0.9,
    });
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
      const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 5, r), mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      parent.add(m);
      return m;
    }
    const body = new THREE.Group();
    root.add(body);
    box(4.25, 2.62, 1.7, 0.28, rubber, 0, 0, 0, body);
    const fabricCanvas = document.createElement("canvas");
    fabricCanvas.width = 128;
    fabricCanvas.height = 128;
    const fc = fabricCanvas.getContext("2d")!;
    fc.fillStyle = "#222321";
    fc.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 4) {
      for (let x = 0; x < 128; x += 4) {
        const b = 42 + ((x * 17 + y * 7) % 25);
        fc.fillStyle = `rgb(${b},${b},${b})`;
        fc.fillRect(x + (y % 8 === 0 ? 1 : 0), y, 2, 3);
        fc.fillStyle = "#111211";
        fc.fillRect(x + 2, y, 1, 2);
      }
    }
    const weave = new THREE.CanvasTexture(fabricCanvas);
    weave.colorSpace = THREE.SRGBColorSpace;
    weave.wrapS = weave.wrapT = THREE.RepeatWrapping;
    weave.repeat.set(8, 5);
    weave.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const fabric = new THREE.MeshStandardMaterial({
      color: "#adadad",
      map: weave,
      bumpMap: weave,
      bumpScale: 0.018,
      roughness: 0.96,
    });
    const front = new THREE.Group();
    root.add(front);
    box(4.05, 2.42, 0.09, 0.22, fabric, 0, 0, 0.882, front);
    const brandCanvas = document.createElement("canvas");
    brandCanvas.width = 512;
    brandCanvas.height = 128;
    const bc = brandCanvas.getContext("2d")!;
    bc.font = "600 76px Helvetica, Arial";
    bc.fillStyle = "#ededdf";
    bc.fillText("offbeat", 15, 88);
    const brandTex = new THREE.CanvasTexture(brandCanvas);
    brandTex.colorSpace = THREE.SRGBColorSpace;
    const brand = new THREE.Mesh(
      new THREE.PlaneGeometry(0.77, 0.193),
      new THREE.MeshBasicMaterial({
        map: brandTex,
        transparent: true,
        depthWrite: false,
      }),
    );
    brand.position.set(-1.33, -0.84, 0.939);
    front.add(brand);
    const dial = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 0.18, 64),
      metal,
    );
    dial.position.set(1.05, 1.4, 0.05);
    dial.castShadow = true;
    body.add(dial);
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const notch = new THREE.Mesh(
        new THREE.BoxGeometry(0.011, 0.12, 0.012),
        rubberDark,
      );
      notch.position.set(
        1.05 + Math.sin(a) * 0.251,
        1.4,
        0.05 + Math.cos(a) * 0.251,
      );
      notch.rotation.y = a;
      body.add(notch);
    }
    const marker = new THREE.Mesh(
      new THREE.BoxGeometry(0.022, 0.004, 0.11),
      black,
    );
    marker.position.set(1.05, 1.492, 0.13);
    body.add(marker);
    for (let i = 0; i < 3; i++)
      box(0.23, 0.03, 0.18, 0.035, black, -1.1 + i * 0.45, 1.315, -0.08, body);
    const led = new THREE.Mesh(
      new THREE.SphereGeometry(0.024, 12, 12),
      new THREE.MeshBasicMaterial({ color: "#d6ef43" }),
    );
    led.position.set(0.3, 1.326, -0.08);
    body.add(led);
    box(2.82, 1.62, 0.055, 0.24, black, 0, 0, -0.865, body);
    box(0.49, 0.2, 0.02, 0.05, rubberDark, 0, -0.64, -0.91, body);
    box(0.22, 0.08, 0.02, 0.025, metal, 0, -0.64, -0.925, body);
    for (const x of [-1.35, 1.35])
      box(0.6, 0.11, 0.65, 0.045, rubberDark, x, -1.34, 0, body);
    const attach = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.06, 40),
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
      new THREE.TubeGeometry(strapCurve, 64, 0.078, 8, false),
      fabric,
    );
    strap.castShadow = true;
    body.add(strap);
    const drivers = new THREE.Group();
    root.add(drivers);
    for (const x of [-0.98, 0.98]) {
      const plate = new THREE.Mesh(
        new THREE.CylinderGeometry(0.86, 0.86, 0.12, 64),
        black,
      );
      plate.rotation.x = Math.PI / 2;
      plate.position.set(x, 0, 0.95);
      drivers.add(plate);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.73, 0.075, 12, 64),
        rubberDark,
      );
      ring.position.set(x, 0, 1.035);
      drivers.add(ring);
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.69, 0.22, 64),
        new THREE.MeshStandardMaterial({
          color: "#393b3a",
          metalness: 0.5,
          roughness: 0.4,
        }),
      );
      cone.rotation.x = -Math.PI / 2;
      cone.position.set(x, 0, 1.02);
      drivers.add(cone);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.26, 32, 16), black);
      cap.scale.z = 0.36;
      cap.position.set(x, 0, 1.15);
      drivers.add(cap);
    }
    drivers.visible = false;
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.ShadowMaterial({ opacity: 0.16 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.48;
    ground.receiveShadow = true;
    scene.add(ground);
    let yaw = -0.44,
      pitch = 0.05,
      pointer: number | null = null,
      lastX = 0,
      lastY = 0,
      seen = true,
      frame = 0,
      phase = 0,
      prev = 0;
    let instant = false;
    let lost = false;
    const desiredColor = new THREE.Color();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    function resize() {
      if (!node.clientWidth || !node.clientHeight) return;
      const w = node.clientWidth,
        h = node.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.position.z = compact ? 9.8 : w < 430 ? 10.7 : 9.4;
      camera.updateProjectionMatrix();
      requestRender();
    }
    const observer = new ResizeObserver(resize);
    observer.observe(node);
    resize();
    const visibility = new IntersectionObserver(
      (entries) => {
        seen = entries[0].isIntersecting;
        requestRender();
      },
      { rootMargin: "100px" },
    );
    visibility.observe(node);
    function render(time: number) {
      frame = 0;
      if (!seen || document.hidden || lost) return;
      const dt = Math.min((time - prev) / 1000, 0.04) || 0.016;
      prev = time;
      const k = reduced.matches || instant ? 1 : 1 - Math.exp(-dt * 11);
      instant = false;
      desiredColor.set(target.current.color);
      rubber.color.lerp(desiredColor, k);
      phase = THREE.MathUtils.lerp(phase, target.current.exploded ? 1 : 0, k);
      body.position.z = -phase * 0.55;
      front.position.z = phase * 1.7;
      drivers.position.z = phase * 0.45;
      drivers.visible = phase > 0.025;
      root.rotation.y = THREE.MathUtils.lerp(
        root.rotation.y,
        yaw + target.current.rotation,
        k,
      );
      root.rotation.x = THREE.MathUtils.lerp(root.rotation.x, pitch, k);
      renderer.render(scene, camera);
      const settling =
        Math.abs(phase - (target.current.exploded ? 1 : 0)) > 0.0001 ||
        Math.abs(root.rotation.y - yaw - target.current.rotation) > 0.0001 ||
        Math.abs(root.rotation.x - pitch) > 0.0001 ||
        Math.abs(rubber.color.r - desiredColor.r) +
          Math.abs(rubber.color.g - desiredColor.g) +
          Math.abs(rubber.color.b - desiredColor.b) >
          0.0001;
      if (settling) requestRender();
    }
    function requestRender() {
      if (seen && !document.hidden && !lost && !frame)
        frame = requestAnimationFrame(render);
    }
    wake.current = requestRender;
    function pointerDown(e: PointerEvent) {
      if (pointer !== null || !e.isPrimary || e.button !== 0) return;
      pointer = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
      node.setPointerCapture(e.pointerId);
    }
    function pointerMove(e: PointerEvent) {
      if (e.pointerId !== pointer) return;
      yaw += (e.clientX - lastX) * 0.008;
      pitch = THREE.MathUtils.clamp(
        pitch + (e.clientY - lastY) * 0.003,
        -0.3,
        0.45,
      );
      lastX = e.clientX;
      lastY = e.clientY;
      requestRender();
    }
    function pointerUp(e: PointerEvent) {
      if (e.pointerId !== pointer) return;
      pointer = null;
      if (node.hasPointerCapture(e.pointerId))
        node.releasePointerCapture(e.pointerId);
    }
    function keyDown(e: KeyboardEvent) {
      if (
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home"].includes(
          e.key,
        )
      ) {
        e.preventDefault();
        if (e.key === "ArrowLeft") yaw -= 0.22;
        if (e.key === "ArrowRight") yaw += 0.22;
        if (e.key === "ArrowUp") pitch -= 0.12;
        if (e.key === "ArrowDown") pitch += 0.12;
        if (e.key === "Home") {
          yaw = -0.44;
          pitch = 0.05;
        }
        pitch = THREE.MathUtils.clamp(pitch, -0.3, 0.45);
        instant = true;
        requestRender();
      }
    }
    function visible() {
      requestRender();
    }
    node.addEventListener("pointerdown", pointerDown);
    node.addEventListener("pointermove", pointerMove);
    node.addEventListener("pointerup", pointerUp);
    node.addEventListener("pointercancel", pointerUp);
    node.addEventListener("lostpointercapture", pointerUp);
    node.addEventListener("keydown", keyDown);
    document.addEventListener("visibilitychange", visible);
    reduced.addEventListener("change", requestRender);
    requestRender();
    const contextLost = (e: Event) => {
      e.preventDefault();
      lost = true;
      cancelAnimationFrame(frame);
      frame = 0;
      setFailed(true);
    };
    renderer.domElement.addEventListener("webglcontextlost", contextLost);
    return () => {
      cancelAnimationFrame(frame);
      wake.current = () => {};
      observer.disconnect();
      visibility.disconnect();
      document.removeEventListener("visibilitychange", visible);
      reduced.removeEventListener("change", requestRender);
      node.removeEventListener("pointerdown", pointerDown);
      node.removeEventListener("pointermove", pointerMove);
      node.removeEventListener("pointerup", pointerUp);
      node.removeEventListener("pointercancel", pointerUp);
      node.removeEventListener("lostpointercapture", pointerUp);
      node.removeEventListener("keydown", keyDown);
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => m.dispose());
        }
      });
      weave.dispose();
      brandTex.dispose();
      environment.dispose();
      key.shadow.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [compact, failed]);
  return failed ? (
    <div className="canvas-fallback">
      <img src="/images/listening-room.webp" alt="OFFBEAT in hot orange" />
      <span>3D is unavailable on this device. Explore the product below.</span>
    </div>
  ) : (
    <div
      ref={host}
      className="speaker-canvas"
      tabIndex={0}
      role="group"
      aria-label="Interactive OFFBEAT speaker. Drag to rotate, or use the arrow keys. Press Home to reset."
    />
  );
}
