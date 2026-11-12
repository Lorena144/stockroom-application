import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { sessionUser, SESSION_COOKIE } from '@/server/auth';
import { Login } from '@/components/login';
export const dynamic = 'force-dynamic';
export default async function Page() {
  if (sessionUser((await cookies()).get(SESSION_COOKIE)?.value)) redirect('/catalog');
  return <Login />;
}
