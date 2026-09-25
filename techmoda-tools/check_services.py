"""Validate the actual browser contract. Never print signed audio links.
Default: read-only GET catalog + OPTIONS. --smoke invokes billable AI operations
and refreshes product metadata/index; description generation uses save=false.
"""
import argparse
import json
import re
import sys
import urllib.error
import urllib.request
from urllib.parse import urlsplit
from configure_frontend import stack_outputs, runtime_config

def request(url, method, origin, body=None, preflight=False):
    headers = {"Origin": origin}
    data = None
    if preflight:
        headers.update({"Access-Control-Request-Method": method, "Access-Control-Request-Headers": "content-type"})
        method = "OPTIONS"
    elif body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        response = urllib.request.urlopen(req, timeout=135)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        values = response.headers.get_all("Access-Control-Allow-Origin") or []
        cors = len(values) == 1 and values[0] in (origin, "*")
        if preflight:
            allowed_methods = ",".join(response.headers.get_all("Access-Control-Allow-Methods") or []).upper()
            allowed_headers = ",".join(response.headers.get_all("Access-Control-Allow-Headers") or []).lower()
            cors = cors and ("*" in allowed_methods or headers["Access-Control-Request-Method"] in allowed_methods)
            cors = cors and ("*" in allowed_headers or "content-type" in allowed_headers)
        raw = response.read()
        try:
            result = json.loads(raw) if raw else {}
        except (ValueError, UnicodeError):
            result = {}
        return response.status, cors, result

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--stack", default="techmoda-ai")
    parser.add_argument("--region", default="us-east-1")
    parser.add_argument("--smoke", action="store_true", help="Invoca IA y actualiza metadatos/índice (puede generar cargos).")
    args = parser.parse_args()
    outputs = stack_outputs(args.stack, args.region)
    config = runtime_config(outputs)
    parsed = urlsplit(outputs["FrontendUrl"])
    origin = parsed.scheme + "://" + parsed.netloc
    failures = []
    def check(label, key, path, method="POST", body=None, preflight=False, required=None):
        try:
            status, cors, data = request(config[key] + path, method, origin, body, preflight)
            valid = 200 <= status < 300 and cors and (required is None or required in data)
            if key == "VITE_INDEX_URL" and not preflight:
                valid = valid and data.get("indexed", 0) > 0 and data.get("skipped", 0) == 0
            if key == "VITE_SEMANTIC_SEARCH_URL" and not preflight:
                valid = valid and bool(data.get("results"))
            if key == "VITE_ASSISTANT_URL" and not preflight:
                valid = valid and bool(data.get("reply")) and not data.get("blocked", False)
            if not valid:
                failures.append(label)
            print(("OK  " if valid else "ERROR  ") + label + f" — HTTP {status}, CORS {'correcto' if cors else 'ausente/duplicado/incorrecto'}")
            if not valid and isinstance(data, dict) and isinstance(data.get("error"), str):
                print("    " + data["error"][:200])
            return data if valid else {}
        except (OSError, ValueError, KeyError) as error:
            failures.append(label)
            print("ERROR  " + label + " — " + type(error).__name__)
            return {}
    try:
        req = urllib.request.Request(origin + "/env-config.js", headers={"Cache-Control": "no-cache"})
        with urllib.request.urlopen(req, timeout=20) as response:
            source = response.read(65536).decode("utf-8")
        matched = re.search(r"window\.__ENV\s*=\s*(\{.*\})\s*;", source, re.S)
        deployed = json.loads(matched.group(1)) if matched else {}
        if deployed != config:
            raise ValueError("Las URLs publicadas no coinciden con el stack.")
        print("OK  Configuración publicada del frontend")
    except (OSError, ValueError) as error:
        failures.append("Configuración publicada")
        print("ERROR  Configuración publicada — " + type(error).__name__)
    catalog = check("Catálogo", "VITE_API_URL", "/products", "GET", required="products")
    for key in config:
        method = "GET" if key == "VITE_SEMANTIC_SEARCH_URL" else "POST"
        check(key + " preflight", key, "", method=method, preflight=True)
    if args.smoke:
        products = catalog.get("products", [])
        if not products:
            print("No se pudo probar IA: falta un catálogo con productos.")
            return 1
        # Path comes from the project's own product IDs.
        from urllib.parse import quote
        path = "/products/" + quote(products[0]["productId"], safe="")
        check("Etiquetas", "VITE_ENRICH_LABELS_URL", path + "/labels", required="labels")
        check("Moderación", "VITE_MODERATE_IMAGE_URL", path + "/moderate", required="moderationStatus")
        check("Sentimiento", "VITE_SENTIMENT_URL", "", body={"text": "Me encantó la calidad."}, required="overallSentiment")
        check("Traducción", "VITE_TRANSLATE_URL", path + "/translate", body={"target": "en"}, required="translation")
        voice = check("Audio", "VITE_VOICE_URL", path + "/voice", body={"lang": "es"}, required="audioUrl")
        if voice.get("audioUrl"):
            try:
                audio_url = voice["audioUrl"]
                parts = urlsplit(audio_url)
                if parts.scheme != "https" or not parts.hostname or not parts.hostname.endswith(".amazonaws.com"):
                    raise ValueError("El servicio no devolvió un enlace S3 HTTPS.")
                with urllib.request.urlopen(audio_url, timeout=20) as response:
                    if not response.headers.get("Content-Type", "").startswith("audio/") or not response.read(128):
                        raise ValueError("Audio vacío o tipo de contenido incorrecto.")
                print("OK  Archivo de audio accesible (enlace no mostrado)")
            except (OSError, ValueError) as error:
                failures.append("Archivo de audio")
                print("ERROR  Archivo de audio — " + type(error).__name__)
        check("Descripción (borrador)", "VITE_DESCRIBE_URL", path + "/describe", body={"tone": "claro", "save": False}, required="description")
        check("Índice", "VITE_INDEX_URL", "/search/index", required="indexed")
        check("Búsqueda", "VITE_SEMANTIC_SEARCH_URL", "/search?q=ropa", method="GET", required="results")
        check("Asistente", "VITE_ASSISTANT_URL", "/assistant", body={"message": "Recomienda un producto del catálogo"}, required="reply")
    print(f"Comprobaciones con fallos: {len(failures)}")
    return 1 if failures else 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as error:
        print("No se pudo verificar el despliegue: " + str(error), file=sys.stderr)
        sys.exit(1)
