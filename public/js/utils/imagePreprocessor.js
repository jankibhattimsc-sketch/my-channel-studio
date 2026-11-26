/**
 * Gyan Yatra AI Studio — Interactive Image Preprocessor
 * Features:
 * - 90° / 180° / 270° Rotation
 * - Zoom & Pan
 * - Contrast & Brightness adjustments
 * - Sharpening filter (3x3 convolution kernel)
 * - Intelligent Dark Mode Inversion for OCR
 * - Crop rectangle extraction
 */

/**
 * Applies adjustments to an HTML Image or Canvas and returns a new Canvas.
 * 
 * @param {HTMLImageElement|HTMLCanvasElement} source 
 * @param {Object} options
 * @param {number} options.rotation - 0, 90, 180, 270 degrees
 * @param {number} options.brightness - -100 to 100
 * @param {number} options.contrast - -100 to 100
 * @param {boolean} options.sharpen - whether to apply 3x3 sharpen filter
 * @param {boolean} options.invertForOcr - invert if background is dark
 * @param {Object} options.cropRect - { x, y, width, height } in percentage (0 to 1) or pixels
 */
export function processImageAdjustments(source, options = {}) {
  const {
    rotation = 0,
    brightness = 0,
    contrast = 0,
    sharpen = false,
    invertForOcr = false,
    cropRect = null
  } = options;

  const srcWidth = source.naturalWidth || source.width;
  const srcHeight = source.naturalHeight || source.height;

  // Determine crop dimensions
  let sx = 0, sy = 0, sw = srcWidth, sh = srcHeight;
  if (cropRect && cropRect.width > 0 && cropRect.height > 0) {
    if (cropRect.width <= 1.0 && cropRect.height <= 1.0) {
      // Relative 0.0 - 1.0
      sx = Math.round(cropRect.x * srcWidth);
      sy = Math.round(cropRect.y * srcHeight);
      sw = Math.round(cropRect.width * srcWidth);
      sh = Math.round(cropRect.height * srcHeight);
    } else {
      // Pixel coordinates
      sx = Math.round(cropRect.x);
      sy = Math.round(cropRect.y);
      sw = Math.round(cropRect.width);
      sh = Math.round(cropRect.height);
    }
  }

  // Handle Rotation Dimensions
  const isRotated90or270 = (rotation % 180 !== 0);
  const outWidth = isRotated90or270 ? sh : sw;
  const outHeight = isRotated90or270 ? sw : sh;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, outWidth);
  canvas.height = Math.max(1, outHeight);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  // Apply CSS filters for brightness and contrast
  const bVal = 100 + Number(brightness || 0);
  const cVal = 100 + Number(contrast || 0);
  ctx.filter = `brightness(${bVal}%) contrast(${cVal}%)`;

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(
    source,
    sx, sy, sw, sh,
    -sw / 2, -sh / 2, sw, sh
  );
  ctx.restore();

  // Reset filter
  ctx.filter = 'none';

  // Apply Pixel-level Sharpen or Invert if requested
  if (sharpen || invertForOcr) {
    try {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      // Dark mode inversion check for OCR readability
      if (invertForOcr) {
        let sum = 0;
        const step = Math.max(4, Math.floor(data.length / 5000) * 4);
        let count = 0;
        for (let i = 0; i < data.length; i += step) {
          sum += (data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114);
          count++;
        }
        const avg = sum / (count || 1);
        if (avg < 115) {
          for (let i = 0; i < data.length; i += 4) {
            data[i] = 255 - data[i];
            data[i+1] = 255 - data[i+1];
            data[i+2] = 255 - data[i+2];
          }
        }
      }

      // 3x3 Convolution Sharpen Filter
      if (sharpen) {
        const copy = new Uint8ClampedArray(data);
        const w = canvas.width;
        const h = canvas.height;
        // Kernel:
        // [  0, -1,  0 ]
        // [ -1,  5, -1 ]
        // [  0, -1,  0 ]
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const idx = (y * w + x) * 4;
            const top = ((y - 1) * w + x) * 4;
            const btm = ((y + 1) * w + x) * 4;
            const lft = (y * w + (x - 1)) * 4;
            const rgt = (y * w + (x + 1)) * 4;

            for (let c = 0; c < 3; c++) {
              const val = (copy[idx + c] * 5) - copy[top + c] - copy[btm + c] - copy[lft + c] - copy[rgt + c];
              data[idx + c] = Math.min(255, Math.max(0, val));
            }
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);
    } catch (pixelErr) {
      console.warn('[Image Preprocessor Pixel Notice]:', pixelErr.message);
    }
  }

  return canvas;
}

