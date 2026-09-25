/**
 * Contrato de datos del catálogo.
 *
 * IMPORTANTE: estos nombres de campo deben coincidir EXACTAMENTE con lo que
 * guarda el backend en DynamoDB (camelCase). La fuente de verdad es:
 *   - la PK de la tabla:            productId   (template.yaml)
 *   - lo que persiste create-item:  functions/create-item/index.js
 *   - lo que escriben las Lambdas de IA (sessions/S0N/functions/.../app.py)
 *
 * Si agregás un campo acá, agregalo también en create-item y update-item, o se
 * descarta en silencio (el handler arma un objeto explícito, no hace passthrough).
 */
export interface Product {
  productId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  imageUrl: string;
  createdAt?: string;
  updatedAt?: string;

  // ---- Campos que agregan las sesiones de IA (opcionales) ----
  aiLabels?: string[];              // S1 · Rekognition DetectLabels
  aiLabelsRaw?: { name: string; confidence: number }[];
  aiModeration?: Record<string, unknown>;  // S2 · Rekognition moderación
  aiAltText?: string;               // S2 · alt-text accesible
  aiSentiment?: Record<string, unknown>;   // S3 · Comprehend
  aiTranslations?: Record<string, string>; // S4 · Translate
  aiAudioUrl?: string;              // S5 · Polly (URL prefirmada)
  aiDescription?: string;           // S6 · Bedrock
  aiEmbedding?: number[];           // S7 · Bedrock embeddings
  altText?: string;
  moderationStatus?: 'APPROVED' | 'FLAGGED';
  translations?: Record<string, { name: string; description: string }>;
}
