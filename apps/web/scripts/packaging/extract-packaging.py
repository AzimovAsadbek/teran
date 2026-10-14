"""
Renders the TERAN packaging print files (CorelDRAW PDF exports supplied by the owner) into the
intermediate images that build-packaging-assets.mjs turns into web assets.

  python3 scripts/packaging/extract-packaging.py <folder with 2025.pdf 8009.pdf 8810.pdf 8830.pdf> <out dir>

Requires Python 3 and PyMuPDF (pip install pymupdf). Colours are converted with the files' own
ICC profile (ISO Coated v2) so they match the print proof. Nothing is redrawn: every output is a
render or an embedded image of the original artwork.

Outputs (in <out dir>):
  <code>-front.png / <code>-back.png   page 1 and 2 at 300 dpi
  <code>-window.json                  outline of the front's transparent window (300 dpi pixels)
  logo.png                            the logo lockup alone, at 1200 dpi, on the page's white
  lake.png, terraces.png, sprig-*.png embedded artworks (landscape, tea-leaf cut-outs)
  calligraphy.svg, icons.svg          vector ornaments (绿茶 with the 茶叶 seal; the four icons)
"""
import json
import os
import sys

import fitz  # PyMuPDF

fitz.TOOLS.set_icc(True)

PACKS = {'XC2025': '2025.pdf', '8009': '8009.pdf', 'G8810': '8810.pdf', '8830': '8830.pdf'}
DPI = 300
LOGO_DPI = 1200
# Regions on the XC2025 front (PDF points, top-left origin), measured on the proof.
LOGO_RECT = fitz.Rect(150, 40, 447, 330)
CALLIGRAPHY_RECT = fitz.Rect(470, 100, 560, 285)
ICONS_RECT = fitz.Rect(100, 480, 490, 585)


def area(rect):
    return rect.width * rect.height


def window_outline(page, scale):
    """
    The largest near-black fill wider than half the page: the window marked for clear film. Only
    shapes on the page count: the files also hold copies of the artwork off the page.
    """
    best = None
    for drawing in page.get_drawings():
        fill = drawing.get('fill')
        rect = fitz.Rect(drawing['rect'])
        if fill is None or max(fill) > 0.15 or rect.width < page.rect.width * 0.5:
            continue
        if not page.rect.contains(rect):
            continue
        if best is None or area(rect) > area(fitz.Rect(best['rect'])):
            best = drawing
    if best is None:
        raise SystemExit('window outline not found')
    return {'d': path_data(best, scale), 'rect': [v * scale for v in best['rect']]}


def path_data(drawing, scale=1.0, origin=(0.0, 0.0)):
    ox, oy = origin

    def pt(p):
        return f'{(p.x - ox) * scale:.2f} {(p.y - oy) * scale:.2f}'

    parts, last = [], None
    for item in drawing['items']:
        op = item[0]
        if op in ('l', 'c'):
            start = item[1]
            if last is None or abs(start.x - last.x) > 0.01 or abs(start.y - last.y) > 0.01:
                parts.append('M' + pt(start))
            if op == 'l':
                parts.append('L' + pt(item[2]))
                last = item[2]
            else:
                parts.append('C' + ' '.join(pt(p) for p in item[2:5]))
                last = item[4]
        elif op == 're':
            r = item[1]
            parts.append(f'M{pt(r.tl)}L{pt(r.tr)}L{pt(r.br)}L{pt(r.bl)}Z')
            last = None
        elif op == 'qu':
            q = item[1]
            parts.append(f'M{pt(q.ul)}L{pt(q.ur)}L{pt(q.lr)}L{pt(q.ll)}Z')
            last = None
    if drawing.get('closePath'):
        parts.append('Z')
    return ''.join(parts)


def hex_colour(colour):
    return '#' + ''.join(f'{max(0, min(255, round(c * 255))):02x}' for c in colour)


def region_svg(page, rect):
    """The vector paths fully inside rect, as an SVG in the region's own coordinates (points)."""
    paths = []
    for drawing in page.get_drawings():
        if drawing.get('fill') is None or not rect.contains(fitz.Rect(drawing['rect'])):
            continue
        rule = ' fill-rule="evenodd"' if drawing.get('even_odd') else ''
        paths.append(
            f'<path d="{path_data(drawing, 1.0, (rect.x0, rect.y0))}" '
            f'fill="{hex_colour(drawing["fill"])}"{rule}/>'
        )
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {rect.width:.2f} {rect.height:.2f}">'
        + ''.join(paths)
        + '</svg>'
    )


def embedded_image(doc, xref, dest):
    pix = fitz.Pixmap(doc, xref)
    if pix.colorspace and pix.colorspace.n != 3:
        pix = fitz.Pixmap(fitz.csRGB, pix)
    smask = doc.extract_image(xref).get('smask', 0)
    if smask:
        base = fitz.Pixmap(pix, 0) if pix.alpha else pix
        pix = fitz.Pixmap(base, fitz.Pixmap(doc, smask))
    pix.save(dest)
    print(dest, pix.width, pix.height)


def largest_image(page, within):
    """xref of the largest image placed (directly) inside the given page rectangle."""
    best = None
    for info in page.get_image_info(xrefs=True):
        box = fitz.Rect(info['bbox'])
        if info['xref'] and within.contains(box):
            if best is None or area(box) > best[1]:
                best = (info['xref'], area(box))
    return best[0] if best else None


def isolated_logo(path, dest):
    """The logo region with every background form or image that reaches outside it removed."""
    doc = fitz.open(path)
    page = doc[0]
    height = page.rect.height
    for xref, _name, _invoker, bbox in page.get_xobjects():
        box = fitz.Rect(bbox[0], height - bbox[3], bbox[2], height - bbox[1])
        if box.intersects(LOGO_RECT) and not LOGO_RECT.contains(box):
            doc.update_stream(xref, b'')
    blank = fitz.Pixmap(fitz.csRGB, fitz.IRect(0, 0, 1, 1), True)
    blank.clear_with(0)
    for info in page.get_image_info(xrefs=True):
        box = fitz.Rect(info['bbox'])
        if info['xref'] and box.intersects(LOGO_RECT) and not LOGO_RECT.contains(box):
            page.replace_image(info['xref'], pixmap=blank)
    pix = page.get_pixmap(dpi=LOGO_DPI, clip=LOGO_RECT, alpha=False)
    pix.save(dest)
    print(dest, pix.width, pix.height)


def main():
    source, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    scale = DPI / 72
    for code, name in PACKS.items():
        doc = fitz.open(os.path.join(source, name))
        front, back = doc[0], doc[1]
        for page, side in ((front, 'front'), (back, 'back')):
            dest = os.path.join(out, f'{code}-{side}.png')
            pix = page.get_pixmap(dpi=DPI, alpha=False)
            pix.save(dest)
            print(dest, pix.width, pix.height)
        with open(os.path.join(out, f'{code}-window.json'), 'w') as handle:
            json.dump(window_outline(front, scale), handle)

    xc = os.path.join(source, PACKS['XC2025'])
    isolated_logo(xc, os.path.join(out, 'logo.png'))
    doc = fitz.open(xc)
    front, back = doc[0], doc[1]
    with open(os.path.join(out, 'calligraphy.svg'), 'w') as handle:
        handle.write(region_svg(front, CALLIGRAPHY_RECT))
    with open(os.path.join(out, 'icons.svg'), 'w') as handle:
        handle.write(region_svg(front, ICONS_RECT))
    # Embedded artworks: the front's lake landscape, the back's tea terraces and leaf sprigs.
    embedded_image(doc, largest_image(front, fitz.Rect(-1, 100, 597, 700)), os.path.join(out, 'lake.png'))
    embedded_image(doc, largest_image(back, fitz.Rect(0, 100, 600, 420)), os.path.join(out, 'terraces.png'))
    sprigs = sorted(
        {i['xref'] for i in back.get_image_info(xrefs=True)
         if i['xref'] and fitz.Rect(i['bbox']).y0 > 600 and fitz.Rect(i['bbox']).x1 < 200},
    )
    for index, xref in enumerate(sprigs):
        embedded_image(doc, xref, os.path.join(out, f'sprig-{index + 1}.png'))


if __name__ == '__main__':
    main()
