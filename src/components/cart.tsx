'use client';
import { useEffect, useRef, useState } from 'react';
import { money, type Cart, type CartItem, type Order } from '@/shared/types';
import { ProductArt } from './art';
import { commerceRequest, commerceMessage, CommerceError } from './commerce-api';
type Attempt = { key: string; cartVersion: number; checkoutToken: string };
function CartLine({
  item,
  busy,
  onUpdate,
  onRemove,
}: {
  item: CartItem;
  busy: boolean;
  onUpdate: (id: string, n: number) => void;
  onRemove: (id: string) => void;
}) {
  const [quantity, setQuantity] = useState(String(item.quantity));
  useEffect(() => setQuantity(String(item.quantity)), [item.quantity]);
  return (
    <article className="cart-item" data-testid="cart-item" data-product-id={item.productId}>
      <div className={`cart-art ${item.color}`} aria-hidden="true">
        <ProductArt kind={item.art} color={item.color} />
      </div>
      <div className="cart-item-content">
        <p className="eyebrow">{item.sku}</p>
        <h2>
          <a href={`/products/${item.productId}`}>{item.name}</a>
        </h2>
        <p className="muted">
          {money(item.unitPriceCents)} each · {item.stock} available
        </p>
        {item.priceChanged && (
          <p className="price-notice">
            Price changed since adding: previously {money(item.addedPriceCents)} each. The current
            price is included in your total.
          </p>
        )}
        {!item.available && (
          <p className="error-text" role="alert">
            Only {item.stock} available. Reduce the quantity or remove this product.
          </p>
        )}
        <form
          className="cart-quantity-form"
          onSubmit={(e) => {
            e.preventDefault();
            onUpdate(item.productId, Number(quantity));
          }}
        >
          <label htmlFor={`quantity-${item.productId}`}>Quantity for {item.name}</label>
          <input
            id={`quantity-${item.productId}`}
            type="number"
            min="1"
            max="99"
            step="1"
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            disabled={busy}
          />
          <button
            className="button secondary"
            type="submit"
            aria-label={`Update quantity for ${item.name}`}
            disabled={busy}
          >
            Update
          </button>
          <button
            className="text-button"
            type="button"
            aria-label={`Remove ${item.name} from cart`}
            onClick={() => onRemove(item.productId)}
            disabled={busy}
          >
            Remove
          </button>
        </form>
      </div>
      <strong className="cart-line-total" data-testid="cart-line-total">
        {money(item.subtotalCents)}
      </strong>
    </article>
  );
}
export function ShoppingCart({ userId }: { userId: string }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState<Attempt | null>(null);
  const lock = useRef(false);
  const storageKey = `stockroom:checkout:${userId}`;
  useEffect(() => {
    const controller = new AbortController();
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null');
      if (
        saved &&
        typeof saved.key === 'string' &&
        Number.isSafeInteger(saved.cartVersion) &&
        typeof saved.checkoutToken === 'string'
      )
        setPending(saved);
    } catch {
      /* An in-memory attempt still protects the current tab if storage is unavailable. */
    }
    commerceRequest<{ cart: Cart }>('/api/cart', { signal: controller.signal })
      .then((body) => {
        if (!controller.signal.aborted) {
          setCart(body.cart);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setError(commerceMessage(e));
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [storageKey]);
  function remember(attempt: Attempt | null) {
    setPending(attempt);
    try {
      if (attempt) sessionStorage.setItem(storageKey, JSON.stringify(attempt));
      else sessionStorage.removeItem(storageKey);
    } catch {
      /* Keep the same attempt in memory. */
    }
  }
  async function refresh() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const body = await commerceRequest<{ cart: Cart }>('/api/cart');
      setCart(body.cart);
      setLoading(false);
      setMessage('Cart refreshed. Review the latest prices and availability.');
    } catch (e) {
      setError(commerceMessage(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function change(id: string, quantity?: number) {
    if (lock.current || pending) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const body = await commerceRequest<{ cart: Cart }>(
        `/api/cart/items/${encodeURIComponent(id)}`,
        {
          method: quantity === undefined ? 'DELETE' : 'PATCH',
          ...(quantity !== undefined ? { body: JSON.stringify({ quantity }) } : {}),
        },
      );
      setCart(body.cart);
      setMessage(quantity === undefined ? 'Product removed from your cart.' : 'Quantity updated.');
    } catch (e) {
      setError(commerceMessage(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function place(recover = false) {
    if (lock.current || (!recover && !cart)) return;
    const attempt = recover
      ? pending
      : {
          key: crypto.randomUUID(),
          cartVersion: cart!.version,
          checkoutToken: cart!.checkoutToken,
        };
    if (!attempt) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    remember(attempt);
    try {
      const body = await commerceRequest<{ order: Order; replayed: boolean }>('/api/orders', {
        method: 'POST',
        headers: { 'Idempotency-Key': attempt.key },
        body: JSON.stringify({
          cartVersion: attempt.cartVersion,
          checkoutToken: attempt.checkoutToken,
        }),
      });
      remember(null);
      window.location.assign(`/orders/${body.order.id}?placed=1`);
    } catch (e) {
      setError(commerceMessage(e));
      // A definite business rejection created no order. A lost response keeps the original attempt for recovery.
      if (e instanceof CommerceError && e.code !== 'NETWORK_ERROR' && e.code !== 'INTERNAL_ERROR') {
        remember(null);
        try {
          setCart((await commerceRequest<{ cart: Cart }>('/api/cart')).cart);
        } catch {
          /* Keep the original error visible. */
        }
      }
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <main id="main-content" className="main-wrap commerce-wrap">
      <div className="commerce-heading">
        <p className="eyebrow">CUSTOMER / SHOPPING</p>
        <h1>Your cart</h1>
        <p className="muted">
          A place for your next essentials. Stock is checked again when you place your order.
        </p>
      </div>
      {error && (
        <div className="commerce-alert" role="alert">
          {error}
        </div>
      )}
      {message && (
        <p role="status" className="commerce-feedback">
          {message}
        </p>
      )}
      {pending && (
        <section className="recovery-notice" aria-label="Order confirmation recovery">
          <h2>Check your previous order attempt</h2>
          <p>
            The confirmation may not have reached this tab. Check its status before changing the
            cart or placing another order. A retry will not create the same order twice.
          </p>
          <button
            className="button primary"
            type="button"
            disabled={busy}
            onClick={() => place(true)}
          >
            Retry order confirmation
          </button>
          <a href="/orders">View My orders</a>
        </section>
      )}
      {loading ? (
        <p role="status">Loading your cart…</p>
      ) : !cart ? (
        <button className="button primary" onClick={refresh} disabled={busy}>
          Try again
        </button>
      ) : !cart.items.length ? (
        <div className="empty-state" data-testid="empty-cart">
          <h2>Your cart is empty.</h2>
          <p>Explore the collection and add something you like.</p>
          <a className="button primary" href="/catalog">
            Browse products
          </a>
        </div>
      ) : (
        <div className="cart-layout" aria-busy={busy}>
          <section aria-label="Cart products">
            {cart.items.map((item) => (
              <CartLine
                key={item.productId}
                item={item}
                busy={busy || Boolean(pending)}
                onUpdate={change}
                onRemove={(id) => change(id)}
              />
            ))}
          </section>
          <aside className="order-summary" aria-labelledby="cart-summary-title">
            <p className="eyebrow">READY WHEN YOU ARE</p>
            <h2 id="cart-summary-title">Order summary</h2>
            <dl>
              <div>
                <dt>Products</dt>
                <dd>{cart.itemCount}</dd>
              </div>
              <div>
                <dt>Units</dt>
                <dd>{cart.totalQuantity}</dd>
              </div>
              <div className="summary-total">
                <dt>Total</dt>
                <dd data-testid="cart-total">{money(cart.totalCents)}</dd>
              </div>
            </dl>
            <p className="muted">
              EUR prices. No shipping fees, discounts, or additional taxes are added in this demo.
              No payment is taken in this increment.
            </p>
            <button
              className="button primary place-order"
              type="button"
              data-testid="place-order"
              disabled={busy || !cart.canCheckout || Boolean(pending)}
              onClick={() => place()}
            >
              {busy ? 'Please wait…' : 'Place order'}
              <span aria-hidden="true">→</span>
            </button>
            {!cart.canCheckout && (
              <p className="error-text">Adjust unavailable quantities before placing your order.</p>
            )}
            <button className="text-button" onClick={refresh} disabled={busy}>
              Refresh cart
            </button>
            <p className="small muted">
              Adding to the cart does not reserve stock. Review the total before placing your order.
            </p>
          </aside>
        </div>
      )}
      <a className="commerce-back" href="/catalog">
        ← Continue shopping
      </a>
    </main>
  );
}
