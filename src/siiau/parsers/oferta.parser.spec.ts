import * as fs from "node:fs";
import * as path from "node:path";
import { parseOferta } from "./oferta.parser";

describe("parseOferta", () => {
  it("parses oferta page without crashing (rows >= 1)", () => {
    const fixturePath = path.resolve(process.cwd(), "test", "fixtures", "siiau", "debug_oferta_page.html");
    const html = fs.readFileSync(fixturePath, "utf-8");

    const { rows, ciclo } = parseOferta(html);

    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThan(0);

    // debe traer NRCs numéricos
    expect(rows.some(r => /^\d{4,}$/.test(r.nrc))).toBe(true);

    // ciclo puede venir null dependiendo del html, pero no debe romper
    expect(ciclo === null || typeof ciclo === "string").toBe(true);
  });
});
