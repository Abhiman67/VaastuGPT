from __future__ import annotations

import random
from dataclasses import dataclass

import numpy as np

from .features import normalize_features


@dataclass(frozen=True)
class TorchSample:
    image: "object"  # torch.Tensor
    features: "object"  # torch.Tensor


class FloorPlanTorchDataset:
    """PyTorch Dataset for (image, features).

    Images are loaded lazily via PIL and converted to grayscale 128x128 tensors in [0,1].
    Features are normalized using `normalize_features`.

    We avoid importing torch/torchvision at module import time so the rest of the backend
    can run without ML deps installed.
    """

    def __init__(
        self,
        records: list[dict],
        image_size: int = 128,
        seed: int = 42,
    ) -> None:
        self.records = list(records)
        self.image_size = int(image_size)
        self.rng = random.Random(seed)

        try:
            from PIL import Image  # noqa: WPS433
        except Exception as exc:  # pragma: no cover
            raise RuntimeError("Pillow is required for ML dataset loading") from exc

        self._Image = Image

    def __len__(self) -> int:
        return len(self.records)

    def __getitem__(self, idx: int) -> tuple["object", "object"]:
        import torch  # noqa: WPS433

        rec = self.records[idx]

        img = self._Image.open(rec["image_path"]).convert("L")
        img = img.resize((self.image_size, self.image_size))

        arr = np.asarray(img, dtype=np.float32) / 255.0
        arr = np.expand_dims(arr, axis=0)  # (1,H,W)
        image_tensor = torch.from_numpy(arr)

        feat = normalize_features(rec["sq_ft"], rec["beds"], rec["baths"], rec["garage"])
        feat_tensor = torch.from_numpy(feat)

        return image_tensor, feat_tensor
