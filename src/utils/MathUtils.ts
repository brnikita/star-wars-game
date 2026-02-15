import * as THREE from 'three';

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerpVec3(out: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3, t: number): THREE.Vector3 {
  out.x = lerp(a.x, b.x, t);
  out.y = lerp(a.y, b.y, t);
  out.z = lerp(a.z, b.z, t);
  return out;
}

export function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function degToRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function distanceXZ(a: THREE.Vector3, b: THREE.Vector3): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}
