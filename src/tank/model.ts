export type UnitSystem = "mm" | "m";

export interface TankModel {
  schemaVersion: 1;
  project: { name: string; revision: string; drawingNo: string };
  units: UnitSystem;
  diameter: number;
  shellHeight: number;
  bottomElevation: number;
  shell: {
    courseCount: number;
    plateLength: number;
    nominalThickness: number;
    corrosionAllowance: number;
  };
  roof: {
    type: "cone";
    rise: number;
    plateCount: number;
    thickness: number;
    centerHoleRadius: number;
    weldAllowance: number;
    lapAllowance: number;
    seamType?: "lap" | "butt";
    trimAllowance: number;
    stockWidth: number;
    stockLength: number;
    radialCourseCount?: number;
    supportRafterCount?: number;
    supportRingCount?: number;
    centerColumnDiameter?: number;
  };
  bottom: { thickness: number; stockWidth: number; stockLength: number };
  material: { name: string; density: number };
  liquid: { name: string; density: number };
  stair: {
    width: number;
    targetRiser: number;
    targetTread: number;
    clearance: number;
    handrailHeight: number;
    startAngle: number;
    supportSpacing?: number;
    stringerStockLength?: number;
    maxFlightRise?: number;
    platformLength?: number;
    intermediatePlatformCount?: number;
    direction?: "cw" | "ccw";
    stringerPlateDepth?: number;
    nestingGap?: number;
  };
  nozzles: NozzleModel[];
}

export interface NozzleModel {
  id: string;
  nominalDiameter: number;
  elevation: number;
  angle: number;
  projection: number;
  service: string;
}

export const defaultTankModel: TankModel = {
  schemaVersion: 1,
  project: { name: "TK-101", revision: "A", drawingNo: "TK-101-GA-001" },
  units: "mm",
  diameter: 20000,
  shellHeight: 16000,
  bottomElevation: 0,
  shell: { courseCount: 8, plateLength: 8000, nominalThickness: 10, corrosionAllowance: 2 },
  roof: {
    type: "cone", rise: 1200, plateCount: 24, thickness: 6, centerHoleRadius: 350,
    weldAllowance: 20, lapAllowance: 30, seamType: "lap", trimAllowance: 25, stockWidth: 2500, stockLength: 12000,
    radialCourseCount: 3, supportRafterCount: 24, supportRingCount: 3, centerColumnDiameter: 500,
  },
  bottom: { thickness: 8, stockWidth: 2500, stockLength: 12000 },
  material: { name: "Q235B 碳钢", density: 7850 },
  liquid: { name: "水", density: 1000 },
  stair: { width: 800, targetRiser: 180, targetTread: 250, clearance: 250, handrailHeight: 1100, startAngle: 210, supportSpacing: 2000, stringerStockLength: 6000, maxFlightRise: 6000, platformLength: 1200, intermediatePlatformCount: 2, direction: "ccw", stringerPlateDepth: 250, nestingGap: 10 },
  nozzles: [
    { id: "N1", nominalDiameter: 500, elevation: 800, angle: 90, projection: 650, service: "入口" },
    { id: "N2", nominalDiameter: 300, elevation: 1200, angle: 270, projection: 500, service: "出口" },
  ],
};

export interface PartRecord {
  id: string;
  name: string;
  component: "shell" | "roof" | "bottom" | "stair" | "accessory";
  material: string;
  thickness: number;
  area: number;
  weight: number;
  dimensions: string;
  elevation?: number;
  angle?: number;
}
