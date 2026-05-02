from __future__ import annotations

import math


def _lazy_torch():
    import torch  # noqa: WPS433
    import torch.nn as nn  # noqa: WPS433

    return torch, nn


class CVAE:  # constructed via build_cvae
    pass


def build_cvae(image_size: int = 128, latent_dim: int = 64, feature_dim: int = 4, feature_hidden: int = 32):
    """Build a minimal conditional VAE for grayscale floor plans."""
    torch, nn = _lazy_torch()

    assert image_size in (64, 128), "image_size must be 64 or 128"

    class _CVAE(nn.Module):
        def __init__(self):
            super().__init__()

            self.image_size = image_size
            self.latent_dim = latent_dim

            self.feature_net = nn.Sequential(
                nn.Linear(feature_dim, feature_hidden),
                nn.ReLU(inplace=True),
                nn.Linear(feature_hidden, feature_hidden),
                nn.ReLU(inplace=True),
            )

            # Encoder: (1,128,128) -> conv -> flatten -> (mu, logvar)
            self.enc = nn.Sequential(
                nn.Conv2d(1, 32, 4, 2, 1),
                nn.ReLU(inplace=True),
                nn.Conv2d(32, 64, 4, 2, 1),
                nn.ReLU(inplace=True),
                nn.Conv2d(64, 128, 4, 2, 1),
                nn.ReLU(inplace=True),
                nn.Conv2d(128, 256, 4, 2, 1),
                nn.ReLU(inplace=True),
            )

            enc_out = image_size // 16
            self.enc_out_dim = 256 * enc_out * enc_out

            self.fc_mu = nn.Linear(self.enc_out_dim + feature_hidden, latent_dim)
            self.fc_logvar = nn.Linear(self.enc_out_dim + feature_hidden, latent_dim)

            # Decoder: z + features -> fc -> deconv
            self.dec_fc = nn.Sequential(
                nn.Linear(latent_dim + feature_hidden, self.enc_out_dim),
                nn.ReLU(inplace=True),
            )

            self.dec = nn.Sequential(
                nn.ConvTranspose2d(256, 128, 4, 2, 1),
                nn.ReLU(inplace=True),
                nn.ConvTranspose2d(128, 64, 4, 2, 1),
                nn.ReLU(inplace=True),
                nn.ConvTranspose2d(64, 32, 4, 2, 1),
                nn.ReLU(inplace=True),
                nn.ConvTranspose2d(32, 1, 4, 2, 1),
                nn.Sigmoid(),
            )

        def encode(self, x, features):
            feats = self.feature_net(features)
            h = self.enc(x)
            h = h.view(h.size(0), -1)
            h = torch.cat([h, feats], dim=1)
            mu = self.fc_mu(h)
            logvar = self.fc_logvar(h)
            return mu, logvar

        def reparameterize(self, mu, logvar):
            std = torch.exp(0.5 * logvar)
            eps = torch.randn_like(std)
            return mu + eps * std

        def decode(self, z, features):
            feats = self.feature_net(features)
            zf = torch.cat([z, feats], dim=1)
            h = self.dec_fc(zf)
            enc_out = self.image_size // 16
            h = h.view(h.size(0), 256, enc_out, enc_out)
            return self.dec(h)

        def forward(self, x, features):
            mu, logvar = self.encode(x, features)
            z = self.reparameterize(mu, logvar)
            recon = self.decode(z, features)
            return recon, mu, logvar

    return _CVAE()


def cvae_loss(recon_x, x, mu, logvar, beta: float = 1.0):
    torch, _nn = _lazy_torch()

    recon = torch.mean((recon_x - x) ** 2)
    kl = -0.5 * torch.mean(1.0 + logvar - mu.pow(2) - logvar.exp())
    return recon + beta * kl, recon.detach(), kl.detach()
