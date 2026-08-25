"use client";

import { useMemo, useState } from "react";
import type { TankModel } from "../../src/tank/model";
import type { NestingDetailGroup, NestingItem, NestingPlacement, NestingPlan } from "../../src/calculations/nesting";
import { roofNestingPlan, stairNestingPlan, stairStartCuts, uniqueNestingDetails } from "../../src/calculations/nesting";

type LayoutMode="roof"|"stair";
const detailPageSize=8;
const fmt=(value:number)=>value.toFixed(value>=100?0:1);

function PartShape({part,scale}:{part:NestingPlacement;scale:number}){
  const ow=part.width*scale,oh=part.height*scale,displayW=(part.rotated?part.height:part.width)*scale,displayH=(part.rotated?part.width:part.height)*scale;
  const transform=part.rotated?`translate(${part.x*scale+oh} ${part.y*scale}) rotate(90)`:`translate(${part.x*scale} ${part.y*scale})`;
  const inner=(part.innerWidth??part.width)*scale,outer=(part.outerWidth??part.width)*scale;
  const bevel=Math.min(ow,(part.bevelRun??0)*scale);
  const shape=part.shape==="triangle"?<polygon points={`0,0 ${ow},0 0,${oh}`}/>:part.shape==="trapezoid"?<polygon points={`${(ow-outer)/2},0 ${(ow+outer)/2},0 ${(ow+inner)/2},${oh} ${(ow-inner)/2},${oh}`}/>:part.shape==="start-bevel"?<><polygon points={`${bevel},0 ${ow},0 ${ow},${oh} 0,${oh}`}/><polygon className="nest-waste" points={`0,0 ${bevel},0 0,${oh}`}/><line className="nest-ground-edge" x1="0" y1={oh} x2={bevel} y2="0"/></>:<rect width={ow} height={oh}/>;
  return <g className="nest-part" style={{color:part.color}} transform={transform}>{shape}{displayW>34&&displayH>9&&<text x={ow/2} y={Math.min(oh/2+3,oh-2)} textAnchor="middle">{part.id}</text>}{part.shape==="start-bevel"&&displayW>110&&<text x={Math.max(bevel+5,ow*.18)} y={Math.min(oh-3,13)} className="nest-angle">α {part.bevelAngleDeg?.toFixed(1)}°</text>}</g>;
}

function SheetDrawing({model,plan,index}:{model:TankModel;plan:NestingPlan;index:number}){
  const sheet=plan.sheets[index],length=model.roof.stockLength,width=model.roof.stockWidth,scale=Math.min(690/length,265/width),drawW=length*scale,drawH=width*scale,x0=(760-drawW)/2,y0=(330-drawH)/2;
  return <svg viewBox="0 0 760 330" role="img" aria-label={`第 ${index+1} 张钢板自动排样图`}>
    <defs><pattern id="nest-grid" width={500*scale} height={500*scale} patternUnits="userSpaceOnUse"><path d={`M ${500*scale} 0 H 0 V ${500*scale}`} className="nest-grid"/></pattern></defs>
    <g transform={`translate(${x0} ${y0})`}><rect width={drawW} height={drawH} className="nest-stock"/><rect width={drawW} height={drawH} fill="url(#nest-grid)"/>{sheet?.placements.map(part=><PartShape key={part.id} part={part} scale={scale}/>)}</g>
    <text x={x0} y={y0-15} className="nest-title">钢板 #{index+1}　{length.toFixed(0)} × {width.toFixed(0)} mm　利用率 {sheet?.utilization.toFixed(1)??"0.0"}%</text>
    <text x={x0} y={y0+drawH+23} className="nest-note">外框为库存板；零件间距 {plan.gap} mm；板边余量 {plan.margin} mm。颜色表示零件类别，编号对应制造清单。</text>
  </svg>;
}

function PartDetailDiagram({part}:{part:NestingItem}){
  const l=fmt(part.width),b=fmt(part.height),outer=fmt(part.outerWidth??part.width),inner=fmt(part.innerWidth??part.width),a=fmt(part.bevelRun??0),edge=fmt(Math.hypot(part.bevelRun??0,part.height));
  if(part.shape==="trapezoid")return <svg viewBox="0 0 240 140" aria-label={`${part.id} 梯形裁剪参数图`}><polygon points="28,38 212,38 176,108 64,108" className="single-part-shape"/><text x="120" y="27" textAnchor="middle" className="single-dim-text">外口 {outer}</text><text x="120" y="126" textAnchor="middle" className="single-dim-text">内口 {inner}</text><line x1="220" y1="38" x2="220" y2="108" className="single-dim"/><text x="225" y="75" className="single-dim-text vertical-label">径向切长 {b}</text></svg>;
  if(part.shape==="triangle")return <svg viewBox="0 0 240 140" aria-label={`${part.id} 三角节点板裁剪参数图`}><polygon points="45,30 205,108 45,108" className="single-part-shape"/><line x1="45" y1="119" x2="205" y2="119" className="single-dim"/><text x="125" y="134" textAnchor="middle" className="single-dim-text">底 {l}</text><line x1="32" y1="30" x2="32" y2="108" className="single-dim"/><text x="22" y="71" textAnchor="middle" className="single-dim-text vertical-label">高 {b}</text></svg>;
  if(part.shape==="start-bevel")return <svg viewBox="0 0 240 140" aria-label={`${part.id} 起步斜切裁剪参数图`}><rect x="25" y="32" width="190" height="72" className="single-blank"/><polygon points="25,32 76,32 25,104" className="single-waste"/><polygon points="76,32 215,32 215,104 25,104" className="single-part-shape"/><line x1="25" y1="104" x2="76" y2="32" className="single-ground-edge"/><text x="48" y="58" textAnchor="middle" className="single-waste-text">切除</text><text x="86" y="48" className="single-angle-text">α {(part.bevelAngleDeg??0).toFixed(2)}°</text><line x1="25" y1="116" x2="215" y2="116" className="single-dim"/><text x="120" y="132" textAnchor="middle" className="single-dim-text">毛坯长 L={l}</text><text x="18" y="72" textAnchor="middle" className="single-dim-text vertical-label">板高 {b}</text><text x="51" y="22" textAnchor="middle" className="single-dim-text">切除底边 a={a}</text><text x="120" y="97" textAnchor="middle" className="single-ground-text">贴地边 {edge}</text></svg>;
  return <svg viewBox="0 0 240 140" aria-label={`${part.id} 矩形裁剪参数图`}><rect x="28" y="34" width="184" height="72" className="single-part-shape"/><line x1="28" y1="118" x2="212" y2="118" className="single-dim"/><text x="120" y="134" textAnchor="middle" className="single-dim-text">长 L={l}</text><line x1="18" y1="34" x2="18" y2="106" className="single-dim"/><text x="10" y="70" textAnchor="middle" className="single-dim-text vertical-label">宽 B={b}</text></svg>;
}

function PartDetailCard({detail,roofThickness}:{detail:NestingDetailGroup;roofThickness?:number}){
  const {part}=detail,range=detail.ids.length<=3?detail.ids.join("、"):`${detail.ids[0]} ～ ${detail.ids.at(-1)}`;
  const rows=part.shape==="trapezoid"?[["外口",`${fmt(part.outerWidth??part.width)} mm`],["内口",`${fmt(part.innerWidth??part.width)} mm`],["径向切长",`${fmt(part.height)} mm`]]:part.shape==="start-bevel"?[["矩形毛坯",`${fmt(part.width)} × ${fmt(part.height)} mm`],["三角切除",`${fmt(part.bevelRun??0)} × ${fmt(part.height)} mm`],["斜切角 α",`${(part.bevelAngleDeg??0).toFixed(2)}°`],["贴地斜边",`${fmt(Math.hypot(part.bevelRun??0,part.height))} mm`]]:[[part.shape==="triangle"?"底 × 高":"长 × 宽",`${fmt(part.width)} × ${fmt(part.height)} mm`]];
  return <article className="single-part-card"><header><div><b>{part.group}</b><span title={detail.ids.join("、")}>{range}</span></div><em className={detail.unplacedQuantity?"bad":"ok"}>{detail.unplacedQuantity?`${detail.unplacedQuantity} 件未排`:`共 ${detail.quantity} 件`}</em></header><PartDetailDiagram part={part}/><dl>{rows.map(([name,value])=><div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}<div><dt>相同规格数量</dt><dd>{detail.quantity} 件</dd></div><div><dt>单件裁剪面积</dt><dd>{(part.area/1e6).toFixed(4)} m²</dd></div><div><dt>板厚</dt><dd>{roofThickness!==undefined?`${roofThickness.toFixed(1)} mm`:"按正式结构图"}</dd></div></dl></article>;
}

export default function FabricationVisualizer({model}:{model:TankModel}){
  const [mode,setMode]=useState<LayoutMode>("stair"),[sheetIndex,setSheetIndex]=useState(0),[detailPage,setDetailPage]=useState(0);
  const plan=useMemo(()=>mode==="roof"?roofNestingPlan(model):stairNestingPlan(model),[mode,model]);
  const startCuts=useMemo(()=>stairStartCuts(model),[model]);
  const switchMode=(next:LayoutMode)=>{setMode(next);setSheetIndex(0);setDetailPage(0)};
  const placedArea=plan.sheets.reduce((sum,sheet)=>sum+sheet.usedArea,0),overall=plan.sheets.length?placedArea/(plan.sheets.length*plan.sheetArea)*100:0;
  const groups=useMemo(()=>{const rows=new Map<string,{count:number;area:number;color:string;examples:Set<string>}>();for(const sheet of plan.sheets)for(const part of sheet.placements){const row=rows.get(part.group)??{count:0,area:0,color:part.color,examples:new Set<string>()};row.count++;row.area+=part.area;row.examples.add(`${fmt(part.width)}×${fmt(part.height)}`);rows.set(part.group,row)}return [...rows.entries()]},[plan]);
  const current=Math.min(sheetIndex,Math.max(0,plan.sheets.length-1));
  const detailGroups=useMemo(()=>uniqueNestingDetails(plan),[plan]),detailItemCount=detailGroups.reduce((sum,row)=>sum+row.quantity,0);
  const detailPageCount=Math.max(1,Math.ceil(detailGroups.length/detailPageSize)),currentDetailPage=Math.min(detailPage,detailPageCount-1),visibleDetails=detailGroups.slice(currentDetailPage*detailPageSize,(currentDetailPage+1)*detailPageSize);
  return <div className="fabrication-view nesting-view">
    <div className="fab-toolbar"><div className="fab-mode"><button className={mode==="stair"?"active":""} onClick={()=>switchMode("stair")}>楼梯钢板排样</button><button className={mode==="roof"?"active":""} onClick={()=>switchMode("roof")}>顶盖板排样</button></div><div className="nest-pager"><button disabled={current===0} onClick={()=>setSheetIndex(current-1)}>← 上一张</button><b>{plan.sheets.length?`${current+1} / ${plan.sheets.length}`:"无可用排样"}</b><button disabled={current>=plan.sheets.length-1} onClick={()=>setSheetIndex(current+1)}>下一张 →</button></div></div>
    <div className="nest-summary"><div><span>库存板</span><b>{model.roof.stockLength.toFixed(0)} × {model.roof.stockWidth.toFixed(0)} mm</b></div><div><span>预计用板</span><b>{plan.sheets.length} 张</b></div><div><span>综合利用率</span><b>{overall.toFixed(1)}%</b></div><div><span>已排零件</span><b>{plan.sheets.reduce((sum,s)=>sum+s.placements.length,0)} 件</b></div><div className={plan.unplaced.length?"bad":"ok"}><span>无法装入</span><b>{plan.unplaced.length} 件</b></div></div>
    <div className="fab-body"><section className="fab-main"><div className="fab-main-head"><div><small>AUTOMATIC PLATE NESTING</small><h2>{mode==="stair"?"楼梯：从长方形钢板切出梯梁、踏步、平台和节点板":"顶盖：梯形瓜皮板旋转排样"}</h2></div><span className="nest-method">矩形包络 · 允许90°旋转 · 最小余料优先</span></div><div className="fab-sheet">{plan.sheets.length?<SheetDrawing model={model} plan={plan} index={current}/>:<div className="nest-empty">当前库存板无法容纳任何零件</div>}</div><p className="fab-explanation">{mode==="stair"?"梯梁先从钢板切成直条，再按楼梯详图在胎架上滚弯/扭转；踏步和平台按矩形共边排列。支撑横梁、斜撑若采用型钢，应另做型钢定尺清单，不应从面板中切。":"顶板按含搭接、焊接余量和修边量的下料轮廓排入原板。若显示无法装入，必须增加顶板分瓣、减小径向分段长度或更换更宽钢板。"}</p></section>
      <aside className="fab-side nest-side"><div className="nest-legend"><h3>本批零件清单</h3>{groups.map(([name,row])=><div key={name}><i style={{background:row.color}}/><span><b>{name}</b><small>{[...row.examples].slice(0,2).join(" / ")}{row.examples.size>2?" / 多规格":""}</small></span><strong>{row.count} 件</strong></div>)}</div>{mode==="stair"&&<div className="nest-start-cut"><b>起步端贴地斜切</b>{startCuts.map(cut=><div key={cut.side}><span>{cut.label}梯梁　α {cut.angleDeg.toFixed(2)}°</span><small>切除三角 {cut.cutRun.toFixed(0)} × {cut.plateDepth.toFixed(0)}；贴地斜边 {cut.groundEdgeLength.toFixed(0)} mm</small></div>)}<p>橙色虚线三角为废料；斜边安装后水平贴地。</p></div>}<dl><div><dt>当前板零件</dt><dd>{plan.sheets[current]?.placements.length??0} 件</dd></div><div><dt>当前板利用率</dt><dd>{plan.sheets[current]?.utilization.toFixed(1)??"0.0"}%</dd></div><div><dt>切割间距</dt><dd>{plan.gap.toFixed(0)} mm</dd></div><div><dt>板边余量</dt><dd>{plan.margin.toFixed(0)} mm</dd></div></dl>{plan.unplaced.length>0&&<div className="nest-unplaced"><b>超出库存板的零件</b><span>{plan.unplaced.slice(0,8).map(item=>item.id).join("、")}{plan.unplaced.length>8?` 等 ${plan.unplaced.length} 件`:""}</span></div>}<div className="fab-caution">这是工程估料排样，不直接生成数控切割程序。正式生产还要在CAM中加入割缝补偿、引入/引出线、热变形控制和切割顺序；切割间距设为0仅表示共边候选，必须由工艺人员批准。</div></aside>
    </div>
    <section className="single-parts-panel"><header><div><small>UNIQUE PART CONFIGURATIONS</small><h2>不重复单件配置 · {mode==="stair"?"楼梯面板":"顶盖面板"}</h2><p>相同形状与尺寸只显示一次，并保留数量和编号范围；图形不按真实比例，以参数为准。</p></div><div className="single-parts-pager"><button disabled={currentDetailPage===0} onClick={()=>setDetailPage(currentDetailPage-1)}>← 上一页</button><b>{currentDetailPage+1} / {detailPageCount}</b><span>{detailGroups.length} 种规格 / {detailItemCount} 件</span><button disabled={currentDetailPage>=detailPageCount-1} onClick={()=>setDetailPage(currentDetailPage+1)}>下一页 →</button></div></header><div className="single-parts-grid">{visibleDetails.map(detail=><PartDetailCard key={`${detail.part.group}-${detail.part.id}`} detail={detail} roofThickness={mode==="roof"?model.roof.thickness:undefined}/>)}</div></section>
  </div>;
}
