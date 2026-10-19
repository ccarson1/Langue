
import json
from pathlib import Path


# C:\dev\Langue\backend
BACKEND_DIR = Path(__file__).resolve().parent.parent

# C:\dev\Langue\backend\models\config_models.json
CONFIG_FILE = Path(__file__).resolve().parent / "config_models.json"


def load_model_configs():
    with open(CONFIG_FILE, "r", encoding="utf-8") as file:
        data = json.load(file)

    models = data.get("models", [])

    for model in models:
        model["model_path"] = str(BACKEND_DIR / model["model_path"])

        if model.get("config_path"):
            model["config_path"] = str(BACKEND_DIR / model["config_path"])

    return models


def get_model_config(model_id):
    for model in load_model_configs():
        if model["id"] == model_id:
            return model

    raise ValueError(f"AI model configuration not found: {model_id}")
