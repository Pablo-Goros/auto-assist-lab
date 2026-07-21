from fastapi.testclient import TestClient


def test_health_check_returns_ok(client: TestClient, mock_db_connection: None) -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
