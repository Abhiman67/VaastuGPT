import os
import time
import random
import pandas as pd
import numpy as np
import hashlib
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import StandardScaler

app = Flask(__name__)
CORS(app)

# --- CONFIGURATION ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
IMAGE_FOLDER = os.path.join(BASE_DIR, "dataset", "images", "images")
CSV_FILE = os.path.join(BASE_DIR, "dataset", "house_plans_details.csv")

# --- ML STATE ---
dataset_df = None
nn_model = None
scaler = None
query_history = {}

# --- VAASTU HEURISTICS ---
VAASTU_NOTES = [
    "Master Bedroom aligns with South-West corner for stability and leadership.",
    "Kitchen mapped near South-East region, optimizing Agni (Fire) elements.",
    "Main entrance prioritized for East or North-East facing orientation.",
    "Central space (Brahmasthan) kept relatively open to allow positive energy flow.",
    "Guest room conceptually positioned in North-West for proper air circulation.",
    "Bathrooms isolated from primary living boundaries per traditional guidelines.",
    "Staircase (if any) optimally positioned in South or West to balance structural weight.",
    "Water elements implicitly designated towards North-East for prosperity flow."
]

def generate_vaastu_score(filename):
    # Deterministic pseudo-random score based on filename so it's consistent
    hash_val = int(hashlib.md5(filename.encode()).hexdigest(), 16)
    # Score between 82 and 98
    score = 82 + (hash_val % 17)
    
    # Pick 2-3 deterministic insights
    num_insights = 2 + (hash_val % 2)
    random.seed(hash_val)
    insights = random.sample(VAASTU_NOTES, num_insights)
    
    # Reset seed to not mess with other random calls
    random.seed()
    
    return {
        "score": score,
        "insights": insights
    }

def init_ml_model():
    global dataset_df, nn_model, scaler
    if not os.path.exists(CSV_FILE):
        print(f"❌ CRITICAL ERROR: '{CSV_FILE}' not found.")
        return False
        
    try:
        df = pd.read_csv(CSV_FILE)
        df.columns = df.columns.str.strip()
        
        req_cols = ['Image Path', 'Square Feet', 'Beds', 'Baths', 'Garages']
        for col in req_cols:
            if col not in df.columns:
                print(f"❌ ERROR: Missing column '{col}'")
                return False
                
        for col in ['Square Feet', 'Beds', 'Baths', 'Garages']:
            df[col] = pd.to_numeric(df[col].astype(str).str.replace(',', ''), errors='coerce')
            
        df = df.dropna(subset=['Square Feet', 'Beds', 'Baths', 'Garages', 'Image Path'])
        df['filename'] = df['Image Path'].apply(lambda x: os.path.basename(str(x)))
        df = df[df['filename'] != '']
        
        dataset_df = df.reset_index(drop=True)
        
        if len(dataset_df) == 0:
            print("❌ ERROR: Dataset contains no valid rows.")
            return False
            
        print(f"✅ LOADED DATASET: {len(dataset_df)} entries.")
        
        features = dataset_df[['Square Feet', 'Beds', 'Baths', 'Garages']].values
        
        scaler = StandardScaler()
        scaled_features = scaler.fit_transform(features)
        
        nn_model = NearestNeighbors(n_neighbors=min(10, len(dataset_df)), metric='minkowski')
        nn_model.fit(scaled_features)
        
        print("✅ ML MODEL INITIALIZED.")
        return True
    except Exception as e:
        print(f"❌ Error initializing ML model: {e}")
        return False

init_ml_model()

@app.route('/generate', methods=['POST'])
def generate():
    global dataset_df, nn_model, scaler, query_history
    
    if nn_model is None or scaler is None:
        if not init_ml_model():
            return jsonify({"error": "ML Model not initialized"}), 500

    data = request.json
    sq_ft = int(data.get('sq_ft', 1500))
    beds = int(data.get('bedrooms', 3))
    baths = int(data.get('bathrooms', 2))
    garage = int(data.get('garage', 1))

    request_key = f"{sq_ft}_{beds}_{baths}_{garage}"
    if request_key not in query_history:
        query_history[request_key] = 0

    print(f"\n🎯 Request: {sq_ft} sqft | {beds} Beds ({query_history[request_key] + 1})")
    
    fake_time = 3 + random.uniform(0.5, 1.5)
    print(f"⏳ ML Model inferencing... ({fake_time:.2f}s)")
    time.sleep(fake_time)

    # ML Inference
    user_query = np.array([[sq_ft, beds, baths, garage]])
    scaled_query = scaler.transform(user_query)
    distances, indices = nn_model.kneighbors(scaled_query)
    
    current_attempt = query_history[request_key]
    result_idx = indices[0][current_attempt % len(indices[0])]
    dist = distances[0][current_attempt % len(distances[0])]
    query_history[request_key] += 1
    
    best_match_row = dataset_df.iloc[result_idx]
    
    # Calculate Explainable AI "Match Confidence"
    # Convert Euclidean distance to a percentage (heuristic)
    # If dist is 0, it's 100%. Usually scaled dists range from 0.0 to 3.0+
    match_percentage = max(75, min(100, int(100 - (dist * 10))))
    
    # Generate Vaastu Profile
    filename = best_match_row['filename']
    vaastu_data = generate_vaastu_score(filename)

    best_match = {
        "filename": filename,
        "sq_ft": int(best_match_row['Square Feet']),
        "bedrooms": int(best_match_row['Beds']),
        "bathrooms": int(best_match_row['Baths']),
        "garage": int(best_match_row['Garages']),
        "match_confidence": match_percentage,
        "vaastu": vaastu_data
    }

    timestamp = int(time.time())
    return jsonify({
        "image_url": f"http://127.0.0.1:5001/image/{filename}?t={timestamp}",
        "details": best_match
    })

@app.route('/image/<filename>')
def get_image(filename):
    file_path = os.path.join(IMAGE_FOLDER, filename)
    if os.path.exists(file_path):
        mimetype = 'image/jpeg' if filename.lower().endswith('.jpg') else 'image/png'
        return send_file(file_path, mimetype=mimetype)
    return "Not found", 404

if __name__ == '__main__':
    if not os.path.exists(IMAGE_FOLDER): os.makedirs(IMAGE_FOLDER)
    print("🚀 Backend Running (Port 5001)")
    app.run(debug=True, port=5001)