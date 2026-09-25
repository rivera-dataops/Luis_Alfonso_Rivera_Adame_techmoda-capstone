"""
S1 · ENRICH LABELS  —  Auto-etiquetado de imágenes de producto con Amazon Rekognition.

Flujo:
  POST /products/{id}/labels
    1. Lee el producto en DynamoDB y obtiene su imageUrl.
    2. Llama a Rekognition DetectLabels sobre la imagen.
    3. Guarda las etiquetas (aiLabels) de vuelta en el producto.
    4. Devuelve las etiquetas detectadas.

La imagen puede venir como:
  - s3://bucket/key   -> se pasa a Rekognition como S3Object (patrón de producción).
  - https://...       -> se descarga y se pasa como Bytes (cómodo para demos).

Servicio de IA: Amazon Rekognition (visión por computadora preentrenada).
Dominio AIF-C01: D1 — Fundamentals of AI and ML (percepción / clasificación).
"""

import json
import os
import urllib.request
from decimal import Decimal
from urllib.parse import urlparse

import boto3

PRODUCTS_TABLE = os.environ["PRODUCTS_TABLE"]
# Umbral mínimo de confianza para aceptar una etiqueta (0-100).
MIN_CONFIDENCE = float(os.environ.get("LABEL_MIN_CONFIDENCE", "80"))
MAX_LABELS = int(os.environ.get("LABEL_MAX_LABELS", "15"))

rekognition = boto3.client("rekognition")
table = boto3.resource("dynamodb").Table(PRODUCTS_TABLE)


def _response(status, body):
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
        },
        "body": json.dumps(body, ensure_ascii=False),
    }


def _build_image_param(image_url):
    """Devuelve el dict Image={...} que espera Rekognition según el tipo de URL."""
    if image_url.startswith("s3://"):
        parsed = urlparse(image_url)
        return {"S3Object": {"Bucket": parsed.netloc, "Name": parsed.path.lstrip("/")}}
    if image_url.startswith("http://") or image_url.startswith("https://"):
        with urllib.request.urlopen(image_url, timeout=10) as r:
            data = r.read()
        return {"Bytes": data}
    raise ValueError(f"imageUrl no soportada: {image_url!r}")


def _path_id(event):
    """Extrae el productId tanto de eventos API Gateway (pathParameters) como de
    Lambda Function URL (rawPath: /products/<id>/...). Fallback: query string o body."""
    pp = event.get("pathParameters") or {}
    if pp.get("id"):
        return pp["id"]
    raw = event.get("rawPath") or ((event.get("requestContext") or {}).get("http") or {}).get("path") or ""
    parts = [p for p in raw.split("/") if p]
    if "products" in parts:
        i = parts.index("products")
        if i + 1 < len(parts):
            return parts[i + 1]
    qs = event.get("queryStringParameters") or {}
    if qs.get("id"):
        return qs["id"]
    try:
        b = json.loads(event.get("body") or "{}")
        return b.get("productId") or b.get("id")
    except (TypeError, json.JSONDecodeError):
        return None


def lambda_handler(event, context):
    print("Event:", json.dumps(event))
    product_id = _path_id(event)
    if not product_id:
        return _response(400, {"error": "Falta el productId en la ruta."})

    # 1. Leer el producto
    item = table.get_item(Key={"productId": product_id}).get("Item")
    if not item:
        return _response(404, {"error": f"Producto {product_id} no encontrado."})

    image_url = item.get("imageUrl", "")
    if not image_url or image_url.startswith("REEMPLAZAR"):
        return _response(
            422,
            {"error": "El producto no tiene una imageUrl válida. Subí una imagen real primero."},
        )

    # 2. Llamar a Rekognition
    try:
        image_param = _build_image_param(image_url)
        result = rekognition.detect_labels(
            Image=image_param,
            MaxLabels=MAX_LABELS,
            MinConfidence=MIN_CONFIDENCE,
        )
    except Exception as e:  # noqa: BLE001 - queremos el detalle en logs y respuesta
        print("Rekognition error:", repr(e))
        return _response(502, {"error": "Fallo al analizar la imagen", "detail": str(e)})

    labels = [
        {"name": l["Name"], "confidence": round(l["Confidence"], 2)}
        for l in result.get("Labels", [])
    ]

    # 3. Guardar en DynamoDB (las etiquetas como lista de strings para búsqueda simple).
    #    DynamoDB NO acepta float -> los Confidence van como Decimal.
    label_names = [l["name"] for l in labels]
    labels_ddb = [
        {"name": l["name"], "confidence": Decimal(str(l["confidence"]))}
        for l in labels
    ]
    table.update_item(
        Key={"productId": product_id},
        UpdateExpression="SET aiLabels = :labels, aiLabelsRaw = :raw",
        ExpressionAttributeValues={":labels": label_names, ":raw": labels_ddb},
    )

    # 4. Responder
    return _response(
        200,
        {
            "productId": product_id,
            "imageSource": "s3" if image_url.startswith("s3://") else "url",
            "minConfidence": MIN_CONFIDENCE,
            "labels": labels,
        },
    )
