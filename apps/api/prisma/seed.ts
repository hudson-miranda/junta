import { PrismaClient } from '../generated/client';
import { hash } from 'argon2';
import { normalizeSlug } from '@junta/validation';
const db = new PrismaClient();
export async function seed(client = db) {
  if (process.env.NODE_ENV === 'production') throw new Error('Demo seed forbidden in production');
  const password = process.env.DEMO_PASSWORD;
  if (!password || password.length < 12)
    throw new Error('Set DEMO_PASSWORD (12+ characters) in ignored .env');
  const passwordHash = await hash(password, { type: 2 });
  for (const [email, name, role] of [
    ['admin@junta.local', 'Admin demo', 'ADMIN'],
    ['merchant@junta.local', 'Loja demo', 'MERCHANT'],
    ['consumer@junta.local', 'Ana demo', 'CONSUMER'],
    ['analyst@junta.local', 'Analista demo', 'ANALYST'],
  ] as const) {
    const user = await client.user.upsert({
      where: { email },
      update: { passwordHash },
      create: { email, name, role, passwordHash },
    });
    if (role === 'MERCHANT') {
      const merchant = await client.merchant.upsert({
        where: { id: 'merchant-demo' },
        update: {},
        create: { id: 'merchant-demo', name: 'Loja JUNTA demo', approved: true },
      });
      await client.membership.upsert({
        where: { userId_merchantId: { userId: user.id, merchantId: merchant.id } },
        update: {},
        create: { userId: user.id, merchantId: merchant.id },
      });
    }
  }
  const products = [
    ['PlayStation 5 Slim', 'console', 'Games', '1 TB · Branco', 349900],
    ['iPhone 17', 'phone', 'Celulares', '256 GB · Preto', 599900],
    ['Galaxy S26', 'phone', 'Celulares', '256 GB · Azul', 499900],
    ['MacBook Air', 'laptop', 'Computadores', '13 polegadas · 256 GB', 799900],
    ['Nintendo Switch', 'console', 'Games', 'OLED · Branco', 219900],
    ['TV LG OLED', 'tv', 'TV e áudio', '55 polegadas · 4K', 429900],
    ['Samsung OLED', 'tv', 'TV e áudio', '55 polegadas · 4K', 449900],
    ['AirPods', 'audio', 'TV e áudio', 'Pro · Branco', 149900],
    ['Apple Watch', 'watch', 'Wearables', '42 mm · GPS', 299900],
  ] as const;
  for (const [name, illustration, category, variantName, cents] of products) {
    const slug = normalizeSlug(name);
    await client.product.upsert({
      where: { slug },
      update: {},
      create: {
        id: slug,
        name,
        normalizedName: slug,
        slug,
        description: `Junte sua intenção de compra para ${name} e acompanhe ofertas. Produto e preço demonstrativos; não representam cotação de mercado.`,
        category,
        illustration,
        variants: {
          create: { id: `${slug}-default`, name: variantName, demoPrice: (cents / 100).toFixed(2) },
        },
      },
    });
  }
  for (const [key, value] of [
    ['minimumAppVersion', '0.1.0'],
    ['maintenance', false],
    ['dropsEnabled', false],
  ] as const)
    await client.remoteConfig.upsert({ where: { key }, update: {}, create: { key, value } });
}
if (require.main === module)
  seed()
    .then(() => console.log('Demo catalogue and accounts seeded; password comes from .env.'))
    .finally(() => db.$disconnect());
