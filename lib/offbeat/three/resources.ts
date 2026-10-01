import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { BrandPixels } from "./protocol";
let owners = 0;
const resources = new Map<
  string,
  THREE.BufferGeometry | THREE.Material | THREE.Texture
>();
export function shared<
  T extends THREE.BufferGeometry | THREE.Material | THREE.Texture,
>(key: string, make: () => T): T {
  if (!resources.has(key)) resources.set(key, make());
  return resources.get(key) as T;
}
export function acquireResources() {
  owners++;
}
export function releaseResources() {
  if (--owners > 0) return;
  for (const resource of resources.values()) resource.dispose();
  resources.clear();
  owners = 0;
}
export function environment(renderer: THREE.WebGLRenderer) {
  return shared("environment", () => {
    const generator = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const target = generator.fromScene(room, 0.04);
    // Copy the GPU result to CPU-backed half floats once. Unlike a render-target
    // texture, this source can be uploaded safely into every canvas/context.
    const pixels = new Uint16Array(target.width * target.height * 4);
    renderer.readRenderTargetPixels(
      target,
      0,
      0,
      target.width,
      target.height,
      pixels,
    );
    const texture = new THREE.DataTexture(
      pixels,
      target.width,
      target.height,
      THREE.RGBAFormat,
      THREE.HalfFloatType,
    );
    texture.mapping = THREE.CubeUVReflectionMapping;
    texture.minFilter = texture.magFilter = THREE.LinearFilter;
    texture.colorSpace = THREE.LinearSRGBColorSpace;
    texture.needsUpdate = true;
    target.dispose();
    room.dispose();
    generator.dispose();
    return texture;
  });
}
export function brandTexture(brand: BrandPixels) {
  return shared("brand", () => {
    const texture = new THREE.DataTexture(
      new Uint8Array(brand.data),
      brand.width,
      brand.height,
    );
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = true;
    texture.needsUpdate = true;
    return texture;
  });
}
export function contactTexture() {
  return shared("contact", () => {
    const size = 128,
      pixels = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const r = Math.hypot((x - 63.5) / 64, (y - 63.5) / 64);
        pixels[(y * size + x) * 4 + 3] = Math.round(
          40 * Math.exp(-5 * r * r) * Math.max(0, 1 - r),
        );
      }
    const texture = new THREE.DataTexture(pixels, size, size);
    texture.needsUpdate = true;
    return texture;
  });
}
export function fabricTexture() {
  return shared("weave", () => {
    const size = 128,
      pixels = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const tileX = Math.floor(x / 4) * 4,
          tileY = Math.floor(y / 4) * 4;
        const shift = tileY % 8 === 0 ? 1 : 0,
          xx = x % 4,
          yy = y % 4;
        let value = 34,
          green = 35,
          blue = 33;
        if (xx >= shift && xx < shift + 2 && yy < 3) {
          value = 42 + ((tileX * 17 + tileY * 7) % 25);
          green = blue = value;
        }
        if (xx === 2 && yy < 2) {
          value = blue = 17;
          green = 18;
        }
        const index = (y * size + x) * 4;
        pixels[index] = value;
        pixels[index + 1] = green;
        pixels[index + 2] = blue;
        pixels[index + 3] = 255;
      }
    const texture = new THREE.DataTexture(pixels, size, size);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = true;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 5);
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
    return texture;
  });
}
