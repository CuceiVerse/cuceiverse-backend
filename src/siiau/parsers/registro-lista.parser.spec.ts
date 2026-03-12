import { parseRegistroLista } from "./registro-lista.parser";

describe("parseRegistroLista", () => {
  it("parses minimal registro lista table", () => {
    const html = `
      <html><body>
        <table>
          <tr><th>NRC</th><th>CLAVE</th><th>MATERIA</th><th>CREDITOS</th></tr>
          <tr><td>124873</td><td>I5914</td><td>IA</td><td>8</td></tr>
          <tr><td>218581</td><td>I6001</td><td>Redes</td><td>8</td></tr>
        </table>
      </body></html>
    `;

    const { courses } = parseRegistroLista(html);
    expect(courses).toHaveLength(2);
    expect(courses[0].nrc).toBe("124873");
    expect(courses[0].creditos).toBe(8);
  });
});
