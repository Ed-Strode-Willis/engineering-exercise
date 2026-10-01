"""Export the FastAPI OpenAPI document without starting the server."""

import json
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPOSITORY_ROOT = BACKEND_ROOT.parent
OPENAPI_OUTPUT_PATH = REPOSITORY_ROOT / "frontend" / "openapi" / "openapi.json"


def add_backend_root_to_import_path() -> None:
    backend_root_path = str(BACKEND_ROOT)
    if backend_root_path not in sys.path:
        sys.path.insert(0, backend_root_path)


add_backend_root_to_import_path()

from app.main import app  # noqa: E402


def render_openapi_document(openapi_schema: dict) -> str:
    return json.dumps(openapi_schema, indent=2, sort_keys=True) + "\n"


def write_openapi_document(openapi_document: str) -> None:
    OPENAPI_OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OPENAPI_OUTPUT_PATH.write_text(openapi_document, encoding="utf-8")


def export_openapi_schema() -> None:
    openapi_schema = app.openapi()
    openapi_document = render_openapi_document(openapi_schema)
    write_openapi_document(openapi_document)


if __name__ == "__main__":
    export_openapi_schema()
