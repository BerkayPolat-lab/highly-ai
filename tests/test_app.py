import pytest
from fastapi.testclient import TestClient

from api import inference
from api.app import app


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

    payload = {
        "text": "Fixtures let you create objects (like a TestClient) in a controlled and isolated way, so each test can use them without duplicating setup code. This improves readability, ensures consistent test environments, and avoids shared state issues between tests. In your case, instead of making a global client, the client() fixture ensures that every test function automatically gets a properly initialized FastAPI test client when needed."
    }

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


def test_empty_text(client: TestClient):
    resp = client.post("/post", json={"text": ""})
    assert resp.status_code == 404


# Inference raises ValueError
def test_score_inference_value_error(client: TestClient, monkeypatch: pytest.MonkeyPatch):
    def inf_error(text: str):
        raise ValueError("custom length/quality constraint.")

    monkeypatch.setattr(inference, "prob_ai", inf_error)

    resp = client.post(
        "/score",
        json={
            "text": "Fixtures let you create objects (like a TestClient) in a controlled and isolated way, so each test can use them without duplicating setup code. This improves readability, ensures consistent test environments, and avoids shared state issues between tests. In your case, instead of making a global client, the client() fixture ensures that every test function automatically gets a properly initialized FastAPI test client when needed."
        },
    )
    assert resp.status_code == 422
    body = resp.json()
    assert "custom" in str(body.get("detail", ""))


def test_score_extremely_long_text(client, monkeypatch):
    huge_text = (
        "I would love to contribute by transforming multiplexed imaging data into structured, LLM-ready representations, much like how ChatGPT processes an uploaded image into vector embeddings. These representations can then be organized into tabular tissue feature datasets or spatial graphs that capture neighborhood interactions within tumor tissue. Drawing on my experience in image classification and tabular data processing, I aim to bridge the gap between complex, high-dimensional imaging data and interpretable, LLM-compatible inputs."
        * 10000
    ).strip()

    def fake_prob_ai(text: str):
        assert len(text) > 100_000
        return 0.42, 512, "mock-model"

    monkeypatch.setattr(inference, "prob_ai", fake_prob_ai)

    resp = client.post("/score", json={"text": huge_text})
    assert resp.status_code == 200
    body = resp.json()
    assert body["prob_ai"] == 0.42
    assert body["n_tokens"] == 512
    assert body["model"] == "mock-model"


# Inference raises unexpected error
def test_score_inference_unexpected_error(client: TestClient, monkeypatch: pytest.MonkeyPatch):
    def inf_unexpected_error(text: str):
        raise RuntimeError("unexpected failure.")

    monkeypatch.setattr(inference, "prob_ai", inf_unexpected_error)

    resp = client.post(
        "/score",
        json={
            "text": "Fixtures let you create objects (like a TestClient) in a controlled and isolated way, so each test can use them without duplicating setup code. This improves readability, ensures consistent test environments, and avoids shared state issues between tests. In your case, instead of making a global client, the client() fixture ensures that every test function automatically gets a properly initialized FastAPI test client when needed."
        },
    )
    assert resp.status_code == 500
    body = resp.json()
    assert body.get("detail") in ("Internal server error", "inference failed")
