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
  ctx.fillStyle = '#07070c';
  ctx.fillRect(0, 0, width, height);
  const panel = (u0: number, v0: number, u1: number, v1: number, fill: string) => {
    ctx.fillStyle = fill;
    ctx.fillRect(u0 * width, v0 * height, (u1 - u0) * width, (v1 - v0) * height);
  };
  panel(0.28, 0.08, 0.72, 0.34, '#ffffff');
  panel(0.36, 0.02, 0.64, 0.1, '#ffffff');
  panel(0.04, 0.16, 0.24, 0.42, '#f7f5ff');
  panel(0.76, 0.18, 0.96, 0.46, '#ffe7c2');
  panel(0.44, 0.14, 0.56, 0.26, '#ffffff');
  panel(0.12, 0.1, 0.18, 0.18, '#ffffff');
  panel(0.82, 0.1, 0.9, 0.2, '#fff8ee');
  panel(0.0, 0.7, 1, 1, '#16161c');
  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
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
      fresnel: { value: 0.85 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldPosition;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorldPosition = world.xyz;
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

      vec2 gemEquirect(vec3 dir) {
        float u = atan(dir.z, dir.x) * RECIPROCAL_PI2 + 0.5;
        float v = asin(clamp(dir.y, -1.0, 1.0)) * RECIPROCAL_PI + 0.5;
        return vec2(u, v);
      }

      vec3 envSample(vec3 rayDirection) {
        return texture(envMap, gemEquirect(normalize(rayDirection))).rgb;
      }

      vec3 totalInternalReflection(vec3 incomingDirection, vec3 normal, float rayIor, inout float pathLength) {
        vec3 rayOrigin = vWorldPosition;
        vec3 rayDirection = incomingDirection;
        rayDirection = refract(rayDirection, normal, 1.0 / rayIor);
        rayOrigin = vWorldPosition + rayDirection * RAY_OFFSET;
        rayOrigin = (modelMatrixInverse * vec4(rayOrigin, 1.0)).xyz;
        rayDirection = normalize((modelMatrixInverse * vec4(rayDirection, 0.0)).xyz);

        for (float i = 0.0; i < 8.0; i++) {
          if (i >= bounces) break;
          uvec4 faceIndices = uvec4(0u);
          vec3 faceNormal = vec3(0.0, 0.0, 1.0);
          vec3 barycoord = vec3(0.0);
          float side = 1.0;
          float dist = 0.0;
          bvhIntersectFirstHit(bvh, rayOrigin, rayDirection, faceIndices, faceNormal, barycoord, side, dist);
          pathLength += max(dist, 0.0);
          vec3 hitPos = rayOrigin + rayDirection * dist;
          vec3 refractedDirection = refract(rayDirection, faceNormal, rayIor);
          if (length(refractedDirection) != 0.0) {
            rayDirection = refractedDirection;
            break;
          }
          rayDirection = reflect(rayDirection, faceNormal);
          rayOrigin = hitPos + rayDirection * RAY_OFFSET;
        }
        return normalize((modelMatrixWorld * vec4(rayDirection, 0.0)).xyz);
      }

      void main() {
        vec3 fdx = dFdx(vWorldPosition);
        vec3 fdy = dFdy(vWorldPosition);
        vec3 normal = normalize(cross(fdx, fdy));
        vec3 rayDirection = normalize(vWorldPosition - cameraPosition);
        if (dot(normal, rayDirection) > 0.0) normal = -normal;

        float pathG = 0.0;
        vec3 dirG = totalInternalReflection(rayDirection, normal, max(ior, 1.0), pathG);
        float pathR = 0.0;
        float pathB = 0.0;
        vec3 dirR;
        vec3 dirB;
        if (aberrationStrength > 0.0001) {
          dirR = totalInternalReflection(rayDirection, normal, max(ior * (1.0 - aberrationStrength), 1.0), pathR);
          dirB = totalInternalReflection(rayDirection, normal, max(ior * (1.0 + aberrationStrength), 1.0), pathB);
        } else {
          dirR = dirG;
          dirB = dirG;
          pathR = pathG;
          pathB = pathG;
        }

        vec3 transmitted = vec3(envSample(dirR).r, envSample(dirG).g, envSample(dirB).b);
        float pathLength = (pathR + pathG + pathB) / 3.0;
        vec3 beer = max(exp(-(vec3(1.0) - color) * pathLength * absorption), color * 0.18);
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        vec3 reflected = envSample(reflect(-viewDir, normal));
        float f = pow(1.0 - max(dot(viewDir, normal), 0.0), 5.0) * fresnel;
        gl_FragColor = vec4(mix(transmitted * beer, reflected, f), 1.0);

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
