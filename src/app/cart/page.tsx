import { pageUser } from '@/server/auth';
import { Shell } from '@/components/shell';
import { ShoppingCart } from '@/components/cart';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const user = await pageUser();
  return (
    <Shell user={user} active="cart">
      {user.role === 'customer' ? (
        <ShoppingCart userId={user.id} />
      ) : (
        <main id="main-content" className="main-wrap empty-state">
          <h1>Shopping is for customer accounts.</h1>
          <p>Sign in with a customer account to use the cart.</p>
          <a className="button primary" href="/catalog">
            Back to catalog
          </a>
        </main>
      )}
    </Shell>
  );
}
