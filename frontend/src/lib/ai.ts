export type Service = 'VITE_ENRICH_LABELS_URL' | 'VITE_MODERATE_IMAGE_URL' |
  'VITE_SENTIMENT_URL' | 'VITE_TRANSLATE_URL' | 'VITE_VOICE_URL' |
  'VITE_DESCRIBE_URL' | 'VITE_INDEX_URL' | 'VITE_SEMANTIC_SEARCH_URL' | 'VITE_ASSISTANT_URL';

export interface SearchHit { productId: string; name: string; category?: string; price?: number; score?: number }
export interface ChatTurn { role: 'user' | 'assistant'; text: string }
export interface AiResult {
  productId?: string;
  labels?: { name: string; confidence: number }[];
  moderationStatus?: string;
  moderationFlags?: { name: string }[];
  altText?: string;
  overallSentiment?: string;
  results?: { sentiment: string; scores: Record<string, number> }[];
  translation?: { name: string; description: string };
  audioUrl?: string;
  expiresIn?: number;
  description?: string;
  saved?: boolean;
  blocked?: boolean;
  indexed?: number;
  skipped?: number;
  total?: number;
}

export function serviceUrl(key: Service): string {
  const value = window.__ENV?.[key] || import.meta.env[key];
  if (!value || typeof value !== 'string' || !/^https?:\/\//.test(value)) {
    throw new Error('Esta función todavía no está conectada. Actualiza la configuración del sitio desde el despliegue.');
  }
  return value.replace(/\/+$/, '');
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un problema. Intenta de nuevo.';
}

// A single request policy for every AI button. Never retry a billable POST silently.
export async function aiRequest<T>(service: Service, path: string, body?: unknown, method = 'POST'): Promise<T> {
  const url = serviceUrl(service) + path;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), service === 'VITE_INDEX_URL' ? 130000 : 70000);
  try {
    const response = await fetch(url, {
      method,
      signal: controller.signal,
      ...(body !== undefined ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = data?.error || data?.message || data?.Message;
      throw new Error(typeof message === 'string' ? message : `El servicio respondió con un error (${response.status}). Intenta de nuevo.`);
    }
    if (!data || typeof data !== 'object') throw new Error('El servicio devolvió una respuesta inesperada.');
    return data as T;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('La solicitud tardó demasiado. Puede seguir procesándose; espera un momento antes de repetirla.');
    if (error instanceof TypeError) throw new Error('No se pudo conectar con esta función. Comprueba tu conexión; si otras funciones sirven, revisa su URL y CORS en el despliegue.');
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

export const ai = {
  product: (service: Service, id: string, action: string, body?: unknown) =>
    aiRequest<AiResult>(service, `/products/${encodeURIComponent(id)}/${action}`, body),
  sentiment: (text: string) => aiRequest<AiResult>('VITE_SENTIMENT_URL', '', { text }),
  index: () => aiRequest<AiResult>('VITE_INDEX_URL', '/search/index'),
  search: (query: string) => aiRequest<{ query: string; results: SearchHit[]; hint?: string }>('VITE_SEMANTIC_SEARCH_URL', `/search?q=${encodeURIComponent(query)}`, undefined, 'GET'),
  chat: (message: string, history: ChatTurn[]) => aiRequest<{ reply: string; retrieved: SearchHit[]; blocked?: boolean }>('VITE_ASSISTANT_URL', '/assistant', { message, history: history.slice(-10) }),
};
