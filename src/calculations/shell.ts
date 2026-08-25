import type { PartRecord, TankModel } from "../tank/model";

export interface ShellPanel extends PartRecord { course: number; index: number; startAngleRad: number; angleRad: number; length: number; height: number; }

/** Developable cylinder: course plate count is ceil(pi*D / available plate length). */
export function shellPanels(model: TankModel): ShellPanel[] {
  const circumference = Math.PI * model.diameter;
  const perCourse = Math.ceil(circumference / model.shell.plateLength);
  const length = circumference / perCourse;
  const height = model.shellHeight / model.shell.courseCount;
  const angleRad = 2 * Math.PI / perCourse;
  const parts: ShellPanel[] = [];
  for (let c = 0; c < model.shell.courseCount; c++) {
    const offset = c % 2 ? angleRad / 2 : 0;
    const thickness = model.shell.nominalThickness + Math.max(0, model.shell.courseCount - c - 1) * 0.5;
    for (let i = 0; i < perCourse; i++) {
      const areaMm2 = length * height;
      parts.push({
        id: `S${c + 1}-${String(i + 1).padStart(2, "0")}`, name: `第 ${c + 1} 圈罐壁板`, component: "shell",
        material: model.material.name, thickness, area: areaMm2 / 1e6,
        weight: areaMm2 * thickness * 1e-9 * model.material.density,
        dimensions: `${length.toFixed(1)} × ${height.toFixed(1)}`, elevation: c * height,
        angle: ((offset + i * angleRad) * 180 / Math.PI) % 360, course: c + 1, index: i + 1,
        startAngleRad: offset + i * angleRad, angleRad, length, height,
      });
    }
  }
  return parts;
}

export const shellCircumference = (model: TankModel) => Math.PI * model.diameter;
export const shellPlateCountPerCourse = (model: TankModel) => Math.ceil(shellCircumference(model) / model.shell.plateLength);
