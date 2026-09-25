"""
S3 · ANALYZE SENTIMENT  —  Sentimiento de reseñas con Amazon Comprehend.

Flujo:
  POST /sentiment
    body: { "text": "..." }                         -> sentimiento de un texto
       o: { "reviews": ["...", "..."], "productId": "abc" }  -> agrega y guarda

    1. Detecta el idioma dominante (DetectDominantLanguage).
    2. Analiza el sentimiento (DetectSentiment) en ese idioma.
    3. Si vienen varias reseñas + productId, calcula el agregado y lo guarda en el producto.

Servicio de IA: Amazon Comprehend (NLP preentrenado).
Dominio AIF-C01: D1 — Fundamentals of AI and ML (procesamiento de lenguaje natural).
"""

import json
import os
from collections import Counter

import boto3

PRODUCTS_TABLE = os.environ["PRODUCTS_TABLE"]
# Comprehend DetectSentiment soporta un set acotado de idiomas; ajustamos al detectado.
SUPPORTED = {"es", "en", "fr", "de", "it", "pt", "ar", "hi", "ja", "ko", "zh", "zh-TW"}

comprehend = boto3.client("comprehend")
table = boto3.resource("dynamodb").Table(PRODUCTS_TABLE)


def _response(status, body):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body, ensure_ascii=False),
    }


def _detect_language(text):
    resp = comprehend.detect_dominant_language(Text=text)
    langs = resp.get("Languages", [])
    code = langs[0]["LanguageCode"] if langs else "en"
    # Comprehend usa "es","en"... pero DetectSentiment no acepta variantes regionales raras.
    return code if code in SUPPORTED else "en"


def _analyze_one(text):
    lang = _detect_language(text)
    s = comprehend.detect_sentiment(Text=text, LanguageCode=lang)
    return {
        "text": text,
        "language": lang,
        "sentiment": s["Sentiment"],            # POSITIVE | NEGATIVE | NEUTRAL | MIXED
        "scores": {k: round(v, 4) for k, v in s["SentimentScore"].items()},
    }


def lambda_handler(event, context):
    print("Event:", json.dumps(event))
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return _response(400, {"error": "Body JSON inválido."})

    texts = []
    if body.get("text"):
        texts = [body["text"]]
    elif body.get("reviews"):
        texts = [t for t in body["reviews"] if isinstance(t, str) and t.strip()]

    if not texts:
        return _response(400, {"error": "Enviá 'text' o 'reviews' (lista de strings)."})

    results = [_analyze_one(t) for t in texts]

    # Sentimiento agregado: el más frecuente.
    tally = Counter(r["sentiment"] for r in results)
    overall = tally.most_common(1)[0][0]

    product_id = body.get("productId")
    if product_id and len(results) > 0:
        try:
            table.update_item(
                Key={"productId": product_id},
                UpdateExpression="SET reviewSentiment = :s, reviewSentimentCounts = :c",
                ExpressionAttributeValues={":s": overall, ":c": dict(tally)},
            )
        except Exception as e:  # noqa: BLE001
            print("DDB update warn:", repr(e))

    return _response(
        200,
        {
            "count": len(results),
            "overallSentiment": overall,
            "distribution": dict(tally),
            "results": results,
        },
    )
