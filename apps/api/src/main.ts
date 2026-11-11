import { createApp } from './app';
import { initObservability } from './observability';
initObservability();
createApp()
  .then((app) => app.listen(Number(process.env.PORT ?? 4000), '0.0.0.0'))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'Startup failed');
    process.exit(1);
  });
