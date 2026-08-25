type PageFormat="png"|"pdf";
const encoder=new TextEncoder();

function safeName(value:string){return value.replace(/[\\/:*?"<>|]/g,"-").replace(/\s+/g," ").trim()||"TankWorks"}
function download(name:string,blob:Blob){const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000)}
function copyStyles(source:Element,clone:Element){const computed=getComputedStyle(source),style=(clone as HTMLElement|SVGElement).style;for(const property of Array.from(computed))style.setProperty(property,computed.getPropertyValue(property),computed.getPropertyPriority(property));Array.from(source.children).forEach((child,index)=>copyStyles(child,clone.children[index]))}

async function renderCurrentSurface(){
  const target=document.querySelector<HTMLElement>(".drawing-sheet, .table-view, .fabrication-view");
  if(!target)throw new Error("请先切换到二维工程图、展开图、容量曲线或 BOM 页面，再进行导出。");
  if(document.fonts?.ready)await document.fonts.ready;
  const rect=target.getBoundingClientRect(),width=Math.ceil(Math.max(rect.width,target.scrollWidth));
  let height=Math.ceil(Math.max(rect.height,target.scrollHeight));
  const clone=target.cloneNode(true) as HTMLElement;copyStyles(target,clone);
  const sourceBom=target.querySelector<HTMLElement>(".bom-scroll"),cloneBom=clone.querySelector<HTMLElement>(".bom-scroll");
  if(sourceBom&&cloneBom){height=Math.ceil(sourceBom.scrollHeight+84);cloneBom.style.height=`${sourceBom.scrollHeight}px`;cloneBom.style.overflow="visible";cloneBom.querySelectorAll<HTMLElement>("th").forEach(cell=>cell.style.position="static")}
  Object.assign(clone.style,{width:`${width}px`,height:`${height}px`,maxWidth:"none",minWidth:"0",margin:"0",transform:"none"});
  clone.setAttribute("xmlns","http://www.w3.org/1999/xhtml");
  const markup=new XMLSerializer().serializeToString(clone);
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><foreignObject width="100%" height="100%">${markup}</foreignObject></svg>`;
  const url=URL.createObjectURL(new Blob([svg],{type:"image/svg+xml;charset=utf-8"}));
  try{const image=new Image();image.src=url;await image.decode();const scale=Math.min(2,12000/Math.max(width,height)),canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));const context=canvas.getContext("2d");if(!context)throw new Error("浏览器无法创建图像画布。");context.fillStyle="#fff";context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);return canvas}finally{URL.revokeObjectURL(url)}
}

function canvasBlob(canvas:HTMLCanvasElement,type:string,quality?:number){return new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("图像文件生成失败。")),type,quality))}

function imagePdf(jpeg:Uint8Array,imageWidth:number,imageHeight:number){
  const landscape=imageWidth>=imageHeight,pageWidth=landscape?841.89:595.28,pageHeight=landscape?595.28:841.89,margin=28.35;
  const scale=Math.min((pageWidth-margin*2)/imageWidth,(pageHeight-margin*2)/imageHeight),drawWidth=imageWidth*scale,drawHeight=imageHeight*scale,x=(pageWidth-drawWidth)/2,y=(pageHeight-drawHeight)/2;
  const content=`q\n${drawWidth.toFixed(3)} 0 0 ${drawHeight.toFixed(3)} ${x.toFixed(3)} ${y.toFixed(3)} cm\n/Im0 Do\nQ\n`;
  const pieces:(string|Uint8Array)[]=[],offsets:number[]=[0];let length=0;
  const push=(part:string|Uint8Array)=>{pieces.push(part);length+=typeof part==="string"?encoder.encode(part).length:part.byteLength};
  const object=(id:number,parts:(string|Uint8Array)[])=>{offsets[id]=length;push(`${id} 0 obj\n`);parts.forEach(push);push("\nendobj\n")};
  push("%PDF-1.4\n%TankWorks\n");object(1,["<< /Type /Catalog /Pages 2 0 R >>"]);object(2,["<< /Type /Pages /Kids [3 0 R] /Count 1 >>"]);object(3,[`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth.toFixed(2)} ${pageHeight.toFixed(2)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`]);object(4,[`<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.byteLength} >>\nstream\n`,jpeg,"\nendstream"]);object(5,[`<< /Length ${encoder.encode(content).length} >>\nstream\n${content}endstream`]);
  const xref=length;push("xref\n0 6\n0000000000 65535 f \n");for(let id=1;id<=5;id++)push(`${String(offsets[id]).padStart(10,"0")} 00000 n \n`);push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);return new Blob(pieces,{type:"application/pdf"});
}

export async function exportCurrentPage(format:PageFormat,projectName:string,viewName:string){const canvas=await renderCurrentSurface(),base=safeName(`${projectName}-${viewName}`);if(format==="png"){download(`${base}.png`,await canvasBlob(canvas,"image/png"));return}const jpegBlob=await canvasBlob(canvas,"image/jpeg",.96),jpeg=new Uint8Array(await jpegBlob.arrayBuffer());download(`${base}.pdf`,imagePdf(jpeg,canvas.width,canvas.height))}
