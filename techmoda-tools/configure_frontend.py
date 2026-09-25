"""Resolve current endpoints from CloudFormation before every frontend build."""
import argparse
import json
import subprocess
from pathlib import Path
from urllib.parse import urlsplit

OUTPUTS = {
    "VITE_API_URL": "ApiUrl",
    "VITE_ENRICH_LABELS_URL": "EnrichLabelsUrl",
    "VITE_MODERATE_IMAGE_URL": "ModerateImageUrl",
    "VITE_SENTIMENT_URL": "AnalyzeSentimentUrl",
    "VITE_TRANSLATE_URL": "TranslateCatalogUrl",
    "VITE_VOICE_URL": "SynthesizeVoiceUrl",
    "VITE_DESCRIBE_URL": "GenerateDescriptionUrl",
    "VITE_INDEX_URL": "IndexEmbeddingsUrl",
    "VITE_SEMANTIC_SEARCH_URL": "SemanticSearchUrl",
    "VITE_ASSISTANT_URL": "ShoppingAssistantUrl",
}

def stack_outputs(stack, region):
    result = subprocess.run(
        ["aws", "cloudformation", "describe-stacks", "--stack-name", stack,
         "--region", region, "--output", "json", "--no-cli-pager"],
        check=True, capture_output=True, text=True,
    )
    data = json.loads(result.stdout)["Stacks"][0]
    if data["StackStatus"] not in ("CREATE_COMPLETE", "UPDATE_COMPLETE", "UPDATE_ROLLBACK_COMPLETE"):
        raise RuntimeError("El stack no está listo: " + data["StackStatus"])
    return {item["OutputKey"]: item["OutputValue"] for item in data.get("Outputs", [])}

def runtime_config(outputs):
    config = {}
    for key, output in OUTPUTS.items():
        value = outputs.get(output, "").rstrip("/")
        parts = urlsplit(value)
        if parts.scheme != "https" or not parts.hostname or not parts.hostname.endswith(".on.aws") or parts.query:
            raise ValueError("Falta una Function URL válida en el output " + output)
        config[key] = value
    if not outputs.get("FrontendBucketName") or not outputs.get("FrontendUrl"):
        raise ValueError("Faltan los outputs del frontend.")
    return config

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--stack", default="techmoda-ai")
    parser.add_argument("--region", default="us-east-1")
    args = parser.parse_args()
    outputs = stack_outputs(args.stack, args.region)
    config = runtime_config(outputs)
    root = Path(__file__).resolve().parents[1]
    destination = root / "frontend/public/env-config.js"
    destination.write_text("// Generated from current CloudFormation outputs.\nwindow.__ENV = " + json.dumps(config, indent=2) + ";\n", encoding="utf-8")
    print("Configuradas las 10 URLs actuales en frontend/public/env-config.js")

if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as error:
        raise SystemExit("No se pudo consultar el stack. Revisa la sesión AWS, la cuenta y la región.\n" + (error.stderr or ""))
    except (ValueError, KeyError, RuntimeError) as error:
        raise SystemExit(str(error))
