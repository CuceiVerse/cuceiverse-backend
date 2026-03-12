import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { SiiauFixtureProvider } from './siiau-fixture.provider';

describe('SiiauFixtureProvider', () => {
  it('returns snapshot (falls back to timestamp if missing)', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'siiau-fixture-'));
    const fixturePath = path.join(tmpDir, 'resultado_horario.json');

    try {
      fs.writeFileSync(
        fixturePath,
        JSON.stringify({
          pidm: '1411222',
          majrp: 'INNI',
          ciclo: '202210',
          courses: [],
          stats: { total_courses: 0, with_schedule: 0, missing_schedule: 0 },
        }),
        'utf-8',
      );

      process.env.SIIAU_FIXTURE_PATH = fixturePath;

      const p = new SiiauFixtureProvider();
      const snap = await p.fetchSnapshot({ codigo: 'x', nip: 'y' });

      expect(snap.pidm).toBe('1411222');
      expect(snap.majrp).toBe('INNI');
      expect(Array.isArray(snap.courses)).toBe(true);
      expect(typeof snap.timestamp).toBe('string');
    } finally {
      // cleanup
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  });
});
