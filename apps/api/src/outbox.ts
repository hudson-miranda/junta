import { PrismaClient, Prisma } from '../generated/client';
export async function processOutbox(db: PrismaClient) {
  const events = await db.outboxEvent.findMany({
    where: { processedAt: null, deadAt: null, availableAt: { lte: new Date() } },
    take: 50,
    orderBy: { createdAt: 'asc' },
  });
  for (const event of events) {
    try {
      await db.$transaction(
        async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${event.id}))`;
          const fresh = await tx.outboxEvent.findUniqueOrThrow({ where: { id: event.id } });
          if (fresh.processedAt || fresh.deadAt) return;
          const payload = event.payload as Record<string, string>;
          if (event.type === 'offer.activated') {
            const offer = await tx.offer.findUnique({
              where: { id: payload.offerId },
              include: { variant: { include: { product: true } }, merchant: true },
            });
            if (offer?.active && offer.merchant.approved && offer.endsAt > new Date()) {
              const intents = await tx.purchaseIntent.findMany({
                where: {
                  variantId: offer.variantId,
                  active: true,
                  targetPrice: { gte: offer.price },
                  user: { deletedAt: null },
                },
                include: { user: true },
                distinct: ['userId'],
              });
              for (const intent of intents) {
                const prefs = intent.user.preferences as Record<string, boolean>;
                if (prefs.offers === false) continue;
                await tx.notification.upsert({
                  where: { userId_eventId: { userId: intent.userId, eventId: event.id } },
                  create: {
                    userId: intent.userId,
                    eventId: event.id,
                    offerId: offer.id,
                    title: `Oferta para ${offer.variant.product.name}`,
                    body: `Seu preço-alvo foi alcançado: R$ ${offer.price.toFixed(2)}.`,
                  },
                  update: {},
                });
                await tx.outboxEvent.upsert({
                  where: { id: `push-${event.id}-${intent.userId}` },
                  create: {
                    id: `push-${event.id}-${intent.userId}`,
                    type: 'notification.push',
                    payload: {
                      userId: intent.userId,
                      offerId: offer.id,
                      eventId: event.id,
                      title: `Oferta para ${offer.variant.product.name}`,
                    },
                  },
                  update: {},
                });
              }
            }
          }
          if (event.type === 'notification.push' && process.env.PUSH_ENABLED === 'true') {
            const devices = await tx.device.findMany({
              where: { userId: payload.userId, enabled: true },
            });
            for (const device of devices) {
              const res = await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(process.env.EXPO_ACCESS_TOKEN
                    ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` }
                    : {}),
                },
                body: JSON.stringify({
                  to: device.token,
                  title: payload.title,
                  body: 'Toque para ver a oferta.',
                  data: { offerId: payload.offerId, url: `junta://offer/${payload.offerId}` },
                }),
                signal: AbortSignal.timeout(10000),
              });
              if (!res.ok) throw new Error(`Push HTTP ${res.status}`);
              const result = (await res.json()) as {
                data?: { status: string; details?: { error?: string } };
              };
              if (result.data?.status === 'error') {
                if (result.data.details?.error === 'DeviceNotRegistered')
                  await tx.device.update({ where: { id: device.id }, data: { enabled: false } });
                else throw new Error('Push provider rejected notification');
              }
            }
          }
          await tx.outboxEvent.update({
            where: { id: event.id },
            data: { processedAt: new Date(), lastError: null },
          });
        },
        { timeout: 30000 },
      );
    } catch (e) {
      const attempts = event.attempts + 1;
      await db.outboxEvent.update({
        where: { id: event.id },
        data: {
          attempts,
          availableAt: new Date(Date.now() + Math.min(3600000, 1000 * 2 ** attempts)),
          deadAt: attempts >= 8 ? new Date() : null,
          lastError:
            e instanceof Prisma.PrismaClientKnownRequestError ? e.code : 'event_processing_failed',
        },
      });
    }
  }
}
