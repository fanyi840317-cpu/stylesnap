/**
 * Annotator
 * Uses chrome.tabs.captureVisibleTab to take a screenshot,
 * then draws measurement annotations on a Canvas
 */

export interface AnnotationElement {
  selector: string
  rect: DOMRect
  styles: {
    backgroundColor: string
    color: string
    fontFamily: string
    fontSize: string
    fontWeight: string
    borderRadius: string
  }
}

export interface AnnotationOptions {
  showDimensions: boolean
  showColors: boolean
  showFonts: boolean
  showSpacing: boolean
}

const DEFAULT_OPTIONS: AnnotationOptions = {
  showDimensions: true,
  showColors: true,
  showFonts: true,
  showSpacing: true,
}

/**
 * Collect all annotatable elements on the page
 */
export function collectAnnotatableElements(selector = '*'): AnnotationElement[] {
  const elements = document.querySelectorAll(selector)
  const results: AnnotationElement[] = []

  for (const el of Array.from(elements)) {
    const tag = el.tagName.toLowerCase()
    if (['script', 'style', 'head', 'meta', 'link', 'noscript'].includes(tag)) continue

    const rect = el.getBoundingClientRect()
    // Skip invisible or zero-size elements
    if (rect.width === 0 || rect.height === 0) continue
    if (rect.bottom < 0 || rect.top > window.innerHeight) continue

    const computed = window.getComputedStyle(el)

    results.push({
      selector: el.id ? `#${el.id}` : el.tagName.toLowerCase(),
      rect,
      styles: {
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        fontFamily: computed.fontFamily.split(',')[0].trim().replace(/['"]/g, ''),
        fontSize: computed.fontSize,
        fontWeight: computed.fontWeight,
        borderRadius: computed.borderRadius,
      },
    })
  }

  return results
}

/**
 * Draw annotations on a canvas over a screenshot
 * Called in the side panel after screenshot is captured
 */
export function drawAnnotations(
  canvas: HTMLCanvasElement,
  screenshotDataUrl: string,
  elements: AnnotationElement[],
  options: AnnotationOptions = DEFAULT_OPTIONS,
  devicePixelRatio = 1
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Cannot get canvas context'))

      // Draw screenshot
      ctx.drawImage(img, 0, 0)

      const scale = devicePixelRatio

      // Draw annotations for selected elements
      for (const el of elements) {
        const { rect, styles } = el
        const x = rect.left * scale
        const y = rect.top * scale + window.scrollY * scale
        const w = rect.width * scale
        const h = rect.height * scale

        if (w < 10 || h < 10) continue

        // Highlight border
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)' // blue-500
        ctx.lineWidth = 1.5
        ctx.setLineDash([4, 2])
        ctx.strokeRect(x, y, w, h)
        ctx.setLineDash([])

        if (options.showDimensions) {
          drawDimensionLabel(ctx, x, y, w, h, scale)
        }

        if (options.showColors) {
          drawColorSwatch(ctx, x, y, styles.backgroundColor, styles.color)
        }

        if (options.showFonts) {
          drawFontLabel(ctx, x, y + h, styles.fontFamily, styles.fontSize, styles.fontWeight)
        }
      }

      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = reject
    img.src = screenshotDataUrl
  })
}

function drawDimensionLabel(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  _scale: number
) {
  const label = `${Math.round(w)}×${Math.round(h)}`
  const padding = 3
  const fontSize = 10

  ctx.font = `${fontSize}px monospace`
  const textWidth = ctx.measureText(label).width

  // Background pill
  ctx.fillStyle = 'rgba(59, 130, 246, 0.9)'
  ctx.beginPath()
  ctx.roundRect(x + w / 2 - textWidth / 2 - padding, y - fontSize - padding * 2, textWidth + padding * 2, fontSize + padding * 2, 3)
  ctx.fill()

  // Text
  ctx.fillStyle = 'white'
  ctx.fillText(label, x + w / 2 - textWidth / 2, y - padding)
}

function drawColorSwatch(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  bgColor: string, textColor: string
) {
  const swatchSize = 12
  const gap = 2

  // Background color swatch
  if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
    ctx.fillStyle = bgColor
    ctx.fillRect(x, y + gap, swatchSize, swatchSize)
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'
    ctx.lineWidth = 0.5
    ctx.strokeRect(x, y + gap, swatchSize, swatchSize)
  }

  // Text color swatch
  if (textColor && textColor !== 'rgba(0, 0, 0, 0)') {
    ctx.fillStyle = textColor
    ctx.fillRect(x + swatchSize + gap, y + gap, swatchSize, swatchSize)
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'
    ctx.lineWidth = 0.5
    ctx.strokeRect(x + swatchSize + gap, y + gap, swatchSize, swatchSize)
  }
}

function drawFontLabel(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  fontFamily: string, fontSize: string, fontWeight: string
) {
  if (!fontFamily || !fontSize) return

  const label = `${fontFamily} ${fontSize} w${fontWeight}`
  const textSize = 9

  ctx.font = `${textSize}px monospace`
  ctx.fillStyle = 'rgba(107, 114, 128, 0.9)' // gray-500
  ctx.fillText(label, x, y + textSize + 2)
}
