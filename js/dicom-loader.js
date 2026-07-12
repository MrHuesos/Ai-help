// Carga de series DICOM en el navegador (usa dicomParser, global).
// Produce un volumen normalizado: Uint8Array donde 0..255 ≙ -1024..3072 HU,
// con dimensiones [nx, ny, nz] y espaciado físico en mm [sx, sy, sz].

const SUPPORTED_TS = new Set([
  '1.2.840.10008.1.2',      // Implicit VR Little Endian
  '1.2.840.10008.1.2.1',    // Explicit VR Little Endian
]);

function parseFloats(str) {
  if (!str) return null;
  const parts = String(str).split('\\').map(parseFloat);
  return parts.some(Number.isNaN) ? null : parts;
}

function readSliceMeta(dataSet) {
  const rows = dataSet.uint16('x00280010');
  const cols = dataSet.uint16('x00280011');
  const pixelDataElement = dataSet.elements.x7fe00010;
  if (!rows || !cols || !pixelDataElement) return null;

  const orientation = parseFloats(dataSet.string('x00200037'));
  const position = parseFloats(dataSet.string('x00200032'));
  const pixelSpacing = parseFloats(dataSet.string('x00280030'));

  return {
    rows,
    cols,
    pixelDataElement,
    seriesUID: dataSet.string('x0020000e') || 'serie-desconocida',
    instanceNumber: parseInt(dataSet.string('x00200013'), 10) || 0,
    position,
    orientation,
    pixelSpacing,
    sliceThickness: parseFloat(dataSet.string('x00180050')) || null,
    spacingBetween: parseFloat(dataSet.string('x00180088')) || null,
    slope: parseFloat(dataSet.string('x00281053')),
    intercept: parseFloat(dataSet.string('x00281052')),
    bitsAllocated: dataSet.uint16('x00280100') || 16,
    signed: dataSet.uint16('x00280103') === 1,
    frames: parseInt(dataSet.string('x00280008'), 10) || 1,
    modality: dataSet.string('x00080060') || '',
    studyDescription: dataSet.string('x00081030') || '',
    seriesDescription: dataSet.string('x0008103e') || '',
    studyDate: dataSet.string('x00080020') || '',
  };
}

// Proyección de la posición del corte sobre la normal del plano de imagen,
// para ordenar los cortes en el eje perpendicular.
function sliceNormal(orientation) {
  if (!orientation || orientation.length < 6) return [0, 0, 1];
  const [rx, ry, rz, cx, cy, cz] = orientation;
  return [ry * cz - rz * cy, rz * cx - rx * cz, rx * cy - ry * cx];
}

function median(arr) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

// Identifica por bytes mágicos los formatos que la gente sube por error.
function sniffFileKind(b) {
  if (!b || b.length < 12) return 'other';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image'; // JPEG
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image'; // PNG
  if (b[0] === 0x42 && b[1] === 0x4d) return 'image'; // BMP
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'image'; // GIF
  if (b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image'; // WEBP
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) return 'image'; // HEIC/AVIF (ftyp)
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'image'; // PDF (informe)
  if (b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05)) return 'zip'; // ZIP
  return 'other';
}

/**
 * @param {File[]} files
 * @param {(done:number, total:number, phase:string) => void} onProgress
 * @param {{maxVoxels?: number, maxDim?: number}} limits
 */
export async function loadDicomFiles(files, onProgress, limits = {}) {
  const maxVoxels = limits.maxVoxels || 64e6;
  const maxDim = limits.maxDim || 512;

  const slices = [];
  const warnings = [];
  let unsupportedCompressed = 0;
  let unreadable = 0;
  let regularImages = 0;
  let zipFiles = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    let byteArray = null;
    try {
      byteArray = new Uint8Array(await file.arrayBuffer());
    } catch {
      unreadable++;
      continue;
    }
    try {
      const dataSet = dicomParser.parseDicom(byteArray);
      const ts = (dataSet.string('x00020010') || '1.2.840.10008.1.2').trim();
      if (!SUPPORTED_TS.has(ts)) {
        unsupportedCompressed++;
        continue;
      }
      const meta = readSliceMeta(dataSet);
      if (!meta) {
        unreadable++;
        continue;
      }
      meta.byteArray = byteArray;
      slices.push(meta);
    } catch {
      const kind = sniffFileKind(byteArray);
      if (kind === 'image') regularImages++;
      else if (kind === 'zip') zipFiles++;
      else unreadable++;
    }
    if (onProgress && (i % 5 === 0 || i === files.length - 1)) {
      onProgress(i + 1, files.length, 'Leyendo archivos');
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  if (unsupportedCompressed > 0) {
    warnings.push(
      `${unsupportedCompressed} archivo(s) usan compresión (JPEG/JPEG2000/RLE) no soportada. ` +
      `Exporte la serie sin compresión ("Little Endian") desde su estación PACS.`
    );
  }
  if (regularImages > 0) {
    warnings.push(`${regularImages} archivo(s) eran fotos o documentos (JPG/PNG/PDF) y se omitieron.`);
  }
  if (zipFiles > 0) {
    warnings.push(`${zipFiles} archivo(s) .zip: descomprímalos primero y suba su contenido.`);
  }
  if (unreadable > 0) {
    warnings.push(`${unreadable} archivo(s) no eran DICOM válidos y se omitieron.`);
  }
  if (slices.length === 0) {
    if (regularImages > 0) {
      throw new Error(
        'Los archivos seleccionados son fotografías o capturas (JPG/PNG/PDF), no archivos DICOM. ' +
        'Una foto de la tomografía no contiene la información 3D: solo muestra unos pocos cortes ya procesados. ' +
        'Para la reconstrucción 3D necesita los archivos DICOM originales del estudio, que puede pedir en el centro ' +
        'de imágenes (los entregan en CD, USB o por el portal del paciente, normalmente cientos de archivos, uno por corte).'
      );
    }
    if (zipFiles > 0) {
      throw new Error(
        'El archivo es un ZIP comprimido. Descomprímalo primero (manténgalo pulsado → Descomprimir en el teléfono, ' +
        'o clic derecho → Extraer en la computadora) y luego suba la carpeta con los archivos DICOM que contiene.'
      );
    }
    throw new Error('No se encontró ningún corte DICOM legible en los archivos seleccionados.');
  }

  // Agrupar por serie y quedarse con la que más cortes tenga.
  const bySeries = new Map();
  for (const s of slices) {
    if (!bySeries.has(s.seriesUID)) bySeries.set(s.seriesUID, []);
    bySeries.get(s.seriesUID).push(s);
  }
  let series = null;
  for (const arr of bySeries.values()) {
    const count = arr.reduce((n, s) => n + s.frames, 0);
    if (!series || count > series.count) series = { arr, count };
  }
  if (bySeries.size > 1) {
    warnings.push(`Se detectaron ${bySeries.size} series; se cargó la de mayor número de cortes (${series.count}).`);
  }

  const arr = series.arr;
  const ref = arr[0];

  // Comprobar homogeneidad de dimensiones.
  const homog = arr.filter((s) => s.rows === ref.rows && s.cols === ref.cols);
  if (homog.length !== arr.length) {
    warnings.push('Se omitieron cortes con dimensiones distintas al resto de la serie.');
  }

  // Ordenar por posición espacial (proyección sobre la normal del plano).
  const normal = sliceNormal(ref.orientation);
  let sorted = homog;
  if (homog.every((s) => s.position)) {
    for (const s of homog) {
      s.proj = s.position[0] * normal[0] + s.position[1] * normal[1] + s.position[2] * normal[2];
    }
    sorted = homog.slice().sort((a, b) => a.proj - b.proj);
  } else {
    sorted = homog.slice().sort((a, b) => a.instanceNumber - b.instanceNumber);
  }

  // Espaciado entre cortes.
  let dz = null;
  if (sorted.length > 1 && sorted[0].proj !== undefined) {
    const diffs = [];
    for (let i = 1; i < sorted.length; i++) diffs.push(Math.abs(sorted[i].proj - sorted[i - 1].proj));
    dz = median(diffs);
  }
  if (!dz || dz < 1e-3) dz = ref.spacingBetween || ref.sliceThickness || 1;

  const px = ref.pixelSpacing ? ref.pixelSpacing[1] : 1; // columnas (x)
  const py = ref.pixelSpacing ? ref.pixelSpacing[0] : 1; // filas (y)

  const srcNx = ref.cols;
  const srcNy = ref.rows;
  const srcNz = sorted.reduce((n, s) => n + s.frames, 0);

  // Factores de reducción para respetar el presupuesto de vóxeles del dispositivo.
  let fxy = 1;
  let fz = 1;
  const voxelsAt = () =>
    Math.ceil(srcNx / fxy) * Math.ceil(srcNy / fxy) * Math.ceil(srcNz / fz);
  while (Math.ceil(srcNx / fxy) > maxDim || Math.ceil(srcNy / fxy) > maxDim) fxy *= 2;
  while (Math.ceil(srcNz / fz) > maxDim) fz += 1;
  while (voxelsAt() > maxVoxels) {
    if (fxy < 4 && Math.ceil(srcNx / fxy) >= Math.ceil(srcNz / fz)) fxy *= 2;
    else fz += 1;
  }

  const nx = Math.ceil(srcNx / fxy);
  const ny = Math.ceil(srcNy / fxy);
  const nz = Math.ceil(srcNz / fz);
  const data = new Uint8Array(nx * ny * nz);

  const slope = Number.isFinite(ref.slope) ? ref.slope : 1;
  const intercept = Number.isFinite(ref.intercept) ? ref.intercept : 0;

  // Índice global de frame → corte de salida (promediando fz frames consecutivos).
  const accum = new Float32Array(nx * ny);
  const accumCount = new Int32Array(nz);
  let frameIndex = 0;
  let outZ = 0;

  const flushAccum = () => {
    const base = outZ * nx * ny;
    const n = accumCount[outZ] || 1;
    for (let i = 0; i < nx * ny; i++) {
      const hu = accum[i] / n;
      let v = Math.round(((hu + 1024) / 4096) * 255);
      data[base + i] = v < 0 ? 0 : v > 255 ? 255 : v;
    }
    accum.fill(0);
  };

  for (let s = 0; s < sorted.length; s++) {
    const meta = sorted[s];
    const el = meta.pixelDataElement;
    const bytesPerSample = meta.bitsAllocated / 8;
    const frameLen = meta.rows * meta.cols;

    for (let f = 0; f < meta.frames; f++) {
      const offset = el.dataOffset + f * frameLen * bytesPerSample;
      let raw;
      if (meta.bitsAllocated === 8) {
        raw = meta.signed
          ? new Int8Array(meta.byteArray.buffer, meta.byteArray.byteOffset + offset, frameLen)
          : new Uint8Array(meta.byteArray.buffer, meta.byteArray.byteOffset + offset, frameLen);
      } else {
        const byteOffset = meta.byteArray.byteOffset + offset;
        if (byteOffset % 2 === 0) {
          raw = meta.signed
            ? new Int16Array(meta.byteArray.buffer, byteOffset, frameLen)
            : new Uint16Array(meta.byteArray.buffer, byteOffset, frameLen);
        } else {
          const copy = meta.byteArray.slice(offset, offset + frameLen * 2);
          raw = meta.signed ? new Int16Array(copy.buffer) : new Uint16Array(copy.buffer);
        }
      }

      // Reducción XY con promedio de bloque fxy×fxy, acumulando en HU.
      for (let oy = 0; oy < ny; oy++) {
        const y0 = oy * fxy;
        const y1 = Math.min(y0 + fxy, srcNy);
        for (let ox = 0; ox < nx; ox++) {
          const x0 = ox * fxy;
          const x1 = Math.min(x0 + fxy, srcNx);
          let sum = 0;
          let cnt = 0;
          for (let yy = y0; yy < y1; yy++) {
            const rowBase = yy * srcNx;
            for (let xx = x0; xx < x1; xx++) {
              sum += raw[rowBase + xx];
              cnt++;
            }
          }
          accum[oy * nx + ox] += (sum / cnt) * slope + intercept;
        }
      }
      accumCount[outZ]++;
      frameIndex++;

      if (frameIndex % fz === 0 || frameIndex === srcNz) {
        flushAccum();
        outZ++;
        if (outZ >= nz) break;
      }
    }
    if (outZ >= nz) break;

    if (onProgress && s % 8 === 0) {
      onProgress(s + 1, sorted.length, 'Reconstruyendo volumen');
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  if (onProgress) onProgress(sorted.length, sorted.length, 'Reconstruyendo volumen');

  return {
    volume: {
      data,
      dims: [nx, ny, nz],
      spacing: [px * fxy, py * fxy, dz * fz],
      meta: {
        modality: ref.modality,
        studyDescription: ref.studyDescription,
        seriesDescription: ref.seriesDescription,
        studyDate: ref.studyDate,
        sourceDims: [srcNx, srcNy, srcNz],
        downsampled: fxy > 1 || fz > 1,
      },
    },
    warnings,
  };
}
