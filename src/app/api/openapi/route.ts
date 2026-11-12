import { openapi } from '@/server/openapi';
export function GET() {
  return Response.json(openapi, { headers: { 'Cache-Control': 'no-store' } });
}
