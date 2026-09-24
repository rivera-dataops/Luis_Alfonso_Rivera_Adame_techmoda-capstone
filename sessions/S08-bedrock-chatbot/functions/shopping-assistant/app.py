"""
S8 · SHOPPING ASSISTANT  —  Asistente de compras conversacional (RAG sobre el catálogo).

Flujo:
  POST /assistant
    body: { "message": "busco algo para una boda de día",
            "history": [ {"role":"user","text":"..."}, {"role":"assistant","text":"..."} ] }

    1. RETRIEVAL: embebe el mensaje y recupera los productos más relevantes (reusa los
       embeddings creados en S7).
    2. AUGMENT: arma un contexto con esos productos (grounding).
    3. GENERATION: llama a un foundation model con un system prompt + el contexto + el
       historial, y devuelve una respuesta conversacional anclada SOLO en el catálogo.

Es el patrón RAG completo: Retrieval (S7) + Augmented Generation (S6) sobre datos propios.

Servicio de IA: Amazon Bedrock (embeddings + generación).
Dominio AIF-C01: D2 (GenAI / prompt engineering) + D3 (RAG / aplicaciones de FM).
"""

import json
import math
import os

import boto3

PRODUCTS_TABLE = os.environ["PRODUCTS_TABLE"]
EMBED_MODEL_ID = os.environ.get("EMBED_MODEL_ID", "amazon.titan-embed-text-v2:0")
CHAT_MODEL_ID = os.environ.get("BEDROCK_MODEL_ID", "anthropic.claude-haiku-4-5-20251001-v1:0")
TOP_K = int(os.environ.get("ASSISTANT_TOP_K", "3"))
MAX_TOKENS = int(os.environ.get("BEDROCK_MAX_TOKENS", "400"))
GUARDRAIL_ID = os.environ.get("BEDROCK_GUARDRAIL_ID")
GUARDRAIL_VERSION = os.environ.get("BEDROCK_GUARDRAIL_VERSION", "DRAFT")

SYSTEM_PROMPT = (
    "Sos el asistente de compras de TechModa, una tienda de moda. Respondé en español, "
    "amable y conciso. Recomendá ÚNICAMENTE productos del CATÁLOGO que se te entrega como "
    "contexto; si nada encaja, decílo con honestidad y sugerí refinar la búsqueda. No "
    "inventes productos, precios ni características que no estén en el contexto."
)

bedrock = boto3.client("bedrock-runtime")
table = boto3.resource("dynamodb").Table(PRODUCTS_TABLE)


def _response(status, body):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
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
    na = math.sqrt(sum(x * x for x in a)) or 1.0
    nb = math.sqrt(sum(y * y for y in b)) or 1.0
    return dot / (na * nb)


def _retrieve(query, k):
    q_vec = _embed(query)
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
        scored.append((_cosine(q_vec, vec), item))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [item for _, item in scored[:k]]


def _format_context(products):
    if not products:
        return "(catálogo sin coincidencias relevantes)"
    lines = []
    for p in products:
        price = p.get("price", "")
        lines.append(
            f"- {p.get('name','')} | categoría: {p.get('category','')} | precio: {price} | "
            f"{p.get('description','')}"
        )
    return "\n".join(lines)


def _build_messages(history, message, context_block):
    messages = []
    for turn in history or []:
        role = turn.get("role")
        text = turn.get("text") or turn.get("content")
        if role in ("user", "assistant") and text:
            messages.append({"role": role, "content": [{"text": text}]})
    # Mensaje actual con el contexto recuperado inyectado (grounding).

    user_text = (
        f"CATÁLOGO RELEVANTE:\n{context_block}\n\n"
        f"PREGUNTA DEL CLIENTE: {message}"
    )
    messages.append({"role": "user", "content": [{"text": user_text}]})
    return messages


def lambda_handler(event, context):
    print("Event:", json.dumps(event))
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return _response(400, {"error": "Body JSON inválido."})

    message = (body.get("message") or "").strip()
    if not message:
        return _response(400, {"error": "Enviá 'message' con la consulta del cliente."})
    history = body.get("history", [])

    try:
        products = _retrieve(message, TOP_K)
        context_block = _format_context(products)
        messages = _build_messages(history, message, context_block)
        
        kwargs = {
            "modelId": CHAT_MODEL_ID,
            "system": [{"text": SYSTEM_PROMPT}],
            "messages": messages,
            "inferenceConfig": {"maxTokens": MAX_TOKENS, "temperature": 0.5},
        }
        if GUARDRAIL_ID:
            kwargs["guardrailConfig"] = {
                "guardrailIdentifier": GUARDRAIL_ID,
                "guardrailVersion": GUARDRAIL_VERSION,
            }
        resp = bedrock.converse(**kwargs)
        reply = resp["output"]["message"]["content"][0]["text"].strip()
        usage = resp.get("usage", {})
    except Exception as e:  # noqa: BLE001
        print("Bedrock error:", repr(e))
        return _response(
            502,
            {
                "error": "Fallo del asistente",
                "detail": str(e),
                "hint": "¿Habilitaste los modelos en Bedrock y corriste POST /search/index (S7)?",
            },
        )

    return _response(
        200,
        {
            "reply": reply,
            "retrieved": [{"productId": p["productId"], "name": p.get("name", "")} for p in products],
            "model": CHAT_MODEL_ID,
            "usage": usage,
        },
    )
