import type { UnitSystem } from "../tank/model";

/** All geometry is stored in millimetres; this boundary converts UI values only. */
export const toMillimetres = (value: number, unit: UnitSystem) => unit === "m" ? value * 1000 : value;
export const fromMillimetres = (value: number, unit: UnitSystem) => unit === "m" ? value / 1000 : value;
export const displayLength = (mm: number, unit: UnitSystem) => `${fromMillimetres(mm, unit).toFixed(unit === "m" ? 3 : 1)} ${unit}`;
