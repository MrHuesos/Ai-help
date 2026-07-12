# Visor 3D de Tomografía de Tórax

Aplicación web que reconstruye una **Tomografía Axial Computarizada (TAC)** de tórax
en **3D** a partir de una serie de archivos **DICOM**, y permite explorarla por
partes del cuerpo, seccionarla e interactuar con ella. Funciona en **teléfonos y
computadoras** y **todo el procesamiento ocurre en el dispositivo** (las imágenes
nunca salen del navegador).

## Qué hace

- **Carga de estudios DICOM**: arrastre la carpeta de la serie o seleccione los
  archivos. Se ordenan los cortes por su posición espacial y se reconstruye el
  volumen 3D.
- **Reconstrucción 3D por volumen (raymarching, WebGL2)** con sombreado por
  gradiente y modo *rayos X* (MIP).
- **Separación por partes del cuerpo**: cada tejido es un canal independiente que
  se enciende/apaga y cuya opacidad se ajusta, clasificado por densidad (HU):
  - Pulmones y vías aéreas
  - Grasa
  - Tejido blando / órganos
  - Vasos / contraste
  - Huesos (costillas, columna, esternón)
- **Seccionar**: planos de corte en los tres ejes (izq↔der, ant↔post, inf↔sup)
  para mirar dentro del cuerpo.
- **Interacción**: rotar, acercar y desplazar con ratón o gestos táctiles; vistas
  predefinidas (frente, espalda, laterales, superior, inferior); etiquetas de
  orientación anatómica (A/P/L/R/S/I); captura de pantalla en PNG.
- **Cortes 2D (MPR)**: visor de planos axial, coronal y sagital con ventanas
  radiológicas (pulmón, mediastino, hueso).
- **Adaptación al dispositivo**: en móviles se reduce la resolución del volumen y
  el número de pasos del render para mantener la fluidez; el panel de controles se
  convierte en un cajón lateral.

## Cómo usar

1. Abra `index.html` servido por HTTP (por módulos ES necesita un servidor, no
   `file://`). Por ejemplo:
   ```bash
   python3 -m http.server 8000
   ```
   y visite `http://localhost:8000`.
2. Pulse **Seleccionar carpeta** y elija el directorio de la serie DICOM, o
   arrástrelo sobre la zona de carga. También puede pulsar **Ver demostración**
   para cargar un modelo torácico sintético sin necesidad de archivos.
3. Use el panel **Partes del cuerpo** para aislar tejidos, **Seccionar** para
   recortar y las **Vistas** para orientar la cámara. La pestaña **Cortes 2D**
   muestra los planos originales.

## Formato de imagen soportado

- DICOM **sin comprimir**: *Implicit/Explicit VR Little Endian*
  (`1.2.840.10008.1.2` y `1.2.840.10008.1.2.1`).
- Las series comprimidas (JPEG, JPEG 2000, RLE) no se decodifican en el navegador;
  expórtelas sin compresión desde la estación PACS. La aplicación avisa cuando
  detecta cortes comprimidos.

## Estructura

```
index.html              Interfaz y punto de entrada (import map de three.js)
styles.css              Estilos (tema oscuro, responsivo, safe-area móvil)
js/app.js               Orquestación de UI, tejidos, cortes y carga
js/dicom-loader.js      Parseo DICOM y reconstrucción del volumen normalizado
js/volume-renderer.js   Render volumétrico 3D (three.js + shader de raymarching)
js/slice-viewer.js      Visor 2D multiplanar (axial/coronal/sagital)
js/phantom.js           Fantoma torácico sintético para demostración
vendor/                 three.js, OrbitControls y dicom-parser (locales)
```

## Aviso

Herramienta de **apoyo a la visualización** con fines educativos y de exploración.
**No** sustituye el diagnóstico médico ni las estaciones de trabajo clínicas
certificadas. La clasificación por rangos de densidad (HU) es una aproximación y no
constituye una segmentación anatómica validada.
