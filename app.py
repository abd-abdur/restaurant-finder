from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)  # Allows frontend requests

API_KEY = "33cb5d0b9d8d953d6ff3a927101e241cf0346278de7dc7eab02cda663f9e15a3"

@app.route('/fetch_restaurants', methods=['GET'])
def fetch_restaurants():
    region = request.args.get("region")
    min_reviews = int(request.args.get("min_reviews", 100))
    min_rating = float(request.args.get("min_rating", 4.0))

    if not region:
        return jsonify({"error": "Region is required"}), 400

    url = "https://serpapi.com/search"
    params = {"engine": "google_maps", "q": f"restaurants in {region}", "api_key": API_KEY, "hl": "en"}
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    results = data.get("local_results", [])
    filtered = []

    for r in results:
        if r.get("rating", 0) >= min_rating and r.get("reviews", 0) >= min_reviews:
            filtered.append({
                "name": r.get("title"),
                "address": r.get("address"),
                "rating": r.get("rating"),
                "reviews": r.get("reviews"),
                "phone": r.get("phone"),
                "lat": r.get("gps_coordinates", {}).get("latitude"),
                "lng": r.get("gps_coordinates", {}).get("longitude"),
                "maps_link": f"https://www.google.com/maps/place/?q=place_id:{r.get('place_id')}"
            })

    return jsonify(filtered)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=6000, debug=True)
