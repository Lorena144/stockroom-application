'use client';
import { useEffect, useRef, useState } from 'react';
import { money, stockLabel, type ProductResult, type InventoryProduct } from '@/shared/types';
import { ProductArt } from './art';
import { AddToCart } from './add-to-cart';
type Query = {
  q: string;
  category: string;
  stock: string;
  sort: string;
  page: string;
  pageSize: string;
};
const defaults: Query = {
  q: '',
  category: 'all',
  stock: 'all',
  sort: 'name-asc',
  page: '1',
  pageSize: '6',
};
type Result = ProductResult & {
  summary?: {
    products: number;
    units: number;
    lowStock: number;
    outOfStock: number;
  };
};
export function Catalog({
  inventory = false,
  canShop = false,
}: {
  inventory?: boolean;
  canShop?: boolean;
}) {
  const [query, setQuery] = useState<Query>(defaults);
  const [search, setSearch] = useState('');
  const searchInput = useRef<HTMLInputElement>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = { ...defaults };
    for (const key of Object.keys(next) as (keyof Query)[])
      if (params.has(key)) next[key] = params.get(key)!;
    setQuery(next);
    setSearch(next.q);
    setReady(true);
    function onBack() {
      const p = new URLSearchParams(window.location.search);
      const q = { ...defaults };
      for (const k of Object.keys(q) as (keyof Query)[]) if (p.has(k)) q[k] = p.get(k)!;
      changeQuery(q);
      setSearch(q.q);
    }
    window.addEventListener('popstate', onBack);
    return () => window.removeEventListener('popstate', onBack);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    const params = new URLSearchParams(query);
    window.history.replaceState(null, '', `${window.location.pathname}?${params}`);
    setLoading(true);
    setError('');
    fetch(`${inventory ? '/api/inventory' : '/api/products'}?${params}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (res) => {
        if (controller.signal.aborted) return null;
        if (res.status === 401) {
          window.location.assign('/login');
          return null;
        }
        const body = await res.json();
        if (!res.ok) throw new Error(body.error.message);
        return body as Result;
      })
      .then((body) => {
        if (body && !controller.signal.aborted) {
          setData(body);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted && e.name !== 'AbortError') {
          setError(
            e.message === 'Failed to fetch'
              ? 'We could not load products. Please try again.'
              : e.message,
          );
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [ready, query, inventory, retry]);
  function changeQuery(next: Query | ((current: Query) => Query)) {
    // Invalidate the previous request immediately, before the next effect runs.
    activeRequest.current?.abort();
    setLoading(true);
    setError('');
    setQuery(next);
  }
  function update(key: keyof Query, value: string) {
    changeQuery((q) => ({ ...q, [key]: value, page: '1' }));
  }
  function clearSearch() {
    setSearch('');
    update('q', '');
    searchInput.current?.focus();
  }
  function reset() {
    setSearch('');
    changeQuery({ ...defaults });
  }
  const total = data?.total ?? 0;
  const from =
    total && data?.items.length ? (Number(query.page) - 1) * Number(query.pageSize) + 1 : 0;
  const filtered = query.q || query.category !== 'all' || query.stock !== 'all';
  return (
    <main id="main-content" className="main-wrap">
      {inventory ? (
        <section className="inventory-heading">
          <p className="eyebrow">Operations / Inventory</p>
          <h1>A clear view of your stock.</h1>
          <p className="muted">
            Product availability, quantities, and supplier information in one place.
          </p>
        </section>
      ) : (
        <section className="catalog-hero">
          <div>
            <p className="eyebrow">
              <span className="green-dot" /> THE WORKSPACE COLLECTION
            </p>
            <h1>
              Good tools.
              <br />
              <span>Better workdays.</span>
            </h1>
            <p>
              A considered collection of everyday essentials.
              <br />
              Find what works for you.
            </p>
            <a href="#browse-products" className="hero-link">
              Explore the collection <span aria-hidden="true">↓</span>
            </a>
          </div>
          <div className="hero-art" aria-hidden="true">
            <span className="hero-circle" />
            <ProductArt kind="monitor" color="sage" large />
            <div className="hero-keyboard">
              <ProductArt kind="keyboard" color="sand" />
            </div>
            <span className="hero-note">Built around your everyday.</span>
          </div>
        </section>
      )}
      {inventory && data?.summary && (
        <section className="stock-stats" aria-label="Inventory summary">
          {[
            ['Products', data.summary.products],
            ['Units available', data.summary.units],
            ['Low stock', data.summary.lowStock],
            ['Out of stock', data.summary.outOfStock],
          ].map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </section>
      )}
      <section id="browse-products" className="browse-section" aria-labelledby="collection-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{inventory ? 'STOCK OVERVIEW' : 'FIND YOUR NEXT ESSENTIAL'}</p>
            <h2 id="collection-title">
              {inventory ? 'Inventory' : 'The collection'}{' '}
              <span className="count-badge" data-testid="product-count">
                {loading ? '…' : total}
              </span>
            </h2>
          </div>
          <span className="collection-note">
            {inventory
              ? 'Read only · Operations access'
              : 'Thoughtfully selected. Ready for your desk.'}
          </span>
        </div>
        <form
          className="search-form"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            update('q', search.trim());
          }}
        >
          <label className="sr-only" htmlFor="catalog-search">
            Search products
          </label>
          <span aria-hidden="true" className="search-symbol">
            ⌕
          </span>
          <input
            id="catalog-search"
            ref={searchInput}
            type="search"
            value={search}
            maxLength={100}
            placeholder="Search by product name or SKU…"
            onChange={(e) => {
              const value = e.target.value;
              setSearch(value);
              if (value === '') update('q', '');
            }}
          />
          {(search || query.q) && (
            <button
              className="clear-search"
              type="button"
              aria-label="Clear search"
              onClick={clearSearch}
            >
              <span aria-hidden="true">×</span>
            </button>
          )}
          <button className="button primary" type="submit">
            Search <span aria-hidden="true">→</span>
          </button>
        </form>
        <div className="filter-bar">
          <div className="filter-field">
            <label htmlFor="catalog-category">Category</label>
            <select
              id="catalog-category"
              value={query.category}
              onChange={(e) => update('category', e.target.value)}
            >
              <option value="all">All categories</option>
              {['Accessories', 'Audio', 'Computers', 'Displays', 'Workspace'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="filter-field">
            <label htmlFor="catalog-stock">Availability</label>
            <select
              id="catalog-stock"
              value={query.stock}
              onChange={(e) => update('stock', e.target.value)}
            >
              <option value="all">All availability</option>
              <option value="available">In stock</option>
              <option value="low">Low stock</option>
              <option value="out">Out of stock</option>
            </select>
          </div>
          <div className="filter-field sort-field">
            <label htmlFor="catalog-sort">Sort by</label>
            <select
              id="catalog-sort"
              value={query.sort}
              onChange={(e) => update('sort', e.target.value)}
            >
              <option value="name-asc">Name: A to Z</option>
              <option value="name-desc">Name: Z to A</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="stock-asc">Stock: low to high</option>
              <option value="stock-desc">Stock: high to low</option>
            </select>
          </div>
          <button type="button" className="text-button reset-filters" onClick={reset}>
            Reset filters <span aria-hidden="true">↺</span>
          </button>
        </div>
        <div
          className="results-line"
          role="status"
          aria-live="polite"
          data-testid="catalog-results"
        >
          {loading
            ? 'Loading products…'
            : error
              ? 'Products unavailable'
              : `${total} ${total === 1 ? 'product' : 'products'}${query.q ? ` matching “${query.q}”` : ''}`}
          {!loading && !error && filtered && (
            <span className="active-filter-label">Filtered collection</span>
          )}
        </div>
        <div aria-busy={loading}>
          {error ? (
            <div className="empty-state" role="alert">
              <h3>We couldn’t load the collection.</h3>
              <p>{error}</p>
              <button className="button primary" onClick={() => setRetry((n) => n + 1)}>
                Try again
              </button>
            </div>
          ) : loading ? (
            <div className="product-grid skeleton-grid" aria-hidden="true">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="skeleton-card" />
              ))}
            </div>
          ) : !data?.items.length ? (
            <div className="empty-state" data-testid="empty-results">
              <span className="empty-icon" aria-hidden="true">
                ⌕
              </span>
              <h3>{total ? 'There are no products on this page.' : 'No products found.'}</h3>
              <p>
                {total
                  ? 'Return to the first page to see the collection.'
                  : 'Try a different search or adjust your filters.'}
              </p>
              <button
                className="button primary"
                onClick={total ? () => update('page', '1') : reset}
              >
                {total ? 'Return to first page' : 'Clear filters'}
              </button>
            </div>
          ) : inventory ? (
            <div className="table-scroll">
              <table className="inventory-table">
                <caption className="sr-only">
                  Product inventory with supplier and cost information
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Product</th>
                    <th scope="col">SKU</th>
                    <th scope="col">Availability</th>
                    <th scope="col">Units</th>
                    <th scope="col">Retail price</th>
                    <th scope="col">Unit cost</th>
                    <th scope="col">Supplier</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.items as InventoryProduct[]).map((p) => (
                    <tr key={p.id}>
                      <td>
                        <a href={`/products/${p.id}`}>{p.name}</a>
                        <small>{p.category}</small>
                      </td>
                      <td>{p.sku}</td>
                      <td>
                        <span
                          className={`stock-pill ${p.stock === 0 ? 'out' : p.stock <= 5 ? 'low' : 'available'}`}
                        >
                          {stockLabel(p.stock)}
                        </span>
                      </td>
                      <td>{p.stock}</td>
                      <td>{money(p.priceCents)}</td>
                      <td>{money(p.costCents)}</td>
                      <td>{p.supplier}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="product-grid" data-testid="product-grid">
              {data.items.map((p) => (
                <article className="product-card" data-testid="product-card" key={p.id}>
                  <a
                    className={`product-visual ${p.color}`}
                    href={`/products/${p.id}`}
                    aria-label={`View ${p.name}`}
                  >
                    <span
                      className={`stock-pill ${p.stock === 0 ? 'out' : p.stock <= 5 ? 'low' : 'available'}`}
                    >
                      {stockLabel(p.stock)}
                    </span>
                    <ProductArt kind={p.art} color={p.color} />
                    <span className="card-arrow" aria-hidden="true">
                      ↗
                    </span>
                  </a>
                  <div className="product-meta">
                    <span>{p.category}</span>
                    <span>{p.sku}</span>
                  </div>
                  <div className="product-title-row">
                    <h3>
                      <a href={`/products/${p.id}`}>{p.name}</a>
                    </h3>
                    <strong>{money(p.priceCents)}</strong>
                  </div>
                  {canShop && <AddToCart product={p} />}
                  <p className="stock-quantity">
                    {p.stock === 0 ? 'Currently unavailable' : `${p.stock} available`}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
        {!loading && !error && data && (
          <div className="pagination-row">
            <p>
              Showing {from}–{from ? Math.min(from + data.items.length - 1, total) : 0} of {total}
            </p>
            <nav className="catalog-pagination" aria-label="Product pagination">
              <button
                onClick={() =>
                  changeQuery((q) => ({
                    ...q,
                    page: String(Number(q.page) - 1),
                  }))
                }
                disabled={Number(query.page) <= 1}
                aria-label="Previous page"
              >
                ←
              </button>
              {Array.from({ length: Math.min(data.totalPages, 20) }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => changeQuery((q) => ({ ...q, page: String(n) }))}
                  aria-label={`Page ${n}`}
                  aria-current={Number(query.page) === n ? 'page' : undefined}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() =>
                  changeQuery((q) => ({
                    ...q,
                    page: String(Number(q.page) + 1),
                  }))
                }
                disabled={Number(query.page) >= data.totalPages}
                aria-label="Next page"
              >
                →
              </button>
            </nav>
            <div className="page-size">
              <label htmlFor="catalog-page-size">Per page</label>
              <select
                id="catalog-page-size"
                value={query.pageSize}
                onChange={(e) => update('pageSize', e.target.value)}
              >
                <option>6</option>
                <option>12</option>
                <option>24</option>
              </select>
            </div>
          </div>
        )}
      </section>
      <aside className="collection-bottom">
        <span className="bottom-icon" aria-hidden="true">
          ✳
        </span>
        <div>
          <h2>Small details. A better everyday.</h2>
          <p>Tools that feel at home, wherever work happens.</p>
        </div>
        <span className="bottom-label">THE STOCKROOM WAY</span>
      </aside>
    </main>
  );
}
