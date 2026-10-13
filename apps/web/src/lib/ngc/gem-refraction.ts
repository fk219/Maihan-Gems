/**
 * BVH ray-traced gem refraction (three-mesh-bvh diamond / MeshRefractionMaterial).
 * Colour is Beer's-law absorption along the internal path, not a flat albedo.
 * Browser only — dynamically imported from the configurator canvas.
 */
import * as THREE from 'three';
import { BVHShaderGLSL, MeshBVH, MeshBVHUniformStruct, SAH } from 'three-mesh-bvh';

import { gemRefractionParams } from './colors.js';
import { buildFacetedGem, parseGemShape, type FacetedGemMesh, type GemShapeId } from './faceted-gem.js';

export { gemRefractionParams };

/** Neutral studio equirect — bright windows on a dark wrap so internal hits sparkle. */
export function createStudioEnvMap(): THREE.CanvasTexture {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('studio env canvas');
  ctx.fillStyle = '#05050a';
  ctx.fillRect(0, 0, width, height);
  const panel = (u0: number, v0: number, u1: number, v1: number, fill: string) => {
    ctx.fillStyle = fill;
    ctx.fillRect(u0 * width, v0 * height, (u1 - u0) * width, (v1 - v0) * height);
  };
  panel(0.3, 0.1, 0.7, 0.32, '#ffffff');
  panel(0.4, 0.04, 0.6, 0.1, '#ffffff');
  panel(0.06, 0.2, 0.16, 0.34, '#f4f4f8');
  panel(0.84, 0.22, 0.94, 0.36, '#fff1d6');
  panel(0.47, 0.16, 0.51, 0.21, '#ffffff');
  panel(0.18, 0.12, 0.205, 0.155, '#ffffff');
  panel(0.78, 0.11, 0.805, 0.145, '#ffffff');
  panel(0.62, 0.08, 0.64, 0.11, '#ffffff');
  panel(0.36, 0.07, 0.38, 0.1, '#ffffff');
  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export function gemBufferGeometry(mesh: FacetedGemMesh): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(mesh.positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

export function buildGemGeometry(shape: string | null | undefined, aspect = 1): {
  geometry: THREE.BufferGeometry;
  mesh: FacetedGemMesh;
  shape: GemShapeId;
} {
  const shapeId = parseGemShape(shape);
  const mesh = buildFacetedGem(shapeId, aspect);
  return { geometry: gemBufferGeometry(mesh), mesh, shape: shapeId };
}

export function createGemRefractionMaterial(options: {
  readonly envMap: THREE.Texture;
  readonly geometry: THREE.BufferGeometry;
  readonly absorptionColor: string;
  readonly stoneType?: string | null;
}): THREE.ShaderMaterial {
  const params = gemRefractionParams(options.stoneType);
  const bvh = new MeshBVH(options.geometry, { strategy: SAH, maxLeafTris: 1 });
  const bvhUniform = new MeshBVHUniformStruct();
  bvhUniform.updateFrom(bvh);

  const material = new THREE.ShaderMaterial({
    side: THREE.FrontSide,
    transparent: false,
    depthWrite: true,
    uniforms: {
      envMap: { value: options.envMap },
      bvh: { value: bvhUniform },
      projectionMatrixInv: { value: new THREE.Matrix4() },
      viewMatrixInv: { value: new THREE.Matrix4() },
      modelMatrixWorld: { value: new THREE.Matrix4() },
      modelMatrixInverse: { value: new THREE.Matrix4() },
      resolution: { value: new THREE.Vector2(1, 1) },
      bounces: { value: params.bounces },
      ior: { value: params.ior },
      color: { value: new THREE.Color(options.absorptionColor) },
      absorption: { value: params.absorption },
      aberrationStrength: { value: params.aberrationStrength },
      fresnel: { value: 0.55 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorldPosition = world.xyz;
        vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      #define RAY_OFFSET 0.001
      #include <common>
      precision highp isampler2D;
      precision highp usampler2D;

      ${BVHShaderGLSL.common_functions}
      ${BVHShaderGLSL.bvh_struct_definitions}
      ${BVHShaderGLSL.bvh_ray_functions}

      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      uniform sampler2D envMap;
      uniform float bounces;
      uniform BVH bvh;
      uniform float ior;
      uniform vec3 color;
      uniform float absorption;
      uniform mat4 projectionMatrixInv;
      uniform mat4 viewMatrixInv;
      uniform mat4 modelMatrixWorld;
      uniform mat4 modelMatrixInverse;
      uniform vec2 resolution;
      uniform float aberrationStrength;
      uniform float fresnel;

      vec3 safeNormalize(vec3 v, vec3 fallback) {
        float len = length(v);
        return len > 1e-5 ? v / len : fallback;
      }

      vec2 gemEquirect(vec3 dir) {
        vec3 d = safeNormalize(dir, vec3(0.0, 1.0, 0.0));
        float u = atan(d.z, d.x) * RECIPROCAL_PI2 + 0.5;
        float v = asin(clamp(d.y, -1.0, 1.0)) * RECIPROCAL_PI + 0.5;
        return clamp(vec2(u, v), vec2(0.002), vec2(0.998));
      }

      vec3 envSample(vec3 rayDirection) {
        vec3 c = texture(envMap, gemEquirect(rayDirection)).rgb;
        float luma = dot(c, vec3(0.333));
        return c * mix(0.55, 1.85, smoothstep(0.12, 0.9, luma));
      }

      vec3 totalInternalReflection(vec3 incomingDirection, vec3 normal, float rayIor, inout float pathLength) {
        vec3 rayDirection = refract(incomingDirection, normal, 1.0 / rayIor);
        if (dot(rayDirection, rayDirection) < 1e-8) {
          pathLength = 0.0;
          return reflect(incomingDirection, normal);
        }
        vec3 rayOrigin = vWorldPosition + rayDirection * RAY_OFFSET;
        rayOrigin = (modelMatrixInverse * vec4(rayOrigin, 1.0)).xyz;
        rayDirection = safeNormalize((modelMatrixInverse * vec4(rayDirection, 0.0)).xyz, vec3(0.0, -1.0, 0.0));

        for (float i = 0.0; i < 8.0; i++) {
          if (i >= bounces) break;
          uvec4 faceIndices = uvec4(0u);
          vec3 faceNormal = vec3(0.0, 0.0, 1.0);
          vec3 barycoord = vec3(0.0);
          float side = 1.0;
          float dist = 0.0;
          bvhIntersectFirstHit(bvh, rayOrigin, rayDirection, faceIndices, faceNormal, barycoord, side, dist);
          if (dist < 1e-5 || dist > 4.0) break;
          pathLength += dist;
          vec3 hitPos = rayOrigin + rayDirection * dist;
          vec3 refractedDirection = refract(rayDirection, faceNormal, rayIor);
          if (dot(refractedDirection, refractedDirection) > 1e-8) {
            rayDirection = refractedDirection;
            break;
          }
          rayDirection = reflect(rayDirection, faceNormal);
          rayOrigin = hitPos + rayDirection * RAY_OFFSET;
        }
        return safeNormalize((modelMatrixWorld * vec4(rayDirection, 0.0)).xyz, incomingDirection);
      }

      void main() {
        vec3 geo = cross(dFdx(vWorldPosition), dFdy(vWorldPosition));
        vec3 normal = length(geo) > 1e-8 ? normalize(geo) : safeNormalize(vWorldNormal, vec3(0.0, 1.0, 0.0));
        vec3 rayDirection = safeNormalize(vWorldPosition - cameraPosition, vec3(0.0, 0.0, -1.0));
        if (dot(normal, rayDirection) > 0.0) normal = -normal;

        float pathG = 0.0;
        vec3 dirG = totalInternalReflection(rayDirection, normal, max(ior, 1.0), pathG);
        vec3 transmitted = envSample(dirG);
        if (aberrationStrength > 0.0002) {
          vec3 dirR = safeNormalize(dirG + vec3(aberrationStrength, 0.0, 0.0), dirG);
          vec3 dirB = safeNormalize(dirG - vec3(aberrationStrength, 0.0, 0.0), dirG);
          transmitted = vec3(envSample(dirR).r, transmitted.g, envSample(dirB).b);
        }

        float pathLength = clamp(pathG, 0.0, 1.15);
        vec3 beer = max(exp(-(vec3(1.0) - color) * pathLength * absorption), vec3(0.42));
        vec3 body = transmitted * mix(color, vec3(1.0), 0.48) * beer;
        vec3 viewDir = safeNormalize(cameraPosition - vWorldPosition, vec3(0.0, 0.0, 1.0));
        vec3 reflected = envSample(reflect(-viewDir, normal));
        float f = pow(1.0 - max(dot(viewDir, normal), 0.0), 5.0) * fresnel;
        vec3 pixel = mix(body, reflected, f);
        pixel = max(pixel, vec3(0.0));
        if (any(isnan(pixel))) pixel = color * 0.6;
        gl_FragColor = vec4(pixel, 1.0);

        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  material.userData['bvh'] = bvh;
  material.userData['bvhUniform'] = bvhUniform;
  return material;
}

export function syncGemRefraction(
  material: THREE.ShaderMaterial,
  camera: THREE.PerspectiveCamera,
  drawingBuffer: THREE.Vector2,
): void {
  camera.updateMatrixWorld();
  material.uniforms['viewMatrixInv']?.value.copy(camera.matrixWorld);
  material.uniforms['projectionMatrixInv']?.value.copy(camera.projectionMatrixInverse);
  material.uniforms['resolution']?.value.copy(drawingBuffer);
  const mesh = material.userData['mesh'] as THREE.Object3D | undefined;
  if (mesh) {
    mesh.updateWorldMatrix(true, false);
    material.uniforms['modelMatrixWorld']?.value.copy(mesh.matrixWorld);
    material.uniforms['modelMatrixInverse']?.value.copy(mesh.matrixWorld).invert();
  }
}
