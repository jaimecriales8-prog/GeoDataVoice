// Variables de segmentación de audiencia para encuestas.
// Mismas variables que capturamos del panelista en `participants`.
// La audiencia se guarda en surveys.audiencia (jsonb) como:
//   { gender: ["female"], regimen_salud: ["contributivo"], recibe_subsidios: [true] }
// null o {} = cualquier persona.

export type Audiencia = Record<string, (string | number | boolean)[]>;

export type SegmentVar = {
  key: string;            // columna en participants
  label: string;
  tipo: "opciones" | "bool" | "lista"; // lista = columna array (actividades)
  opciones: { value: string | number | boolean; label: string }[];
};

export const SEGMENT_VARS: SegmentVar[] = [
  {
    key: "gender", label: "Sexo", tipo: "opciones",
    opciones: [
      { value: "female", label: "Mujeres" },
      { value: "male", label: "Hombres" },
      { value: "other", label: "Otro" },
    ],
  },
  {
    key: "estrato", label: "Estrato", tipo: "opciones",
    opciones: [1, 2, 3, 4, 5, 6].map(n => ({ value: n, label: `Estrato ${n}` })),
  },
  {
    key: "nivel_estudios", label: "Nivel de estudios", tipo: "opciones",
    opciones: [
      { value: "bachiller", label: "Bachiller" },
      { value: "tecnico_tecnologo", label: "Técnico / Tecnólogo" },
      { value: "profesional", label: "Profesional" },
      { value: "posgrado", label: "Posgrado" },
    ],
  },
  {
    key: "estado_civil", label: "Estado civil", tipo: "opciones",
    opciones: [
      { value: "soltero", label: "Soltero/a" },
      { value: "casado", label: "Casado/a" },
      { value: "union_libre", label: "Unión libre" },
      { value: "separado", label: "Separado/a" },
      { value: "divorciado", label: "Divorciado/a" },
      { value: "viudo", label: "Viudo/a" },
    ],
  },
  {
    key: "regimen_salud", label: "Régimen de salud", tipo: "opciones",
    opciones: [
      { value: "subsidiado", label: "Subsidiado" },
      { value: "contributivo", label: "Contributivo" },
      { value: "especial", label: "Especial" },
      { value: "ninguno", label: "Ninguno" },
    ],
  },
  {
    key: "sisben_grupo", label: "SISBEN", tipo: "opciones",
    opciones: [
      { value: "no", label: "No está en SISBEN" },
      { value: "A", label: "Grupo A" },
      { value: "B", label: "Grupo B" },
      { value: "C", label: "Grupo C" },
      { value: "D", label: "Grupo D" },
    ],
  },
  {
    key: "tenencia_vivienda", label: "Vivienda", tipo: "opciones",
    opciones: [
      { value: "propia", label: "Propia" },
      { value: "arriendo", label: "Arriendo" },
      { value: "familiar", label: "Familiar" },
    ],
  },
  {
    key: "grupo_etnico", label: "Grupo étnico", tipo: "opciones",
    opciones: [
      { value: "ninguno", label: "Ninguno" },
      { value: "afro", label: "Afrodescendiente" },
      { value: "indigena", label: "Indígena" },
      { value: "raizal", label: "Raizal" },
      { value: "otro", label: "Otro" },
    ],
  },
  {
    key: "antiguedad_barrio", label: "Antigüedad en el barrio", tipo: "opciones",
    opciones: [
      { value: "menos_1", label: "Menos de 1 año" },
      { value: "1_5", label: "1 a 5 años" },
      { value: "5_10", label: "5 a 10 años" },
      { value: "mas_10", label: "Más de 10 años" },
    ],
  },
  {
    key: "actividades", label: "Actividad", tipo: "lista",
    opciones: [
      { value: "estudiante", label: "Estudiante" },
      { value: "empleado", label: "Empleado" },
      { value: "independiente", label: "Independiente" },
      { value: "desempleado", label: "Desempleado" },
    ],
  },
  {
    key: "recibe_subsidios", label: "Recibe subsidios", tipo: "bool",
    opciones: [{ value: true, label: "Sí" }, { value: false, label: "No" }],
  },
  {
    key: "acceso_internet", label: "Smartphone con internet", tipo: "bool",
    opciones: [{ value: true, label: "Sí" }, { value: false, label: "No" }],
  },
  {
    key: "registrado_votar", label: "Registrado para votar", tipo: "bool",
    opciones: [{ value: true, label: "Sí" }, { value: false, label: "No" }],
  },
];

/** ¿Está la audiencia vacía (= cualquier persona)? */
export function audienciaVacia(a: Audiencia | null | undefined): boolean {
  if (!a) return true;
  return Object.values(a).every(v => !v || v.length === 0);
}

/** ¿El participante cumple los filtros de la audiencia? */
export function participanteCoincide(a: Audiencia | null | undefined, p: Record<string, unknown>): boolean {
  if (audienciaVacia(a)) return true;
  for (const [key, valores] of Object.entries(a!)) {
    if (!valores || valores.length === 0) continue; // sin filtro en esta variable
    const def = SEGMENT_VARS.find(v => v.key === key);
    const pv = p[key];
    if (def?.tipo === "lista") {
      // columna array: basta intersección
      const arr = Array.isArray(pv) ? pv : [];
      if (!valores.some(v => arr.includes(v))) return false;
    } else {
      // debe coincidir uno de los valores seleccionados
      if (!valores.some(v => v === pv)) return false;
    }
  }
  return true;
}

/** Resumen legible de la audiencia (para mostrar en listas). */
export function resumenAudiencia(a: Audiencia | null | undefined): string {
  if (audienciaVacia(a)) return "Cualquier persona";
  const partes: string[] = [];
  for (const [key, valores] of Object.entries(a!)) {
    if (!valores || valores.length === 0) continue;
    const def = SEGMENT_VARS.find(v => v.key === key);
    if (!def) continue;
    const labels = valores.map(v => def.opciones.find(o => o.value === v)?.label ?? String(v));
    partes.push(`${def.label}: ${labels.join(", ")}`);
  }
  return partes.join(" · ");
}
