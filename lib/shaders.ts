import * as THREE from "three";
import { FLARE, FUNNEL_RADIUS, MAX_DEPTH, SKY_CENTER_Y, SKY_COUNT, SKY_GAP, THROAT_RADIUS, TUBE_FRACTION } from "./physics";

/**
 * GPU line materials for the spacetime grid and the Seven Skies.
 *
 * Both are drawn as *static* line geometry: the vertex shader bends them every
 * frame from a couple of uniforms (mass; expand/fold), so the CPU never
 * rewrites or re-uploads vertex buffers. Constants come from `physics.ts`,
 * which stays the single source of truth.
 */
const f = (n: number) => n.toFixed(5);

const FRAGMENT = /* glsl */ `
  #include <fog_pars_fragment>
  varying vec3 vColor;
  void main() {
    gl_FragColor = vec4(vColor, 1.0);
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

/**
 * Spacetime grid. Attributes: `position` = (x, 0, z) at rest, `aProfile` =
 * wellProfile(r) (0 flat … 1 centre), `aEdge` = fade toward the grid edge.
 */
export function createGridMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uMass: { value: 0 },
        uFade: { value: 1 },
        uBase: { value: new THREE.Color("#9fd3ff") },
        uDeep: { value: new THREE.Color("#ffb45a") },
      },
    ]),
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>
      uniform float uMass;
      uniform float uFade;
      uniform vec3 uBase;
      uniform vec3 uDeep;
      attribute float aProfile;
      attribute float aEdge;
      varying vec3 vColor;
      void main() {
        float depth = clamp(uMass * aProfile, 0.0, 1.0);
        vColor = mix(uBase, uDeep, pow(depth, 0.7)) * (0.32 + 1.1 * depth) * aEdge * uFade;
        vec4 mvPosition = modelViewMatrix * vec4(position.x, -${f(MAX_DEPTH)} * depth, position.z, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: FRAGMENT,
    fog: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
}

/**
 * Seven Skies. Attributes: `position` = (restRadius, angle, skyIndex),
 * `aTint` = the sky's tint already multiplied by its edge fade.
 *
 * The fold mirrors the original CPU version: the inner disc of every sky is
 * stretched into a Flamm-paraboloid-like funnel that turns into a vertical
 * tube. Skies below the middle stretch upward and those above stretch
 * downward, so together their tubes overlap into one continuous tunnel.
 */
export function createSkiesMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uExpand: { value: 0 }, uFold: { value: 0 } }]),
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>
      uniform float uExpand;
      uniform float uFold;
      attribute vec3 aTint;
      varying vec3 vColor;

      const float CY = ${f(SKY_CENTER_Y)};
      const float GAP = ${f(SKY_GAP)};
      const float MID = ${f((SKY_COUNT - 1) / 2)};
      const float FR = ${f(FUNNEL_RADIUS)};
      const float TR = ${f(THROAT_RADIUS)};
      const float TF = ${f(TUBE_FRACTION)};
      const float FL = ${f(FLARE)};

      void main() {
        float r0 = position.x;
        float th = position.y;
        float h = CY + (position.z - MID) * GAP * uExpand;
        float r = r0;
        float y = h;
        float s = r0 / FR;
        if (uFold > 0.0 && s < 1.0) {
          float dir = sign(CY - h);
          float reach = abs(CY - h);
          float flare = min(FL, reach);
          float fr;
          float fy;
          if (s >= TF) {
            float t = (s - TF) / (1.0 - TF);
            fr = TR + (FR - TR) * t * t;
            fy = h + dir * flare * (1.0 - sqrt(t));
          } else {
            float t = s / TF;
            fr = TR;
            fy = h + dir * (flare + (reach - flare) * (1.0 - t));
          }
          // Points nearer the centre move later, so the pinch runs inward like a drain.
          float delay = (1.0 - s) * 0.35;
          float l = clamp((uFold - delay) / (1.0 - delay), 0.0, 1.0);
          float k = l * l * (3.0 - 2.0 * l);
          r = mix(r0, fr, k);
          y = mix(h, fy, k);
        }
        // Seven tubes overlap in the throat, so the fabric there is dimmed to keep the
        // tunnel readable; the funnel lips glow brighter as they are stretched.
        float tube = s < TF ? 1.0 - 0.8 * uFold : 1.0;
        float lip = (s >= TF && s < 1.0) ? uFold * 0.45 * (1.0 - (s - TF) / (1.0 - TF)) : 0.0;
        float fadeIn = uExpand * uExpand * (3.0 - 2.0 * uExpand);
        vColor = aTint * fadeIn * (0.42 * tube + lip);
        vec4 mvPosition = modelViewMatrix * vec4(cos(th) * r, y, sin(th) * r, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: FRAGMENT,
    fog: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
}
