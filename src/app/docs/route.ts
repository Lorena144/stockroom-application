export function GET() {
  return new Response(
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Stockroom API reference</title><link rel="stylesheet" href="/swagger/swagger-ui.css"><link rel="icon" href="/favicon.svg"></head><body><div id="swagger-ui"></div><script src="/swagger/swagger-ui-bundle.js"></script><script src="/docs-init.js"></script></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
  );
}
