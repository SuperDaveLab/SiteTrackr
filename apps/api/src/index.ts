import { buildApp } from './app';
import { env } from './env';

const start = async (): Promise<void> => {
  const app = buildApp();

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    app.log.info({ port: env.PORT }, 'HTTP server ready');
  } catch (error) {
    app.log.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
};

void start();
