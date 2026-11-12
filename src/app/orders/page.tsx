import { pageUser } from '@/server/auth';
import { Shell } from '@/components/shell';
import { OrderHistory } from '@/components/orders';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const user = await pageUser();
  return (
    <Shell user={user} active="orders">
      {user.role === 'customer' ? (
        <OrderHistory />
      ) : (
        <main id="main-content" className="main-wrap empty-state">
          <h1>Orders belong to customer accounts.</h1>
          <p>Staff accounts cannot access customer purchase history.</p>
          <a className="button primary" href="/catalog">
            Back to catalog
          </a>
        </main>
      )}
    </Shell>
  );
}
