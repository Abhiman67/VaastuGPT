from __future__ import annotations

import numpy as np


def normalize_features(sq_ft: float, beds: float, baths: float, garage: float) -> np.ndarray:
    """Normalize raw features into a small numeric range.

    Keep this in sync between training and inference.

    Returns shape (4,) float32.
    """
    sq = float(sq_ft) / 5000.0
    b = float(beds) / 5.0
    ba = float(baths) / 5.0
    g = float(garage) / 3.0

    vec = np.array([sq, b, ba, g], dtype=np.float32)
    return np.clip(vec, 0.0, 1.5)
