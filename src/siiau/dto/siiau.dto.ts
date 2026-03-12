export type SiiauMode = "real" | "fixture";

export interface SiiauScheduleSessionDto {
  ses?: string | null;      // "01"
  hora?: string | null;     // "1100-1455"
  dias?: string | null;     // ". . . . . S"
  edif?: string | null;     // "DUCT1"
  aula?: string | null;     // "LC07"
  periodo?: string | null;  // "16/01/22 - 15/07/22"
  profesor?: string | null; // "APELLIDO, NOMBRE"
}

export interface SiiauCourseDto {
  nrc: string;
  clave: string;
  materia: string;
  creditos?: number | null;

  // Oferta join
  sec?: string | null;
  sessions?: SiiauScheduleSessionDto[]; // puede ser [] si la página no trae horario
  profesor?: string | null;

  // flags
  warnings?: string[];
}

export interface SiiauSnapshotDto {
  timestamp: string; // ISO
  pidm: string;
  carrera_value?: string | null; // ej "INNI-202210"
  majrp: string;                 // ej "INNI"
  ciclo?: string | null;         // ej "202210"
  courses: SiiauCourseDto[];
  stats: {
    total_courses: number;
    with_schedule: number;
    missing_schedule: number;
  };
}

/**
 * Para esta fase, el backend puede recibir credenciales por request.
 * (Luego se migra a "vincular" y guardar token/credenciales cifradas.)
 */
export interface SiiauSnapshotRequestDto {
  codigo: string;          // SIIAU code
  nip: string;             // NIP
  carreraPrefer?: string;  // ej "INNI-202210"
  // si no se manda, se toma el ciclo del valor de carreraPrefer (INNI-202210 -> 202210)
  cicloPrefer?: string;    // ej "202210"
}