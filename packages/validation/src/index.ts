import { z } from 'zod';
export const money = z.number().int().min(1).max(999999999);
export const email = z.string().trim().toLowerCase().pipe(z.email());
export const password = z.string().min(12).max(128);
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
