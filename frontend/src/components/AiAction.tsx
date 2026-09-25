import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { errorMessage } from '../lib/ai';
import type { AiResult } from '../lib/ai';
import { AiResultView } from './AiResultView';

export function AiAction({ title, description, icon, action, disabled, onPublish }: {
  title: string; description: string; icon: ReactNode; action: () => Promise<AiResult>;
  disabled?: boolean; onPublish?: (text: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AiResult | null>(null);
  const [error, setError] = useState('');
  const [published, setPublished] = useState(false);
  const [revision, setRevision] = useState(0);
  const lock = useRef(false);
  const run = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true); setError(''); setResult(null); setPublished(false);
    try { setResult(await action()); setRevision(value => value + 1); }
    catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); lock.current = false; }
  };
  const publish = async () => {
    if (!result?.description || !onPublish || lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await onPublish(result.description); setPublished(true); }
    catch (err) { setError(errorMessage(err)); }
    finally { lock.current = false; setBusy(false); }
  };
  return <section className="action-card">
    <div className="flex items-center gap-2 text-blue-700">{icon}<h3 className="font-semibold text-slate-900">{title}</h3></div>
    <p className="mb-4 mt-2 text-sm text-slate-500">{description}</p>
    <button type="button" className="btn-secondary w-full" onClick={run} disabled={disabled || busy}>
      {busy && <Loader2 aria-hidden="true" size={16} className="animate-spin" />}{busy ? 'Procesando…' : title}
    </button>
    {busy && <p role="status" className="mt-2 text-xs text-slate-500">Espera un momento, estamos procesando tu solicitud.</p>}
    {error && <p role="alert" className="error-box mt-3">{error}</p>}
    {result && <AiResultView key={revision} result={result} />}
    {result?.description && onPublish && !result.blocked && <button className="btn-primary mt-3 w-full" onClick={publish} disabled={busy || published}>
      {published ? 'Descripción publicada' : 'Publicar esta descripción'}
    </button>}
  </section>;
}
