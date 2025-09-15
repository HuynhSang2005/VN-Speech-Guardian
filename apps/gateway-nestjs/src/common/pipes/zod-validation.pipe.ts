import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common';
import { ZodSchema, ZodTypeAny, ZodError } from 'zod';

/**
 * Zod validation pipe compatible with NestJS controllers.
 * - Input: Zod schema or ZodTypeAny
 * - Output: validated/transformed value
 * - Edge: throws BadRequestException with Zod error details
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodTypeAny | ZodSchema<any>) {}

  transform(value: any) {
    const result = (this.schema as ZodTypeAny).safeParse(value);
    if (!result.success) {
      const zErr = result.error as ZodError;
      const issues = zErr.issues.map((err) => ({ path: err.path, message: err.message }));
      throw new BadRequestException({ success: false, error: { code: 'VSG-VAL-001', issues } });
    }
    return result.data;
  }
}
