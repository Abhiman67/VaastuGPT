import os
import time
import random
import pandas as pd
import numpy as np
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import StandardScaler

app = Flask(__name__)
CORS(app)  # Allow the frontend to communicate with this backend

# --- CONFIGURATION ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
IMAGE_FOLDER = os.path.join(BASE_DIR, "dataset", "images", "images")
CSV_FILE = os.path.join(BASE_DIR, "dataset", "house_plans_details.csv")

# --- ML STATE ---
dataset_df = None
nn_model = None
scaler = None
query_history = {}

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

    data = request.json
    sq_ft = int(data.get('sq_ft', 1500))
    beds = int(data.get('bedrooms', 3))
    baths = int(data.get('bathrooms', 2))
    garage = int(data.get('garage', 1))

    request_key = f"{sq_ft}_{beds}_{baths}_{garage}"
    if request_key not in query_history:
        query_history[request_key] = 0

    print(f"\n🎯 Request: {sq_ft} sqft | {beds} Beds | {baths} Baths | {garage} Garage (Attempt #{query_history[request_key] + 1})")
    
    # 1. Processing Simulation
    fake_time = 3 + random.uniform(0.5, 1.5)
    print(f"⏳ ML Model inferencing... (Mock {fake_time:.2f}s delay)")
    time.sleep(fake_time)

    # 2. ML Prediction (Finding closest match)
    user_query = np.array([[sq_ft, beds, baths, garage]])
    scaled_query = scaler.transform(user_query)
    distances, indices = nn_model.kneighbors(scaled_query)
    
    # Cycling alternative matches to avoid showing same result if requesting same repeatedly
    current_attempt = query_history[request_key]
    result_idx = indices[0][current_attempt % len(indices[0])]
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
        "details": best_match
    })

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
    print("🚀 Backend Running (Port 5001)")
    app.run(debug=True, port=5001)