"use client";

import * as THREE from "three";
import { TIERS } from "@/lib/quality";
import { useLab } from "@/lib/store";

/**
 * Glow without post-processing. On the light tiers (built-in graphics and
 * software rendering) there is no bloom pass; instead each bright object
 * carries a soft additive sprite. A sprite is one small quad, so the glow
 * costs almost nothing. With bloom on, halos stay hidden.
 */

let texture: THREE.Texture | null = null;

/** Shared radial-falloff texture for every halo. */
export function haloTexture(): THREE.Texture {
  if (texture) return texture;
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.18, "rgba(255,255,255,0.55)");
  g.addColorStop(0.45, "rgba(255,255,255,0.16)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** True when halos should show: glow is on and the current tier has no bloom. */
export function halosEnabled(): boolean {
  const { tier, settings } = useLab.getState();
  return settings.glow && !TIERS[tier].bloom;
}

export function useHalosEnabled(): boolean {
  return useLab((s) => s.settings.glow && !TIERS[s.tier].bloom);
}

/** A halo sprite for objects built imperatively (pools). Toggle `.visible` with `halosEnabled()`. */
export function createHaloSprite(color: THREE.ColorRepresentation, size: number, opacity = 1): THREE.Sprite {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: haloTexture(),
      color,
      opacity,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  sprite.scale.set(size, size, 1);
  sprite.visible = halosEnabled();
  return sprite;
}

/**
 * Declarative halo. Place it inside the glowing object's group so it follows
 * its position, scale and visibility. `size` is the sprite's width in the
 * parent's units; `color` may exceed 1 for a brighter core.
 */
export function Halo({
  color,
  size,
  opacity = 1,
}: {
  color: THREE.ColorRepresentation | [number, number, number];
  size: number;
  opacity?: number;
}) {
  const on = useHalosEnabled();
  return (
    <sprite visible={on} scale={[size, size, 1]}>
      <spriteMaterial
        map={haloTexture()}
        color={color}
        opacity={opacity}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </sprite>
  );
}
