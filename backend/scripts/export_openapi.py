"""Export the FastAPI OpenAPI contract for frontend type generation."""

import json
import os
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_ROOT.parent
OUTPUT_PATH = PROJECT_ROOT / "openapi.json"

# Re-enter through the project's virtual environment when this script is
# launched by npm from a system Python that does not have backend dependencies.
venv_python = BACKEND_ROOT / ".venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
if venv_python.exists() and Path(sys.executable).resolve() != venv_python.resolve():
    os.execv(venv_python, [str(venv_python), *sys.argv])

sys.path.insert(0, str(BACKEND_ROOT))

from app.main import app  # noqa: E402


def main() -> None:
    OUTPUT_PATH.write_text(
        json.dumps(app.openapi(), indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Exported OpenAPI contract to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
