import { parseOferta } from './oferta.parser';

describe('parseOferta', () => {
  it('parses oferta html without crashing (rows >= 1)', () => {
    const html = `
      <html><body>
        <table>
          <tr>
            <th>CU</th><th>NRC</th><th>CLAVE</th><th>MATERIA</th><th>SEC</th>
            <th>CR</th><th>CUP</th><th>DIS</th>
            <th>Ses/Hora/Días/Edif/Aula/Periodo</th>
            <th>Ses/Profesor</th>
          </tr>
          <tr>
            <td>C</td><td>124873</td><td>I5914</td><td>IA</td><td>D01</td>
            <td>8</td><td>30</td><td>10</td>
            <td>
              <table>
                <tr>
                  <td>01</td><td>1100-1455</td><td>. . . . . S</td><td>DUCT1</td><td>LC07</td><td>16/01/22 - 15/07/22</td>
                </tr>
              </table>
            </td>
            <td>
              <table>
                <tr><td>01</td><td>APELLIDO, NOMBRE</td></tr>
              </table>
            </td>
          </tr>
        </table>
      </body></html>
    `;

    const { rows, ciclo } = parseOferta(html);

    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThan(0);

    expect(rows[0].nrc).toBe('124873');
    expect(rows[0].sessions.length).toBe(1);
    expect(rows[0].sessions[0].ses).toBe('01');
    expect(rows[0].sessions[0].hora).toBe('1100-1455');

    // profesor es best-effort (puede venir vacío en SIIAU)
    expect(
      rows[0].sessions[0].profesor === null ||
        typeof rows[0].sessions[0].profesor === 'string',
    ).toBe(true);

    expect(ciclo === null || typeof ciclo === 'string').toBe(true);
  });
});
