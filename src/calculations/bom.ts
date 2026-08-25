import type { PartRecord, TankModel } from "../tank/model";
import { roofParts } from "./roof";
import { shellPanels } from "./shell";
import { stairGeometry } from "./stair";

export function bottomParts(model: TankModel): PartRecord[] {
  const area = Math.PI * (model.diameter / 2000 + 0.08) ** 2;
  return [{ id:"BP-01", name:"底板组合件", component:"bottom", material:model.material.name, thickness:model.bottom.thickness, area, weight:area * model.bottom.thickness / 1000 * model.material.density, dimensions:`Ø${(model.diameter + 160).toFixed(0)}` }];
}
export function stairParts(model: TankModel): PartRecord[] {
  const s = stairGeometry(model); const stringerLength=s.stringers[0].helixLength+s.stringers[1].helixLength,frameLength=s.supportFrames.length*(model.stair.clearance+model.stair.width)*2,platformArea=(s.platforms.length+1)*model.stair.width*(model.stair.platformLength??1200)/1e6; const steelVolumeM3 = s.stepPositions.length * (model.stair.width/1000) * .25 * .006 + (stringerLength/1000) * .0045 + (frameLength/1000)*.0025 + platformArea*.006;
  return [{ id:"ST-01", name:"螺旋楼梯组合件", component:"stair", material:model.material.name, thickness:6, area:steelVolumeM3/.006, weight:steelVolumeM3*model.material.density, dimensions:`${s.flights.length} 梯段 + ${s.platforms.length} 中间平台 / ${s.stepCount} 级` }];
}
export function nozzleParts(model: TankModel): PartRecord[] { return model.nozzles.map(n => ({ id:n.id, name:`接管 ${n.service}`, component:"accessory", material:model.material.name, thickness:8, area:Math.PI*n.nominalDiameter*n.projection/1e6, weight:Math.PI*n.nominalDiameter*n.projection*8*1e-9*model.material.density, dimensions:`DN${n.nominalDiameter} × ${n.projection}`, elevation:n.elevation, angle:n.angle })); }
export const buildBom = (model: TankModel) => [...shellPanels(model), ...roofParts(model), ...bottomParts(model), ...stairParts(model), ...nozzleParts(model)];
export function materialSummary(model: TankModel) { const rows = buildBom(model); return rows.reduce<Record<string,number>>((a,p)=>{a[p.component]=(a[p.component]??0)+p.weight; return a;},{}); }
