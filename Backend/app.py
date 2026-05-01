import os
import time
import random
import hashlib
import json
from datetime import datetime
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
import pandas as pd
import numpy as np
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import StandardScaler

try:
    from PIL import Image, ImageDraw, ImageFont
except Exception:
    Image = None
    ImageDraw = None
    ImageFont = None

app = Flask(__name__)
CORS(app)  # Allow the frontend to communicate with this backend

# --- CONFIGURATION ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
IMAGE_FOLDER = os.path.join(BASE_DIR, "dataset", "images", "images")
CSV_FILE = os.path.join(BASE_DIR, "dataset", "house_plans_details.csv")
GENERATED_FOLDER = os.path.join(BASE_DIR, "generated")
ML_MODELS_FOLDER = os.path.join(BASE_DIR, "models")

NANO_BANANA_BASE_URL = os.environ.get("NANO_BANANA_BASE_URL", "https://www.nananobanana.com/api/v1")
NANO_BANANA_API_KEY = os.environ.get("NANO_BANANA_API_KEY")

# If you expose the backend via ngrok/cloudflare tunnel, set this to the public origin.
# Example: https://xxxx.ngrok-free.app
PUBLIC_BACKEND_URL = os.environ.get("PUBLIC_BACKEND_URL")

# --- ML STATE ---
dataset_df = None
nn_model = None
scaler = None
query_history = {}

# Lazy-loaded ML model checkpoint path (set after training)
DEFAULT_ML_CHECKPOINT = os.environ.get(
    "VAASTUGPT_ML_CHECKPOINT",
    os.path.join(ML_MODELS_FOLDER, "cvae_128_64_epoch10.pt"),
)


def _safe_int(value, default):
    try:
        return int(value)
    except Exception:
        return default


def _ensure_generated_folder():
    os.makedirs(GENERATED_FOLDER, exist_ok=True)


def _publicize_local_backend_url(image_url: str) -> str:
    """Replace localhost/127.0.0.1 backend URLs with a public origin.

    Nano Banana's API takes `referenceImageUrls`, so their servers must be able to fetch the image.
    Local URLs won't work unless you expose your backend with a public tunnel.
    """
    if not PUBLIC_BACKEND_URL:
        return image_url

    try:
        parsed = urlparse(image_url)
        host = (parsed.hostname or "").lower()
        if host in {"127.0.0.1", "localhost"} and (parsed.port in {5001, None}):
            # Keep path/query, replace scheme+netloc.
            return f"{PUBLIC_BACKEND_URL.rstrip('/')}{parsed.path}{('?' + parsed.query) if parsed.query else ''}"
    except Exception:
        return image_url

    return image_url


def _download_bytes(url: str, timeout: int = 30) -> bytes:
    with urlopen(url, timeout=timeout) as resp:
        return resp.read()


def _deterministic_seed(payload: dict) -> int:
    # Stable seed per request payload so repeated requests are reproducible.
    seed_src = (
        f"{payload.get('sq_ft','')}|{payload.get('bedrooms','')}|{payload.get('bathrooms','')}|"
        f"{payload.get('garage','')}|{payload.get('seed','')}|{payload.get('style','')}"
    )
    digest = hashlib.sha256(seed_src.encode("utf-8")).hexdigest()
    return int(digest[:8], 16)


def generate_procedural_floorplan(payload: dict) -> dict:
    """Generate a simple, labeled floor plan image.

    This is a deterministic procedural generator (not dataset retrieval).
    Returns: {"filename": ..., "details": {...}}
    """
    if Image is None:
        raise RuntimeError(
            "Pillow is not installed. Install it with: pip install pillow"
        )

    _ensure_generated_folder()

    sq_ft = _safe_int(payload.get("sq_ft"), 1500)
    beds = _safe_int(payload.get("bedrooms"), 3)
    baths = _safe_int(payload.get("bathrooms"), 2)
    garage = _safe_int(payload.get("garage"), 1)

    beds = max(1, min(beds, 6))
    baths = max(1, min(baths, 5))
    garage = max(0, min(garage, 4))
    sq_ft = max(400, min(sq_ft, 12000))

    rng = random.Random(_deterministic_seed(payload))

    # Canvas
    width, height = 1400, 900
    margin = 60
    img = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(img)

    # Fonts (fallback to default)
    try:
        font = ImageFont.truetype("arial.ttf", 18)
        font_title = ImageFont.truetype("arial.ttf", 26)
    except Exception:
        font = ImageFont.load_default()
        font_title = font

    # Outer boundary
    outer = (margin, margin + 60, width - margin, height - margin)
    draw.rectangle(outer, outline="black", width=4)

    # Title
    title = f"Generated Plan — {sq_ft} sqft | {beds} bed | {baths} bath | {garage} garage"
    draw.text((margin, margin), title, fill="black", font=font_title)

    # Room list (simple program)
    rooms = []
    rooms.append(("Living", 1))
    rooms.append(("Kitchen", 1))
    rooms.append(("Dining", 1))
    rooms.append(("Laundry", 1))
    rooms.append(("Foyer", 1))
    rooms.append(("Hall", 1))
    for i in range(beds):
        rooms.append((f"Bedroom {i+1}", 1))
    for i in range(baths):
        rooms.append((f"Bath {i+1}", 1))
    if garage > 0:
        rooms.append(("Garage", garage))

    # Allocate relative weights
    base_weights = {
        "Living": 3,
        "Kitchen": 2,
        "Dining": 2,
        "Laundry": 1,
        "Foyer": 1,
        "Hall": 1,
        "Garage": 3,
        "Bedroom": 2,
        "Bath": 1,
    }

    weighted = []
    for name, mult in rooms:
        key = "Bedroom" if name.startswith("Bedroom") else "Bath" if name.startswith("Bath") else name
        w = base_weights.get(key, 1) * mult
        # add slight jitter for variety
        w = max(1, w + rng.choice([0, 0, 1]))
        weighted.append((name, w))

    # Partition the outer rectangle using recursive splits
    rects = [outer]
    labels = []
    total_w = sum(w for _, w in weighted)

    def split_rect(rect, fraction, vertical):
        x1, y1, x2, y2 = rect
        if vertical:
            w = x2 - x1
            cut = x1 + int(w * fraction)
            return (x1, y1, cut, y2), (cut, y1, x2, y2)
        h = y2 - y1
        cut = y1 + int(h * fraction)
        return (x1, y1, x2, cut), (x1, cut, x2, y2)

    # Start with one big rect; keep splitting the largest rect
    for name, w in weighted:
        if len(rects) == 1 and name == weighted[0][0]:
            continue
        # pick largest by area
        rects.sort(key=lambda r: (r[2]-r[0]) * (r[3]-r[1]), reverse=True)
        big = rects.pop(0)
        frac = max(0.25, min(0.75, w / total_w))
        vertical = rng.choice([True, False])
        a, b = split_rect(big, frac, vertical)
        rects.extend([a, b])

    # Now we should have enough rectangles; take the largest N
    rects.sort(key=lambda r: (r[2]-r[0]) * (r[3]-r[1]), reverse=True)
    rects = rects[: len(weighted)]
    rects.sort(key=lambda r: (r[0], r[1]))

    # Draw rooms
    palette = [
        (245, 245, 245),
        (255, 250, 240),
        (240, 248, 255),
        (248, 248, 255),
        (250, 255, 250),
    ]

    for idx, ((name, _w), rect) in enumerate(zip(weighted, rects)):
        x1, y1, x2, y2 = rect
        # inset so walls are visible
        inset = 6
        x1i, y1i, x2i, y2i = x1 + inset, y1 + inset, x2 - inset, y2 - inset
        fill = palette[idx % len(palette)]
        draw.rectangle((x1i, y1i, x2i, y2i), fill=fill, outline="black", width=2)

        # Label
        tx = x1i + 10
        ty = y1i + 10
        draw.text((tx, ty), name, fill="black", font=font)

    # Save
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"generated_{sq_ft}_{beds}_{baths}_{garage}_{ts}_{rng.randint(1000, 9999)}.png"
    out_path = os.path.join(GENERATED_FOLDER, filename)
    img.save(out_path, format="PNG")

    return {
        "filename": filename,
        "details": {
            "sq_ft": sq_ft,
            "bedrooms": beds,
            "bathrooms": baths,
            "garage": garage,
            "source": "procedural",
        },
    }


@app.route('/refine', methods=['POST'])
def refine():
    """Refine an existing plan image using Nano Banana image-to-image + a manual prompt."""
    data = request.json or {}
    prompt = (data.get("prompt") or "").strip()
    image_url = (data.get("image_url") or "").strip()

    if not image_url:
        return jsonify({"error": "Missing image_url"}), 400
    if not prompt:
        return jsonify({"error": "Missing prompt"}), 400

    if not NANO_BANANA_API_KEY:
        return jsonify(
            {
                "error": "Nano Banana not configured",
                "hint": "Set NANO_BANANA_API_KEY env var (Bearer nb_...).",
            }
        ), 501

    public_ref_url = _publicize_local_backend_url(image_url)
    if public_ref_url == image_url and (urlparse(image_url).hostname or "").lower() in {"127.0.0.1", "localhost"}:
        return jsonify(
            {
                "error": "Reference image URL is local-only",
                "hint": "Nano Banana requires a public URL in referenceImageUrls. Expose your backend (ngrok) and set PUBLIC_BACKEND_URL.",
                "image_url": image_url,
            }
        ), 400

    selected_model = data.get("selectedModel") or "nano-banana"
    mode = data.get("mode") or "sync"
    aspect_ratio = data.get("aspectRatio")

    payload = {
        "prompt": prompt,
        "selectedModel": selected_model,
        "referenceImageUrls": [public_ref_url],
        "mode": mode,
    }
    if aspect_ratio:
        payload["aspectRatio"] = aspect_ratio

    try:
        req = Request(
            f"{NANO_BANANA_BASE_URL.rstrip('/')}/generate",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {NANO_BANANA_API_KEY}",
            },
            method="POST",
        )
        with urlopen(req, timeout=180) as resp:
            raw = resp.read()
        result = json.loads(raw.decode("utf-8"))

        if not result.get("success"):
            return jsonify({"error": "Nano Banana generation failed", "details": result}), 502

        urls = result.get("imageUrls") or []
        if not urls:
            return jsonify({"error": "Nano Banana returned no imageUrls", "details": result}), 502

        out_bytes = _download_bytes(urls[0], timeout=60)
        _ensure_generated_folder()
        ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"refined_{ts}_{random.randint(1000, 9999)}.png"
        out_path = os.path.join(GENERATED_FOLDER, filename)
        with open(out_path, "wb") as f:
            f.write(out_bytes)

        timestamp = int(time.time())
        return jsonify(
            {
                "image_url": f"http://127.0.0.1:5001/generated/{filename}?t={timestamp}",
                "details": {
                    "source": "nano-banana",
                    "selectedModel": selected_model,
                    "mode": mode,
                    "referenceImageUrl": public_ref_url,
                    "remoteImageUrl": urls[0],
                },
            }
        )
    except HTTPError as e:
        try:
            body = e.read().decode("utf-8", errors="ignore")
        except Exception:
            body = ""
        return (
            jsonify(
                {
                    "error": "Nano Banana request failed",
                    "status": getattr(e, "code", None),
                    "message": body[:2000] if body else str(e),
                }
            ),
            502,
        )
    except URLError as e:
        return jsonify({"error": "Nano Banana request failed", "message": str(e)}), 502
    except Exception as e:
        return jsonify({"error": "Nano Banana refine failed", "message": str(e)}), 500

def init_ml_model():
    global dataset_df, nn_model, scaler
    if not os.path.exists(CSV_FILE):
        print(f"❌ CRITICAL ERROR: '{CSV_FILE}' not found.")
        return False
        
    try:
        # Load dataset
        df = pd.read_csv(CSV_FILE)
        df.columns = df.columns.str.strip()
        
        # We need specific columns
        req_cols = ['Image Path', 'Square Feet', 'Beds', 'Baths', 'Garages']
        for col in req_cols:
            if col not in df.columns:
                print(f"❌ ERROR: Missing column '{col}'")
                return False
                
        # Clean data: convert to numeric, dropping NaNs or invalid strings
        for col in ['Square Feet', 'Beds', 'Baths', 'Garages']:
            df[col] = pd.to_numeric(df[col].astype(str).str.replace(',', ''), errors='coerce')
            
        df = df.dropna(subset=['Square Feet', 'Beds', 'Baths', 'Garages', 'Image Path'])
        df['filename'] = df['Image Path'].apply(lambda x: os.path.basename(str(x)))
        df = df[df['filename'] != '']
        
        # Assign back to global
        dataset_df = df.reset_index(drop=True)
        
        if len(dataset_df) == 0:
            print("❌ ERROR: Dataset contains no valid rows.")
            return False
            
        print(f"✅ LOADED DATASET: {len(dataset_df)} entries.")
        
        # Prepare features for ML Model
        # Weights (We care more about beds/baths/garage exactness to some degree, but sq ft scale is larger) 
        # StandardScaler takes care of the magnitude differences.
        features = dataset_df[['Square Feet', 'Beds', 'Baths', 'Garages']].values
        
        scaler = StandardScaler()
        scaled_features = scaler.fit_transform(features)
        
        # Fit Nearest Neighbors
        # Using 10 neighbors so we can show alternatives (cycle through them if asked repeatedly)
        nn_model = NearestNeighbors(n_neighbors=min(10, len(dataset_df)), metric='minkowski')
        nn_model.fit(scaled_features)
        
        print("✅ ML MODEL INITIALIZED (NearestNeighbors).")
        return True
    except Exception as e:
        print(f"❌ Error initializing ML model: {e}")
        return False

# Initialize ML model directly at startup
init_ml_model()

@app.route('/generate', methods=['POST'])
def generate():
    global dataset_df, nn_model, scaler, query_history
    
    if nn_model is None or scaler is None:
        if not init_ml_model():
            return jsonify({"error": "ML Model not initialized / Dataset missing"}), 500

    data = request.json or {}
    strategy = (data.get("strategy") or os.environ.get("VAASTUGPT_STRATEGY") or "procedural").lower()

    sq_ft = _safe_int(data.get('sq_ft', 1500), 1500)
    beds = _safe_int(data.get('bedrooms', 3), 3)
    baths = _safe_int(data.get('bathrooms', 2), 2)
    garage = _safe_int(data.get('garage', 1), 1)

    if strategy in {"ml", "cvae", "autoencoder"}:
        try:
            from ml.infer import generate_image_from_features  # local module

            seed = data.get("seed")
            seed = _safe_int(seed, None) if seed is not None else None

            checkpoint = data.get("checkpoint") or DEFAULT_ML_CHECKPOINT
            if not os.path.isabs(str(checkpoint)):
                checkpoint = os.path.join(ML_MODELS_FOLDER, str(checkpoint))

            if not os.path.exists(checkpoint):
                raise FileNotFoundError(
                    f"ML checkpoint not found: {checkpoint}. Train one via Backend/ml/train_cvae.py"
                )

            result = generate_image_from_features(
                checkpoint_path=checkpoint,
                out_dir=GENERATED_FOLDER,
                sq_ft=sq_ft,
                bedrooms=beds,
                bathrooms=baths,
                garage=garage,
                seed=seed,
                device=os.environ.get("VAASTUGPT_ML_DEVICE", "cpu"),
            )

            timestamp = int(time.time())
            return jsonify(
                {
                    "image_url": f"http://127.0.0.1:5001/generated/{result.filename}?t={timestamp}",
                    "details": result.details,
                }
            )
        except Exception as e:
            print(f"⚠️ ML generation failed, falling back to procedural: {e}")
            strategy = "procedural"

    if strategy in {"procedural", "generate", "gen"}:
        try:
            generated = generate_procedural_floorplan(data)
            timestamp = int(time.time())
            return jsonify({
                "image_url": f"http://127.0.0.1:5001/generated/{generated['filename']}?t={timestamp}",
                "details": generated["details"],
            })
        except Exception as e:
            # Fall back to KNN if generation fails (e.g., Pillow missing)
            print(f"⚠️ Procedural generation failed, falling back to KNN: {e}")
            strategy = "knn"

    request_key = f"{sq_ft}_{beds}_{baths}_{garage}"
    if request_key not in query_history:
        query_history[request_key] = 0

    print(f"\n🎯 Request: {sq_ft} sqft | {beds} Beds | {baths} Baths | {garage} Garage (Attempt #{query_history[request_key] + 1})")

    # 2. ML Prediction (Finding closest match)
    user_query = np.array([[sq_ft, beds, baths, garage]])
    scaled_query = scaler.transform(user_query)
    distances, indices = nn_model.kneighbors(scaled_query)
    
    # Default behavior: always return the closest match.
    # If the caller wants variety, they can pass `variant` (0..k-1).
    variant = _safe_int(data.get("variant", 0), 0)
    variant = max(0, min(variant, len(indices[0]) - 1))
    result_idx = indices[0][variant]
    query_history[request_key] += 1
    
    # Extract prediction row
    best_match_row = dataset_df.iloc[result_idx]
    
    best_match = {
        "filename": best_match_row['filename'],
        "sq_ft": int(best_match_row['Square Feet']),
        "bedrooms": int(best_match_row['Beds']),
        "bathrooms": int(best_match_row['Baths']),
        "garage": int(best_match_row['Garages'])
    }

    print(f"✅ Result via ML KNN -> {best_match['filename']} (sq_ft: {best_match['sq_ft']}, beds: {best_match['bedrooms']})")
    
    timestamp = int(time.time())
    return jsonify({
        "image_url": f"http://127.0.0.1:5001/image/{best_match['filename']}?t={timestamp}",
        "details": {**best_match, "source": "knn"}
    })


@app.route('/generated/<filename>')
def get_generated_image(filename):
    file_path = os.path.join(GENERATED_FOLDER, filename)
    if os.path.exists(file_path):
        mimetype = 'image/png' if filename.lower().endswith('.png') else 'image/jpeg'
        return send_file(file_path, mimetype=mimetype)
    else:
        print(f"❌ Missing Generated Image: {file_path}")
        return "Not found", 404

@app.route('/image/<filename>')
def get_image(filename):
    file_path = os.path.join(IMAGE_FOLDER, filename)
    if os.path.exists(file_path):
        mimetype = 'image/jpeg' if filename.lower().endswith('.jpg') else 'image/png'
        return send_file(file_path, mimetype=mimetype)
    else:
        print(f"❌ Missing Image: {file_path}")
        return "Not found", 404

if __name__ == '__main__':
    if not os.path.exists(IMAGE_FOLDER): os.makedirs(IMAGE_FOLDER)
    if not os.path.exists(GENERATED_FOLDER): os.makedirs(GENERATED_FOLDER)
    print("🚀 Backend Running (Port 5001)")
    app.run(debug=True, port=5001)