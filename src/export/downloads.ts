import type { TankModel } from "../tank/model";
import { capacityTable } from "../calculations/capacity";
import { roofPanelCutGeometry, roofPanelLayout } from "../calculations/roof";
import { shellPanels } from "../calculations/shell";

const download = (name:string, text:string, type:string) => { const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([text],{type})); a.download=name; a.click(); URL.revokeObjectURL(a.href); };
export const saveProject = (model:TankModel) => download(`${model.project.name}.tank.json`, JSON.stringify(model,null,2), "application/json");
export const exportCapacityCsv = (model:TankModel, step=100) => { const rows=capacityTable(model,step); const body=["液位 mm,容积 m3,增量 m3,充装率 %",...rows.map(r=>`${r.level},${r.volume.toFixed(6)},${r.increment.toFixed(6)},${r.fillPercent.toFixed(4)}`)].join("\r\n"); download(`${model.project.name}-容量表.csv`,`\ufeff${body}`,"text/csv;charset=utf-8"); };
const dxfHeader = () => `0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n`;
const dxfEnd = () => `0\nENDSEC\n0\nEOF\n`;
const line=(x1:number,y1:number,x2:number,y2:number,layer="CUT")=>`0\nLINE\n8\n${layer}\n10\n${x1}\n20\n${y1}\n30\n0\n11\n${x2}\n21\n${y2}\n31\n0\n`;
const text=(x:number,y:number,h:number,value:string)=>`0\nTEXT\n8\nTEXT\n10\n${x}\n20\n${y}\n30\n0\n40\n${h}\n1\n${value}\n`;
export function exportRoofPlateDxf(model:TankModel,id:string){ const panels=roofPanelLayout(model),p=panels.find(panel=>panel.id===id)??panels[0],cut=roofPanelCutGeometry(model,p),inner=cut.cutInnerChord,outer=cut.cutOuterChord,length=cut.cutRadialLength,seam=(model.roof.seamType??"lap")==="lap"?`LAP R=${cut.radialLap.toFixed(1)} C=${cut.outerLap.toFixed(1)}`:"BUTT"; const body=line(-inner/2,0,inner/2,0)+line(inner/2,0,outer/2,length)+line(outer/2,length,-outer/2,length)+line(-outer/2,length,-inner/2,0)+text(-inner/2,Math.max(120,length*.45),120,`${p.id} CUT ${inner.toFixed(1)}/${outer.toFixed(1)}x${length.toFixed(1)}`)+text(-inner/2,Math.max(240,length*.45+180),90,seam); download(`${p.id}.dxf`,dxfHeader()+body+dxfEnd(),"application/dxf"); }
export function exportShellDxf(model:TankModel){ const parts=shellPanels(model); let body=""; for(const p of parts){ const x=(p.index-1)*p.length, y=(p.course-1)*p.height; body+=line(x,y,x+p.length,y)+line(x+p.length,y,x+p.length,y+p.height)+line(x+p.length,y+p.height,x,y+p.height)+line(x,y+p.height,x,y)+text(x+80,y+p.height/2,100,p.id);} download(`${model.project.name}-罐壁展开.dxf`,dxfHeader()+body+dxfEnd(),"application/dxf"); }
