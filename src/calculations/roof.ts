import type { PartRecord, TankModel } from "../tank/model";

export interface ConeDevelopment {
  tankRadius: number;
  rise: number;
  slantLength: number;
  slopeAngleRad: number;
  totalSectorAngleRad: number;
  plateAngleRad: number;
  innerRadius: number;
  theoreticalArea: number;
  outerArcLength: number;
  innerArcLength: number;
  cutOuterRadius: number;
  cutInnerRadius: number;
  cutAngleRad: number;
  cutArea: number;
  boundingWidth: number;
  boundingLength: number;
}

export interface RoofPanelSegment {
  id: string;
  sector: number;
  course: number;
  innerRadius: number;
  outerRadius: number;
  innerChord: number;
  outerChord: number;
  radialLength: number;
  exactArea: number;
}

export interface RoofPanelCutGeometry {
  cutInnerRadius: number;
  cutOuterRadius: number;
  cutAngleRad: number;
  cutInnerChord: number;
  cutOuterChord: number;
  cutRadialLength: number;
  cutArea: number;
  radialLap: number;
  outerLap: number;
}

/** Exact development of a conical annular sector. Inputs and radii: mm; areas: mm². */
export function coneDevelopment(model: TankModel): ConeDevelopment {
  const tankRadius = model.diameter / 2;
  const rise = model.roof.rise;
  const slantLength = Math.hypot(tankRadius, rise);
  const slopeAngleRad = Math.atan2(rise, tankRadius);
  const totalSectorAngleRad = 2 * Math.PI * tankRadius / slantLength;
  const plateAngleRad = totalSectorAngleRad / model.roof.plateCount;
  const innerRadius = slantLength * model.roof.centerHoleRadius / tankRadius;
  const theoreticalArea = 0.5 * plateAngleRad * (slantLength ** 2 - innerRadius ** 2);
  // One radial edge owns the lap. Shop allowance remains on both radial edges.
  const allowance = 2 * model.roof.weldAllowance + ((model.roof.seamType??"lap")==="lap"?model.roof.lapAllowance:0);
  const meanRadius = Math.max(1, (slantLength + innerRadius) / 2);
  const cutOuterRadius = slantLength + model.roof.trimAllowance;
  const cutInnerRadius = Math.max(0, innerRadius - model.roof.trimAllowance);
  const cutAngleRad = plateAngleRad + allowance / meanRadius;
  const cutArea = 0.5 * cutAngleRad * (cutOuterRadius ** 2 - cutInnerRadius ** 2);
  return {
    tankRadius, rise, slantLength, slopeAngleRad, totalSectorAngleRad, plateAngleRad, innerRadius,
    theoreticalArea, outerArcLength: slantLength * plateAngleRad, innerArcLength: innerRadius * plateAngleRad,
    cutOuterRadius, cutInnerRadius, cutAngleRad, cutArea,
    boundingWidth: 2 * cutOuterRadius * Math.sin(cutAngleRad / 2), boundingLength: cutOuterRadius - cutInnerRadius,
  };
}

/**
 * Preliminary shop-cut geometry. The high/inner course owns the outward
 * circumferential lap; each gore owns one clockwise radial lap.
 */
export function roofPanelCutGeometry(model: TankModel, panel: RoofPanelSegment): RoofPanelCutGeometry {
  const development=coneDevelopment(model);
  const courses=Math.max(1,Math.round(model.roof.radialCourseCount??1));
  const isLap=(model.roof.seamType??"lap")==="lap";
  const radialLap=isLap?model.roof.lapAllowance:0;
  const outerLap=isLap&&panel.course<courses?model.roof.lapAllowance:0;
  const cutInnerRadius=Math.max(0,panel.innerRadius-model.roof.trimAllowance);
  const cutOuterRadius=panel.outerRadius+model.roof.trimAllowance+outerLap;
  const meanRadius=Math.max(1,(cutInnerRadius+cutOuterRadius)/2);
  const cutAngleRad=development.plateAngleRad+(2*model.roof.weldAllowance+radialLap)/meanRadius;
  return {
    cutInnerRadius,
    cutOuterRadius,
    cutAngleRad,
    cutInnerChord:2*cutInnerRadius*Math.sin(cutAngleRad/2),
    cutOuterChord:2*cutOuterRadius*Math.sin(cutAngleRad/2),
    cutRadialLength:cutOuterRadius-cutInnerRadius,
    cutArea:.5*cutAngleRad*(cutOuterRadius**2-cutInnerRadius**2),
    radialLap,
    outerLap,
  };
}

/** Radially segmented roof panels. Chords describe the straight-sided shop trapezoid. */
export function roofPanelLayout(model: TankModel): RoofPanelSegment[] {
  const d=coneDevelopment(model);
  const courses=Math.max(1,Math.round(model.roof.radialCourseCount??1));
  const radialSpan=d.slantLength-d.innerRadius;
  const panels:RoofPanelSegment[]=[];
  for(let sector=1;sector<=model.roof.plateCount;sector++){
    for(let course=1;course<=courses;course++){
      const innerRadius=d.innerRadius+radialSpan*(course-1)/courses;
      const outerRadius=d.innerRadius+radialSpan*course/courses;
      panels.push({
        id:`RP-${String(sector).padStart(2,"0")}-${String(course).padStart(2,"0")}`,
        sector,course,innerRadius,outerRadius,
        innerChord:2*innerRadius*Math.sin(d.plateAngleRad/2),
        outerChord:2*outerRadius*Math.sin(d.plateAngleRad/2),
        radialLength:outerRadius-innerRadius,
        exactArea:.5*d.plateAngleRad*(outerRadius**2-innerRadius**2),
      });
    }
  }
  return panels;
}

export function roofParts(model: TankModel): PartRecord[] {
  return roofPanelLayout(model).map(panel => {
    const cut=roofPanelCutGeometry(model,panel);
    return {
      id:panel.id, name:`锥顶梯形板（第 ${panel.course} 段）`, component:"roof" as const,
      material:model.material.name, thickness:model.roof.thickness, area:cut.cutArea/1e6,
      weight:cut.cutArea*model.roof.thickness*1e-9*model.material.density,
      dimensions:`下料 ${cut.cutInnerChord.toFixed(0)}/${cut.cutOuterChord.toFixed(0)} × ${cut.cutRadialLength.toFixed(0)}`,
      elevation:model.shellHeight, angle:(panel.sector-1)*360/model.roof.plateCount,
    };
  });
}
