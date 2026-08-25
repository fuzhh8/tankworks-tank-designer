import type { TankModel } from "../tank/model";
import { roofPanelCutGeometry, roofPanelLayout } from "./roof";
import { stairGeometry } from "./stair";

export type NestingShape="rect"|"trapezoid"|"triangle"|"start-bevel";
export interface NestingItem {
  id:string; group:string; shape:NestingShape; width:number; height:number; area:number;
  color:string; innerWidth?:number; outerWidth?:number; bevelRun?:number; bevelAngleDeg?:number;
}
export interface NestingPlacement extends NestingItem { x:number; y:number; rotated:boolean; }
export interface NestingSheet { index:number; placements:NestingPlacement[]; usedArea:number; utilization:number; }
export interface NestingPlan { sheets:NestingSheet[]; unplaced:NestingItem[]; totalArea:number; sheetArea:number; gap:number; margin:number; }
export interface StairStartCut { side:"inner"|"outer"; label:string; angleDeg:number; plateDepth:number; cutRun:number; groundEdgeLength:number; wasteArea:number; }
export interface NestingDetailGroup { part:NestingItem; quantity:number; ids:string[]; unplacedQuantity:number; }
interface Rect {x:number;y:number;w:number;h:number}

const contains=(a:Rect,b:Rect)=>b.x>=a.x&&b.y>=a.y&&b.x+b.w<=a.x+a.w&&b.y+b.h<=a.y+a.h;
const intersects=(a:Rect,b:Rect)=>!(b.x>=a.x+a.w||b.x+b.w<=a.x||b.y>=a.y+a.h||b.y+b.h<=a.y);
function splitFree(free:Rect[],used:Rect){
  const next:Rect[]=[];
  for(const f of free){
    if(!intersects(f,used)){next.push(f);continue}
    if(used.x>f.x)next.push({x:f.x,y:f.y,w:used.x-f.x,h:f.h});
    if(used.x+used.w<f.x+f.w)next.push({x:used.x+used.w,y:f.y,w:f.x+f.w-used.x-used.w,h:f.h});
    if(used.y>f.y)next.push({x:f.x,y:f.y,w:f.w,h:used.y-f.y});
    if(used.y+used.h<f.y+f.h)next.push({x:f.x,y:used.y+used.h,w:f.w,h:f.y+f.h-used.y-used.h});
  }
  return next.filter(r=>r.w>0&&r.h>0).filter((r,i,rows)=>!rows.some((other,j)=>j!==i&&contains(other,r)));
}

export function packNestingItems(items:NestingItem[],sheetLength:number,sheetWidth:number,gap=10,margin=20):NestingPlan{
  const usable={x:margin,y:margin,w:sheetLength-2*margin,h:sheetWidth-2*margin};
  const states:Array<{free:Rect[];placements:NestingPlacement[]}>=[],unplaced:NestingItem[]=[];
  const sorted=[...items].sort((a,b)=>Math.max(b.width,b.height)-Math.max(a.width,a.height)||b.area-a.area);
  for(const item of sorted){
    let best:{sheet:number;free:number;rotated:boolean;w:number;h:number;score:number}|undefined;
    const evaluate=(sheet:number,freeIndex:number,rotated:boolean,w:number,h:number)=>{
      const f=states[sheet].free[freeIndex],ow=w+gap,oh=h+gap;
      if(ow>f.w||oh>f.h)return;
      const score=(f.w-ow)*(f.h-oh)+Math.min(f.w-ow,f.h-oh)*1e6;
      if(!best||score<best.score)best={sheet,free:freeIndex,rotated,w,h,score};
    };
    states.forEach((state,s)=>state.free.forEach((_,f)=>{evaluate(s,f,false,item.width,item.height);if(item.width!==item.height)evaluate(s,f,true,item.height,item.width)}));
    if(!best){
      const fits=(item.width+gap<=usable.w&&item.height+gap<=usable.h)||(item.height+gap<=usable.w&&item.width+gap<=usable.h);
      if(!fits){unplaced.push(item);continue}
      states.push({free:[{...usable}],placements:[]});
      const s=states.length-1; evaluate(s,0,false,item.width,item.height); if(item.width!==item.height)evaluate(s,0,true,item.height,item.width);
    }
    if(!best){unplaced.push(item);continue}
    const state=states[best.sheet],f=state.free[best.free],used={x:f.x,y:f.y,w:best.w+gap,h:best.h+gap};
    state.placements.push({...item,x:f.x+gap/2,y:f.y+gap/2,rotated:best.rotated});
    state.free=splitFree(state.free,used);
  }
  const sheetArea=sheetLength*sheetWidth;
  const sheets=states.map((state,index)=>{const usedArea=state.placements.reduce((sum,p)=>sum+p.area,0);return {index:index+1,placements:state.placements,usedArea,utilization:usedArea/sheetArea*100}});
  return {sheets,unplaced,totalArea:items.reduce((sum,item)=>sum+item.area,0),sheetArea,gap,margin};
}

/** Collapse repeated IDs into unique cutting configurations while preserving quantities and traceability. */
export function uniqueNestingDetails(plan:NestingPlan):NestingDetailGroup[]{
  const groups=new Map<string,NestingDetailGroup>();
  const add=(part:NestingItem,unplaced:boolean)=>{
    const key=[part.group,part.shape,part.width,part.height,part.innerWidth??"",part.outerWidth??"",part.bevelRun??"",part.bevelAngleDeg??""].join("|");
    const row=groups.get(key)??{part,quantity:0,ids:[],unplacedQuantity:0};
    row.quantity++;row.ids.push(part.id);if(unplaced)row.unplacedQuantity++;groups.set(key,row);
  };
  plan.sheets.forEach(sheet=>sheet.placements.forEach(part=>add(part,false)));
  plan.unplaced.forEach(part=>add(part,true));
  return [...groups.values()].map(row=>({...row,ids:row.ids.sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}))})).sort((a,b)=>a.part.id.localeCompare(b.part.id,undefined,{numeric:true}));
}

export function roofNestingPlan(model:TankModel){
  const items=roofPanelLayout(model).map(panel=>{const cut=roofPanelCutGeometry(model,panel);return {id:panel.id,group:`第${panel.course}段顶板`,shape:"trapezoid" as const,width:Math.max(cut.cutInnerChord,cut.cutOuterChord),height:cut.cutRadialLength,innerWidth:cut.cutInnerChord,outerWidth:cut.cutOuterChord,area:cut.cutArea,color:["#d88754","#6d98aa","#8ca6a0"][panel.course%3]}});
  return packNestingItems(items,model.roof.stockLength,model.roof.stockWidth,model.stair.nestingGap??10,20);
}

/** Bottom stringer toe: remove a right triangle so the new diagonal becomes horizontal after installation. */
export function stairStartCuts(model:TankModel):[StairStartCut,StairStartCut]{
  const stair=stairGeometry(model),plateDepth=Math.max(1,model.stair.stringerPlateDepth??250);
  const make=(side:"inner"|"outer",radius:number):StairStartCut=>{
    const angleRad=Math.atan2(model.shellHeight,radius*stair.totalAngleRad);
    const cutRun=plateDepth/Math.tan(angleRad);
    return {side,label:side==="inner"?"内侧":"外侧",angleDeg:angleRad*180/Math.PI,plateDepth,cutRun,groundEdgeLength:Math.hypot(cutRun,plateDepth),wasteArea:cutRun*plateDepth/2};
  };
  return [make("inner",stair.innerRadius),make("outer",stair.outerRadius)];
}

export function stairNestingPlan(model:TankModel){
  const stair=stairGeometry(model),depth=model.stair.stringerPlateDepth??250,cuts=stairStartCuts(model),items:NestingItem[]=[];
  stair.flights.forEach(flight=>{
    for(let i=0;i<flight.stockSegmentCount;i++){
      const isToe=flight.index===1&&i===0,innerCut=isToe?cuts[0]:undefined,outerCut=isToe?cuts[1]:undefined;
      items.push({id:`${flight.id}-IN-${i+1}`,group:isToe?"内侧梯梁（起步斜切）":"内侧梯梁条",shape:isToe?"start-bevel":"rect",width:flight.innerPieceLength,height:depth,area:flight.innerPieceLength*depth-(innerCut?.wasteArea??0),bevelRun:innerCut?.cutRun,bevelAngleDeg:innerCut?.angleDeg,color:"#287895"});
      items.push({id:`${flight.id}-OUT-${i+1}`,group:isToe?"外侧梯梁（起步斜切）":"外侧梯梁条",shape:isToe?"start-bevel":"rect",width:flight.outerPieceLength,height:depth,area:flight.outerPieceLength*depth-(outerCut?.wasteArea??0),bevelRun:outerCut?.cutRun,bevelAngleDeg:outerCut?.angleDeg,color:"#c66d39"});
    }
  });
  stair.stepPositions.forEach((_,i)=>items.push({id:`TR-${String(i+1).padStart(3,"0")}`,group:"踏步板",shape:"rect",width:model.stair.width,height:stair.tread,area:model.stair.width*stair.tread,color:"#8da7b1"}));
  [...stair.platforms,stair.topPlatform].forEach(platform=>items.push({id:platform.id,group:"平台面板",shape:"rect",width:platform.length,height:platform.width,area:platform.length*platform.width,color:"#d39a68"}));
  const gusset=300;
  stair.supportFrames.forEach((_,i)=>{for(let side=1;side<=2;side++)items.push({id:`GP-${String(i+1).padStart(2,"0")}-${side}`,group:"支撑节点板",shape:"triangle",width:gusset,height:gusset,area:gusset*gusset/2,color:"#8c795f"})});
  return packNestingItems(items,model.roof.stockLength,model.roof.stockWidth,model.stair.nestingGap??10,20);
}
