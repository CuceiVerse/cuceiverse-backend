import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'cuceiverse-backend',
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  root() {
    return 'OK';
  }
}
