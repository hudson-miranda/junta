export type AnalyticsName = 'product.view' | 'offer.view' | 'onboarding.complete';
export interface AnalyticsProvider {
  track: (
    name: AnalyticsName,
    properties: Record<string, string | number | boolean>,
  ) => Promise<void>;
}
export class Analytics {
  constructor(private provider: AnalyticsProvider) {}
  setProvider(provider: AnalyticsProvider) {
    this.provider = provider;
  }
  async track(name: AnalyticsName, properties: Record<string, string | number | boolean> = {}) {
    try {
      await this.provider.track(name, properties);
    } catch {
      /* Analytics delivery never blocks the consumer journey. */
    }
  }
}
