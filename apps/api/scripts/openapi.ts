import { writeFileSync } from 'node:fs';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { createApp } from '../src/app';
async function main() {
  const app = await createApp({ logging: false });
  await app.init();
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('JUNTA API').setVersion('0.1.0').addBearerAuth().build(),
  );
  writeFileSync('../../packages/api-client/openapi.json', JSON.stringify(document, null, 2) + '\n');
  await app.close();
}
main().catch(() => process.exit(1));
