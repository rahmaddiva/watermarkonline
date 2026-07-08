from PIL import Image
import os

def watermark_image_file(input_path, watermark_path, output_tiff_path):
    base = Image.open(input_path).convert("RGBA")
    wm = Image.open(watermark_path).convert("RGBA")

    target_w = int(base.width * 0.4)
    ratio = target_w / wm.width
    target_h = int(wm.height * ratio)
    wm = wm.resize((target_w, target_h), Image.LANCZOS)

    x = (base.width - target_w) // 2
    y = (base.height - target_h) // 2

    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    layer.paste(wm, (x, y), wm)
    composited = Image.alpha_composite(base, layer).convert("RGB")
    composited.save(output_tiff_path, format="TIFF")
