# tablox.github.io

The landing page for [Tablox](https://github.com/gettablox/tablox) — a minimal
browser signal showing how much browser context is currently open.

Static HTML, CSS and JavaScript. No build step, no dependencies, no framework.
GitHub Pages serves the repository root as-is.

```
index.html                    the whole page
assets/css/style.css          all styling
assets/js/main.js             the checkup demo, the hero tab field, reveals
images/                       placeholders and the OG cover
favicon.svg                   the Tablox icon
sitemap.xml
.nojekyll
```

## Local preview

Any static server works. From this directory:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Opening `index.html` straight off the filesystem also works — nothing here
needs a server.

## The five states live in two places

The state table, the colours and the popup copy are transcribed from the
extension's `src/shared/state.js`. Two files to keep in sync:

| Where | What |
| --- | --- |
| `assets/css/style.css` | the five colours as `--focused` … `--overloaded`, plus each state's darker `--*-icon` sibling |
| `assets/js/main.js` | the `STATES` table — thresholds, colours, range labels, popup copy, toast copy |

The `iconColor` and `badgeText` values are not hand-picked. The extension
derives them by darkening each hue to a fixed relative luminance so the toolbar
icon holds roughly 4:1 against both a light and a dark Chrome toolbar. The values
here were produced by running that module, so if a hue changes there, re-run it
and copy the new derived values across:

```bash
cd ../tablox && node --input-type=module -e "
import { STATES } from './src/shared/state.js';
console.table(STATES.map(({id,label,color,iconColor,badgeText,range}) =>
  ({id,label,color,iconColor,badgeText,range})));
"
```

## Replacing the image placeholders

Every image is a labelled test card, sized to the frame it sits in. Swap the
`src` in `index.html` and the new file will drop straight in.

| Placeholder | Size | Shows |
| --- | --- | --- |
| `images/placeholder-popup.svg` | 416 × 260 | The extension popup. |
| `images/placeholder-toast.svg` | 416 × 260 | The in-page toast. |
| `images/placeholder-privacy.svg` | 416 × 260 | Permissions / privacy. |

None of these three shows the toolbar state indicator, so the page currently
has no image of the product as it actually appears in a browser. If you want
that back, commission a toolbar screenshot and drop it into section 02 — that
frame is gone, so it needs a new wrapper rather than just a new `src`.

### The social card

`images/og-cover.png` (1200 × 630) is what link previews use. It is rasterised
from `images/og-cover.svg`. On macOS:

```bash
qlmanage -t -s 1200 -o /tmp images/og-cover.svg   # renders 1200 × 1200, padded
```

`qlmanage` always squares the output, so the committed PNG was produced by
rendering the art inside a 1200 × 1200 canvas and cropping the middle 630 rows.
Re-do it the same way, or replace the PNG outright — most platforms will not
render an SVG for `og:image`.

## The checkup demo

Section 01 is not a video or a looping GIF. It is the product's own logic
running in the page: move the dial and the mock toolbar icon, the badge, the
mock popup and the toast all resolve from the same thresholds the extension
uses. Click any row in the table below it to jump the dial into that band.

The hero does the same thing on scroll — the window behind the headline fills
with tabs as you read, and the page's accent colour walks the five states from
green to red. It is the extension's colour walk at about twenty times the speed.

## Accessibility and motion

- The five state colours all clear 4.5:1 against the `#0a0b0d` ground, so the
  table is legible without relying on the chip alone — every row also carries a
  range, a name and a sentence.
- `prefers-reduced-motion` removes the tab field, the sweep and the reveals.
- `prefers-contrast: more` strengthens the rules and lifts the dim greys.
- The dial is a real `<input type="range">`, the state rows are keyboard
  operable, and the live state line is an `aria-live` region.
- Printing drops the chrome and leaves a plain report.

## Deploying

This is the `gettablox` organisation's user site — the repository is named
`gettablox.github.io`, which is what makes the bare `gettablox.github.io` domain
resolve here rather than at a project sub-path. Pages builds `main` from the
repository root. If it is ever off:

```bash
gh api -X POST repos/gettablox/gettablox.github.io/pages --input - <<'JSON'
{"source": {"branch": "main", "path": "/"}}
JSON
```

The site is at <https://gettablox.github.io/>.

The canonical URL, `og:url` and `sitemap.xml` all carry that same address, and
both `og:image` paths are absolute for the same reason. If the repository is
ever renamed or moved, all six need updating together — a relative `og:image`
silently fails to render in most link previews, because scrapers fetch it
without a base URL.

### Why not `tablox.github.io`?

That domain belongs to an unrelated GitHub account and is not available. An
organisation has to be named after the domain you want, so the closest clean
root was `gettablox.github.io`.

## Note on the science section

Section 03 is deliberately non-citational. It makes the modest claim the
extension's own README makes — that tabs are used as external memory, and that
there is no magic number — and stops there. No paper titles, authors or years
have been invented. If you want references, they belong in this section and
nowhere else.
