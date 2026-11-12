import { pageUser } from '@/server/auth';
import { Shell } from '@/components/shell';
import { Catalog } from '@/components/catalog';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const user = await pageUser();
  return (
    <Shell user={user} active="inventory">
      {user.role === 'staff' ? (
        <Catalog inventory />
      ) : (
        <main id="main-content" className="access-denied empty-state">
          <p className="eyebrow">OPERATIONS ACCESS</p>
          <h1>This area is for staff.</h1>
          <p>Your customer account can browse the collection and view product details.</p>
          <a className="button primary" href="/catalog">
            Back to catalog
          </a>
        </main>
      )}
    </Shell>
  );
}
