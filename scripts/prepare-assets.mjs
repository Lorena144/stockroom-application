import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
mkdirSync('public/swagger', { recursive: true });
for (const file of ['swagger-ui.css', 'swagger-ui-bundle.js', 'swagger-ui-bundle.js.map']) {
  copyFileSync(
    path.resolve('node_modules/swagger-ui-dist', file),
    path.resolve('public/swagger', file),
  );
}
console.log('Local API documentation assets prepared.');
if (existsSync('docs/Stockroom Release Guide.html'))
  copyFileSync('docs/Stockroom Release Guide.html', 'public/release-guide.html');
