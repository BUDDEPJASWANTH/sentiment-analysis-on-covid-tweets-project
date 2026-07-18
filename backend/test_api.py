import requests

def test_predict():
    url = "http://127.0.0.1:8000/predict"
    
    test_inputs = [
        "I am so stressed about the quarantine, life is miserable right now.",
        "Got my second dose of the vaccine today, feeling great! #vaccinated",
        "The store hours have changed due to recent updates.",
        "This new variant is spreading way too fast, very concerning news @healthdept http://example.com"
    ]
    
    print("Testing /predict endpoint...")
    for text in test_inputs:
        print(f"\\nInput: {text}")
        try:
            response = requests.post(url, json={"text": text})
            if response.status_code == 200:
                print(f"Output: {response.json()}")
            else:
                print(f"Error ({response.status_code}): {response.text}")
        except Exception as e:
            print(f"Exception: {e}")

if __name__ == "__main__":
    test_predict()
