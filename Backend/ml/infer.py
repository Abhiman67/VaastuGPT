from __future__ import annotations

import os
import random
from dataclasses import dataclass

import numpy as np

from .features import normalize_features
from .model import build_cvae


@dataclass(frozen=True)
class MLGenerateResult:
    filename: str
    details: dict


def _lazy_torch():
    import torch  # noqa: WPS433

    return torch


def _seed_everything(seed: int | None) -> None:
    if seed is None:
        return
    random.seed(seed)
    np.random.seed(seed)
    torch = _lazy_torch()
    torch.manual_seed(seed)


def load_cvae_checkpoint(checkpoint_path: str, device: str = "cpu"):
    """Load a CVAE checkpoint (cpu by default) and return (model, config)."""
    torch = _lazy_torch()

    ckpt = torch.load(checkpoint_path, map_location=device)
    cfg = ckpt.get("config") or {}

    image_size = int(cfg.get("image_size", 128))
    latent_dim = int(cfg.get("latent_dim", 64))

    model = build_cvae(image_size=image_size, latent_dim=latent_dim)
    model.load_state_dict(ckpt["state_dict"], strict=True)
    model.eval()
    return model.to(device), cfg


def generate_image_from_features(
    checkpoint_path: str,
    out_dir: str,
    sq_ft: int,
    bedrooms: int,
    bathrooms: int,
    garage: int,
    seed: int | None = None,
    device: str = "cpu",
) -> MLGenerateResult:
    """Sample z~N(0,1) and decode conditioned on features into a PNG."""
    from PIL import Image  # noqa: WPS433

    os.makedirs(out_dir, exist_ok=True)

    _seed_everything(seed)

    model, cfg = load_cvae_checkpoint(checkpoint_path, device=device)
    torch = _lazy_torch()

    feat = normalize_features(sq_ft, bedrooms, bathrooms, garage)
    feats = torch.from_numpy(feat).unsqueeze(0).to(device)

    latent_dim = int(cfg.get("latent_dim", 64))
    z = torch.randn((1, latent_dim), device=device)

    with torch.no_grad():
        out = model.decode(z, feats)

    img = out.squeeze(0).squeeze(0).detach().cpu().numpy()  # (H,W)
    img = np.clip(img, 0.0, 1.0)
    img_u8 = (img * 255.0).astype(np.uint8)

    pil = Image.fromarray(img_u8, mode="L").convert("RGB")

    suffix = f"{sq_ft}_{bedrooms}_{bathrooms}_{garage}"
    if seed is not None:
        suffix += f"_seed{seed}"
    filename = f"ml_{suffix}.png"
    out_path = os.path.join(out_dir, filename)
    pil.save(out_path, format="PNG")

    return MLGenerateResult(
        filename=filename,
        details={
            "sq_ft": int(sq_ft),
            "bedrooms": int(bedrooms),
            "bathrooms": int(bathrooms),
            "garage": int(garage),
            "source": "ml",
            "model": os.path.basename(checkpoint_path),
        },
    )
