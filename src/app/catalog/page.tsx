import { pageUser } from '@/server/auth';
import { Shell } from '@/components/shell';
import { Catalog } from '@/components/catalog';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const user = await pageUser();
  return (
    <Shell user={user} active="catalog">
      <Catalog canShop={user.role === 'customer'} />
    </Shell>
  );
}
