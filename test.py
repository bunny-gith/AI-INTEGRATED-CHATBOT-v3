import requests
import json

API_KEY = "AIzaSyCVIVQYQRXwJAR5SPDHz7ngDaFym8mCQwc"

url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

headers = {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": API_KEY
}

data = {
    "contents": [
        {
            "parts": [
                {"text": "Explain how AI works in a few words"}
            ]
        }
    ]
}

response = requests.post(url, headers=headers, data=json.dumps(data))

if response.status_code == 200:
    print("✅ Gemini API is working!")
    resp_json = response.json()
    try:
        # Updated extraction for new response structure
        output_text = resp_json["candidates"][0]["content"]["parts"][0]["text"]
        print("Response:", output_text)
    except (KeyError, IndexError):
        print("Could not extract reply:", resp_json)
else:
    print("❌ API Error!")
    print("Status Code:", response.status_code)
    print("Response:", response.text)