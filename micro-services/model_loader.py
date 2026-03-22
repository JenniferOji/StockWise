from pathlib import Path
from huggingface_hub import hf_hub_download

HF_REPO_ID = "JennyO/stockwise-models"

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "models"
MODEL_DIR.mkdir(exist_ok=True)

# downloading all the necessary models and files from Hugging Face 
def download_file(filename: str, subdir: str = ""):
    local_path = MODEL_DIR / subdir / Path(filename).name
    local_path.parent.mkdir(parents=True, exist_ok=True)

    if not local_path.exists():
        downloaded = hf_hub_download(
            repo_id=HF_REPO_ID,
            filename=filename,
            repo_type="model",
        )

        from shutil import copyfile
        copyfile(downloaded, local_path)

    return str(local_path)


def load_all_models():
    print("Downloading models")

    download_file("finbert/model.onnx", "finbert")
    download_file("sentiment_preprocessor.onnx")
    download_file("sentiment_catboost_model.onnx")
    download_file("sentiment_label_map.pkl")

    download_file("clustered_stocks.csv")
    download_file("cluster_risk_mapping.pkl")
    download_file("stock_scaler.pkl")
    download_file("kmeans_pipeline.onnx")

    print("Models downloaded")