
import requests
import uuid
import getpass
import json

url = "http://127.0.0.1:8000/api/user-progress/sync/"

token = getpass.getpass("Paste your Langue access token: ")

event_id = str(uuid.uuid4())

body = {
    "events": [
        {
            "event_id": event_id,
            "lesson_id": 67,
            "event_type": "completed",
            "occurred_at": "2026-10-21T12:00:00Z",
            "payload": {}
        }
    ]
}

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

print("\nSending first request...")

response = requests.post(
    url,
    headers=headers,
    json=body
)

print("HTTP status:", response.status_code)
print(json.dumps(response.json(), indent=2))

if response.ok:
    print("\nSending the same event again...")

    response = requests.post(
        url,
        headers=headers,
        json=body
    )

    print("HTTP status:", response.status_code)
    print(json.dumps(response.json(), indent=2))
