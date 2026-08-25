"use client";

import { Canvas } from "@react-three/fiber";
import { Grid, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import type { TankModel } from "../../src/tank/model";
import { shellPanels } from "../../src/calculations/shell";
import { stairGeometry } from "../../src/calculations/stair";
import { coneDevelopment, roofPanelLayout } from "../../src/calculations/roof";
import { roofSupportGeometry } from "../../src/calculations/roofSupport";

interface Props { model:TankModel; selectedId:string; setSelectedId:(id:string)=>void; setHovered:(id:string)=>void; level:number; explosion:number; mode:string; }
const S=1/1000;

function HelixTubeSegment({radius,startAngle,endAngle,startHeight,endHeight,color}:{radius:number;startAngle:number;endAngle:number;startHeight:number;endHeight:number;color:string}){
  const geometry=useMemo(()=>{const pts=Array.from({length:65},(_,i)=>{const t=i/64,a=startAngle+(endAngle-startAngle)*t,y=startHeight+(endHeight-startHeight)*t;return new THREE.Vector3(radius*S*Math.cos(a),y*S,radius*S*Math.sin(a));});return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),64,.035,6,false);},[radius,startAngle,endAngle,startHeight,endHeight]);
  return <mesh geometry={geometry}><meshStandardMaterial color={color} metalness={.55} roughness={.4}/></mesh>;
}

function Beam({from,to,radius=.055,color="#53636a"}:{from:[number,number,number];to:[number,number,number];radius?:number;color?:string}){
  const start=new THREE.Vector3(...from),end=new THREE.Vector3(...to);
  const direction=end.clone().sub(start),length=direction.length(),mid=start.clone().add(end).multiplyScalar(.5);
  const quaternion=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
  return <mesh position={mid} quaternion={quaternion}><cylinderGeometry args={[radius,radius,length,8]}/><meshStandardMaterial color={color} metalness={.45} roughness={.5}/></mesh>;
}

function Scene({model,selectedId,setSelectedId,setHovered,level,explosion,mode}:Props){
  const shell=shellPanels(model); const r=model.diameter/2*S; const h=model.shellHeight*S; const stair=stairGeometry(model);
  const roof=coneDevelopment(model),roofPanels=roofPanelLayout(model),support=roofSupportGeometry(model);
  const select=(id:string)=>(e:{stopPropagation:()=>void})=>{e.stopPropagation();setSelectedId(id)};
  const skeletonMode=mode==="顶盖骨架";
  const mat=(id:string,base:string)=>({color:selectedId===id?"#ef8b4b":base,metalness:mode==="工程模式"?.15:.58,roughness:.46,transparent:mode==="X-Ray"||skeletonMode,opacity:mode==="X-Ray"?.32:skeletonMode?.16:1,depthWrite:!(mode==="X-Ray"||skeletonMode),side:THREE.DoubleSide});
  return <>
    <color attach="background" args={[mode==="工程模式"?"#eef1f2":"#cad2d5"]}/><ambientLight intensity={1.7}/><directionalLight position={[14,22,10]} intensity={2.8} castShadow/>
    <group onPointerMissed={()=>setSelectedId("")}>
      {shell.map(p=><mesh key={p.id} position={[0,(p.elevation!+p.height/2)*S,0]} onClick={select(p.id)} onPointerOver={()=>setHovered(p.id)} onPointerOut={()=>setHovered("")}>
        <cylinderGeometry args={[r,r,p.height*S,12,1,true,p.startAngleRad,p.angleRad-.004]}/><meshStandardMaterial {...mat(p.id, p.course%2?"#a9b6bb":"#b7c1c5")}/>
      </mesh>)}
      {support.supported&&<group>
        <mesh position={[0,support.centerColumnHeight*S/2,0]} onClick={select("RC-01")}><cylinderGeometry args={[support.centerColumnDiameter*S/2,support.centerColumnDiameter*S/2,support.centerColumnHeight*S,16]}/><meshStandardMaterial color={skeletonMode?"#d46f36":"#495a62"} metalness={.5} roughness={.45}/></mesh>
        {Array.from({length:support.rafterCount},(_,i)=>{const a=i*2*Math.PI/support.rafterCount,inner=.35,outer=r-.12,y0=h+model.roof.rise*S*(1-inner/r)-.10,y1=h+model.roof.rise*S*(1-outer/r)-.10;return <Beam key={i} from={[inner*Math.cos(a),y0,inner*Math.sin(a)]} to={[outer*Math.cos(a),y1,outer*Math.sin(a)]} color={skeletonMode?"#d46f36":"#566870"}/>})}
        {support.ringRadii.map(radius=>{const rr=radius*S,y=h+model.roof.rise*S*(1-rr/r)-.12;return <mesh key={radius} position={[0,y,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[rr,.065,8,96]}/><meshStandardMaterial color={skeletonMode?"#f0a05c":"#465860"} metalness={.5} roughness={.45}/></mesh>})}
      </group>}
      {roofPanels.map(panel=>{const a0=(panel.sector-1)*2*Math.PI/model.roof.plateCount,mid=a0+Math.PI/model.roof.plateCount,ex=explosion*S;const innerPhysical=panel.innerRadius/roof.slantLength*(model.diameter/2),outerPhysical=panel.outerRadius/roof.slantLength*(model.diameter/2),yInner=h+model.roof.rise*S*(1-innerPhysical/(model.diameter/2)),yOuter=h+model.roof.rise*S*(1-outerPhysical/(model.diameter/2));return <mesh key={panel.id} position={[Math.cos(mid)*ex,(yInner+yOuter)/2,Math.sin(mid)*ex]} onClick={select(panel.id)} onPointerOver={()=>setHovered(panel.id)} onPointerOut={()=>setHovered("")}>
        <cylinderGeometry args={[innerPhysical*S,outerPhysical*S,Math.max(.001,yInner-yOuter),8,1,true,a0,2*Math.PI/model.roof.plateCount-.006]}/><meshStandardMaterial {...mat(panel.id,(panel.sector+panel.course)%2?"#81959d":"#91a5ac")}/>
      </mesh>})}
      <mesh position={[0,.025,0]} onClick={select("BP-01")}><cylinderGeometry args={[r+.1,r+.1,.05,96]}/><meshStandardMaterial {...mat("BP-01","#52636a")}/></mesh>
      {level>0&&<mesh position={[0,level*S/2+.06,0]}><cylinderGeometry args={[r-.07,r-.07,level*S,96]}/><meshStandardMaterial color="#2a91ad" transparent opacity={.46} roughness={.15}/></mesh>}
      {stair.stepPositions.map(step=>{const a=step.angleRad,y=step.elevation*S+.12;return <mesh key={step.index} position={[stair.centerRadius*S*Math.cos(a),y,stair.centerRadius*S*Math.sin(a)]} rotation={[0,-a,0]} onClick={select("ST-01")}><boxGeometry args={[model.stair.width*S,.055,stair.tread*S*.9]}/><meshStandardMaterial {...mat("ST-01","#cf7a45")}/></mesh>})}
      {stair.supportFrames.map(frame=>{const a=frame.angleRad,wall=r+.04,outer=stair.outerRadius*S,y=frame.elevation*S+.04,lowerY=Math.max(.08,y-.65);return <group key={`SF-${frame.index}`} onClick={select("ST-01")}><Beam from={[wall*Math.cos(a),y,wall*Math.sin(a)]} to={[outer*Math.cos(a),y,outer*Math.sin(a)]} radius={.045} color="#566870"/>{frame.index>1&&<Beam from={[wall*Math.cos(a),lowerY,wall*Math.sin(a)]} to={[outer*Math.cos(a),y,outer*Math.sin(a)]} radius={.038} color="#7b5d49"/>}</group>})}
      {stair.flights.flatMap(flight=>[<HelixTubeSegment key={`${flight.id}-I`} radius={stair.innerRadius} startAngle={flight.startAngleRad} endAngle={flight.endAngleRad} startHeight={flight.startElevation} endHeight={flight.endElevation} color="#64747b"/>,<HelixTubeSegment key={`${flight.id}-O`} radius={stair.outerRadius} startAngle={flight.startAngleRad} endAngle={flight.endAngleRad} startHeight={flight.startElevation} endHeight={flight.endElevation} color="#64747b"/>,<HelixTubeSegment key={`${flight.id}-H`} radius={stair.outerRadius} startAngle={flight.startAngleRad} endAngle={flight.endAngleRad} startHeight={flight.startElevation+model.stair.handrailHeight} endHeight={flight.endElevation+model.stair.handrailHeight} color="#cf7a45"/>])}
      {[...stair.platforms,stair.topPlatform].map(platform=>{const a=platform.centerAngleRad,rr=stair.centerRadius*S,half=platform.length/2;const point=(radial:number,tangent:number,elevation:number):[number,number,number]=>[(radial*Math.cos(a)-tangent*Math.sin(a))*S,elevation*S,(radial*Math.sin(a)+tangent*Math.cos(a))*S];const railBase=platform.elevation+.14,railTop=platform.elevation+model.stair.handrailHeight,outer=stair.outerRadius,wall=model.diameter/2+40;return <group key={platform.id} onClick={select("PF-01")}><mesh position={[rr*Math.cos(a),platform.elevation*S+.08,rr*Math.sin(a)]} rotation={[0,-a,0]}><boxGeometry args={[platform.width*S,.12,platform.length*S]}/><meshStandardMaterial {...mat("PF-01",platform.top?"#707f85":"#8a969b")}/></mesh>{[-half,0,half].map(t=><Beam key={`post-${t}`} from={point(outer,t,railBase)} to={point(outer,t,railTop)} radius={.025} color="#cf7a45"/>)}<Beam from={point(outer,-half,railTop)} to={point(outer,half,railTop)} radius={.028} color="#cf7a45"/><Beam from={point(outer,-half,platform.elevation+model.stair.handrailHeight*.52)} to={point(outer,half,platform.elevation+model.stair.handrailHeight*.52)} radius={.018} color="#b9693e"/>{[-half*.72,half*.72].map(t=><group key={`support-${t}`}><Beam from={point(wall,t,platform.elevation)} to={point(outer,t,platform.elevation)} radius={.045} color="#566870"/><Beam from={point(wall,t,Math.max(80,platform.elevation-650))} to={point(outer,t,platform.elevation)} radius={.038} color="#7b5d49"/></group>)}</group>})}
      {model.nozzles.map(n=>{const a=n.angle*Math.PI/180, rr=r+n.projection*S/2;return <group key={n.id} rotation={[0,-a,0]}><mesh position={[rr,n.elevation*S,0]} rotation={[0,0,Math.PI/2]} onClick={select(n.id)}><cylinderGeometry args={[n.nominalDiameter*S/2,n.nominalDiameter*S/2,n.projection*S,24]}/><meshStandardMaterial {...mat(n.id,"#bb7047")}/></mesh></group>})}
      <mesh position={[r+.15,1.1,0]} rotation={[0,0,Math.PI/2]} onClick={select("MH-01")}><cylinderGeometry args={[.45,.45,.28,32]}/><meshStandardMaterial {...mat("MH-01","#596b73")}/></mesh>
    </group>
    <Grid position={[0,-.03,0]} args={[70,70]} cellSize={1} cellThickness={.55} cellColor="#a9b3b8" sectionSize={5} sectionColor="#77868e" fadeDistance={48}/>
    <PerspectiveCamera makeDefault position={[22,17,24]} fov={36}/><OrbitControls makeDefault target={[0,h*.48,0]} minDistance={8} maxDistance={70}/>
  </>;
}
export default function TankScene(props:Props){return <Canvas shadows dpr={[1,1.6]}><Scene {...props}/></Canvas>}
