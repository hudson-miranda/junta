import { test, expect } from '@playwright/test';
test('consumer searches, joins persisted demand, shares, and receives merchant offer', async ({
  page,
  browser,
}) => {
  const unique = Date.now();
  await page.goto('http://localhost:3000');
  await expect(
    page.getByRole('heading', { name: 'Seu próximo desejo tem companhia.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByRole('button', { name: 'Criar uma conta' }).click();
  await page.getByLabel('Seu nome').fill('Pessoa E2E');
  await page.getByLabel('Email', { exact: true }).fill(`e2e-${unique}@example.com`);
  await page.getByLabel('Senha', { exact: true }).fill('Strong!Password123');
  const signupResponse = page.waitForResponse((r) => r.url().includes('/auth/signup'));
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  expect((await (await signupResponse).json()).refreshToken).toBeUndefined();
  await expect(page.getByRole('button', { name: 'Pessoa E2E' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Pessoa E2E' })).toBeVisible();
  await page.getByPlaceholder('O que você quer comprar?').fill('PlayStation');
  await page
    .getByRole('link', { name: /PlayStation 5 Slim/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Eu quero', exact: true }).click();
  await page.getByLabel('Quando quer comprar?').selectOption('WEEK');
  await page.getByLabel('Preço-alvo em reais').fill('2999');
  await page.getByRole('button', { name: 'Confirmar participação' }).click();
  await expect(page.getByText('Participação confirmada')).toBeVisible();
  await page.getByRole('button', { name: 'Compartilhar', exact: true }).click();
  await expect(page.getByLabel('Link para compartilhar')).toHaveValue(/ref=/);
  await page.getByRole('link', { name: 'Meus produtos', exact: true }).click();
  await expect(page).toHaveURL('http://localhost:3000/me');
  await expect(page.getByRole('heading',{name:'PlayStation 5 Slim',exact:true})).toBeVisible();
  const context = await browser.newContext();
  const merchant = await context.newPage();
  await merchant.goto('http://localhost:3002');
  await merchant.getByLabel('Email', { exact: true }).fill('merchant@junta.local');
  await merchant.getByLabel('Senha', { exact: true }).fill(process.env.DEMO_PASSWORD!);
  await merchant.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(merchant.getByRole('heading', { name: 'A demanda já está aqui.' })).toBeVisible();
  await merchant.getByLabel('Produto da oferta').selectOption('playstation-5-slim-default');
  await merchant.getByLabel('Preço da oferta em reais').fill('2999');
  await merchant.getByLabel('URL de compra').fill('https://example.com/ps5');
  await merchant.getByRole('button', { name: 'Publicar oferta', exact: true }).click();
  await expect(merchant.getByText('Oferta publicada')).toBeVisible();
  await page.goto('http://localhost:3000/notifications');
  await expect(page.getByRole('link', { name: /Oferta para PlayStation/ }).first()).toBeVisible({
    timeout: 20000,
  });
  await page
    .getByRole('link', { name: /Oferta para PlayStation/ })
    .first()
    .click();
  await expect(page.getByRole('button', { name: 'Ver oferta' })).toBeVisible();
  await page.route('https://example.com/ps5', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<h1>Parceiro demonstrativo</h1>',
    }),
  );
  await page.getByRole('button', { name: 'Ver oferta' }).click();
  await expect(page).toHaveURL('https://example.com/ps5');
  await context.close();
});
test('modal keeps keyboard focus and closes with Escape', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Shift+Tab');
  expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(
    true,
  );
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  const response = await page.request.post('http://localhost:3000/api/auth/refresh', {
    headers: { Origin: 'https://evil.example' },
    data: {},
  });
  expect(response.status()).toBe(403);
});
test('admin can create product and inspect metrics', async ({ page }) => {
  await page.goto('http://localhost:3001');
  await page.getByLabel('Email', { exact: true }).fill('admin@junta.local');
  await page.getByLabel('Senha', { exact: true }).fill(process.env.DEMO_PASSWORD!);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'O pulso do JUNTA.' })).toBeVisible();
  await page.getByLabel('Nome do produto').fill(`Produto de teste ${Date.now()}`);
  await page
    .getByLabel('Descrição do produto')
    .fill('Produto criado pela jornada automatizada de administração.');
  await page.getByLabel('Preço de demonstração em reais').fill('999');
  await page.getByRole('button', { name: 'Salvar produto' }).click();
  await expect(page.getByText('Produto salvo')).toBeVisible();
});
test('public page metadata and mobile viewport have no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:3000/p/playstation-5-slim');
  await expect(page).toHaveTitle(/PlayStation 5 Slim/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /PlayStation/);
});
