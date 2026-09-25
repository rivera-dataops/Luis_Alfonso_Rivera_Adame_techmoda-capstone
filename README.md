<!-- entrega-techmoda-luis -->
# TechModa — Luis Alfonso Rivera Adame

Capstone: catálogo inteligente serverless en AWS con React, Lambda,
DynamoDB y Amazon Bedrock. Integra visión, sentimiento, traducción,
voz, búsqueda semántica y un asistente de compras con RAG.

- [Demo funcional (HTTP)](http://techmoda-mxmex35-luisxplayer-frontend.s3-website-us-east-1.amazonaws.com/)
- [Arquitectura, pruebas y notas de esta entrega](docs/ENTREGA_LUIS.md)
- Proyecto desarrollado sobre la base del [workshop TechModa](https://github.com/gabanox/techmoda-ai-capstone).

**Despliegue:** el script heredado `techmoda-tools/deploy.sh` apunta al bucket
del stack `techmoda-ai`, no al bucket de esta entrega. Revisar las notas antes
de volver a publicar. Las credenciales AWS y la configuración runtime son locales.

---

# TechModa AI — Capstone AWS re/Start · AI Practitioner (AIF-C01)

> **Bootcamp Institute · AWS re/Start**
> Versión **AI Practitioner** del capstone serverless de e-commerce *TechModa*.
> Tomamos una tienda de moda serverless ya funcional (Lambda Function URLs + DynamoDB + React)
> y le agregamos, **una sesión de 1 hora a la vez**, capacidades de **IA preentrenada y generativa**
> de AWS. Cada sesión es autocontenida: se despliega y se ve funcionar en ~60 minutos.

> 🔌 **Dos decisiones de arquitectura.** (1) **Sin API Gateway**: la API se expone con **Lambda
> Function URLs** — ver **[`docs/SANDBOX-COMPAT.md`](docs/SANDBOX-COMPAT.md)**. (2) **IAM de mínimo
> privilegio por función**: cada Lambda declara sus `Policies:` y SAM le crea su rol — ver
> **[`docs/IAM.md`](docs/IAM.md)**, léelo antes de agregar funciones. Necesitás una cuenta AWS donde
> puedas **crear roles IAM** (`iam:CreateRole`).

> 📄 La documentación del **capstone serverless base** (sin IA) se conserva en
> [`README-BASE-SERVERLESS.md`](README-BASE-SERVERLESS.md).

---

## 🎯 Visión

TechModa es una boutique de moda online. Su catálogo serverless ya hace el CRUD básico de productos.
El reto del/la egresado/a de re/Start es **convertir ese catálogo en un producto "AI-powered"** usando
exclusivamente servicios administrados de IA de AWS — **sin entrenar un solo modelo**. Ese es justo el
corazón del examen **AWS Certified AI Practitioner (AIF-C01)**: saber **elegir y aplicar** el servicio
de IA correcto para cada problema de negocio, entendiendo sus capacidades, costos, riesgos y controles.

Al terminar las 12 sesiones, TechModa:

- **Etiqueta y modera** sus fotos de producto automáticamente (Rekognition).
- Genera **texto alternativo accesible** para cada imagen (Rekognition + accesibilidad).
- Entiende el **sentimiento** de las reseñas de clientes (Comprehend).
- Ofrece su catálogo **bilingüe ES↔EN** sin traductores humanos (Translate).
- Lee las descripciones **en voz alta** para accesibilidad (Polly).
- **Redacta descripciones de producto** a partir de atributos (Bedrock — IA generativa).
- Tiene **búsqueda semántica / RAG** sobre el catálogo (Bedrock embeddings).
- Incluye un **asistente de compras conversacional** (Bedrock — chatbot + prompt engineering).
- Aplica **guardrails, control de sesgo y privacidad** sobre todas sus features de IA (Bedrock Guardrails).
- Opera con **IAM de mínimo privilegio, logging de invocación y control de costos** (gobernanza).

---

## 🗺️ Mapa de las 12 sesiones

| # | Sesión | Servicio de IA | Dominio AIF-C01 | Estado |
|---|--------|----------------|-----------------|--------|
| **S0** | [Desplegar TechModa base (CRUD serverless)](sessions/S00-base/GUIA.md) | — | Cimiento | ✅ Completa |
| **S1** | [Auto-etiquetado de imágenes de producto](sessions/S01-rekognition-labels/GUIA.md) | Rekognition `DetectLabels` | D1 (20%) | ✅ Completa |
| **S2** | [Moderación de imágenes + alt-text accesible](sessions/S02-moderation-alttext/GUIA.md) | Rekognition `DetectModerationLabels` | D4 (14%) | ✅ Completa |
| **S3** | [Sentimiento de reseñas](sessions/S03-comprehend-sentiment/GUIA.md) | Comprehend `DetectSentiment` | D1 (20%) | ✅ Completa |
| **S4** | [Catálogo multilingüe ES↔EN](sessions/S04-translate-multilang/GUIA.md) | Translate `TranslateText` | D1 (20%) | ✅ Completa |
| **S5** | [Descripción por voz (accesibilidad)](sessions/S05-polly-voice/GUIA.md) | Polly `SynthesizeSpeech` | D1 + D4 | ✅ Completa |
| **S6** | [Generar descripciones desde atributos](sessions/S06-bedrock-descripciones/GUIA.md) | Bedrock `InvokeModel` | D2 (24%) | ✅ Completa |
| **S7** | [Búsqueda semántica / RAG sobre el catálogo](sessions/S07-bedrock-rag-busqueda/GUIA.md) | Bedrock embeddings | D3 (28%) | ✅ Completa |
| **S8** | [Asistente de compras (chatbot)](sessions/S08-bedrock-chatbot/GUIA.md) | Bedrock + prompt engineering | D2 + D3 | ✅ Completa |
| **S9** | [Guardrails, sesgo y privacidad](sessions/S09-guardrails-sesgo/GUIA.md) | Bedrock Guardrails | D4 (14%) | 🟡 Guía detallada + scaffold |
| **S10** | [IAM mínimo privilegio, logging, costos](sessions/S10-iam-logging-costos/GUIA.md) | — (gobernanza) | D5 (14%) | 🟡 Guía detallada + scaffold |
| **S11** | [Integración final, demo, documentación, cleanup](sessions/S11-integracion-demo-cleanup/GUIA.md) | — (cierre) | Todos | 🟡 Guía detallada + scripts |

> **Leyenda de estado**
> ✅ **Completa** = código funcional (Lambda Python + boto3), snippet de `template.yaml` listo para pegar, y GUIA.md paso a paso.
> 🟡 **Guía + scaffold** = GUIA.md detallada con conceptos, pasos y "qué entra en el examen", más esqueleto de código/política para completar en la sesión.

---

## 📚 Mapa AIF-C01: dominios ↔ sesiones

El examen **AIF-C01** distribuye sus preguntas en 5 dominios. Verificado contra la
[guía oficial del examen (AWS)](https://docs.aws.amazon.com/aws-certification/latest/examguides/ai-practitioner-01.html)
el **2026-06-17**:

| Dominio | Nombre | Peso | Sesiones que lo cubren |
|---------|--------|------|------------------------|
| **D1** | Fundamentals of AI and ML | **20%** | S1, S3, S4, S5 |
| **D2** | Fundamentals of Generative AI | **24%** | S6, S8 |
| **D3** | Applications of Foundation Models | **28%** | S7, S8 |
| **D4** | Guidelines for Responsible AI | **14%** | S2, S5, S9 |
| **D5** | Security, Compliance & Governance for AI | **14%** | S10, S11 |

> **D2 + D3 = 52% del examen** → la mitad del peso es **IA generativa y foundation models**.
> Por eso las sesiones S6–S8 (Bedrock) concentran el mayor valor pedagógico.
>
> ⚠️ Los pesos pueden cambiar entre versiones del examen. **Verificá siempre la guía oficial vigente** antes de presentar.

---

## 🏗️ Arquitectura

```
                    ┌──────────────────────────────────────────────┐
                    │      Frontend React (S3 + CloudFront)        │
                    └───────────────────────┬──────────────────────┘
                                            │ HTTPS
              ┌─────────────────────────────┼──────────────────────────────┐
              │ Lambda Function URLs (AuthType NONE, CORS *) — sin API GW   │
              └──────┬───────────────────────────────────┬─────────────────┘
                     ▼ (1 Function URL)                   ▼ (1 URL por función IA)
        Router CRUD (Node.js, base S0)        AI Lambdas (S1–S8, Python + boto3)
        functions/router/index.js             ├─ enrich-labels      → Rekognition
          ├─ list/create/get/update/delete     ├─ moderate-image     → Rekognition
          (reusa las 5 Lambdas CRUD)           ├─ analyze-sentiment  → Comprehend
                     │                          ├─ translate-catalog  → Translate
                     │                          ├─ synthesize-voice   → Polly (+ S3 audio)
                     │                          ├─ generate-desc      → Bedrock
                     │                          ├─ semantic-search    → Bedrock (embeddings)
                     │                          └─ shopping-assistant → Bedrock (chat)
                     │   (cada una con su rol de mínimo privilegio creado por SAM)
                     ▼
              ┌────────────────────────────┐
              │   DynamoDB  (Products)     │
              └────────────────────────────┘
```

- **Base (S0):** **Lambda Function URL** (router CRUD Node.js) + DynamoDB + Frontend React, vía **AWS SAM**. Sin API Gateway.
- **IA (S1–S8):** cada sesión agrega 1 Lambda **Python 3.12 + boto3** (con su propia Function URL) que llama a un servicio de IA administrado y **escribe el resultado de vuelta en DynamoDB** o lo retorna.
- **IaC:** todo es **AWS SAM** (`template.yaml`). Cada sesión trae un `template-snippet.yaml` con el recurso nuevo (Function URL + `Policies:` acotadas), listo para pegar.
- **IAM:** un rol de mínimo privilegio por función, creado por SAM → ver **[`docs/IAM.md`](docs/IAM.md)**.

---

## ✅ Prerequisitos

1. **Una cuenta AWS donde puedas crear roles IAM** (`iam:CreateRole`).
   - El stack crea un rol de ejecución de mínimo privilegio **por Lambda**; sin ese permiso el deploy
     falla y CloudFormation revierte el stack entero. Ver [`docs/SANDBOX-COMPAT.md`](docs/SANDBOX-COMPAT.md) §2.
   - Región de trabajo: **`us-east-1`** (Norte de Virginia). Podés cambiarla: nada está atado a la región.
2. Herramientas: **AWS SAM CLI**, **AWS CLI v2**, **Node.js 22+**, **Python 3.12** (tiene que coincidir
   con el `Runtime` de las Lambdas de IA), **git**. El devcontainer de este repo las trae fijadas.
3. **Acceso a modelos de Bedrock** habilitado para S6–S9:
   Consola → **Amazon Bedrock → Model access** → habilitar los modelos que uses (Anthropic Claude Haiku
   y Amazon Titan Embeddings). Es un setting **por región**: habilitalo en la región del deploy.

> ✅ **Chequeo de un comando antes de tocar AWS:** `bash scripts/validate-all.sh --static`
> (herramientas, los 3 templates, los 8 snippets, sintaxis, frontend y coherencia del repo).
> Con el stack ya desplegado, `bash scripts/validate-all.sh` prueba además el CRUD y las 9 features de IA.

---

## 🚀 Cómo desplegar la base (S0)

```bash
# 1. Clonar el repo dentro del VS Code IDE del sandbox
git clone <este-repo> techmoda-ai-capstone && cd techmoda-ai-capstone

# 2. Configurar SAM para us-east-1
cp samconfig.us-east-1.example samconfig.toml

# 3. Construir y desplegar (atajo: bash scripts/deploy.sh)
sam build
sam deploy --stack-name techmoda-ai --region us-east-1 \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND \
  --resolve-s3 --no-confirm-changeset

# 4. (opcional) cargar productos de ejemplo CON imágenes para las sesiones de IA
bash ai/seed/seed-products.sh

# 5. Construir y publicar el frontend
bash scripts/deploy-frontend.sh
```

La salida del stack te da `ApiUrl` (la **Lambda Function URL** del router, formato
`https://<id>.lambda-url.us-east-1.on.aws/`) y `FrontendUrl`. Ábrelos y verás el catálogo de TechModa.
Detalle completo y validación en **[sessions/S00-base/GUIA.md](sessions/S00-base/GUIA.md)**.

> 🧩 **Dos formas de llegar al mismo resultado:**
> - **Progresiva (recomendada, pedagógica):** desplegás `template.yaml` (solo S0) y vas pegando el
>   `template-snippet.yaml` de cada sesión, una por hora. Así "ves crecer" la arquitectura.
> - **Todo junto:** `sam build -t template.full.yaml && sam deploy -t template.full.yaml --stack-name techmoda-ai
>   --region us-east-1 --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND --resolve-s3 --no-confirm-changeset`
>   despliega la base + las 8 features de IA (S1–S8) + gobernanza (S10) ya cableadas, cada una con su
>   Function URL. Útil para una demo rápida o para revisar el resultado final.
>   Este archivo está **validado con `sam validate --lint`**.
>
> ℹ️ Las Lambdas CRUD base usan **`nodejs22.x`** (la `nodejs18.x` del starter original quedó deprecada y su
> creación está deshabilitada en AWS desde 2026-02). Las Lambdas de IA usan **`python3.12`**.

---

## 💸 Nota de costos + cleanup (LEER SIEMPRE)

> 🔴 **Regla FinOps del capstone:** ningún recurso de IA se queda "encendido" entre sesiones más de lo necesario.
> Bedrock, Rekognition, Comprehend, Polly, Translate **cobran por uso** (por imagen / por carácter / por token).
> En volúmenes de práctica (decenas de llamadas) el costo es de **centavos**, pero **nunca lo dejes corriendo en bucle**.

**Cada `GUIA.md` termina con:**
1. Una **estimación de costo** de la sesión (marcada *"verificar contra la calculadora/precios oficiales de AWS"* — no inventamos cifras).
2. El bloque de **cleanup** específico (qué borrar y cómo).

Cleanup total del proyecto al terminar:

```bash
bash scripts/delete-all.sh   # vacía buckets S3 y borra el stack completo
```

Detalles: **[docs/COST_AND_CLEANUP.md](docs/COST_AND_CLEANUP.md)** y **[sessions/S11-integracion-demo-cleanup/GUIA.md](sessions/S11-integracion-demo-cleanup/GUIA.md)**.

---

## 🧭 Cómo navegar este repo

```
techmoda-ai-capstone/
├── README.md                  # este archivo
├── README-BASE-SERVERLESS.md  # docs del capstone serverless base (sin IA)
├── template.yaml              # SAM base (S0). Cada sesión agrega su snippet aquí.
├── samconfig.us-east-1.example
├── functions/                 # 5 Lambdas CRUD Node.js + router/ (1 Function URL, base S0)
├── frontend/                  # React + Vite (base S0)
├── scripts/                   # deploy / delete / logs / status
├── ai/
│   └── seed/                  # productos de ejemplo con imágenes para las sesiones IA
└── sessions/
    ├── S00-base/GUIA.md
    ├── S01-rekognition-labels/
    │   ├── GUIA.md
    │   ├── functions/enrich-labels/        # Lambda Python + boto3
    │   └── template-snippet.yaml           # recurso + Function URL + Policies: acotadas
    ├── S02-... S08-...                      # mismo patrón
    └── S09 / S10 / S11                       # guía + scaffold/scripts
```

**Flujo recomendado:** seguí las sesiones **en orden** (cada una asume la anterior). Para cada sesión:
1. Leé `GUIA.md` completa (objetivo + concepto de IA + "qué entra en el examen").
2. Pegá el `template-snippet.yaml` en `template.yaml`.
3. `sam build && sam deploy`.
4. Ejecutá el comando de prueba de la guía y observá el resultado.
5. Corré el **checklist de validación** y el **cleanup**.

---

## ⚖️ Marca y alcance

Material educativo de **Bootcamp Institute** para el programa **AWS re/Start**, pista *AI Practitioner (AIF-C01)*.
Caso práctico ficticio: la tienda **TechModa**. Los precios/cuotas de servicios que se citen están marcados
para **verificar contra la documentación oficial de AWS** — no son cifras inventadas ni garantizadas.

Proyecto **standalone** (no forma parte de ningún monorepo). Listo para revisión local. **No** se despliega
automáticamente ni se publica.
