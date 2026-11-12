'use client';
import { useEffect, useState } from 'react';
import { money, type Order, type OrderResult } from '@/shared/types';
import { commerceRequest, commerceMessage } from './commerce-api';
const date = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
export function OrderHistory() {
  const [data, setData] = useState<OrderResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    commerceRequest<OrderResult>(`/api/orders${window.location.search}`, {
      signal: controller.signal,
    })
      .then((body) => {
        if (!controller.signal.aborted) {
          setData(body);
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
  }, [retry]);
  return (
    <main id="main-content" className="main-wrap commerce-wrap">
      <div className="commerce-heading">
        <p className="eyebrow">CUSTOMER / PURCHASES</p>
        <h1>My orders</h1>
        <p className="muted">Your orders, saved with the prices you accepted.</p>
      </div>
      {loading ? (
        <p role="status">Loading your orders…</p>
      ) : error ? (
        <div className="commerce-alert" role="alert">
          <p>{error}</p>
          <button className="button secondary" onClick={() => setRetry((n) => n + 1)}>
            Try again
          </button>
        </div>
      ) : data && !data.items.length ? (
        <div className="empty-state" data-testid="empty-orders">
          <h2>{data.total ? 'No orders on this page.' : 'No orders yet.'}</h2>
          <p>
            {data.total
              ? 'Return to the first page to see your orders.'
              : 'Your next essentials are waiting in the collection.'}
          </p>
          <a className="button primary" href={data.total ? '/orders' : '/catalog'}>
            {data.total ? 'First page' : 'Browse products'}
          </a>
        </div>
      ) : (
        data && (
          <>
            <p role="status">
              {data.total} {data.total === 1 ? 'order' : 'orders'}
            </p>
            <div className="table-scroll">
              <table className="orders-table">
                <caption className="sr-only">Your order history</caption>
                <thead>
                  <tr>
                    <th scope="col">Order</th>
                    <th scope="col">Placed</th>
                    <th scope="col">Status</th>
                    <th scope="col">Units</th>
                    <th scope="col">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((order) => (
                    <tr key={order.id} data-testid="order-row">
                      <td>
                        <a href={`/orders/${order.id}`}>{order.number}</a>
                      </td>
                      <td>
                        <time dateTime={order.createdAt}>{date(order.createdAt)}</time>
                      </td>
                      <td>
                        <span className="order-status">Placed</span>
                      </td>
                      <td>{order.totalQuantity}</td>
                      <td>{money(order.totalCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <nav className="orders-pagination" aria-label="Order pagination">
              {data.page > 1 && (
                <a
                  className="button secondary"
                  href={`/orders?page=${data.page - 1}&pageSize=${data.pageSize}`}
                >
                  Previous page
                </a>
              )}
              <span>
                Page {data.page} of {data.totalPages}
              </span>
              {data.page < data.totalPages && (
                <a
                  className="button secondary"
                  href={`/orders?page=${data.page + 1}&pageSize=${data.pageSize}`}
                >
                  Next page
                </a>
              )}
            </nav>
          </>
        )
      )}
      <a className="commerce-back" href="/catalog">
        ← Continue shopping
      </a>
    </main>
  );
}
export function OrderDetails({ id, confirmed }: { id: string; confirmed: boolean }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    commerceRequest<{ order: Order }>(`/api/orders/${encodeURIComponent(id)}`, {
      signal: controller.signal,
    })
      .then((body) => {
        if (!controller.signal.aborted) {
          setOrder(body.order);
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
  }, [id, retry]);
  return (
    <main id="main-content" className="main-wrap commerce-wrap">
      <div className="commerce-heading">
        <p className="eyebrow">CUSTOMER / PURCHASES</p>
        <h1>{order && confirmed ? 'Order placed' : 'Order details'}</h1>
        {order && confirmed && (
          <p role="status" className="confirmation-message" data-testid="order-confirmation">
            Thank you. Your order is saved and the stock has been updated. No payment has been
            taken.
          </p>
        )}
      </div>
      {loading ? (
        <p role="status">Loading order details…</p>
      ) : error ? (
        <div className="commerce-alert" role="alert">
          <p>{error}</p>
          <button className="button secondary" onClick={() => setRetry((n) => n + 1)}>
            Try again
          </button>
        </div>
      ) : (
        order && (
          <section className="order-detail-panel" aria-labelledby="order-number">
            <div className="order-detail-heading">
              <div>
                <p className="eyebrow">ORDER NUMBER</p>
                <h2 id="order-number" data-testid="order-number">
                  {order.number}
                </h2>
                <p>
                  <time dateTime={order.createdAt}>{date(order.createdAt)}</time>
                </p>
              </div>
              <span className="order-status" data-testid="order-status">
                Placed
              </span>
            </div>
            <div className="table-scroll">
              <table className="orders-table">
                <caption className="sr-only">Products and prices saved with this order</caption>
                <thead>
                  <tr>
                    <th scope="col">Product</th>
                    <th scope="col">Quantity</th>
                    <th scope="col">Unit price</th>
                    <th scope="col">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.productId} data-testid="order-item">
                      <td>
                        <a href={`/products/${item.productId}`}>{item.name}</a>
                        <small>{item.sku}</small>
                      </td>
                      <td>{item.quantity}</td>
                      <td>{money(item.unitPriceCents)}</td>
                      <td>{money(item.subtotalCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="order-total">
              <span>Total · EUR</span>
              <strong data-testid="order-total">{money(order.totalCents)}</strong>
            </div>
            <p className="muted">
              This order keeps its original product names and prices. Payments, cancellations, and
              shipping updates are not part of this release.
            </p>
          </section>
        )
      )}
      <a className="button secondary" href="/orders">
        View My orders
      </a>
      <a className="commerce-back" href="/catalog">
        Continue shopping →
      </a>
    </main>
  );
}
