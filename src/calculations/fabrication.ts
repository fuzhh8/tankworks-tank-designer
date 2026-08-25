import type { TankModel } from "../tank/model";
import { roofPanelCutGeometry, roofPanelLayout } from "./roof";
import { stairGeometry } from "./stair";

export interface RoofFabricationAnalysis {
  innerChord:number;
  outerChord:number;
  radialLength:number;
  cutInnerChord:number;
  cutOuterChord:number;
  cutWidth:number;
  cutLength:number;
  cutArea:number;
  radialLap:number;
  outerLap:number;
  fitsStock:boolean;
  recommendedSectorCount:number;
  exactArea:number;
  straightArea:number;
  areaDifferencePercent:number;
}

export function roofFabricationAnalysis(model:TankModel,course:number):RoofFabricationAnalysis {
  const courses=Math.max(1,Math.round(model.roof.radialCourseCount??1));
  const selectedCourse=Math.max(1,Math.min(courses,Math.round(course)));
  const panel=roofPanelLayout(model).find(item=>item.sector===1&&item.course===selectedCourse)!;
  const cut=roofPanelCutGeometry(model,panel);
  const cutWidth=Math.max(cut.cutInnerChord,cut.cutOuterChord);
  const cutLength=cut.cutRadialLength;
  const fits=(width:number,length:number)=>(width<=model.roof.stockWidth&&length<=model.roof.stockLength)||(length<=model.roof.stockWidth&&width<=model.roof.stockLength);
  let recommendedSectorCount=model.roof.plateCount;
  while(recommendedSectorCount<360){
    const candidateModel={...model,roof:{...model.roof,plateCount:recommendedSectorCount}};
    const candidatePanel=roofPanelLayout(candidateModel).find(item=>item.sector===1&&item.course===selectedCourse)!;
    const candidateCut=roofPanelCutGeometry(candidateModel,candidatePanel);
    if(fits(Math.max(candidateCut.cutInnerChord,candidateCut.cutOuterChord),candidateCut.cutRadialLength))break;
    recommendedSectorCount++;
  }
  const straightArea=.5*(panel.innerChord+panel.outerChord)*panel.radialLength;
  return {innerChord:panel.innerChord,outerChord:panel.outerChord,radialLength:panel.radialLength,cutInnerChord:cut.cutInnerChord,cutOuterChord:cut.cutOuterChord,cutWidth,cutLength,cutArea:cut.cutArea,radialLap:cut.radialLap,outerLap:cut.outerLap,fitsStock:fits(cutWidth,cutLength),recommendedSectorCount,exactArea:panel.exactArea,straightArea,areaDifferencePercent:(straightArea-panel.exactArea)/panel.exactArea*100};
}

export interface StairFabricationAnalysis {
  treadCount:number;
  treadWidth:number;
  treadDepth:number;
  treadsPerSheet:number;
  treadSheetCount:number;
  stringerLength:number;
  stringerPieces:number;
  innerStringerLength:number;
  outerStringerLength:number;
  stringerSegmentCount:number;
  innerSegmentLength:number;
  outerSegmentLength:number;
  supportFrameCount:number;
  supportSpacing:number;
  supportReach:number;
  flightCount:number;
  platformCount:number;
  platformWidth:number;
  platformLength:number;
  handrailLength:number;
  postCount:number;
}

export function stairFabricationAnalysis(model:TankModel):StairFabricationAnalysis {
  const stair=stairGeometry(model);
  const along=Math.max(1,Math.floor(model.roof.stockLength/model.stair.width));
  const across=Math.max(1,Math.floor(model.roof.stockWidth/stair.tread));
  const treadsPerSheet=along*across;
  return {treadCount:stair.stepPositions.length,treadWidth:model.stair.width,treadDepth:stair.tread,treadsPerSheet,treadSheetCount:Math.ceil(stair.stepPositions.length/treadsPerSheet),stringerLength:stair.pathLength,stringerPieces:stair.stringerSegmentCount*2,innerStringerLength:stair.stringers[0].helixLength,outerStringerLength:stair.stringers[1].helixLength,stringerSegmentCount:stair.stringerSegmentCount,innerSegmentLength:stair.stringers[0].segmentLength,outerSegmentLength:stair.stringers[1].segmentLength,supportFrameCount:stair.supportFrames.length,supportSpacing:stair.supportSpacing,supportReach:model.stair.clearance+model.stair.width,flightCount:stair.flights.length,platformCount:stair.platforms.length+1,platformWidth:model.stair.width,platformLength:model.stair.platformLength??1200,handrailLength:stair.stringers[1].helixLength,postCount:Math.ceil(stair.stringers[1].helixLength/1000)+1};
}
