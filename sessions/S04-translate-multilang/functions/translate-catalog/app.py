"""
S4 · TRANSLATE CATALOG  —  Catálogo bilingüe ES<->EN con Amazon Translate.

Flujo:
  POST /products/{id}/translate
    body: { "target": "en" }    (o "es")

    1. Lee name + description del producto.
    2. Amazon Translate los traduce al idioma destino (source auto-detectado).
    3. Guarda translations.<lang>.{name,description} en el producto.
    4. Devuelve la traducción.

Servicio de IA: Amazon Translate (traducción automática neuronal preentrenada).
Dominio AIF-C01: D1 — Fundamentals of AI and ML.
"""

import json
import os

import boto3

PRODUCTS_TABLE = os.environ["PRODUCTS_TABLE"]
ALLOWED_TARGETS = {"en", "es"}

translate = boto3.client("translate")
table = boto3.resource("dynamodb").Table(PRODUCTS_TABLE)


def _response(status, body):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body, ensure_ascii=False),
    }


def _translate(text, target):
    if not text:
        return ""
    resp = translate.translate_text(
        Text=text, SourceLanguageCode="auto", TargetLanguageCode=target
    )
    return resp["TranslatedText"]


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

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return _response(400, {"error": "Body JSON inválido."})

    target = (body.get("target") or "en").lower()
    if target not in ALLOWED_TARGETS:
        return _response(400, {"error": f"target debe ser uno de {sorted(ALLOWED_TARGETS)}"})

    item = table.get_item(Key={"productId": product_id}).get("Item")
    if not item:
        return _response(404, {"error": f"Producto {product_id} no encontrado."})

    try:
        translated_name = _translate(item.get("name", ""), target)
        translated_desc = _translate(item.get("description", ""), target)
    except Exception as e:  # noqa: BLE001
        print("Translate error:", repr(e))
        return _response(502, {"error": "Fallo al traducir", "detail": str(e)})

    # Guardamos bajo translations.<lang> usando un mapa anidado.
    table.update_item(
        Key={"productId": product_id},
        UpdateExpression="SET translations = if_not_exists(translations, :empty)",
        ExpressionAttributeValues={":empty": {}},
    )
    table.update_item(
        Key={"productId": product_id},
        UpdateExpression="SET translations.#lang = :t",
        ExpressionAttributeNames={"#lang": target},
        ExpressionAttributeValues={":t": {"name": translated_name, "description": translated_desc}},
    )

    return _response(
        200,
        {
            "productId": product_id,
            "target": target,
            "translation": {"name": translated_name, "description": translated_desc},
        },
    )
