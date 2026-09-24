import { useEffect, useState } from 'react';
import {
  Bot,
  Database,
  Languages,
  Loader2,
  Search,
  ShieldCheck,
  Sparkles,
  Tags,
  Volume2,
} from 'lucide-react';
import type { Product } from '../lib/types';

interface AiWorkspaceProps {
  products: Product[];
}

function serviceUrl(key: string): string {
  const env = window.__ENV as unknown as Record<string, string | undefined> | undefined;
  const value = env?.[key];

  if (!value) {
    throw new Error(`Falta configurar ${key} en env-config.js.`);
  }

  return value.replace(/\/+$/, '');
}

async function request(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data === 'object' &&
      data !== null &&
      'error' in data &&
      typeof (data as Record<string, unknown>).error === 'string'
        ? (data as Record<string, string>).error
        : `Error ${response.status}: ${response.statusText}`;

    throw new Error(message);
  }

  return data;
}

function post(service: string, path = '', body?: unknown): Promise<unknown> {
  return request(`${serviceUrl(service)}${path}`, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function AiWorkspace({ products }: AiWorkspaceProps) {
  const [selectedId, setSelectedId] = useState('');
  const [sentimentText, setSentimentText] = useState(
    'Me encantó la calidad, llegó rapidísimo.'
  );
  const [semanticQuery, setSemanticQuery] = useState(
    'algo cómodo y blanco para caminar'
  );
  const [chatMessage, setChatMessage] = useState(
    'Busco algo cómodo y blanco para caminar'
  );
  const [result, setResult] = useState<unknown>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (products.length > 0 && !products.some((product) => product.productId === selectedId)) {
      setSelectedId(products[0].productId);
    }
  }, [products, selectedId]);

  const selectedProduct = products.find((product) => product.productId === selectedId);

  const productPath = () => {
    if (!selectedId) {
      throw new Error('Seleccioná un producto primero.');
    }

    return `/products/${selectedId}`;
  };

  const run = async (label: string, action: () => Promise<unknown>) => {
    setRunning(label);
    setError('');
    setResult(null);

    try {
      setResult(await action());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado.');
    } finally {
      setRunning(null);
    }
  };

  const audioUrl =
    typeof result === 'object' &&
    result !== null &&
    'audioUrl' in result &&
    typeof (result as Record<string, unknown>).audioUrl === 'string'
      ? (result as Record<string, string>).audioUrl
      : undefined;

  const productDisabled = !selectedId || running !== null;
  const buttonClass =
    'flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500';

  return (
    <section className="mb-8 rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-start gap-3">
        <div className="rounded-xl bg-blue-600 p-3 text-white">
          <Sparkles className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Centro IA TechModa</h2>
          <p className="text-sm text-gray-500">
            Probá las funciones de IA ya desplegadas en AWS.
          </p>
        </div>
      </div>

      <label className="mb-2 block text-sm font-medium text-gray-700">
        Producto para acciones de imagen, voz, traducción y descripción
      </label>
      <select
        value={selectedId}
        onChange={(event) => setSelectedId(event.target.value)}
        className="mb-5 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Seleccioná un producto</option>
        {products.map((product) => (
          <option key={product.productId} value={product.productId}>
            {product.name} — ${product.price.toFixed(2)}
          </option>
        ))}
      </select>

      {selectedProduct && (
        <p className="mb-4 text-sm text-gray-500">
          Seleccionado: <span className="font-medium text-gray-800">{selectedProduct.name}</span>
        </p>
      )}

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <button
          className={`${buttonClass} bg-blue-600 text-white hover:bg-blue-700`}
          disabled={productDisabled}
          onClick={() =>
            run('Etiquetando imagen', () =>
              post('VITE_ENRICH_LABELS_URL', `${productPath()}/labels`)
            )
          }
        >
          <Tags className="h-4 w-4" />
          Etiquetar imagen
        </button>

        <button
          className={`${buttonClass} bg-violet-600 text-white hover:bg-violet-700`}
          disabled={productDisabled}
          onClick={() =>
            run('Moderando imagen', () =>
              post('VITE_MODERATE_IMAGE_URL', `${productPath()}/moderate`)
            )
          }
        >
          <ShieldCheck className="h-4 w-4" />
          Moderar imagen
        </button>

        <button
          className={`${buttonClass} bg-emerald-600 text-white hover:bg-emerald-700`}
          disabled={productDisabled}
          onClick={() =>
            run('Traduciendo producto', () =>
              post('VITE_TRANSLATE_URL', `${productPath()}/translate`, { target: 'en' })
            )
          }
        >
          <Languages className="h-4 w-4" />
          Traducir a inglés
        </button>

        <button
          className={`${buttonClass} bg-amber-500 text-white hover:bg-amber-600`}
          disabled={productDisabled}
          onClick={() =>
            run('Generando audio', () =>
              post('VITE_VOICE_URL', `${productPath()}/voice`, { lang: 'es' })
            )
          }
        >
          <Volume2 className="h-4 w-4" />
          Generar audio
        </button>

        <button
          className={`${buttonClass} bg-fuchsia-600 text-white hover:bg-fuchsia-700`}
          disabled={productDisabled}
          onClick={() =>
            run('Generando descripción', () =>
              post('VITE_DESCRIBE_URL', `${productPath()}/describe`, {
                tone: 'elegante',
                save: true,
              })
            )
          }
        >
          <Sparkles className="h-4 w-4" />
          Generar descripción
        </button>

        <button
          className={`${buttonClass} bg-slate-700 text-white hover:bg-slate-800`}
          disabled={running !== null}
          onClick={() =>
            run('Indexando catálogo', () => post('VITE_INDEX_URL', '/search/index'))
          }
        >
          <Database className="h-4 w-4" />
          Indexar catálogo
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-xl bg-gray-50 p-4">
          <h3 className="mb-3 font-semibold text-gray-900">Sentimiento de reseña</h3>
          <textarea
            value={sentimentText}
            onChange={(event) => setSentimentText(event.target.value)}
            className="mb-3 min-h-24 w-full rounded-lg border border-gray-300 p-3 text-sm"
          />
          <button
            className={`${buttonClass} w-full bg-blue-600 text-white hover:bg-blue-700`}
            disabled={!sentimentText.trim() || running !== null}
            onClick={() =>
              run('Analizando sentimiento', () =>
                post('VITE_SENTIMENT_URL', '', { text: sentimentText })
              )
            }
          >
            Analizar sentimiento
          </button>
        </div>

        <div className="rounded-xl bg-gray-50 p-4">
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
            <Search className="h-4 w-4" />
            Búsqueda semántica
          </h3>
          <input
            value={semanticQuery}
            onChange={(event) => setSemanticQuery(event.target.value)}
            className="mb-3 w-full rounded-lg border border-gray-300 p-3 text-sm"
            placeholder="Ej. algo abrigado para el frío"
          />
          <button
            className={`${buttonClass} w-full bg-blue-600 text-white hover:bg-blue-700`}
            disabled={!semanticQuery.trim() || running !== null}
            onClick={() =>
              run('Buscando por significado', () =>
                request(
                  `${serviceUrl('VITE_SEMANTIC_SEARCH_URL')}/search?q=${encodeURIComponent(
                    semanticQuery
                  )}`
                )
              )
            }
          >
            Buscar por significado
          </button>
        </div>

        <div className="rounded-xl bg-gray-50 p-4">
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
            <Bot className="h-4 w-4" />
            Asistente de compras
          </h3>
          <input
            value={chatMessage}
            onChange={(event) => setChatMessage(event.target.value)}
            className="mb-3 w-full rounded-lg border border-gray-300 p-3 text-sm"
            placeholder="¿Qué estás buscando?"
          />
          <button
            className={`${buttonClass} w-full bg-blue-600 text-white hover:bg-blue-700`}
            disabled={!chatMessage.trim() || running !== null}
            onClick={() =>
              run('Consultando asistente', () =>
                post('VITE_ASSISTANT_URL', '', { message: chatMessage })
              )
            }
          >
            Preguntar al asistente
          </button>
        </div>
      </div>

      {running && (
        <div className="mt-5 flex items-center gap-2 rounded-lg bg-blue-50 p-4 text-blue-700">
          <Loader2 className="h-5 w-5 animate-spin" />
          {running}…
        </div>
      )}

      {error && (
        <div role="alert" className="mt-5 rounded-lg bg-red-50 p-4 text-red-700">
          Error: {error}
        </div>
      )}

      {audioUrl && (
        <audio className="mt-5 w-full" controls src={audioUrl}>
          Tu navegador no soporta audio.
        </audio>
      )}

      {result && (
        <pre className="mt-5 max-h-96 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </section>
  );
}