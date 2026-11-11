import * as Sentry from '@sentry/node';
export function initObservability() {
  if (process.env.SENTRY_DSN)
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV ?? 'development',
      sendDefaultPii: false,
      tracesSampleRate: 0.05,
      beforeSend: (event) => {
        delete event.request;
        delete event.user;
        return event;
      },
    });
}
export function captureError(error: unknown, requestId: string) {
  if (process.env.SENTRY_DSN) Sentry.captureException(error, { tags: { requestId } });
}
