from fastapi.testclient import TestClient
import pytest

from api.app import app
from api import inference

@pytest.fixture(scope="module")
def client():
    return TestClient(app)


def test_healthcheck(client: TestClient):
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"message": "API is running."}
    

def test_score_valid(client: TestClient, monkeypatch: pytest.MonkeyPatch):

    def fake_prob_ai(test: str) -> tuple[float, int, str]:
        return (0.85, 213, "berkay-fake-model")
    
    monkeypatch.setattr(inference, "prob_ai", fake_prob_ai)

    payload = {"text": "Fixtures let you create objects (like a TestClient) in a controlled and isolated way, so each test can use them without duplicating setup code. This improves readability, ensures consistent test environments, and avoids shared state issues between tests. In your case, instead of making a global client, the client() fixture ensures that every test function automatically gets a properly initialized FastAPI test client when needed."}

    resp = client.post("/score", json=payload)

    assert resp.status_code == 200
    body = resp.json()
    print(body)
    assert body["prob_ai"] == 0.85
    assert body["n_tokens"] == 213
    assert body["model"] == "berkay-fake-model"
    assert body["version"]
    assert isinstance(body["latency"], (int, float)) and body["latency"] >= 0


def test_short_text(client: TestClient):

    resp = client.post("/score", json={"text": "Short text."})
    assert resp.status_code == 422

# Inference raises ValueError
def test_score_inference_value_error(client: TestClient, monkeypatch: pytest.MonkeyPatch):
    def inf_error(text: str):
        raise ValueError("custom length/quality constraint.")

    monkeypatch.setattr(inference, "prob_ai", inf_error)

    resp = client.post("/score", json={"text": "Fixtures let you create objects (like a TestClient) in a controlled and isolated way, so each test can use them without duplicating setup code. This improves readability, ensures consistent test environments, and avoids shared state issues between tests. In your case, instead of making a global client, the client() fixture ensures that every test function automatically gets a properly initialized FastAPI test client when needed."})
    assert resp.status_code == 422
    body = resp.json()
    assert "custom" in str(body.get("detail", ""))


# Inference raises unexpected error
def test_score_inference_unexpected_error(client: TestClient, monkeypatch: pytest.MonkeyPatch):
    def inf_unexpected_error(text: str):
        raise RuntimeError("unexpected failure.")

    monkeypatch.setattr(inference, "prob_ai", inf_unexpected_error)

    resp = client.post("/score", json={"text": "Fixtures let you create objects (like a TestClient) in a controlled and isolated way, so each test can use them without duplicating setup code. This improves readability, ensures consistent test environments, and avoids shared state issues between tests. In your case, instead of making a global client, the client() fixture ensures that every test function automatically gets a properly initialized FastAPI test client when needed."})
    assert resp.status_code == 500
    body = resp.json()
    assert body.get("detail") in ("Internal server error", "inference failed")


    

    