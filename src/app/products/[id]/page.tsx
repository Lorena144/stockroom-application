import { notFound } from 'next/navigation';
import { pageUser, ApiError } from '@/server/auth';
import { getProduct } from '@/server/catalog';
import { Shell } from '@/components/shell';
import { ProductArt } from '@/components/art';
import { AddToCart } from '@/components/add-to-cart';
import { money, stockLabel } from '@/shared/types';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await pageUser();
  const { id } = await params;
  let product;
  try {
    product = getProduct(id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  return (
    <Shell user={user} active="catalog">
      <main id="main-content" className="main-wrap detail-wrap">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <a href="/catalog">Catalog</a>
          <span aria-hidden="true">/</span>
          <span>{product.category}</span>
        </nav>
        <section className="product-detail" data-testid="product-detail">
          <div className={`detail-visual ${product.color}`}>
            <ProductArt kind={product.art} color={product.color} large />
          </div>
          <div className="detail-content">
            <p className="eyebrow">
              {product.category} <span className="detail-sku">{product.sku}</span>
            </p>
            <h1>{product.name}</h1>
            <p className="detail-price">{money(product.priceCents)}</p>
            <span
              className={`stock-pill ${product.stock === 0 ? 'out' : product.stock <= 5 ? 'low' : 'available'}`}
              data-testid="product-availability"
            >
              {stockLabel(product.stock)}
            </span>
            <p className="detail-description">{product.description}</p>
            <p className="detail-stock">
              {product.stock === 0
                ? 'This product is currently unavailable.'
                : `${product.stock} units currently available.`}
            </p>
            {user.role === 'customer' && <AddToCart product={product} withQuantity />}
            <h2>The details</h2>
            <dl className="spec-list">
              {Object.entries(product.specs).map(([key, value]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <a className="button primary" href="/catalog">
              Continue exploring <span aria-hidden="true">→</span>
            </a>
          </div>
        </section>
      </main>
    </Shell>
  );
}
