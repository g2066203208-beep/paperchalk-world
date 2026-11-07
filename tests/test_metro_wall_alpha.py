"""Ensure illustrated 2.5D metro wall is REALLY transparent at five windows."""
from pathlib import Path
from PIL import Image
root = Path(__file__).resolve().parents[1]
p = root / "site/assets/metro/side/cabin-master-illustrated.webp"
assert p.exists(), "Authored 2.5D train texture absent"
with Image.open(p) as image:
    assert image.size == (2172, 724), image.size
    assert image.mode == "RGBA", "Windows must carry a real alpha channel"
    # Passenger-door glass (four) and central bench window (one).
    for coord in [(300, 320), (500, 320), (1060, 320),
                  (1670, 320), (1870, 320), (1050, 708)]:
        assert image.getpixel(coord)[3] <= 20, f"{coord}: painted checkerboard"
    # Frames, signage and bench must remain full-opacity.
    for coord in [(700, 320), (1440, 310), (1080, 80),
                  (1080, 550), (110, 310)]:
        assert image.getpixel(coord)[3] >= 235, f"{coord}: clipped wall"
    print("METRO WALL: five true alpha cutout windows, intact frame, 3:1 aspect")
