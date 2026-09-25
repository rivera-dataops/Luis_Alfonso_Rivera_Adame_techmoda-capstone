import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useCart } from './useCart';
import { mockProduct } from '../test/mockData';

const products = [{ ...mockProduct, stock: 2 }];
describe('persistent demo cart', () => {
  beforeEach(() => localStorage.clear());
  it('adds, clamps to stock, totals and removes', () => {
    const { result } = renderHook(() => useCart(products, true));
    act(() => { result.current.add(products[0]); result.current.add(products[0]); result.current.add(products[0]); });
    expect(result.current.count).toBe(2);
    expect(result.current.total).toBe(products[0].price * 2);
    act(() => result.current.quantity(products[0].productId, 0));
    expect(result.current.items).toHaveLength(0);
  });
  it('preserves saved entries while the catalog loads, then reconciles stock', () => {
    localStorage.setItem('techmoda-cart-v1', JSON.stringify([{ id: mockProduct.productId, quantity: 9 }, { id: 'deleted', quantity: 1 }]));
    const { result, rerender } = renderHook(({ items, loaded }) => useCart(items, loaded), { initialProps: { items: [] as typeof products, loaded: false } });
    expect(JSON.parse(localStorage.getItem('techmoda-cart-v1')!)).toHaveLength(2);
    rerender({ items: products, loaded: true });
    expect(result.current.count).toBe(2);
    expect(JSON.parse(localStorage.getItem('techmoda-cart-v1')!)).toEqual([{ id: mockProduct.productId, quantity: 2 }]);
  });
  it('ignores malformed or duplicate stored entries', () => {
    localStorage.setItem('techmoda-cart-v1', JSON.stringify([null, { id: mockProduct.productId, quantity: 1 }, { id: mockProduct.productId, quantity: 2 }, { id: 'x', quantity: -1 }]));
    const { result } = renderHook(() => useCart(products, true));
    expect(result.current.count).toBe(1);
  });
  it('never adds out-of-stock products', () => {
    const { result } = renderHook(() => useCart(products, true));
    act(() => result.current.add({ ...products[0], stock: 0 }));
    expect(result.current.count).toBe(0);
  });
});
