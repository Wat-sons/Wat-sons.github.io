"""生成 favicon 的 PNG 版本与 Apple Touch Icon。

为什么不引 cairosvg / sharp：那会给构建加一个重依赖。
这里用 Pillow 按同一套几何把图标画一遍 —— 形状只有「环 + 一段曲线 + 一个点」，
手画既准确又没有新依赖。生成后 PNG 直接提交进仓库，构建时不需要 Python。

改了品牌几何要重新跑：python tools/make-icons.py
"""
import os
from PIL import Image, ImageDraw

ROOT = r"D:\Claude Code project\projects\个人主页"
OUT = os.path.join(ROOT, "assets", "favicon")
os.makedirs(OUT, exist_ok=True)

BG = (11, 11, 12, 255)        # --bg
INK = (237, 234, 227, 255)    # --fg
ACC = (216, 255, 74, 255)     # --accent
SS = 8                        # 超采样倍率，抗锯齿

# 与 src/lib/brand.mjs 里 faviconSvg() 完全相同的几何（32×32 坐标系）
RING = (13.6, 13.6, 7.1, 3.2)          # cx, cy, r, stroke
PATH = ((19.3, 19.3), (22.2, 22.2), (24.4, 21.8), (26.4, 20.4))
NODE = (27.4, 19.7, 1.9)               # cx, cy, r


def bez(p0, p1, p2, p3, n=48):
    out = []
    for i in range(n + 1):
        t = i / n
        u = 1 - t
        out.append((u**3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0],
                    u**3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1]))
    return out


def draw_mark(d, k, ox, oy):
    """把 Q + Path 画进 (ox, oy) 起、每单位 k 像素的坐标里"""
    def P(x, y):
        return (ox + x * k, oy + y * k)

    cx, cy, rr, sw = RING
    w = max(1, round(sw * k))
    d.ellipse((*P(cx - rr, cy - rr), *P(cx + rr, cy + rr)), outline=INK, width=w)
    pts = [P(*p) for p in bez(*PATH)]
    d.line(pts, fill=ACC, width=w, joint="curve")
    for p in (pts[0], pts[-1]):
        r = sw * k / 2
        d.ellipse((p[0] - r, p[1] - r, p[0] + r, p[1] + r), fill=ACC)
    nx, ny, nr = NODE
    d.ellipse((*P(nx - nr, ny - nr), *P(nx + nr, ny + nr)), fill=ACC)


def icon(size, inset=0.90, radius_ratio=7 / 32):
    S = size * SS
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, S - 1, S - 1), radius=S * radius_ratio, fill=BG)
    k = S / 32.0 * inset
    off = (S - 32 * k) / 2
    draw_mark(d, k, off, off)
    return im.resize((size, size), Image.LANCZOS)


def apple_icon(size=180):
    S = size * SS
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, S - 1, S - 1), radius=S * 0.22, fill=BG)
    k = S / 32.0 * 0.78
    off = (S - 32 * k) / 2
    draw_mark(d, k, off, off)
    return im.resize((size, size), Image.LANCZOS)


for s in (16, 32):   # 只生成 HTML 真正引用到的两个尺寸
    p = os.path.join(OUT, f"favicon-{s}.png")
    icon(s).save(p, "PNG", optimize=True)
    print(f"  favicon-{s}.png  {os.path.getsize(p)} B")
p = os.path.join(OUT, "apple-touch-icon.png")
apple_icon(180).save(p, "PNG", optimize=True)
print(f"  apple-touch-icon.png  {os.path.getsize(p)/1024:.1f} KB")
icon(512).save(os.path.join(ROOT, "预览", "favicon-512.png"), "PNG")
print("  预览/favicon-512.png  （肉眼复核用）")
