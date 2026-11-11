export async function reportClientError(error: unknown) {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    const Sentry = await import('@sentry/browser');
    Sentry.captureException(error);
  }
}
export async function initMonitoring() {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    const Sentry = await import('@sentry/browser');
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      sendDefaultPii: false,
      environment: process.env.NODE_ENV,
      beforeSend: (event) => {
        delete event.request;
        delete event.user;
        return event;
      },
    });
  }
}
