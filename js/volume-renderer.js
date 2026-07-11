// Renderizador volumétrico 3D por raymarching (WebGL2 + three.js).
// Recibe un volumen normalizado (Uint8, 0..255 ≙ -1024..3072 HU) y lo dibuja
// clasificando cada muestra en tejidos (pulmón, grasa, tejido blando, vasos, hueso)
// con color y opacidad independientes, recorte por caja y sombreado por gradiente.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export const MAX_CLASSES = 5;

const VERT = /* glsl */ `
out vec3 vOrigin;
out vec3 vDirection;

void main() {
  vOrigin = vec3(inverse(modelMatrix) * vec4(cameraPosition, 1.0));
  vDirection = position - vOrigin;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAG = /* glsl */ `
precision highp float;
precision highp sampler3D;

uniform sampler3D uData;
uniform vec3  uDims;
uniform vec3  uClipMin;
uniform vec3  uClipMax;
uniform float uSteps;
uniform int   uMode;      // 0 = composición, 1 = MIP (rayos X)
uniform bool  uShading;
uniform float uClassMin[${MAX_CLASSES}];
uniform float uClassMax[${MAX_CLASSES}];
uniform vec3  uClassColor[${MAX_CLASSES}];
uniform float uClassAlpha[${MAX_CLASSES}];

in vec3 vOrigin;
in vec3 vDirection;
out vec4 outColor;

vec2 hitBox(vec3 ro, vec3 rd, vec3 bmin, vec3 bmax) {
  vec3 inv = 1.0 / rd;
  vec3 t0 = (bmin - ro) * inv;
  vec3 t1 = (bmax - ro) * inv;
  vec3 tmin = min(t0, t1);
  vec3 tmax = max(t0, t1);
  return vec2(max(max(tmin.x, tmin.y), tmin.z), min(min(tmax.x, tmax.y), tmax.z));
}

float sampleV(vec3 p) {
  return texture(uData, p).r;
}

vec4 classify(float v) {
  vec3 col = vec3(0.0);
  float al = 0.0;
  for (int i = 0; i < ${MAX_CLASSES}; i++) {
    float a = uClassAlpha[i];
    if (a <= 0.001) continue;
    float lo = uClassMin[i];
    float hi = uClassMax[i];
    if (v < lo || v > hi) continue;
    float edge = min((hi - lo) * 0.35, 0.02);
    float w = smoothstep(lo, lo + edge, v);
    float aw = a * w;
    if (aw > al) {
      al = aw;
      col = uClassColor[i];
    }
  }
  return vec4(col, al);
}

bool inAnyClass(float v) {
  for (int i = 0; i < ${MAX_CLASSES}; i++) {
    if (uClassAlpha[i] > 0.001 && v >= uClassMin[i] && v <= uClassMax[i]) return true;
  }
  return false;
}

vec3 gradientAt(vec3 p) {
  vec3 e = 1.0 / uDims;
  return vec3(
    sampleV(p + vec3(e.x, 0.0, 0.0)) - sampleV(p - vec3(e.x, 0.0, 0.0)),
    sampleV(p + vec3(0.0, e.y, 0.0)) - sampleV(p - vec3(0.0, e.y, 0.0)),
    sampleV(p + vec3(0.0, 0.0, e.z)) - sampleV(p - vec3(0.0, 0.0, e.z))
  );
}

float lightingAt(vec3 p, vec3 rd, out float spec) {
  vec3 g = gradientAt(p);
  float gm = length(g);
  spec = 0.0;
  if (gm < 1e-4) return 1.0;
  float d = clamp(abs(dot(normalize(g), rd)), 0.0, 1.0);
  float shade = 0.38 + 0.62 * d;
  spec = pow(d, 24.0) * 0.22;
  float m = smoothstep(0.002, 0.03, gm);
  spec *= m;
  return mix(1.0, shade, m);
}

void main() {
  vec3 rd = normalize(vDirection);
  vec3 bmin = uClipMin - 0.5;
  vec3 bmax = uClipMax - 0.5;
  vec2 t = hitBox(vOrigin, rd, bmin, bmax);
  if (t.x > t.y) discard;
  t.x = max(t.x, 0.0);

  float dt = 1.7321 / uSteps;
  float jitter = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  float tt = t.x + dt * jitter;

  vec4 acc = vec4(0.0);
  float maxV = 0.0;

  for (int i = 0; i < 2048; i++) {
    if (tt > t.y || acc.a > 0.97) break;
    vec3 p = vOrigin + rd * tt + 0.5;
    float v = sampleV(p);

    if (uMode == 1) {
      if (inAnyClass(v)) maxV = max(maxV, v);
    } else {
      vec4 cls = classify(v);
      if (cls.a > 0.001) {
        float a = 1.0 - pow(1.0 - cls.a, dt * 60.0);
        vec3 col = cls.rgb;
        if (uShading) {
          float spec;
          float s = lightingAt(p, rd, spec);
          col = col * s + vec3(spec);
        }
        acc.rgb += (1.0 - acc.a) * a * col;
        acc.a   += (1.0 - acc.a) * a;
      }
    }
    tt += dt;
  }

  if (uMode == 1) {
    float g = smoothstep(0.06, 0.62, maxV);
    outColor = vec4(vec3(0.92, 0.96, 1.0) * g, g);
  } else {
    outColor = acc;
  }
  if (outColor.a < 0.004) discard;
}
`;

function makeLabelSprite(text) {
  const size = 96;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = 'rgba(12, 20, 32, 0.72)';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.44, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(140, 180, 220, 0.7)';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = '#dce9f5';
  ctx.font = `bold ${size * 0.5}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, size / 2, size / 2 + size * 0.02);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.setScalar(0.085);
  sprite.renderOrder = 10;
  return sprite;
}

export class VolumeRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(0x000000, 0);
    this.maxPixelRatio = 2;

    const gl = this.renderer.getContext();
    this.max3DTextureSize = gl.getParameter(gl.MAX_3D_TEXTURE_SIZE);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.01, 50);
    this.defaultCamPos = new THREE.Vector3(0, 0.18, 2.4);
    this.camera.position.copy(this.defaultCamPos);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.rotateSpeed = 0.85;
    this.controls.minDistance = 0.35;
    this.controls.maxDistance = 8;
    this.controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    this.controls.addEventListener('change', () => this.invalidate());

    // Grupo rotado para que el eje superior del paciente (z del volumen) quede
    // hacia arriba en pantalla y la vista inicial sea anterior (de frente).
    this.group = new THREE.Group();
    this.group.rotation.x = -Math.PI / 2;
    this.scene.add(this.group);

    this.uniforms = {
      uData: { value: null },
      uDims: { value: new THREE.Vector3(1, 1, 1) },
      uClipMin: { value: new THREE.Vector3(0, 0, 0) },
      uClipMax: { value: new THREE.Vector3(1, 1, 1) },
      uSteps: { value: 192 },
      uMode: { value: 0 },
      uShading: { value: true },
      uClassMin: { value: new Array(MAX_CLASSES).fill(0) },
      uClassMax: { value: new Array(MAX_CLASSES).fill(0) },
      uClassColor: { value: Array.from({ length: MAX_CLASSES }, () => new THREE.Color(0)) },
      uClassAlpha: { value: new Array(MAX_CLASSES).fill(0) },
    };

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: this.uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
    this.mesh.visible = false;
    this.group.add(this.mesh);

    this.wire = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
      new THREE.LineBasicMaterial({ color: 0x3a5a78, transparent: true, opacity: 0.55 })
    );
    this.wire.visible = false;
    this.group.add(this.wire);

    // Etiquetas de orientación anatómica (espacio del volumen: +x=Izq, +y=Post, +z=Sup)
    this.labels = {
      L: makeLabelSprite('L'), R: makeLabelSprite('R'),
      P: makeLabelSprite('P'), A: makeLabelSprite('A'),
      S: makeLabelSprite('S'), I: makeLabelSprite('I'),
    };
    for (const s of Object.values(this.labels)) {
      s.visible = false;
      this.group.add(s);
    }

    this.texture = null;
    this.needsRender = true;
    this._animate = this._animate.bind(this);
    requestAnimationFrame(this._animate);
  }

  setVolume(volume) {
    const [nx, ny, nz] = volume.dims;
    const [sx, sy, sz] = volume.spacing;

    if (this.texture) this.texture.dispose();
    const tex = new THREE.Data3DTexture(volume.data, nx, ny, nz);
    tex.format = THREE.RedFormat;
    tex.type = THREE.UnsignedByteType;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.unpackAlignment = 1;
    tex.needsUpdate = true;
    this.texture = tex;

    this.uniforms.uData.value = tex;
    this.uniforms.uDims.value.set(nx, ny, nz);

    const size = new THREE.Vector3(nx * sx, ny * sy, nz * sz);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    size.divideScalar(maxDim);
    this.mesh.scale.copy(size);
    this.wire.scale.copy(size);
    this.mesh.visible = true;
    this.wire.visible = true;

    const pad = 0.09;
    this.labels.L.position.set(size.x / 2 + pad, 0, 0);
    this.labels.R.position.set(-size.x / 2 - pad, 0, 0);
    this.labels.P.position.set(0, size.y / 2 + pad, 0);
    this.labels.A.position.set(0, -size.y / 2 - pad, 0);
    this.labels.S.position.set(0, 0, size.z / 2 + pad);
    this.labels.I.position.set(0, 0, -size.z / 2 - pad);
    for (const s of Object.values(this.labels)) s.visible = true;

    this.invalidate();
  }

  setLabelsVisible(v) {
    for (const s of Object.values(this.labels)) s.visible = v && this.mesh.visible;
    this.wire.visible = v && this.mesh.visible;
    this.invalidate();
  }

  // hu → valor normalizado de textura
  static huToNorm(hu) {
    return Math.min(1, Math.max(0, (hu + 1024) / 4096));
  }

  setTissue(i, { huMin, huMax, color, alpha }) {
    if (huMin !== undefined) this.uniforms.uClassMin.value[i] = VolumeRenderer.huToNorm(huMin);
    if (huMax !== undefined) this.uniforms.uClassMax.value[i] = VolumeRenderer.huToNorm(huMax);
    if (color !== undefined) this.uniforms.uClassColor.value[i].set(color);
    if (alpha !== undefined) this.uniforms.uClassAlpha.value[i] = alpha;
    this.invalidate();
  }

  setClip(axis, min, max) {
    const idx = { x: 'x', y: 'y', z: 'z' }[axis];
    this.uniforms.uClipMin.value[idx] = min;
    this.uniforms.uClipMax.value[idx] = max;
    this.invalidate();
  }

  setSteps(n) {
    this.uniforms.uSteps.value = n;
    this.invalidate();
  }

  setPixelRatioCap(cap) {
    this.maxPixelRatio = cap;
    this.resize();
  }

  setShading(v) {
    this.uniforms.uShading.value = v;
    this.invalidate();
  }

  setMode(mode) {
    this.uniforms.uMode.value = mode === 'mip' ? 1 : 0;
    this.invalidate();
  }

  resetView() {
    this.camera.position.copy(this.defaultCamPos);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
    this.invalidate();
  }

  setViewPreset(name) {
    const d = this.defaultCamPos.length();
    const pos = {
      anterior: [0, 0, d],
      posterior: [0, 0, -d],
      izquierda: [d, 0, 0],
      derecha: [-d, 0, 0],
      superior: [0, d, 0.001],
      inferior: [0, -d, 0.001],
    }[name];
    if (!pos) return;
    this.camera.position.set(pos[0], pos[1], pos[2]);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
    this.invalidate();
  }

  snapshot() {
    this.renderer.render(this.scene, this.camera);
    return this.canvas.toDataURL('image/png');
  }

  invalidate() {
    this.needsRender = true;
  }

  resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    if (w === 0 || h === 0) return;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.maxPixelRatio));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.invalidate();
  }

  _animate() {
    requestAnimationFrame(this._animate);
    this.controls.update();
    if (this.needsRender) {
      this.needsRender = false;
      this.renderer.render(this.scene, this.camera);
    }
  }
}
