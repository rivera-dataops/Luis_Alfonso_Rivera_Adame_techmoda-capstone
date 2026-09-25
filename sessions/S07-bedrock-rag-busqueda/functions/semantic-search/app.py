"""
S7 (2/2) · SEMANTIC SEARCH  —  Búsqueda semántica sobre el catálogo.

Flujo:
  GET /search?q=algo+abrigado+para+el+frio
    1. Convierte la consulta en un embedding (Bedrock Titan Embeddings).
    2. Compara contra los embeddings guardados de cada producto (similitud coseno).
    3. Devuelve los productos ordenados por relevancia semántica.

A diferencia de un LIKE de texto, esto entiende SIGNIFICADO: "algo para abrigarse"
puede devolver "Chaqueta de mezclilla" aunque la palabra "abrigo" no aparezca.

Servicio de IA: Amazon Bedrock (embeddings).
Dominio AIF-C01: D3 — Applications of Foundation Models (28%). Recuperación semántica (base del RAG).
"""

import json
import math
import os

import boto3

PRODUCTS_TABLE = os.environ["PRODUCTS_TABLE"]
EMBED_MODEL_ID = os.environ.get("EMBED_MODEL_ID", "amazon.titan-embed-text-v2:0")
TOP_K = int(os.environ.get("SEARCH_TOP_K", "5"))

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
    return json.loads(resp["body"].read())["embedding"]


def _cosine(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


def lambda_handler(event, context):
    print("Event:", json.dumps(event))
    query = (event.get("queryStringParameters") or {}).get("q", "").strip()
    if not query:
        return _response(400, {"error": "Falta el parámetro de consulta ?q="})

    try:
        q_vec = _embed(query)
    except Exception as e:  # noqa: BLE001
        print("Embed error:", repr(e))
        return _response(502, {"error": "Fallo al generar el embedding de la consulta", "detail": str(e)})

    items = table.scan().get("Items", [])
    scored = []
    for item in items:
        emb = item.get("embedding")
        if not emb:
            continue
        try:
            vec = json.loads(emb)
        except (TypeError, json.JSONDecodeError):
            continue
        score = _cosine(q_vec, vec)
        scored.append(
            {
                "productId": item["productId"],
                "name": item.get("name", ""),
                "category": item.get("category", ""),
                "price": float(item["price"]) if item.get("price") is not None else None,
                "score": round(score, 4),
            }
        )

    scored.sort(key=lambda x: x["score"], reverse=True)
    if not scored:
        return _response(
            200,
            {"query": query, "results": [], "hint": "¿Corriste POST /search/index primero?"},
        )

    return _response(200, {"query": query, "results": scored[:TOP_K]})
