import { useRef, useState } from 'react';
import type { AiResult } from '../lib/ai';

const sentiments: Record<string, string> = { POSITIVE: 'Positivo', NEGATIVE: 'Negativo', NEUTRAL: 'Neutral', MIXED: 'Mixto' };

export function AiResultView({ result }: { result: AiResult }) {
  const [audioFailed, setAudioFailed] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const playAudio = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    setAudioFailed(false);
    try {
      await audio.play();
    } catch {
      setAudioFailed(true);
    }
  };

  return <div className="ai-result" aria-live="polite">
    {result.labels && <div className="flex flex-wrap gap-2">{result.labels.length ? result.labels.map(label =>
      <span className="badge" key={label.name}>{label.name} · {Math.round(label.confidence)}%</span>
    ) : <p>No se detectaron etiquetas con suficiente confianza.</p>}</div>}
    {result.moderationStatus && <div>
      <p className="font-semibold">{result.moderationStatus === 'APPROVED' ? 'Imagen aprobada' : 'Imagen pendiente de revisión'}</p>
      <p className="mt-2 text-sm text-slate-600">{result.altText}</p>
      {result.moderationFlags?.map(flag => <span className="badge" key={flag.name}>{flag.name}</span>)}
    </div>}
    {result.translation && <div><h4 className="font-semibold">{result.translation.name}</h4><p className="mt-2 leading-relaxed">{result.translation.description}</p></div>}
    {result.audioUrl && <div>
      <p className="mb-2 text-sm">Tu audio está listo. Presiona reproducir.</p>
      <audio
        ref={audioRef}
        aria-label="Descripción del producto en audio"
        controls
        preload="metadata"
        src={result.audioUrl}
        className="w-full"
        onPlay={() => setAudioPlaying(true)}
        onPause={() => setAudioPlaying(false)}
        onEnded={() => setAudioPlaying(false)}
        onError={() => { setAudioPlaying(false); setAudioFailed(true); }}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn-secondary" onClick={playAudio} disabled={audioPlaying}>
          {audioPlaying ? 'Reproduciendo…' : 'Reproducir audio'}
        </button>
        <a className="btn-secondary" href={result.audioUrl} target="_blank" rel="noreferrer">
          Abrir audio
        </a>
      </div>
      {audioFailed && <p role="alert" className="mt-2 text-sm text-red-700">No se pudo reproducir. Genera el audio otra vez para renovar el enlace.</p>}
    </div>}
    {result.description && <div><p className="whitespace-pre-wrap leading-relaxed">{result.description}</p><p className="mt-2 text-xs text-slate-500">Borrador generado por IA. Revisa los datos antes de publicarlo.</p></div>}
    {result.overallSentiment && <div>
      <p className="mb-3 text-lg font-semibold">Sentimiento: {sentiments[result.overallSentiment] || result.overallSentiment}</p>
      {Object.entries(result.results?.[0]?.scores || {}).map(([label, value]) => <div className="mb-2" key={label}>
        <div className="mb-1 flex justify-between text-xs"><span>{sentiments[label.toUpperCase()] || label}</span><span>{Math.round(value * 100)}%</span></div>
        <div className="h-2 overflow-hidden rounded bg-slate-200"><div className="h-full rounded bg-blue-600" style={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }} /></div>
      </div>)}
    </div>}
    {result.indexed !== undefined && <div>
      <p className="font-semibold">{result.indexed} de {result.total} productos indexados</p>
      <p className="mt-1 text-sm">{result.skipped ? `${result.skipped} productos no se indexaron. Revisa el servicio antes de volver a intentarlo.` : 'El catálogo está preparado para la búsqueda inteligente.'}</p>
    </div>}
  </div>;
}
