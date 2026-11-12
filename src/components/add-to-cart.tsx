'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { commerceRequest, commerceMessage } from './commerce-api';
export function AddToCart({
  product,
  withQuantity = false,
}: {
  product: { id: string; name: string; stock: number };
  withQuantity?: boolean;
}) {
  const inputId = useId();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const [quantity, setQuantity] = useState('1');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage('');
    setError('');
    try {
      await commerceRequest('/api/cart/items', {
        method: 'POST',
        body: JSON.stringify({
          productId: product.id,
          quantity: Number(quantity),
        }),
      });
      setMessage(`${quantity} ${Number(quantity) === 1 ? 'unit' : 'units'} added to your cart.`);
    } catch (e) {
      setError(commerceMessage(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="add-to-cart">
      <form onSubmit={add} className="add-to-cart-form" aria-label={`Add ${product.name} to cart`}>
        {withQuantity && (
          <div className="quantity-field">
            <label htmlFor={inputId}>Quantity</label>
            <input
              id={inputId}
              type="number"
              min="1"
              max="99"
              step="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={!ready || busy || product.stock === 0}
            />
          </div>
        )}
        <button
          type="submit"
          className="button primary"
          data-testid="add-to-cart"
          aria-label={`Add ${product.name} to cart`}
          disabled={!ready || busy || product.stock === 0}
        >
          {busy ? 'Adding…' : product.stock === 0 ? 'Out of stock' : 'Add to cart'}
          <span aria-hidden="true">+</span>
        </button>
      </form>
      {message && (
        <p className="commerce-feedback" role="status">
          {message} <a href="/cart">View cart</a>
        </p>
      )}
      {error && (
        <p className="commerce-feedback error-text" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
