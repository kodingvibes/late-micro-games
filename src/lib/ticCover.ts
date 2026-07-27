const coverCache = new Map<string, string>();

const DEFAULT_PALETTE = new Uint8Array([
  0x00, 0x00, 0x00, 0x1d, 0x2b, 0x53, 0x7e, 0x25, 0x53,
  0x00, 0x87, 0x51, 0xab, 0x52, 0x36, 0x5f, 0x57, 0x4f,
  0xc2, 0xc3, 0xc7, 0xff, 0xf1, 0xe8, 0xff, 0x00, 0x4d,
  0xff, 0xa3, 0x00, 0xff, 0xec, 0x27, 0x00, 0xe4, 0x36,
  0x29, 0xad, 0xff, 0x83, 0x76, 0x9c, 0xff, 0x77, 0xa8,
  0xff, 0xcc, 0xaa,
]);

function readLE16(view: DataView, offset: number): number {
  return view.getUint8(offset) | (view.getUint8(offset + 1) << 8);
}

export async function getTicCover(cartUrl: string): Promise<string | null> {
  const cached = coverCache.get(cartUrl);
  if (cached) return cached;

  try {
    const res = await fetch(cartUrl);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const view = new DataView(buf);
    const len = buf.byteLength;

    let palette = DEFAULT_PALETTE;
    let screen: Uint8Array | null = null;

    let offset = 0;
    while (offset + 4 <= len) {
      const headerByte = view.getUint8(offset);
      const type = headerByte & 0x1f;
      const bank = (headerByte >> 5) & 0x07;
      const size = readLE16(view, offset + 1);
      offset += 4;
      const payload = new Uint8Array(buf, offset, size);
      offset += size;

      if (type === 12) palette = payload;
      else if (type === 18 && bank === 0) screen = payload;
    }

    if (!screen || screen.length < 16384) return null;

    const cvs = new OffscreenCanvas(240, 136);
    const ctx = cvs.getContext("2d")!;
    const imageData = ctx.createImageData(240, 136);
    const pixels = imageData.data;

    for (let i = 0; i < 16384; i++) {
      const lo = screen[i] & 0x0f;
      const hi = (screen[i] >> 4) & 0x0f;
      const put = (idx: number, colorIdx: number) => {
        const pi = idx * 4;
        const ci = colorIdx * 3;
        pixels[pi] = palette[ci];
        pixels[pi + 1] = palette[ci + 1];
        pixels[pi + 2] = palette[ci + 2];
        pixels[pi + 3] = 255;
      };
      put(i * 2, lo);
      put(i * 2 + 1, hi);
    }

    ctx.putImageData(imageData, 0, 0);
    const blob = await cvs.convertToBlob({ type: "image/png" });
    const url = URL.createObjectURL(blob);
    coverCache.set(cartUrl, url);
    return url;
  } catch {
    return null;
  }
}
