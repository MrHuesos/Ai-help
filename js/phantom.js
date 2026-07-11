// Fantoma torácico sintético para demostración sin archivos DICOM reales.
// Genera un volumen normalizado (0..255 ≙ -1024..3072 HU) con estructuras
// aproximadas: pared torácica (tejido blando), grasa subcutánea, dos pulmones
// con árbol vascular, columna y costillas (hueso), corazón y aorta.

function huToByte(hu) {
  const v = Math.round(((hu + 1024) / 4096) * 255);
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

export function makePhantom(n = 160) {
  const nz = Math.round(n * 0.9);
  const nx = n;
  const ny = n;
  const data = new Uint8Array(nx * ny * nz);

  const AIR = huToByte(-1000);
  const LUNG = huToByte(-780);
  const FAT = huToByte(-90);
  const SOFT = huToByte(45);
  const MUSCLE = huToByte(55);
  const BLOOD = huToByte(120);
  const BONE = huToByte(700);
  const BONE_HARD = huToByte(1100);

  data.fill(AIR);

  const cx = nx / 2;
  const cy = ny / 2;

  // Semilla determinista para el árbol vascular.
  let seed = 20260711;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  const set = (x, y, z, val) => {
    x |= 0; y |= 0; z |= 0;
    if (x < 0 || y < 0 || z < 0 || x >= nx || y >= ny || z >= nz) return;
    data[z * nx * ny + y * nx + x] = val;
  };

  // Cuerpo, grasa, músculo por corte axial.
  const bodyRx = nx * 0.42;
  const bodyRy = ny * 0.32;
  for (let z = 0; z < nz; z++) {
    const taper = 1 - 0.12 * Math.abs(z / nz - 0.5); // torso ligeramente cónico
    const rx = bodyRx * taper;
    const ry = bodyRy * taper;
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        const r = dx * dx + dy * dy;
        if (r > 1) continue;
        let val = SOFT;
        if (r > 0.9) val = FAT;               // grasa subcutánea
        else if (r > 0.78) val = MUSCLE;      // pared muscular
        set(x, y, z, val);
      }
    }
  }

  // Pulmones: dos elipsoides de aire con textura suave.
  const lungCz = nz * 0.52;
  const lungRz = nz * 0.34;
  for (let z = 0; z < nz; z++) {
    const dz = (z - lungCz) / lungRz;
    if (Math.abs(dz) > 1) continue;
    const shrink = Math.sqrt(1 - dz * dz);
    const lrx = nx * 0.15 * shrink;
    const lry = ny * 0.2 * shrink;
    for (const sign of [-1, 1]) {
      const lcx = cx + sign * nx * 0.17;
      const lcy = cy - ny * 0.02;
      for (let y = cy - lry - 2; y <= cy + lry + 2; y++) {
        for (let x = lcx - lrx - 2; x <= lcx + lrx + 2; x++) {
          const dx = (x - lcx) / lrx;
          const dy = (y - lcy) / lry;
          if (dx * dx + dy * dy > 1) continue;
          const noise = (rand() - 0.5) * 30;
          set(x, y, z, huToByte(-780 + noise));
        }
      }
    }
  }

  // Corazón + aorta (tejido con sangre) en el mediastino.
  const heartCz = nz * 0.44;
  for (let z = 0; z < nz; z++) {
    const dz = (z - heartCz) / (nz * 0.16);
    if (Math.abs(dz) > 1) continue;
    const s = Math.sqrt(1 - dz * dz);
    const hrx = nx * 0.11 * s;
    const hry = ny * 0.12 * s;
    const hcx = cx - nx * 0.02;
    const hcy = cy + ny * 0.03;
    for (let y = hcy - hry; y <= hcy + hry; y++) {
      for (let x = hcx - hrx; x <= hcx + hrx; x++) {
        const dx = (x - hcx) / hrx;
        const dy = (y - hcy) / hry;
        if (dx * dx + dy * dy > 1) continue;
        set(x, y, z, BLOOD);
      }
    }
  }
  // Aorta ascendente/descendente (dos tubos verticales).
  for (let z = 0; z < nz; z++) {
    for (const off of [[-0.02, -0.05, 3.5], [0.0, 0.14, 4]]) {
      const acx = cx + off[0] * nx;
      const acy = cy + off[1] * ny;
      const ar = nx * 0.01 * off[2];
      for (let y = acy - ar; y <= acy + ar; y++) {
        for (let x = acx - ar; x <= acx + ar; x++) {
          const dx = x - acx;
          const dy = y - acy;
          if (dx * dx + dy * dy > ar * ar) continue;
          set(x, y, z, BLOOD);
        }
      }
    }
  }

  // Árbol vascular pulmonar: ramas aleatorias desde el hilio.
  const drawVessel = (x, y, z, dir, len, thick) => {
    for (let i = 0; i < len; i++) {
      dir[0] += (rand() - 0.5) * 0.4;
      dir[1] += (rand() - 0.5) * 0.4;
      dir[2] += (rand() - 0.5) * 0.5;
      const m = Math.hypot(dir[0], dir[1], dir[2]) || 1;
      x += dir[0] / m; y += dir[1] / m; z += dir[2] / m;
      const t = Math.max(0.6, thick * (1 - i / len));
      for (let ddz = -t; ddz <= t; ddz++)
        for (let ddy = -t; ddy <= t; ddy++)
          for (let ddx = -t; ddx <= t; ddx++)
            if (ddx * ddx + ddy * ddy + ddz * ddz <= t * t)
              set(x + ddx, y + ddy, z + ddz, BLOOD);
      if (i > len * 0.3 && rand() < 0.12 && thick > 1.4) {
        drawVessel(x, y, z, [-dir[0], dir[1], dir[2]], len * 0.5, thick * 0.6);
      }
    }
  };
  for (const sign of [-1, 1]) {
    const hx = cx + sign * nx * 0.08;
    for (let b = 0; b < 6; b++) {
      drawVessel(hx, cy, lungCz, [sign * (0.5 + rand()), rand() - 0.5, rand() - 0.5], nx * 0.3, 2.6);
    }
  }

  // Columna vertebral (cuerpos vertebrales) en la parte posterior.
  for (let z = 0; z < nz; z++) {
    const seg = Math.sin((z / nz) * Math.PI * 12);
    const vr = nx * 0.06;
    const vcy = cy + ny * 0.26;
    const val = seg > -0.4 ? BONE_HARD : BONE;
    for (let y = vcy - vr; y <= vcy + vr; y++) {
      for (let x = cx - vr; x <= cx + vr; x++) {
        const dx = (x - cx) / vr;
        const dy = (y - vcy) / vr;
        if (dx * dx + dy * dy > 1) continue;
        set(x, y, z, val);
      }
    }
    // Apófisis espinosa
    for (let y = vcy + vr; y < vcy + vr + nx * 0.05; y++) set(cx, y, z, BONE);
  }

  // Costillas: arcos que salen de la columna y rodean el tórax.
  const ribCount = 9;
  for (let rib = 0; rib < ribCount; rib++) {
    const z = nz * 0.18 + (rib / ribCount) * nz * 0.62;
    for (const sign of [-1, 1]) {
      for (let a = 0; a <= Math.PI * 0.92; a += 0.02) {
        const ang = sign * a;
        const rx = bodyRx * 0.9;
        const ry = bodyRy * 0.9;
        const x = cx + Math.sin(ang) * rx;
        const y = cy + ny * 0.24 - (1 - Math.cos(ang)) * ry * 1.1;
        const zz = z - a * nz * 0.02; // las costillas descienden hacia adelante
        for (let ddz = -1; ddz <= 1; ddz++)
          for (let ddy = -1; ddy <= 1; ddy++)
            for (let ddx = -1; ddx <= 1; ddx++)
              set(x + ddx, y + ddy, zz + ddz, BONE);
      }
    }
  }
  // Esternón
  for (let z = nz * 0.24; z < nz * 0.66; z++) {
    for (let ddx = -nx * 0.03; ddx <= nx * 0.03; ddx++)
      for (let ddy = -2; ddy <= 2; ddy++)
        set(cx + ddx, cy - bodyRy * 0.86, z + ddy, BONE);
  }

  return {
    data,
    dims: [nx, ny, nz],
    spacing: [1.4, 1.4, 2.0],
    meta: {
      modality: 'CT',
      studyDescription: 'Fantoma de demostración',
      seriesDescription: 'Tórax sintético',
      studyDate: '',
      sourceDims: [nx, ny, nz],
      downsampled: false,
    },
  };
}
