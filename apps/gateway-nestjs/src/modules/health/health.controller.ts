import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

@Controller()
@SkipThrottle()
export class HealthController {
  @Get('/health')
  health() {
    return { status: 'ok' };
  }

  @Get('/ready')
  ready() {
    // For now, simple readiness — in future check DB/redis connectivity
    return { ready: true };
  }
}
