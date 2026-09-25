import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ModalShell } from './ModalShell';

it('closes on Escape even after focus leaves a disabled control', () => {
  const close = vi.fn();
  render(<ModalShell title="Carrito" onClose={close}><button disabled>Sin más stock</button></ModalShell>);
  fireEvent.keyDown(document.body, { key: 'Escape' });
  expect(close).toHaveBeenCalledOnce();
});

it('returns outside keyboard focus to the modal', () => {
  render(<ModalShell title="Carrito" onClose={() => {}}><button>Continuar</button></ModalShell>);
  fireEvent.keyDown(document.body, { key: 'Tab' });
  expect(screen.getByRole('button', { name: 'Cerrar' })).toHaveFocus();
});
