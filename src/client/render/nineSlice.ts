/**
 * Pinta una caja nine-slice en un canvas con píxeles exactos: esquinas intactas y
 * tramos de borde REPETIDOS (no estirados) desde la esquina superior izquierda, como
 * en las cajas originales. El centro es un color liso y se rellena con él.
 * Lo usan las ventanas de Phaser (scenes/stage.ts → pmdWindow); en el DOM hace lo
 * mismo `border-image … repeat` (style.css, .win).
 */
export function paintNineSlice(ctx: CanvasRenderingContext2D, img: CanvasImageSource & { width: number; height: number }, w: number, h: number, slice: number) {
  const sw = img.width, sh = img.height;
  const tw = sw - 2 * slice, th = sh - 2 * slice; // tramo repetible
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, w, h);
  // Centro.
  ctx.drawImage(img, slice, slice, tw, th, slice, slice, w - 2 * slice, h - 2 * slice);
  // Bordes superior e inferior.
  for (let x = slice; x < w - slice; x += tw) {
    const cw = Math.min(tw, w - slice - x);
    ctx.drawImage(img, slice, 0, cw, slice, x, 0, cw, slice);
    ctx.drawImage(img, slice, sh - slice, cw, slice, x, h - slice, cw, slice);
  }
  // Bordes izquierdo y derecho.
  for (let y = slice; y < h - slice; y += th) {
    const ch = Math.min(th, h - slice - y);
    ctx.drawImage(img, 0, slice, slice, ch, 0, y, slice, ch);
    ctx.drawImage(img, sw - slice, slice, slice, ch, w - slice, y, slice, ch);
  }
  // Esquinas.
  ctx.drawImage(img, 0, 0, slice, slice, 0, 0, slice, slice);
  ctx.drawImage(img, sw - slice, 0, slice, slice, w - slice, 0, slice, slice);
  ctx.drawImage(img, 0, sh - slice, slice, slice, 0, h - slice, slice, slice);
  ctx.drawImage(img, sw - slice, sh - slice, slice, slice, w - slice, h - slice, slice, slice);
}
