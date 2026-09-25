import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ai, aiRequest, serviceUrl } from './ai';

describe('AI browser contract', () => {
  beforeEach(() => {
    window.__ENV = Object.fromEntries(['VOICE', 'SENTIMENT', 'INDEX', 'SEMANTIC_SEARCH', 'ASSISTANT'].map(name => ['VITE_' + name + '_URL', 'https://' + name.toLowerCase() + '.example/']));
    vi.mocked(fetch).mockReset();
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ success: true }) } as Response);
  });
  afterEach(() => { vi.useRealTimers(); });
  it('requires configuration and strips trailing slashes', () => {
    expect(serviceUrl('VITE_VOICE_URL')).toBe('https://voice.example');
    expect(() => serviceUrl('VITE_DESCRIBE_URL')).toThrow('todavía no está conectada');
  });
  it('routes voice and sentiment separately with the correct payload', async () => {
    await ai.product('VITE_VOICE_URL', 'a/b', 'voice', { lang: 'es' });
    expect(fetch).toHaveBeenLastCalledWith('https://voice.example/products/a%2Fb/voice', expect.objectContaining({ method: 'POST', body: '{"lang":"es"}' }));
    await ai.sentiment('Excelente');
    expect(fetch).toHaveBeenLastCalledWith('https://sentiment.example', expect.objectContaining({ body: '{"text":"Excelente"}' }));
  });
  it('uses GET with an encoded semantic query', async () => {
    await ai.search('cómodo & blanco');
    expect(fetch).toHaveBeenCalledWith('https://semantic_search.example/search?q=c%C3%B3modo%20%26%20blanco', expect.objectContaining({ method: 'GET' }));
    expect(vi.mocked(fetch).mock.calls[0][1]).not.toHaveProperty('body');
  });
  it('sends bounded conversation history', async () => {
    await ai.chat('hola', Array.from({ length: 12 }, (_, i) => ({ role: 'user' as const, text: String(i) })));
    const payload = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
    expect(payload.history).toHaveLength(10);
    expect(payload.history[0].text).toBe('2');
  });
  it('surfaces HTTP errors without retrying paid operations', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 422, json: async () => ({ error: 'Revisa el contenido' }) } as Response);
    await expect(ai.sentiment('texto')).rejects.toThrow('Revisa el contenido');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('explains network/CORS failures', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(ai.sentiment('texto')).rejects.toThrow('CORS');
  });
  it('rejects malformed success responses', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => { throw new Error('bad JSON'); } } as unknown as Response);
    await expect(ai.sentiment('texto')).rejects.toThrow('respuesta inesperada');
  });
  it('times out once without automatically retrying', async () => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));
    const pending = expect(aiRequest('VITE_VOICE_URL', '', {})).rejects.toThrow('Puede seguir procesándose');
    await vi.advanceTimersByTimeAsync(70000);
    await pending;
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
