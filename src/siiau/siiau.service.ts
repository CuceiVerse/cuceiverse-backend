import { Inject, Injectable } from '@nestjs/common';
import { SIIAU_PROVIDER } from './siiau.provider';
import type { SiiauProvider } from './siiau.provider';
import type {
  SiiauSnapshotDto,
  SiiauSnapshotRequestDto,
} from './dto/siiau.dto';

@Injectable()
export class SiiauService {
  constructor(
    @Inject(SIIAU_PROVIDER) private readonly provider: SiiauProvider,
  ) {}

  status() {
    return { ok: true, mode: process.env.SIIAU_MODE ?? 'real' };
  }

  fetchSnapshot(input: SiiauSnapshotRequestDto): Promise<SiiauSnapshotDto> {
    return this.provider.fetchSnapshot(input);
  }
}
