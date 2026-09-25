import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiWorkspace } from './AiWorkspace';
import { AiResultView } from './AiResultView';
import { ai } from '../lib/ai';
import { api } from '../lib/api';
import { mockProducts } from '../test/mockData';

vi.mock('../lib/ai', async importOriginal => ({ ...await importOriginal<typeof import('../lib/ai')>(), ai: { product: vi.fn(), sentiment: vi.fn(), index: vi.fn() } }));
vi.mock('../lib/api', () => ({ api: { updateProduct: vi.fn() } }));

describe('isolated AI actions', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('keeps labels and sentiment in their own cards', async () => {
    const user = userEvent.setup();
    vi.mocked(ai.product).mockResolvedValue({ labels: [{ name: 'Dress', confidence: 99 }] });
    vi.mocked(ai.sentiment).mockResolvedValue({ overallSentiment: 'POSITIVE', results: [{ sentiment: 'POSITIVE', scores: { Positive: .99 } }] });
    render(<AiWorkspace products={mockProducts} />);
    await user.click(screen.getByRole('button', { name: 'Etiquetar imagen' }));
    expect(await screen.findByText('Dress · 99%')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Sentimiento de reseña'), 'Me encanta');
    await user.click(screen.getByRole('button', { name: 'Analizar sentimiento' }));
    const heading = screen.getByRole('heading', { name: 'Analizar sentimiento' });
    expect(await within(heading.closest('section')!).findByText('Sentimiento: Positivo')).toBeInTheDocument();
    expect(screen.getByText('Dress · 99%')).toBeInTheDocument();
    expect(ai.sentiment).toHaveBeenCalledWith('Me encanta');
  });
  it('previews descriptions without saving until explicit publication', async () => {
    const user = userEvent.setup();
    vi.mocked(ai.product).mockResolvedValue({ description: 'Borrador revisable', saved: false });
    vi.mocked(api.updateProduct).mockResolvedValue(mockProducts[0]);
    const refresh = vi.fn().mockResolvedValue(undefined);
    render(<AiWorkspace products={mockProducts} onChanged={refresh} />);
    await user.click(screen.getByRole('button', { name: 'Generar descripción' }));
    expect(await screen.findByText('Borrador revisable')).toBeInTheDocument();
    expect(ai.product).toHaveBeenCalledWith('VITE_DESCRIBE_URL', mockProducts[0].productId, 'describe', expect.objectContaining({ save: false }));
    expect(api.updateProduct).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Publicar esta descripción' }));
    expect(await screen.findByRole('button', { name: 'Descripción publicada' })).toBeDisabled();
    expect(api.updateProduct).toHaveBeenCalledWith(mockProducts[0].productId, { description: 'Borrador revisable' });
    expect(refresh).toHaveBeenCalledOnce();
  });
  it('clears product-specific results when selecting another product', async () => {
    const user = userEvent.setup();
    vi.mocked(ai.product).mockResolvedValue({ labels: [{ name: 'Dress', confidence: 99 }] });
    render(<AiWorkspace products={mockProducts} />);
    await user.click(screen.getByRole('button', { name: 'Etiquetar imagen' }));
    await screen.findByText('Dress · 99%');
    await user.selectOptions(screen.getByLabelText('Producto que quieres mejorar'), mockProducts[1].productId);
    expect(screen.queryByText('Dress · 99%')).not.toBeInTheDocument();
  });
  it('provides audio controls and explains expired playback failures', () => {
    render(<AiResultView result={{ audioUrl: 'https://audio.example/demo.mp3' }} />);
    const audio = screen.getByLabelText('Descripción del producto en audio');
    expect(audio).toHaveAttribute('controls');
    fireEvent.error(audio);
    expect(screen.getByRole('alert')).toHaveTextContent('renovar el enlace');
  });
});
