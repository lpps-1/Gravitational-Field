import * as THREE from "three";
import { FLARE, FUNNEL_RADIUS, MAX_DEPTH, SKY_CENTER_Y, SKY_COUNT, SKY_GAP, THROAT_RADIUS, TUBE_FRACTION } from "./physics";
import { DENT_REACH, DENTS, FABRIC_RADIUS, FABRIC_Y, SUN_WELL_DEPTH, SUN_WELL_WIDTH } from "./fabric";

/**
 * GPU line materials for the spacetime grid, the Seven Skies and the Solar
 * System's gravity fabric.
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


/**
 * Solar System gravity fabric (lib/fabric.ts). Shared by the sheet and the
 * rings around each planet: `uDents` = each planet's (x, z, depth, width),
 * moved every frame; `uHues` = each planet's colour; `uGrow` sinks the wells
 * in as the fabric is switched on, `uFade` lights it. `fabricDepth(xz, tint)`
 * matches fabricDepth() in lib/fabric.ts and adds each dent's colour to tint.
 */
const FABRIC_COMMON = /* glsl */ `
  uniform vec4 uDents[${DENTS.length}];
  uniform vec3 uHues[${DENTS.length}];
  uniform float uGrow;
  uniform float uFade;
  varying vec3 vColor;

  // A dent is flat again at DENT_REACH widths, so its edge term is the same for every planet.
  const float DENT_EDGE = ${f(1 / Math.hypot(DENT_REACH, 1))};
  const float SUN_W = ${f(SUN_WELL_WIDTH)};
  const float SUN_EDGE = ${f(SUN_WELL_WIDTH / Math.hypot(FABRIC_RADIUS, SUN_WELL_WIDTH))};

  float dentShape(float d, float s) {
    return max(0.0, (s / length(vec2(d, s)) - DENT_EDGE) / (1.0 - DENT_EDGE));
  }
  float sunWell(vec2 xz) {
    return max(0.0, (SUN_W / length(vec2(length(xz), SUN_W)) - SUN_EDGE) / (1.0 - SUN_EDGE));
  }
  float fabricDepth(vec2 xz, out vec3 tint) {
    float depth = ${f(SUN_WELL_DEPTH)} * sunWell(xz);
    tint = vec3(0.0);
    for (int i = 0; i < ${DENTS.length}; i++) {
      float k = dentShape(distance(xz, uDents[i].xy), uDents[i].w);
      depth += uDents[i].z * k;
      tint += uHues[i] * k;
    }
    return depth;
  }
  vec4 fabricPosition(vec2 xz, float depth) {
    return projectionMatrix * modelViewMatrix * vec4(xz.x, ${f(FABRIC_Y)} - depth * uGrow, xz.y, 1.0);
  }
`;

function fabricUniforms() {
  return {
    uDents: { value: DENTS.map(() => new THREE.Vector4()) },
    uHues: { value: DENTS.map(() => new THREE.Color()) },
    uGrow: { value: 0 },
    uFade: { value: 0 },
  };
}

/**
 * The sheet. Attributes: `position` = (x, 0, z) at rest, `aEdge` = fade
 * toward the rim. Blue where flat, amber deep in the Sun's well, and each
 * planet's colour in its dent.
 */
export function createFabricMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { ...fabricUniforms(), uBase: { value: new THREE.Color("#9fd3ff") }, uDeep: { value: new THREE.Color("#ffb45a") } },
    vertexShader: /* glsl */ `
      ${FABRIC_COMMON}
      uniform vec3 uBase;
      uniform vec3 uDeep;
      attribute float aEdge;
      void main() {
        vec3 tint;
        float depth = fabricDepth(position.xz, tint);
        float sun = sunWell(position.xz);
        vColor = (mix(uBase, uDeep, pow(sun, 0.7)) * (0.18 + 0.95 * sun) + tint * 0.95) * aEdge * uFade;
        gl_Position = fabricPosition(position.xz, depth);
      }
    `,
    fragmentShader: FRAGMENT,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
}

/**
 * Rings and spokes around each planet, in its colour, that sink into its
 * dent and travel with it: they make even Mercury's small dent easy to see.
 * Attributes: `position` = (dx, 0, dz) from the planet, `aPlanet` = its
 * index, `aFade` = fade toward the dent's edge.
 */
export function createDentRingsMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: fabricUniforms(),
    vertexShader: /* glsl */ `
      ${FABRIC_COMMON}
      attribute float aPlanet;
      attribute float aFade;
      void main() {
        int i = int(aPlanet + 0.5);
        vec2 xz = uDents[i].xy + position.xz;
        vec3 tint;
        float depth = fabricDepth(xz, tint);
        float own = dentShape(length(position.xz), uDents[i].w);
        vColor = uHues[i] * (0.3 + 1.1 * own) * aFade * uFade;
        gl_Position = fabricPosition(xz, depth);
      }
    `,
    fragmentShader: FRAGMENT,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
}
