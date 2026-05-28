/**
 * generate-icons.js — minimal PNG icon generator (zero dependencies)
 * Generates valid PNG files with a styled "S" letter icon.
 */
const fs   = require('fs')
const path = require('path')
const zlib = require('zlib')

const OUT_DIR = path.join(__dirname, '../public/icons')
fs.mkdirSync(OUT_DIR, { recursive: true })

// ── Minimal PNG encoder ───────────────────────────────────────────────────────
function uint32BE(n) {
  const b = Buffer.allocUnsafe(4)
  b.writeUInt32BE(n, 0)
  return b
}

function chunk(type, data) {
  const typeB = Buffer.from(type, 'ascii')
  const len   = uint32BE(data.length)
  const crcBuf = Buffer.concat([typeB, data])
  let crc = 0xffffffff
  for (const byte of crcBuf) {
    crc ^= byte
    for (let i = 0; i < 8; i++) crc = (crc & 1) ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
  }
  crc ^= 0xffffffff
  const crcB = uint32BE(crc >>> 0)
  return Buffer.concat([len, typeB, data, crcB])
}

function makePNG(pixels, size) {
  // pixels: Uint8Array of RGBA values, row by row
  const IHDR = chunk('IHDR', Buffer.concat([
    uint32BE(size), uint32BE(size),
    Buffer.from([8, 2, 0, 0, 0]),  // bit depth 8, color type RGB (2)
  ]))
  // Actually use RGBA (color type 6)
  const ihdrData = Buffer.concat([
    uint32BE(size), uint32BE(size),
    Buffer.from([8, 6, 0, 0, 0]),
  ])
  const IHDRchunk = chunk('IHDR', ihdrData)

  // Raw image data: filter byte (0) + row RGBA data
  const rowSize   = size * 4
  const rawRows   = Buffer.allocUnsafe(size * (rowSize + 1))
  for (let y = 0; y < size; y++) {
    rawRows[y * (rowSize + 1)] = 0  // filter type None
    for (let x = 0; x < size; x++) {
      const srcOff = (y * size + x) * 4
      const dstOff = y * (rowSize + 1) + 1 + x * 4
      rawRows[dstOff]     = pixels[srcOff]
      rawRows[dstOff + 1] = pixels[srcOff + 1]
      rawRows[dstOff + 2] = pixels[srcOff + 2]
      rawRows[dstOff + 3] = pixels[srcOff + 3]
    }
  }
  const compressed = zlib.deflateSync(rawRows)
  const IDATchunk  = chunk('IDAT', compressed)
  const IENDchunk  = chunk('IEND', Buffer.alloc(0))
  const sig        = Buffer.from([137,80,78,71,13,10,26,10])
  return Buffer.concat([sig, IHDRchunk, IDATchunk, IENDchunk])
}

// ── Rasterize the "S" icon ────────────────────────────────────────────────────
function renderIcon(size) {
  const pixels = new Uint8Array(size * size * 4)

  const cx = size / 2
  const cy = size / 2
  const r  = size * 0.42   // outer radius of rounded rect

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const off = (y * size + x) * 4
      const dx  = x - cx
      const dy  = y - cy

      // Background: superellipse (rounded square)
      const n   = 4
      const val = Math.pow(Math.abs(dx / r), n) + Math.pow(Math.abs(dy / r), n)
      if (val <= 1) {
        // Gradient: indigo(top-left) → purple(bottom-right)
        const t = (x / size + y / size) / 2
        pixels[off]     = Math.round(0x4f + (0x7c - 0x4f) * t)  // R
        pixels[off + 1] = Math.round(0x46 + (0x3a - 0x46) * t)  // G
        pixels[off + 2] = Math.round(0xe5 + (0xed - 0xe5) * t)  // B
        pixels[off + 3] = 255

        // "S" letter: simple mask-based approach
        const nx = dx / r + 0.5
        const ny = dy / r + 0.5

        // Top bar of S
        if (ny > 0.05 && ny < 0.18 && nx > -0.25 && nx < 0.35) {
          pixels[off] = 255; pixels[off+1] = 255; pixels[off+2] = 255
        }
        // Middle bar of S
        if (ny > 0.41 && ny < 0.54 && nx > -0.35 && nx < 0.25) {
          pixels[off] = 255; pixels[off+1] = 255; pixels[off+2] = 255
        }
        // Bottom bar of S
        if (ny > 0.77 && ny < 0.90 && nx > -0.35 && nx < 0.25) {
          pixels[off] = 255; pixels[off+1] = 255; pixels[off+2] = 255
        }
        // Left side top
        if (nx > -0.45 && nx < -0.30 && ny > 0.05 && ny < 0.54) {
          pixels[off] = 255; pixels[off+1] = 255; pixels[off+2] = 255
        }
        // Right side bottom
        if (nx > 0.20 && nx < 0.35 && ny > 0.41 && ny < 0.90) {
          pixels[off] = 255; pixels[off+1] = 255; pixels[off+2] = 255
        }
      }
    }
  }
  return pixels
}

for (const size of [16, 48, 128]) {
  const pixels = renderIcon(size)
  const png    = makePNG(pixels, size)
  const file   = path.join(OUT_DIR, `icon${size}.png`)
  fs.writeFileSync(file, png)
  console.log(`✓  icon${size}.png  (${png.length} bytes)`)
}
