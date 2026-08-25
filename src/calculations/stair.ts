import type { TankModel } from "../tank/model";

export interface StairStringerGeometry {
  side: "inner" | "outer";
  radius: number;
  developedRun: number;
  helixLength: number;
  slopeDeg: number;
  segmentLength: number;
  segmentPlanArc: number;
  segmentPlanChord: number;
  segmentStraightLength: number;
}

export interface StairFlight {
  id:string; index:number; stepStart:number; stepCount:number;
  startElevation:number; endElevation:number; rise:number;
  startAngleRad:number; endAngleRad:number; angleRad:number;
  centerLength:number; innerLength:number; outerLength:number; stockSegmentCount:number;
  innerPieceLength:number; outerPieceLength:number; innerStraightPieceLength:number; outerStraightPieceLength:number;
}

export interface StairPlatform {
  id:string; index:number; elevation:number; startAngleRad:number; endAngleRad:number;
  centerAngleRad:number; length:number; width:number; top:boolean;
}

export interface StairStepPosition { index:number; angleRad:number; elevation:number; flight:number; }
export interface StairSupportFrame { index:number; station:number; angleRad:number; elevation:number; radialReach:number; }

export interface StairGeometry {
  centerRadius:number; innerRadius:number; outerRadius:number; stepCount:number; riser:number; tread:number;
  deltaAngleRad:number; totalAngleRad:number; overallAngleRad:number; rotations:number; slopeDeg:number;
  pathLength:number; developedRun:number; stringerSegmentCount:number; stringerSegmentAngleRad:number;
  stringerSegmentRise:number; stringers:[StairStringerGeometry,StairStringerGeometry]; flights:StairFlight[];
  platforms:StairPlatform[]; topPlatform:StairPlatform; stepPositions:StairStepPosition[];
  supportSpacing:number; supportFrames:StairSupportFrame[];
  direction:1|-1;
}

/** Helical stair split into transportable flights at intermediate rest platforms. Lengths: mm. */
export function stairGeometry(model:TankModel):StairGeometry {
  const centerRadius=model.diameter/2+model.stair.clearance+model.stair.width/2;
  const innerRadius=centerRadius-model.stair.width/2,outerRadius=centerRadius+model.stair.width/2;
  const stepCount=Math.max(2,Math.round(model.shellHeight/model.stair.targetRiser));
  const riser=model.shellHeight/stepCount,tread=model.stair.targetTread,deltaAngleRad=tread/centerRadius;
  const totalAngleRad=deltaAngleRad*stepCount,developedRun=tread*stepCount,pathLength=Math.hypot(developedRun,model.shellHeight);
  const requestedPlatforms=Math.max(0,Math.round(model.stair.intermediatePlatformCount??2));
  const flightCount=Math.min(stepCount,requestedPlatforms+1),direction:(1|-1)=(model.stair.direction??"ccw")==="ccw"?1:-1;
  const platformLength=Math.max(model.stair.width,model.stair.platformLength??1200),platformAngleRad=platformLength/centerRadius;
  const stockLength=Math.max(1000,model.stair.stringerStockLength??6000),start=model.stair.startAngle*Math.PI/180;
  const baseSteps=Math.floor(stepCount/flightCount),extraSteps=stepCount%flightCount;
  const flights:StairFlight[]=[],platforms:StairPlatform[]=[],stepPositions:StairStepPosition[]=[];
  let stepCursor=0,angleCursor=start;
  for(let index=0;index<flightCount;index++){
    const steps=baseSteps+(index<extraSteps?1:0),rise=steps*riser,angleRad=direction*steps*deltaAngleRad;
    const startElevation=stepCursor*riser,endElevation=(stepCursor+steps)*riser,startAngleRad=angleCursor,endAngleRad=startAngleRad+angleRad;
    const centerLength=Math.hypot(centerRadius*Math.abs(angleRad),rise),innerLength=Math.hypot(innerRadius*Math.abs(angleRad),rise),outerLength=Math.hypot(outerRadius*Math.abs(angleRad),rise);
    const stockSegmentCount=Math.max(1,Math.ceil(outerLength/stockLength));
    const pieceAngle=Math.abs(angleRad)/stockSegmentCount,pieceRise=rise/stockSegmentCount;
    const innerPieceLength=innerLength/stockSegmentCount,outerPieceLength=outerLength/stockSegmentCount;
    const innerStraightPieceLength=Math.hypot(2*innerRadius*Math.sin(pieceAngle/2),pieceRise),outerStraightPieceLength=Math.hypot(2*outerRadius*Math.sin(pieceAngle/2),pieceRise);
    flights.push({id:`FL-${String(index+1).padStart(2,"0")}`,index:index+1,stepStart:stepCursor+1,stepCount:steps,startElevation,endElevation,rise,startAngleRad,endAngleRad,angleRad,centerLength,innerLength,outerLength,stockSegmentCount,innerPieceLength,outerPieceLength,innerStraightPieceLength,outerStraightPieceLength});
    // The floor/platform is the first landing and the next platform is the last;
    // only intermediate levels need separate tread plates.
    for(let local=1;local<steps;local++)stepPositions.push({index:stepPositions.length+1,angleRad:startAngleRad+direction*local*deltaAngleRad,elevation:startElevation+local*riser,flight:index+1});
    stepCursor+=steps; angleCursor=endAngleRad;
    if(index<flightCount-1){
      const pStart=angleCursor,pEnd=pStart+direction*platformAngleRad;
      platforms.push({id:`LP-${String(index+1).padStart(2,"0")}`,index:index+1,elevation:endElevation,startAngleRad:pStart,endAngleRad:pEnd,centerAngleRad:(pStart+pEnd)/2,length:platformLength,width:model.stair.width,top:false});
      angleCursor=pEnd;
    }
  }
  const overallAngleRad=Math.abs(angleCursor-start);
  const topPlatform:StairPlatform={id:"LP-TOP",index:flightCount,elevation:model.shellHeight,startAngleRad:angleCursor,endAngleRad:angleCursor+direction*platformAngleRad,centerAngleRad:angleCursor+direction*platformAngleRad/2,length:platformLength,width:model.stair.width,top:true};
  const stringerSegmentCount=flights.reduce((sum,flight)=>sum+flight.stockSegmentCount,0);
  const stringer=(side:"inner"|"outer",radius:number):StairStringerGeometry=>{
    const developed=radius*totalAngleRad,helixLength=Math.hypot(developed,model.shellHeight),avgAngle=totalAngleRad/stringerSegmentCount,avgRise=model.shellHeight/stringerSegmentCount,segmentPlanChord=2*radius*Math.sin(avgAngle/2);
    return {side,radius,developedRun:developed,helixLength,slopeDeg:Math.atan2(model.shellHeight,developed)*180/Math.PI,segmentLength:helixLength/stringerSegmentCount,segmentPlanArc:radius*avgAngle,segmentPlanChord,segmentStraightLength:Math.hypot(segmentPlanChord,avgRise)};
  };
  const supportTarget=Math.max(500,model.stair.supportSpacing??2000),supportFrames:StairSupportFrame[]=[];
  let station=0;
  flights.forEach((flight,flightIndex)=>{
    const bays=Math.max(1,Math.ceil(flight.centerLength/supportTarget));
    for(let i=0;i<=bays;i++){
      if(flightIndex>0&&i===0)continue;
      const t=i/bays;
      supportFrames.push({index:supportFrames.length+1,station:station+flight.centerLength*t,angleRad:flight.startAngleRad+flight.angleRad*t,elevation:flight.startElevation+flight.rise*t,radialReach:model.stair.clearance+model.stair.width});
    }
    station+=flight.centerLength;
  });
  const supportSpacing=pathLength/Math.max(1,supportFrames.length-1);
  return {centerRadius,innerRadius,outerRadius,stepCount,riser,tread,deltaAngleRad,totalAngleRad,overallAngleRad,rotations:overallAngleRad/(2*Math.PI),slopeDeg:Math.atan2(riser,tread)*180/Math.PI,pathLength,developedRun,stringerSegmentCount,stringerSegmentAngleRad:totalAngleRad/stringerSegmentCount,stringerSegmentRise:model.shellHeight/stringerSegmentCount,stringers:[stringer("inner",innerRadius),stringer("outer",outerRadius)],flights,platforms,topPlatform,stepPositions,supportSpacing,supportFrames,direction};
}
