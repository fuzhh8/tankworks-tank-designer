import type { TankModel } from "../tank/model";

export interface CapacityPoint { level: number; volume: number; increment: number; fillPercent: number; }

/** Vertical cylindrical shell capacity. Input level: mm; output volume: m³. */
export function volumeAtLevel(model: TankModel, levelMm: number): number {
  const h = Math.min(model.shellHeight, Math.max(0, levelMm));
  return Math.PI * (model.diameter / 2000) ** 2 * (h / 1000);
}
export const totalCapacity = (model: TankModel) => volumeAtLevel(model, model.shellHeight);
export const hydrostaticPressureKPa = (model: TankModel, levelMm: number) => model.liquid.density * 9.80665 * (levelMm / 1000) / 1000;
export function capacityTable(model: TankModel, stepMm: number): CapacityPoint[] {
  const rows: CapacityPoint[] = [];
  let previous = 0;
  for (let level = 0; level <= model.shellHeight; level += stepMm) {
    const volume = volumeAtLevel(model, level);
    rows.push({ level, volume, increment: level === 0 ? 0 : volume - previous, fillPercent: level / model.shellHeight * 100 });
    previous = volume;
  }
  if (rows.at(-1)?.level !== model.shellHeight) {
    const volume = totalCapacity(model); rows.push({ level: model.shellHeight, volume, increment: volume - previous, fillPercent: 100 });
  }
  return rows;
}
