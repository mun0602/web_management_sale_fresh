import requests
import time

api_key = "sk-cp-K6yywGzXrs_xhqk2qud9bvbF4jtFYkXAUTiwyg1HWj1YocE4pf08yH3E1w_DZaEMqPO5icKE4EfqFqZZWra6SXH5UB0Tkak7AuFwEjRyMdVa725oWdpEYSM"
url = "https://api.minimax.io/v1/chat/completions"

payload = {
    "model": "MiniMax-Text-01",
    "messages": [
        {
            "role": "system",
            "content": "Bạn là chuyên gia marketing bất động sản. Hãy viết bài quảng cáo hấp dẫn, chuyên nghiệp dựa trên thông tin được cung cấp."
        },
        {
            "role": "user",
            "content": "Viết bài quảng cáo bán căn hộ Vinhomes Central Park 2PN, view Landmark 81, nội thất cơ bản, giá 5 tỷ."
        }
    ],
    "temperature": 0.7,
    "max_tokens": 1000
}

start_time = time.time()
try:
    response = requests.post(url, json=payload, headers={"Authorization": f"Bearer {api_key}"})
    end_time = time.time()
    
    elapsed_ms = (end_time - start_time) * 1000
    print(f"Status Code: {response.status_code}")
    print(f"Time Taken: {elapsed_ms:.2f} ms")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Content length: {len(data['choices'][0]['message']['content'])} characters")
except Exception as e:
    print(e)
