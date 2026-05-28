"""
Generate minimal PNG icons for StyleSnap extension.
Pure stdlib — no Pillow needed.
"""
import struct, zlib, math, os

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'src', 'assets', 'icons')
os.makedirs(OUT_DIR, exist_ok=True)

def make_png(pixels: bytes, size: int) -> bytes:
    """Encode raw RGBA pixels as PNG."""
    def crc32(data):
        return zlib.crc32(data) & 0xffffffff

    def chunk(tag: bytes, data: bytes) -> bytes:
        c = struct.pack('>I', len(data)) + tag + data
        return c + struct.pack('>I', crc32(tag + data))

    ihdr = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    # Build raw scanlines: filter byte 0 + RGBA row
    raw = bytearray()
    for y in range(size):
        raw.append(0)
        raw.extend(pixels[y * size * 4 : (y + 1) * size * 4])
    idat_data = zlib.compress(bytes(raw), 9)

    return (
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', ihdr)
        + chunk(b'IDAT', idat_data)
        + chunk(b'IEND', b'')
    )

def render_icon(size: int) -> bytes:
    """Rasterize a rounded-square icon with a white 'S' letter."""
    pixels = bytearray(size * size * 4)
    cx = cy = size / 2

    for y in range(size):
        for x in range(size):
            off = (y * size + x) * 4
            dx = x - cx + 0.5
            dy = y - cy + 0.5

            # Superellipse background (n=5 for smooth rounded square)
            r = size * 0.40
            n = 5
            val = (abs(dx / r) ** n) + (abs(dy / r) ** n)
            if val > 1.0:
                continue  # transparent

            # Indigo→purple gradient
            t = (x / size * 0.5 + y / size * 0.5)
            R = int(0x4f + (0x7c - 0x4f) * t)
            G = int(0x46 + (0x3a - 0x46) * t)
            B = int(0xe5 + (0xed - 0xe5) * t)
            pixels[off]     = R
            pixels[off + 1] = G
            pixels[off + 2] = B
            pixels[off + 3] = 255

            # Normalised coords for letter drawing (0..1 within bounding circle)
            nx = dx / r  # -1..1
            ny = dy / r

            # Draw a simple "S" shape using rectangles in normalised space
            # All coords: nx in (-1, 1), ny in (-1, 1), top=-1, bottom=+1
            def rect(x0, y0, x1, y1):
                return x0 <= nx <= x1 and y0 <= ny <= y1

            # Top horizontal bar
            if rect(-0.42, -0.78, 0.42, -0.48):
                pixels[off:off+4] = [255,255,255,255]; continue
            # Upper-left vertical
            if rect(-0.56, -0.78, -0.24, -0.05):
                pixels[off:off+4] = [255,255,255,255]; continue
            # Middle bar
            if rect(-0.42, -0.14, 0.42,  0.16):
                pixels[off:off+4] = [255,255,255,255]; continue
            # Lower-right vertical
            if rect(0.24,  0.05, 0.56,  0.78):
                pixels[off:off+4] = [255,255,255,255]; continue
            # Bottom bar
            if rect(-0.42,  0.48, 0.42,  0.78):
                pixels[off:off+4] = [255,255,255,255]; continue

    return make_png(bytes(pixels), size)

for size in (16, 48, 128):
    data = render_icon(size)
    path = os.path.join(OUT_DIR, f'icon{size}.png')
    with open(path, 'wb') as f:
        f.write(data)
    print(f'  icon{size}.png  {len(data):,} bytes')

print('Done.')
