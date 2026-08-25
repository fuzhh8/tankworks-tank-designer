import type { TankModel } from "../tank/model";

export interface RoofSupportGeometry {
  supported: boolean;
  rafterCount: number;
  ringRadii: number[];
  rings: RoofSupportRing[];
  rafterSpans: RoofRafterSpan[];
  rafterStartRadius: number;
  rafterEndRadius: number;
  rafterSlopingLength: number;
  centerColumnDiameter: number;
  centerColumnHeight: number;
  slopeAngleRad: number;
}

export interface RoofSupportRing {
  id: string;
  radius: number;
  elevation: number;
  circumference: number;
  bayCount: number;
  bayAngleDeg: number;
  bayArcLength: number;
  bayChord: number;
}

export interface RoofRafterSpan {
  index: number;
  fromRadius: number;
  toRadius: number;
  horizontalLength: number;
  slopingLength: number;
}

/** Preliminary arrangement geometry only; member sections and connections require code load checks. */
export function roofSupportGeometry(model:TankModel):RoofSupportGeometry {
  const tankRadius=model.diameter/2;
  const slopeAngleRad=Math.atan2(model.roof.rise,tankRadius);
  const ringCount=Math.max(0,Math.round(model.roof.supportRingCount??0));
  const rafterCount=Math.max(4,Math.round(model.roof.supportRafterCount??model.roof.plateCount));
  const ringRadii=Array.from({length:ringCount},(_,i)=>tankRadius*(i+1)/(ringCount+1));
  const roofElevation=(radius:number)=>model.shellHeight+model.roof.rise*(1-radius/tankRadius);
  const rings=ringRadii.map((radius,index)=>({
    id:`RG-${String(index+1).padStart(2,"0")}`,
    radius,
    elevation:roofElevation(radius),
    circumference:2*Math.PI*radius,
    bayCount:rafterCount,
    bayAngleDeg:360/rafterCount,
    bayArcLength:2*Math.PI*radius/rafterCount,
    bayChord:2*radius*Math.sin(Math.PI/rafterCount),
  }));
  const rafterStartRadius=Math.max(0,Math.min(model.roof.centerHoleRadius,tankRadius));
  const boundaries=[rafterStartRadius,...ringRadii.filter(radius=>radius>rafterStartRadius&&radius<tankRadius),tankRadius];
  const rafterSpans=boundaries.slice(0,-1).map((fromRadius,index)=>{
    const toRadius=boundaries[index+1],horizontalLength=toRadius-fromRadius;
    return {index:index+1,fromRadius,toRadius,horizontalLength,slopingLength:horizontalLength/Math.cos(slopeAngleRad)};
  });
  return {
    supported:model.diameter>=15000 || (model.roof.supportRafterCount??0)>0,
    rafterCount,
    ringRadii,
    rings,
    rafterSpans,
    rafterStartRadius,
    rafterEndRadius:tankRadius,
    rafterSlopingLength:(tankRadius-rafterStartRadius)/Math.cos(slopeAngleRad),
    centerColumnDiameter:Math.max(100,model.roof.centerColumnDiameter??500),
    centerColumnHeight:roofElevation(rafterStartRadius)-model.roof.thickness,
    slopeAngleRad,
  };
}
