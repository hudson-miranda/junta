import { test, expect } from '@playwright/test';

for (const [label, port] of [
  ['web', 3000],
  ['admin', 3001],
  ['merchant', 3002],
] as const) {
  test(`${label}: signup explains password strength, visibility and social availability`, async ({
    page,
  }) => {
    await page.goto(`http://localhost:${port}`);
    if (port === 3000) await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await page.getByRole('button', { name: 'Criar uma conta', exact: true }).click();
    const field = page.getByLabel('Senha', { exact: true });
    await field.fill('curta12345');
    await expect(page.getByRole('meter', { name: 'Força da senha' })).toHaveAttribute(
      'aria-valuetext',
      'Fraca',
    );
    await expect(page.getByText('Faltam 2 caracteres para o mínimo de 12.')).toBeVisible();
    await page.getByRole('button', { name: 'Mostrar senha', exact: true }).click();
    await expect(field).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Ocultar senha', exact: true }).click();
    await expect(field).toHaveAttribute('type', 'password');
    await field.fill('janela violeta brisa café');
    await expect(page.getByRole('meter')).toHaveAttribute('aria-valuetext', 'Forte');
    for (const provider of ['Google', 'Apple', 'Facebook'])
      await expect(
        page.getByRole('button', { name: new RegExp(`Continuar com ${provider}`) }),
      ).toBeDisabled();
    await expect(page.getByText(/Você já pode entrar com email/)).toBeVisible();
  });
}
test('catalogue and details load real product photos through the API proxy', async ({
  page,
  request,
}) => {
  await page.goto('http://localhost:3000');
  const photos = page.locator('.product-grid img');
  await expect(photos).toHaveCount(9);
  for (const photo of await photos.all()) {
    await photo.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        photo.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 100),
      )
      .toBe(true);
  }
  const response = await request.get(
    'http://localhost:3000/api/assets/products/playstation-5-slim.webp',
  );
  expect(response.headers()['content-type']).toContain('image/webp');
  expect((await response.body()).length).toBeGreaterThan(10000);
  await page.goto('http://localhost:3000/p/airpods');
  await expect(page.getByRole('img', { name: 'AirPods', exact: true })).toBeVisible();
});
