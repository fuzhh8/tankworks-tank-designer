import type { TankModel } from "../tank/model";
import { roofPanelCutGeometry, roofPanelLayout } from "../calculations/roof";
import { stairGeometry } from "../calculations/stair";

export interface ValidationMessage { severity:"info"|"warning"|"error"; text:string; }
export function validateTank(model: TankModel): ValidationMessage[] {
  const out: ValidationMessage[] = [];
  if (model.diameter < 5000 || model.diameter > 100000) out.push({severity:"error",text:"储罐直径应在 5–100 m 范围内。"});
  if (model.shellHeight < 3000 || model.shellHeight > 30000) out.push({severity:"error",text:"罐壁高度应在 3–30 m 范围内。"});
  if (model.roof.centerHoleRadius >= model.diameter/2) out.push({severity:"error",text:"中心孔半径必须小于储罐半径。"});
  const panels=roofPanelLayout(model);
  const fitsStock=(width:number,length:number)=>(width<=model.roof.stockWidth&&length<=model.roof.stockLength)||(length<=model.roof.stockWidth&&width<=model.roof.stockLength);
  if (panels.some(panel=>{const cut=roofPanelCutGeometry(model,panel);return !fitsStock(Math.max(cut.cutInnerChord,cut.cutOuterChord),cut.cutRadialLength)})) out.push({severity:"warning",text:"至少一块含搭接与余量的顶板下料轮廓超出当前库存板尺寸，请增加周向分瓣或径向分段。"});
  if (model.roof.plateCount < 8) out.push({severity:"warning",text:"瓜皮板数量偏少，单板展开宽度较大。"});
  if ((model.roof.seamType??"lap")==="lap" && model.roof.lapAllowance<Math.min(5*model.roof.thickness,25)) out.push({severity:"warning",text:"当前单面搭接宽度小于 5 倍板厚与 25 mm 两者中的较小值，请按采用规范及焊接工艺复核。"});
  if ((model.roof.seamType??"lap")==="lap" && model.roof.lapAllowance>Math.max(100,10*model.roof.thickness)) out.push({severity:"warning",text:`搭接宽度 ${model.roof.lapAllowance.toFixed(0)} mm 异常偏大，已计入下料尺寸、BOM 和库存板校核；请确认是否误输入。`});
  if (model.diameter>=15000) out.push({severity:"info",text:"大直径罐已采用中心柱、径向椽梁及环梁的初步支承布置；构件截面与节点尚未验算。"});
  const stair = stairGeometry(model);
  if (stair.riser > 200) out.push({severity:"warning",text:"楼梯实际踏步高度超过 200 mm。"});
  if (stair.slopeDeg > 45) out.push({severity:"warning",text:"楼梯坡度超过 45°。"});
  if (!out.length) out.push({severity:"info",text:"几何参数通过第一阶段一致性检查。"});
  out.push({severity:"info",text:"初步设计；接缝仅完成位置和余量布置，尚未执行 API 650 / EN 14015 / GB 规范结构与焊接验算。"});
  return out;
}
