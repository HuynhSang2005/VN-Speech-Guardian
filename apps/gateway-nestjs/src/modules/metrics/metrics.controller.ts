import { Controller, Get, Header } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import * as client from 'prom-client';

// default registry already collects nodejs metrics if enabled elsewhere
@Controller()
@SkipThrottle()
export class MetricsController {
  @Get('/metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4')
  async metrics() {
    return await client.register.metrics();
  }
}
