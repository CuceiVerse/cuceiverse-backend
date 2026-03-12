import * as path from "node:path";
import { SiiauFixtureProvider } from "./siiau-fixture.provider";

describe("SiiauFixtureProvider", () => {
  it("returns snapshot from fixture json", async () => {
    process.env.SIIAU_FIXTURE_PATH = path.resolve(process.cwd(), "test", "fixtures", "siiau", "resultado_horario.json");

    const p = new SiiauFixtureProvider();
    const snap = await p.fetchSnapshot({ codigo: "x", nip: "y" });

    expect(typeof snap.pidm).toBe("string");
    expect(Array.isArray(snap.courses)).toBe(true);
  });
});
