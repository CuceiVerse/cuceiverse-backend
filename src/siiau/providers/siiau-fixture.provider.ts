import { Injectable } from "@nestjs/common";
import * as fs from "node:fs";
import * as path from "node:path";
import { SiiauProvider } from "../siiau.provider";
import { SiiauSnapshotDto, SiiauSnapshotRequestDto } from "../dto/siiau.dto";

@Injectable()
export class SiiauFixtureProvider implements SiiauProvider {
  async fetchSnapshot(_: SiiauSnapshotRequestDto): Promise<SiiauSnapshotDto> {
    const p =
      process.env.SIIAU_FIXTURE_PATH ||
      path.resolve(process.cwd(), "test", "fixtures", "siiau", "resultado_horario.json");

    const raw = fs.readFileSync(p, "utf-8");
    const data = JSON.parse(raw);

    // normaliza timestamp si falta
    if (!data.timestamp) data.timestamp = new Date().toISOString();
    return data as SiiauSnapshotDto;
  }
}