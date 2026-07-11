// Visor 2D de cortes (reconstrucción multiplanar básica) sobre un canvas.
// Trabaja directamente sobre el volumen normalizado Uint8 (0..255 ≙ -1024..3072 HU)
// aplicando ventana radiológica (centro/ancho en HU).

export const WINDOW_PRESETS = {
  pulmon: { name: 'Pulmón', center: -600, width: 1500 },
  mediastino: { name: 'Mediastino', center: 40, width: 400 },
  hueso: { name: 'Hueso', center: 450, width: 1500 },
};

const HU_MIN = -1024;
const HU_RANGE = 4096;

export class SliceViewer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.volume = null;
    this.plane = 'axial';
    this.index = 0;
    this.window = { ...WINDOW_PRESETS.pulmon };
    this._raf = 0;
  }

  setVolume(volume) {
    this.volume = volume;
    this.index = Math.floor(this.sliceCount() / 2);
    this.requestRender();
  }

  setPlane(plane) {
    this.plane = plane;
    this.index = Math.min(this.index, this.sliceCount() - 1);
    this.requestRender();
  }

  setIndex(i) {
    this.index = Math.max(0, Math.min(i, this.sliceCount() - 1));
    this.requestRender();
  }

  setWindow(center, width) {
    this.window = { center, width };
    this.requestRender();
  }

  sliceCount() {
    if (!this.volume) return 1;
    const [nx, ny, nz] = this.volume.dims;
    return this.plane === 'axial' ? nz : this.plane === 'coronal' ? ny : nx;
  }

  requestRender() {
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => {
      this._raf = 0;
      this.render();
    });
  }

  render() {
    if (!this.volume) return;
    const { data, dims, spacing } = this.volume;
    const [nx, ny, nz] = dims;
    const [sx, sy, sz] = spacing;
    const { center, width } = this.window;

    // Ventana en unidades normalizadas 0..255.
    const wLo = ((center - width / 2 - HU_MIN) / HU_RANGE) * 255;
    const wHi = ((center + width / 2 - HU_MIN) / HU_RANGE) * 255;
    const wScale = 255 / Math.max(wHi - wLo, 1e-3);

    let w, h, aspect;
    if (this.plane === 'axial') {
      w = nx; h = ny;
      aspect = (nx * sx) / (ny * sy);
    } else if (this.plane === 'coronal') {
      w = nx; h = nz;
      aspect = (nx * sx) / (nz * sz);
    } else {
      w = ny; h = nz;
      aspect = (ny * sy) / (nz * sz);
    }

    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.canvas.style.aspectRatio = String(aspect);

    const img = this.ctx.createImageData(w, h);
    const px = img.data;
    const k = this.index;
    const nxy = nx * ny;

    let p = 0;
    if (this.plane === 'axial') {
      // x → derecha de la imagen (izquierda del paciente), y → abajo (posterior)
      const base = k * nxy;
      for (let y = 0; y < ny; y++) {
        const row = base + y * nx;
        for (let x = 0; x < nx; x++, p += 4) {
          const g = clampByte((data[row + x] - wLo) * wScale);
          px[p] = px[p + 1] = px[p + 2] = g;
          px[p + 3] = 255;
        }
      }
    } else if (this.plane === 'coronal') {
      // y fijo; vertical = z (superior arriba)
      for (let r = 0; r < nz; r++) {
        const z = nz - 1 - r;
        const base = z * nxy + k * nx;
        for (let x = 0; x < nx; x++, p += 4) {
          const g = clampByte((data[base + x] - wLo) * wScale);
          px[p] = px[p + 1] = px[p + 2] = g;
          px[p + 3] = 255;
        }
      }
    } else {
      // sagital: x fijo; horizontal = y (anterior a la izquierda), vertical = z
      for (let r = 0; r < nz; r++) {
        const z = nz - 1 - r;
        const base = z * nxy + k;
        for (let y = 0; y < ny; y++, p += 4) {
          const g = clampByte((data[base + y * nx] - wLo) * wScale);
          px[p] = px[p + 1] = px[p + 2] = g;
          px[p + 3] = 255;
        }
      }
    }

    this.ctx.putImageData(img, 0, 0);
  }
}

function clampByte(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v | 0;
}
