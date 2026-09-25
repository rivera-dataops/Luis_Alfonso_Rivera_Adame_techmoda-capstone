"""
S7 (1/2) · INDEX EMBEDDINGS  —  Construye el índice semántico del catálogo.

Flujo:
  POST /search/index
    1. Recorre todos los productos.
    2. Para cada uno arma un texto (name + description + categoría + aiLabels).
    3. Pide un EMBEDDING a Bedrock (Amazon Titan Embeddings).
    4. Guarda el vector (como JSON string) en el atributo 'embedding' del producto.

El embedding es un vector numérico que representa el SIGNIFICADO del texto. Productos
con significado parecido quedan "cerca" en el espacio vectorial -> base de la búsqueda
semántica y del RAG (S8).

Servicio de IA: Amazon Bedrock (modelo de embeddings).
Dominio AIF-C01: D3 — Applications of Foundation Models (28%).
"""

import json
import os

import boto3

PRODUCTS_TABLE = os.environ["PRODUCTS_TABLE"]
EMBED_MODEL_ID = os.environ.get("EMBED_MODEL_ID", "amazon.titan-embed-text-v2:0")

bedrock = boto3.client("bedrock-runtime")
table = boto3.resource("dynamodb").Table(PRODUCTS_TABLE)


def _response(status, body):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body, ensure_ascii=False),
    }


def _embed(text):
    resp = bedrock.invoke_model(
        modelId=EMBED_MODEL_ID,
        contentType="application/json",
        accept="application/json",
        body=json.dumps({"inputText": text}),
    )
    payload = json.loads(resp["body"].read())
    return payload["embedding"]


def _product_text(item):
    parts = [
        item.get("name", ""),
        item.get("category", ""),
        item.get("description", ""),
        " ".join(item.get("aiLabels", []) or []),
    ]
    return " — ".join([p for p in parts if p])


def lambda_handler(event, context):
    print("Event:", json.dumps(event))
    # Scan simple (catálogo pequeño). En producción se paginaría / usaría un vector DB.
    items = table.scan().get("Items", [])
    indexed, skipped = 0, 0

    for item in items:
        text = _product_text(item)
        if not text:
            skipped += 1
            continue
        try:
            vector = _embed(text)
        except Exception as e:  # noqa: BLE001
            print(f"Embed error for {item.get('productId')}: {e!r}")
            skipped += 1
            continue
        # Guardamos el vector como JSON string (evita límites de Decimal en DynamoDB).
        table.update_item(
            Key={"productId": item["productId"]},
            UpdateExpression="SET embedding = :e, embeddingModel = :m, embeddingDim = :d",
            ExpressionAttributeValues={
                ":e": json.dumps(vector),
                ":m": EMBED_MODEL_ID,
                ":d": len(vector),
            },
        )
        indexed += 1

    return _response(
        200,
        {"indexed": indexed, "skipped": skipped, "total": len(items), "model": EMBED_MODEL_ID},
    )
