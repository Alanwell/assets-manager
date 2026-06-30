import { Logger } from '@nestjs/common';
import { createApplication } from './application';
import { AppConfigService } from './config/app-config.service';
import { loadEnvironment } from './config/load-environment';

async function bootstrap(): Promise<void> {
  loadEnvironment();
  const app = await createApplication();
  const config = app.get(AppConfigService);
  await app.listen(config.port, '0.0.0.0');
  Logger.log(
    `API listening on http://localhost:${config.port}/api`,
    'Bootstrap',
  );
}

void bootstrap();
