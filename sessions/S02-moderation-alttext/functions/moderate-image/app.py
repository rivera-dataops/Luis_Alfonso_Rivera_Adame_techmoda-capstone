"""
S2 · MODERATE IMAGE  —  Moderación de contenido + texto alternativo accesible.

Flujo:
  POST /products/{id}/moderate
    1. Lee el producto y su imageUrl.
    2. Rekognition DetectModerationLabels -> ¿la imagen es apta para el catálogo?
    3. Rekognition DetectLabels -> construye un alt-text accesible para la foto.
    4. Guarda moderationStatus + altText en el producto.
    5. Devuelve el veredicto y el alt-text.

Servicio de IA: Amazon Rekognition (moderación de contenido).
Dominio AIF-C01: D4 — Guidelines for Responsible AI (seguridad del contenido + accesibilidad).
"""

import json
import os
from decimal import Decimal
import urllib.request
from urllib.parse import urlparse

import boto3

PRODUCTS_TABLE = os.environ["PRODUCTS_TABLE"]
# Confianza mínima para considerar que una etiqueta de moderación aplica.
MODERATION_MIN_CONFIDENCE = float(os.environ.get("MODERATION_MIN_CONFIDENCE", "60"))

rekognition = boto3.client("rekognition")
table = boto3.resource("dynamodb").Table(PRODUCTS_TABLE)


def _response(status, body):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body, ensure_ascii=False),
    }


def _image_param(image_url):
    if image_url.startswith("s3://"):
        p = urlparse(image_url)
        return {"S3Object": {"Bucket": p.netloc, "Name": p.path.lstrip("/")}}
    if image_url.startswith(("http://", "https://")):
        with urllib.request.urlopen(image_url, timeout=10) as r:
            return {"Bytes": r.read()}
    raise ValueError(f"imageUrl no soportada: {image_url!r}")


def _build_alt_text(labels, product_name):
    """Texto alternativo accesible a partir de las etiquetas de visión."""
    top = [l["Name"] for l in labels[:5]]
    if not top:
        return f"Imagen del producto {product_name}."
    return f"Imagen de producto que muestra: {', '.join(top)}."


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

    item = table.get_item(Key={"productId": product_id}).get("Item")
    if not item:
        return _response(404, {"error": f"Producto {product_id} no encontrado."})

    image_url = item.get("imageUrl", "")
    if not image_url or image_url.startswith("REEMPLAZAR"):
        return _response(422, {"error": "El producto no tiene una imageUrl válida."})

    try:
        image_param = _image_param(image_url)
        moderation = rekognition.detect_moderation_labels(
            Image=image_param, MinConfidence=MODERATION_MIN_CONFIDENCE
        )
        # Reutilizamos la misma imagen para el alt-text.
        labels_resp = rekognition.detect_labels(Image=image_param, MaxLabels=10, MinConfidence=80)
    except Exception as e:  # noqa: BLE001
        print("Rekognition error:", repr(e))
        return _response(502, {"error": "Fallo al moderar la imagen", "detail": str(e)})

    flags = [
        {"name": m["Name"], "parent": m.get("ParentName", ""), "confidence": round(m["Confidence"], 2)}
        for m in moderation.get("ModerationLabels", [])
    ]
    status = "FLAGGED" if flags else "APPROVED"
    alt_text = _build_alt_text(labels_resp.get("Labels", []), item.get("name", ""))

    table.update_item(
        Key={"productId": product_id},
        UpdateExpression="SET moderationStatus = :s, moderationFlags = :f, altText = :a",
        ExpressionAttributeValues={":s": status, ":f": [
            {**flag, "confidence": Decimal(str(flag["confidence"]))} for flag in flags
        ], ":a": alt_text},
    )

    return _response(
        200,
        {
            "productId": product_id,
            "moderationStatus": status,
            "moderationFlags": flags,
            "altText": alt_text,
        },
    )
