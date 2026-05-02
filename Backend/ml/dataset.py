from __future__ import annotations

import os
from dataclasses import dataclass

import numpy as np
import pandas as pd


@dataclass(frozen=True)
class DatasetPaths:
    csv_file: str
    image_folder: str


def load_dataframe(csv_file: str) -> pd.DataFrame:
    df = pd.read_csv(csv_file)
    df.columns = df.columns.str.strip()

    required = ["Square Feet", "Beds", "Baths", "Garages", "Image Path"]
    for col in required:
        if col not in df.columns:
            raise ValueError(f"Missing column '{col}' in {csv_file}")

    for col in ["Square Feet", "Beds", "Baths", "Garages"]:
        df[col] = pd.to_numeric(df[col].astype(str).str.replace(",", ""), errors="coerce")

    df = df.dropna(subset=required)
    df["filename"] = df["Image Path"].apply(lambda x: os.path.basename(str(x)))
    df = df[df["filename"].astype(str) != ""]
    return df.reset_index(drop=True)


def build_records(df: pd.DataFrame, image_folder: str) -> list[dict]:
    records: list[dict] = []
    for _, row in df.iterrows():
        filename = str(row["filename"])
        image_path = os.path.join(image_folder, filename)
        if not os.path.exists(image_path):
            continue

        records.append(
            {
                "image_path": image_path,
                "sq_ft": float(row["Square Feet"]),
                "beds": float(row["Beds"]),
                "baths": float(row["Baths"]),
                "garage": float(row["Garages"]),
            }
        )

    return records
