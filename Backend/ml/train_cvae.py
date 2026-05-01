from __future__ import annotations

import argparse
import os
from dataclasses import asdict, dataclass

from .dataset import build_records, load_dataframe
from .model import build_cvae, cvae_loss
from .torch_dataset import FloorPlanTorchDataset


@dataclass
class TrainConfig:
    csv_file: str
    image_folder: str
    out_dir: str
    image_size: int = 128
    latent_dim: int = 64
    batch_size: int = 32
    epochs: int = 10
    lr: float = 1e-3
    beta: float = 0.2
    seed: int = 42
    num_workers: int = 0


def parse_args() -> TrainConfig:
    p = argparse.ArgumentParser(description="Train a conditional VAE on VaastuGPT floor plans")

    p.add_argument("--csv", required=True, help="Path to house_plans_details.csv")
    p.add_argument("--images", required=True, help="Path to dataset/images/images folder")
    p.add_argument("--out", default="models", help="Output directory for checkpoints")

    p.add_argument("--image-size", type=int, default=128, choices=[64, 128])
    p.add_argument("--latent-dim", type=int, default=64)
    p.add_argument("--batch-size", type=int, default=32)
    p.add_argument("--epochs", type=int, default=10)
    p.add_argument("--lr", type=float, default=1e-3)
    p.add_argument("--beta", type=float, default=0.2)
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--num-workers", type=int, default=0)

    a = p.parse_args()
    return TrainConfig(
        csv_file=a.csv,
        image_folder=a.images,
        out_dir=a.out,
        image_size=a.image_size,
        latent_dim=a.latent_dim,
        batch_size=a.batch_size,
        epochs=a.epochs,
        lr=a.lr,
        beta=a.beta,
        seed=a.seed,
        num_workers=a.num_workers,
    )


def main() -> None:
    import numpy as np
    import torch  # type: ignore[import-not-found]
    from torch.utils.data import DataLoader  # type: ignore[import-not-found]

    try:
        from tqdm import tqdm  # type: ignore[import-not-found]
    except Exception:
        tqdm = None

    cfg = parse_args()
    os.makedirs(cfg.out_dir, exist_ok=True)

    torch.manual_seed(cfg.seed)
    np.random.seed(cfg.seed)

    df = load_dataframe(cfg.csv_file)
    records = build_records(df, cfg.image_folder)
    if len(records) == 0:
        raise RuntimeError("No valid image records found; check csv/images paths")

    ds = FloorPlanTorchDataset(records, image_size=cfg.image_size, seed=cfg.seed)
    dl = DataLoader(ds, batch_size=cfg.batch_size, shuffle=True, num_workers=cfg.num_workers)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = build_cvae(image_size=cfg.image_size, latent_dim=cfg.latent_dim).to(device)

    opt = torch.optim.Adam(model.parameters(), lr=cfg.lr)

    def _iter(loader):
        if tqdm is None:
            return loader
        return tqdm(loader, desc="train", leave=False)

    for epoch in range(1, cfg.epochs + 1):
        model.train()
        loss_sum = 0.0
        recon_sum = 0.0
        kl_sum = 0.0
        n = 0

        for x, feats in _iter(dl):
            x = x.to(device)
            feats = feats.to(device)

            recon, mu, logvar = model(x, feats)
            loss, recon_loss, kl = cvae_loss(recon, x, mu, logvar, beta=cfg.beta)

            opt.zero_grad(set_to_none=True)
            loss.backward()
            opt.step()

            b = x.size(0)
            loss_sum += float(loss) * b
            recon_sum += float(recon_loss) * b
            kl_sum += float(kl) * b
            n += b

        ckpt_path = os.path.join(cfg.out_dir, f"cvae_{cfg.image_size}_{cfg.latent_dim}_epoch{epoch}.pt")
        torch.save(
            {
                "config": asdict(cfg),
                "state_dict": model.state_dict(),
                "epoch": epoch,
            },
            ckpt_path,
        )

        avg_loss = loss_sum / max(n, 1)
        avg_recon = recon_sum / max(n, 1)
        avg_kl = kl_sum / max(n, 1)
        print(f"epoch {epoch}/{cfg.epochs} | loss={avg_loss:.6f} recon={avg_recon:.6f} kl={avg_kl:.6f} | saved {ckpt_path}")


if __name__ == "__main__":
    main()
