import { Injectable } from '@nestjs/common';

@Injectable()
export class TenantsService {
  health() {
    return { ok: true };
  }
}
