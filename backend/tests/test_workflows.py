import pytest
from fastapi.testclient import TestClient

from app.dependencies import get_workflow_repository
from app.main import app
from app.persistence.memory import InMemoryWorkflowRepository
from app.persistence.seed import EXAMPLE_PIPELINE_ID, build_example_pipeline
from app.routers.workflows import workflow_to_write
from app.validation.examples import open_required_output, valid_pipeline
from app.validation.service import validate_workflow


@pytest.fixture
def repository() -> InMemoryWorkflowRepository:
    return InMemoryWorkflowRepository(seed_example_workflow=False)


@pytest.fixture
def client(repository: InMemoryWorkflowRepository) -> TestClient:
    app.dependency_overrides[get_workflow_repository] = lambda: repository
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()


def document_json(workflow_write) -> dict:
    return workflow_write.model_dump(by_alias=True, mode="json")


def test_create_get_replace_and_delete_round_trip(client: TestClient):
    created = client.post("/workflows", json=document_json(valid_pipeline()))
    assert created.status_code == 201
    created_body = created.json()
    workflow_id = created_body["workflow"]["id"]
    assert created_body["workflow"]["status"] == "valid"
    assert created_body["validation"]["valid"] is True

    fetched = client.get(f"/workflows/{workflow_id}")
    assert fetched.status_code == 200
    assert fetched.json()["workflow"]["name"] == "Load, transform, train"

    renamed = valid_pipeline().model_copy(update={"name": "Renamed pipeline"})
    replaced = client.put(f"/workflows/{workflow_id}", json=document_json(renamed))
    assert replaced.status_code == 200
    assert replaced.json()["workflow"]["name"] == "Renamed pipeline"
    assert replaced.json()["workflow"]["id"] == workflow_id

    deleted = client.delete(f"/workflows/{workflow_id}")
    assert deleted.status_code == 204
    missing = client.get(f"/workflows/{workflow_id}")
    assert missing.status_code == 404
    assert missing.json()["detail"] == "Workflow not found"


def test_list_returns_workflows_in_creation_order(client: TestClient):
    client.post("/workflows", json={"name": "First", "nodes": [], "edges": []})
    client.post("/workflows", json={"name": "Second", "nodes": [], "edges": []})
    listed = client.get("/workflows")
    assert listed.status_code == 200
    assert [summary["name"] for summary in listed.json()] == ["First", "Second"]


def test_missing_workflow_returns_404_for_each_lookup(client: TestClient):
    assert client.get("/workflows/missing").status_code == 404
    assert (
        client.put(
            "/workflows/missing",
            json={"name": "Nope", "nodes": [], "edges": []},
        ).status_code
        == 404
    )
    assert client.delete("/workflows/missing").status_code == 404


def test_invalid_graph_is_stored_as_invalid(client: TestClient):
    created = client.post("/workflows", json=document_json(open_required_output()))
    assert created.status_code == 201
    body = created.json()
    assert body["workflow"]["status"] == "invalid"
    assert body["validation"]["valid"] is False
    assert body["validation"]["errors"] == []
    open_output_warning = body["validation"]["warnings"][0]
    assert open_output_warning["code"] == "REQUIRED_OUTPUT_DISCONNECTED"
    assert open_output_warning["severity"] == "warning"
    assert open_output_warning["message"] == (
        'The Dataset output on "Transform Dataset" still needs a connection.'
    )

    fetched = client.get(f"/workflows/{body['workflow']['id']}")
    assert fetched.json()["workflow"]["nodes"][0]["id"] == "datasource-1"


def test_replacing_a_valid_workflow_with_an_invalid_graph_stores_invalid(
    client: TestClient,
):
    created = client.post("/workflows", json=document_json(valid_pipeline()))
    workflow_id = created.json()["workflow"]["id"]

    replaced = client.put(
        f"/workflows/{workflow_id}",
        json=document_json(open_required_output()),
    )
    assert replaced.status_code == 200
    assert replaced.json()["workflow"]["status"] == "invalid"
    assert replaced.json()["validation"]["valid"] is False


def test_last_write_wins(client: TestClient):
    created = client.post("/workflows", json=document_json(valid_pipeline()))
    workflow_id = created.json()["workflow"]["id"]
    first_write = valid_pipeline().model_copy(update={"name": "First write"})
    second_write = valid_pipeline().model_copy(update={"name": "Second write"})

    client.put(f"/workflows/{workflow_id}", json=document_json(first_write))
    client.put(f"/workflows/{workflow_id}", json=document_json(second_write))

    fetched = client.get(f"/workflows/{workflow_id}")
    assert fetched.json()["workflow"]["name"] == "Second write"


def test_blank_name_is_rejected(client: TestClient):
    response = client.post("/workflows", json={"name": "   ", "nodes": [], "edges": []})
    assert response.status_code == 422


def test_removed_any_type_is_rejected(client: TestClient):
    response = client.post(
        "/workflows",
        json={
            "name": "Any",
            "nodes": [
                {
                    "id": "datasource-1",
                    "type": "DataSource",
                    "position": {"x": 0, "y": 0},
                    "data": {
                        "label": "Load",
                        "inputs": [],
                        "outputs": [
                            {
                                "id": "dataset",
                                "label": "Dataset",
                                "type": "Any",
                            }
                        ],
                    },
                }
            ],
            "edges": [],
        },
    )
    assert response.status_code == 422


def test_seed_repository_opens_the_example_pipeline_as_valid():
    repository = InMemoryWorkflowRepository(seed_example_workflow=True)
    example_pipeline = repository.get_workflow(EXAMPLE_PIPELINE_ID)
    assert example_pipeline is not None
    assert example_pipeline.status == "valid"
    assert example_pipeline.name == build_example_pipeline().name
    validation_result = validate_workflow(workflow_to_write(example_pipeline))
    assert validation_result.valid is True
