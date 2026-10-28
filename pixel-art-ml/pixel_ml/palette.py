"""Deliberate small palette and nearest-neighbour palette projection."""
import numpy as np

# Hand-picked neutral teaching palette. This is not a game asset or a sampled
# palette from a copyrighted commercial game.
PALETTE = np.array([
    [14, 20, 34],   # near black
    [34, 43, 62],   # ink
    [66, 84, 102],  # middle shadow
    [126, 139, 154],# midtone
    [221, 215, 192],# paper
    [255, 245, 215],# highlight
    [204, 77, 70],  # coral
    [249, 169, 82], # amber
    [83, 178, 165], # teal
    [126, 144, 234] # lavender
], dtype=np.uint8)


def quantize(image: np.ndarray, palette: np.ndarray = PALETTE) -> np.ndarray:
    """Nearest palette color for every RGB pixel, preserving resolution."""
    a = np.asarray(image, dtype=np.uint8)
    if a.ndim != 3 or a.shape[-1] != 3:
        raise ValueError("Expected H×W×3 RGB array")
    flat = a.reshape(-1, 3).astype(np.int32)
    p = palette.astype(np.int32)
    delta = flat[:, None, :] - p[None, :, :]
    choice = np.sum(delta * delta, axis=-1).argmin(axis=1)
    return palette[choice].reshape(a.shape)
