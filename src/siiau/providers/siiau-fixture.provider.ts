import { Injectable } from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';

import type { SiiauProvider } from '../siiau.provider';
import type {
  SiiauSnapshotDto,
  SiiauSnapshotRequestDto,
} from '../dto/siiau.dto';

@Injectable()
export class SiiauFixtureProvider implements SiiauProvider {
  fetchSnapshot(input: SiiauSnapshotRequestDto): Promise<SiiauSnapshotDto> {
    void input;

    const fixturePath =
      process.env.SIIAU_FIXTURE_PATH ??
      path.resolve(
        process.cwd(),
        'test',
        'fixtures',
        'siiau',
        'resultado_horario.json',
      );

    const raw = fs.readFileSync(fixturePath, 'utf-8');

    // JSON.parse -> unknown para evitar no-unsafe-assignment
    const parsed = JSON.parse(raw) as unknown;
    const snap = parsed as Partial<SiiauSnapshotDto>;

    if (!snap.timestamp) snap.timestamp = new Date().toISOString();

    return Promise.resolve(snap as SiiauSnapshotDto);
  }
}
