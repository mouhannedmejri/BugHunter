import { buildApp } from './app.js';
import { env } from './config.js';

export { buildApp } from './app.js';

async function start() {
  const app = await buildApp();

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    app.log.info(`🚀 BugHuntr API running on http://localhost:${env.PORT}`);
    app.log.info(`📚 Swagger docs at http://localhost:${env.PORT}/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
