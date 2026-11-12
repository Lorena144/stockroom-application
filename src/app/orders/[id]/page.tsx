import { pageUser } from '@/server/auth';
import { Shell } from '@/components/shell';
import { OrderDetails } from '@/components/orders';
export const dynamic = 'force-dynamic';
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ placed?: string }>;
}) {
  const user = await pageUser();
  const { id } = await params;
  const query = await searchParams;
  return (
    <Shell user={user} active="orders">
      {user.role === 'customer' ? (
        <OrderDetails id={id} confirmed={query.placed === '1'} />
      ) : (
        <main id="main-content" className="main-wrap empty-state">
          <h1>Orders belong to customer accounts.</h1>
          <p>Staff accounts cannot access customer order details.</p>
          <a className="button primary" href="/catalog">
            Back to catalog
          </a>
        </main>
      )}
    </Shell>
  );
}
