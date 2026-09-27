#!/usr/bin/env python3
"""
Derive images/hero-shot.{webp,png} from the raw images/heroshot.png.

The raw shot is a red-dominant photo (51% red / 21% rose, mean luminance 61)
whose brightest area sits centre-left -- exactly where the hero headline runs.
Pasted in as-is it would fight both the type and the existing .crowd tab-field
mock. So this bakes a treatment instead of stacking CSS filters:

  1. hue is discarded entirely; luminance alone drives colour, through a
     *gradient map* from the page's own tokens (--ground up to a cool grey
     lifted off --ink-faint) whose bright end opens only above the headline. The result cannot introduce an off-palette
     colour, and drops the red that collided with the "overloaded" state.
  2. a vertical alpha ramp holds the image in the top of the hero and fades
     it to fully transparent before the headline gets dense, so the text band
     is composited straight onto --ground. The side note: the headline spans
     ~78% of the viewport width, so there is no free horizontal zone to put
     this in -- dimness is the only real lever.
  3. a mild Gaussian blur drops high-frequency detail so the image reads as
     atmosphere rather than as a photo competing with type.
  4. a gentle rightward weighting balances the existing .ambient__glow, which
     sits at 22% / 30%.

Peak composite under the headline lands near #3F3F3F, ~8.7:1 against --ink.
Re-run after replacing heroshot.png. Committed output, not a build step.
"""
import os
from PIL import Image, ImageFilter, ImageDraw

SRC = "images/heroshot.png"
OUT_WEBP = "images/hero-shot.webp"
OUT_PNG = "images/hero-shot.png"

# --- palette, from :root in assets/css/style.css -----------------------------
DARK = (0x08, 0x09, 0x0C)    # a shade under --ground, for depth
BLUR = 1.5                   # px, at source resolution
GAMMA = 0.92                 # <1 lifts midtones so detail survives the cap

# A gradient map, not a flat duotone. The shot's bright area is centre-left
# and mid-frame, but the headline owns that band -- so the bright end of the
# ramp is allowed to open up only where nothing is set, and closes down as
# the type approaches. Cool grey throughout, pulled off --ink-faint.
LIGHT_STOPS = [(0.00, 0x96, 0x9E, 0xA8),   # open: above the headline
               (0.16, 0x76, 0x7C, 0x84),   # headline band begins
               (0.32, 0x60, 0x66, 0x6D),
               (0.60, 0x50, 0x56, 0x5C),
               (1.00, 0x50, 0x56, 0x5C)]

# Vertical stops: (position in image, alpha). Fades to zero before the subhead,
# which starts at 0.67 of the hero -- so everything below the headline is untouched.
V_STOPS = [(0.00, 1.00), (0.16, 0.74), (0.32, 0.46), (0.48, 0.22), (0.66, 0.08), (0.85, 0.00), (1.00, 0.00)]

# The shot is genuinely low-contrast (mean luminance 61, p95 113) and its top
# region sits at only 44-60, so brightening the ramp alone barely registers.
# Stretching the source's levels first is what actually makes it present:
# top-of-frame peak composite goes 62 -> 92 with no change to the ramp.
LEVELS = (10, 150)            # (black point, white point) applied to source luma
H_RANGE = (0.40, 1.00)       # left -> right; the left edge carries the kicker (small
                          # mono text) and the head of the headline, so it stays quiet

def ramp3(stops, t):
    for (a, *va), (b, *vb) in zip(stops, stops[1:]):
        if a <= t <= b:
            f = 0 if b == a else (t - a) / (b - a)
            return tuple(va[i] + (vb[i] - va[i]) * f for i in range(3))
    return tuple(stops[0][1:] if t < stops[0][0] else stops[-1][1:])

def ramp(stops, t):
    for (a, va), (b, vb) in zip(stops, stops[1:]):
        if a <= t <= b:
            f = 0 if b == a else (t - a) / (b - a)
            return va + (vb - va) * f
    return stops[-1][1] if t > stops[-1][0] else stops[0][1]

def main():
    src = Image.open(SRC).convert("RGB")
    W, H = src.size
    print(f"  source {W}x{H}")

    # 1. luminance -> duotone ramp
    flat = src.resize((W // 2, H // 2), Image.BILINEAR)
    w, h = flat.size
    px = flat.load()
    out = Image.new("RGBA", (w, h))
    op = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
            t = min(1.0, max(0.0, (luma - LEVELS[0]) / (LEVELS[1] - LEVELS[0]))) ** GAMMA
            hi = ramp3(LIGHT_STOPS, y / (h - 1))
            op[x, y] = tuple(round(DARK[i] + (hi[i] - DARK[i]) * t) for i in range(3)) + (255,)

    # 2/4. vertical ramp x gentle rightward weighting -> alpha
    a = out.getchannel("A")
    ap = a.load()
    for y in range(h):
        vy = ramp(V_STOPS, y / (h - 1))
        for x in range(w):
            vx = H_RANGE[0] + (H_RANGE[1] - H_RANGE[0]) * (x / (w - 1))
            ap[x, y] = round(255 * vy * vx)

    # 3. soften detail (colour channels only; alpha ramp stays crisp)
    rgb = out.convert("RGB").filter(ImageFilter.GaussianBlur(BLUR * 0.5))
    out = rgb.convert("RGBA")
    out.putalpha(a)

    out = out.resize((W, H), Image.BICUBIC)

    out.save(OUT_WEBP, "WEBP", quality=72, method=6)
    out.save(OUT_PNG, "PNG", optimize=True)

    for p in (OUT_WEBP, OUT_PNG):
        print(f"  {p:<24} {os.path.getsize(p):>8,} bytes")

if __name__ == "__main__":
    main()
