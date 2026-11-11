import { z } from 'zod';
export const money = z.number().int().min(1).max(999999999);
export const email = z.string().trim().toLowerCase().pipe(z.email());
export const password = z
  .string()
  .min(12, 'Use pelo menos 12 caracteres.')
  .max(128, 'Use no máximo 128 caracteres.');
/** A conservative local hint, not an entropy estimate or a server password policy. */
export function passwordStrength(value: string) {
  const length = value.length;
  const lower = value.toLocaleLowerCase('pt-BR');
  const predictable =
    /(.)\1{3,}|1234|2345|3456|4567|5678|6789|abcd|qwert|asdf|senha|password|junta|letmein/.test(
      lower,
    ) || new Set(lower).size < 5;
  const groups = [/[a-zà-ÿ]/, /[A-ZÀ-Ÿ]/, /\d/, /[^\p{L}\p{N}]/u].filter((r) =>
    r.test(value),
  ).length;
  let score =
    length === 0 ? 0 : length < 12 ? 1 : length >= 20 ? 4 : length >= 16 || groups >= 3 ? 3 : 2;
  if (length && predictable) score = 1;
  const labels = ['Digite uma senha', 'Fraca', 'Razoável', 'Boa', 'Forte'];
  const hint = !length
    ? 'Uma frase com palavras diferentes é mais fácil de lembrar.'
    : length < 12
      ? `Faltam ${12 - length} caracteres para o mínimo de 12.`
      : predictable
        ? 'Evite sequências, repetições e palavras como “senha” ou “Junta”.'
        : score < 4
          ? 'Experimente uma frase mais longa com palavras diferentes.'
          : 'Boa escolha. Use esta senha apenas no Junta.';
  return { score, label: labels[score], hint, meetsMinimum: length >= 12 && length <= 128 };
}
export const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email,
  password,
  referralCode: z.string().max(80).optional(),
});
export const loginSchema = z.object({ email, password: z.string().min(1).max(128) });
export const intentSchema = z.object({
  variantId: z.string().min(1).max(80),
  targetCents: money,
  horizon: z.enum(['WEEK', 'MONTH', 'ANYTIME']),
});
export const offerSchema = z
  .object({
    variantId: z.string().min(1).max(80),
    merchantId: z.string().max(80).optional(),
    priceCents: money,
    url: z
      .url()
      .max(2048)
      .refine((v) => new URL(v).protocol === 'https:', 'Use HTTPS'),
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime(),
  })
  .refine((v) => new Date(v.endsAt) > new Date(v.startsAt), 'Validade inválida');
export const productSchema = z.object({
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(2000),
  category: z.string().min(2).max(50),
  illustration: z.enum(['console', 'phone', 'laptop', 'tv', 'audio', 'watch']).default('console'),
  imageUrl: z
    .string()
    .max(2048)
    .refine(
      (v) =>
        /^\/assets\/products\/[a-z0-9-]+\.webp$/.test(v) ||
        (() => {
          try {
            const u = new URL(v);
            return u.protocol === 'https:' && !u.username && !u.password;
          } catch {
            return false;
          }
        })(),
      'Use uma URL HTTPS de uma foto do produto.',
    )
    .optional(),
  variantName: z.string().min(2).max(100),
  demoPriceCents: money,
});
export const campaignSchema = z
  .object({
    variantId: z.string().min(1),
    name: z.string().min(3).max(120),
    threshold: z.number().int().min(1).max(1000000),
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime(),
  })
  .refine((v) => new Date(v.endsAt) > new Date(v.startsAt), 'Validade inválida');
export function normalizeSlug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
export type IntentInput = z.infer<typeof intentSchema>;
export type OfferInput = z.infer<typeof offerSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type CampaignInput = z.infer<typeof campaignSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
