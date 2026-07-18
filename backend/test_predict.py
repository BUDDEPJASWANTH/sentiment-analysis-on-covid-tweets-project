import requests
import json

url = "http://127.0.0.1:8001/predict"
data = {"text": "I am so afraid of this horrible virus!"}

try:
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print(f"Error: {e}")
