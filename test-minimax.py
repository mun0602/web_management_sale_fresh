import requests

api_key = "sk-cp-K6yywGzXrs_xhqk2qud9bvbF4jtFYkXAUTiwyg1HWj1YocE4pf08yH3E1w_DZaEMqPO5icKE4EfqFqZZWra6SXH5UB0Tkak7AuFwEjRyMdVa725oWdpEYSM"
url = "https://api.minimax.io/v1/chat/completions"

payload = {
    "model": "MiniMax-Text-01",
    "messages": [
        {"role": "user", "content": "hi"}
    ]
}

try:
    response = requests.post(url, json=payload, headers={"Authorization": f"Bearer {api_key}"})
    print(response.status_code)
    print(response.json())
except Exception as e:
    print(e)
