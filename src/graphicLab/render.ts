import { type GardenScene, type Specimen, rng } from './scene';
import { type RenderStyle } from './styles';

type Ctx = CanvasRenderingContext2D;
interface Position { x: number; y: number; }
const TAU = Math.PI * 2;

function colorWithAlpha(hex: string, alpha: number): string {
 const n = hex.replace('#','');
 const r = parseInt(n.slice(0,2),16), g = parseInt(n.slice(2,4),16), b = parseInt(n.slice(4,6),16);
 return `rgba(${r},${g},${b},${alpha})`;
}
function ellipse(ctx: Ctx,x:number,y:number,rx:number,ry:number,fill:string,stroke?:string,lineWidth=1):void {
 ctx.beginPath(); ctx.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);
 ctx.fillStyle=fill;ctx.fill();
 if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.stroke();}
}
function path(ctx: Ctx,pts:Position[],fill:string,stroke?:string,width=1):void {
 ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);
 ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}
}
function line(ctx:Ctx,x1:number,y1:number,x2:number,y2:number,color:string,width:number):void {
 ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.stroke();
}
function circleLeaf(ctx:Ctx,x:number,y:number,r:number,fill:string,stroke:string|undefined,variant:number):void {
 ctx.save();ctx.translate(x,y);ctx.rotate((variant-.5)*1.3);
 ellipse(ctx,0,0,r*(.64+variant*.45),r*(.52+variant*.27),fill,stroke,Math.max(.5,r*.065));
 ctx.restore();
}

function drawBase(ctx:Ctx,w:number,h:number,scene:GardenScene,style:RenderStyle,time:number):void {
 const p=style.palette;
 const cyan=style.id==='cyanotype';
 const engraving=style.id==='etching';
 const paper=style.id==='paper';
 const unit=Math.min((w-75)/14.1,(h-150)/6.65);
 const cx=w*.5,cy=h*.56;
 const project=(x:number,z:number):Position=>({x:cx+(x-z)*unit*.72,y:cy+(x+z)*unit*.31});
 const r=rng(scene.seed^133777);
 const g=ctx.createLinearGradient(0,0,w,h);g.addColorStop(0,p.bg);g.addColorStop(1,cyan?'#15475b':style.id==='ascii'?'#1e3027':style.id==='riso'?'#eee0c9':'#dee4d3');
 ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
 // Grain du papier et légères taches d'impression, stable entre les frames.
 for(let i=0;i<430;i++){
   const x=r()*w,y=r()*h;
   ellipse(ctx,x,y,.4+r()*1.9,.3+r()*1.2,cyan?'#7ab2b120': '#547c6320');
 }
 const corners=[project(-5,-5),project(5,-5),project(5,5),project(-5,5)];
 const bottom=corners.map(q=>({x:q.x,y:q.y+unit*.50}));
 path(ctx,[corners[3],corners[2],bottom[2],bottom[3]],p.soil,colorWithAlpha(p.line,.35),1.1);
 path(ctx,[corners[0],corners[3],bottom[3],bottom[0]],p.groundEdge);
 path(ctx,[corners[1],corners[2],bottom[2],bottom[1]],p.groundEdge);
 ctx.save();ctx.shadowColor=cyan?'#071f2a80':'#344b3940';ctx.shadowBlur=18;ctx.shadowOffsetY=9;
 path(ctx,corners,p.ground,paper?p.line:engraving?p.line:undefined,paper?1.4:1);
 ctx.restore();
 // Petites touches botaniques, toujours les mêmes pour tous les styles.
 for(let i=0;i<290;i++){
   const x=-4.7+r()*9.4,z=-4.7+r()*9.4;
   if((x-.45)**2/2.7+(z+.22)**2/1.8<1)continue;
   const q=project(x,z);const size=(.9+r()*1.7)*unit/76;
   const c=p.foliage[i%3];
   if(i%4===0) ellipse(ctx,q.x,q.y,size*2,size*.72,colorWithAlpha(c,.36));
   else line(ctx,q.x,q.y,q.x+(r()-.5)*3,q.y-size*3,colorWithAlpha(c,.56),size*.8);
 }
 // Le plan d'eau : forme libre en perspective et reflets de lumière.
 const pond=project(.45,-.22);
 ctx.save();ctx.translate(pond.x,pond.y);
 ctx.rotate(-.12);
 ellipse(ctx,2,6,unit*1.67,unit*.73,colorWithAlpha(p.line,.14));
 ellipse(ctx,0,0,unit*1.63,unit*.71,p.water,paper?p.line:undefined,Math.max(1,unit*.017));
 ctx.save();ctx.beginPath();ctx.ellipse(0,0,unit*1.59,unit*.68,0,0,TAU);ctx.clip();
 for(let i=0;i<25;i++){
   const yy=(r()-.5)*unit*1.32;
   const xx=(r()-.5)*unit*2.75;
   const wave=Math.sin(time*.65+i*2.4)*unit*.06;
   line(ctx,xx,yy,xx+unit*(.13+r()*.36)+wave,yy,p.waterShine,unit*(.008+r()*.010));
 }
 ctx.restore();ctx.restore();
 // Plantes à l'arrière puis au premier plan, sans données dépendantes du style.
 for(const item of scene.plants){
   const q=project(item.x,item.z);
   drawPlant(ctx,q.x,q.y,item,unit,style,time);
 }
 // Finition légère des bords du diorama.
 ctx.save();ctx.globalAlpha=cyan?.4:.18;
 for(let i=0;i<11;i++){
   const x=-4.7+i*.90;
   const q=project(x,4.83);
   ellipse(ctx,q.x,q.y,unit*.12,unit*.028,p.line);
 }
 ctx.restore();
}

function drawPlant(ctx:Ctx,x:number,y:number,item:Specimen,u:number,style:RenderStyle,time:number):void {
 const p=style.palette;
 const tone=p.foliage[item.species.tone%p.foliage.length];
 const random=rng(item.seed);
 const height=u*.98*item.species.height*item.scale;
 const sway=Math.sin(time*.72+item.seed*.03)*u*.020;
 const btm=y;
 const outline=(style.id==='paper'||style.id==='etching'||style.id==='cyanotype')?colorWithAlpha(p.line,style.id==='cyanotype'?.66:.38):undefined;
 ctx.save();
 ellipse(ctx,x+height*.17,y+u*.08,height*.53,u*.10,colorWithAlpha(p.line,style.id==='ascii'?.24:.12));
 const type=item.species.type;
 if(type==='broadleaf'||type==='birch'||type==='willow'||type==='pine'||type==='blossom'){
   const trunkWidth=Math.max(1.5,height*(type==='birch'?.075:.10));
   line(ctx,x,y,x+sway,y-height*.76,type==='birch'?'#e7dfc7':p.trunk,trunkWidth);
   if(type==='birch')for(let i=0;i<5;i++)line(ctx,x-trunkWidth*.5,y-i*height*.13,x+trunkWidth*.42,y-i*height*.13-2,p.line,trunkWidth*.2);
   for(let i=0;i<4;i++){
     const angle=i/3*TAU;
     line(ctx,x+sway*.5,btm-height*.48,x+sway+Math.cos(angle)*height*.25,btm-height*(.63+Math.sin(angle)*.1),p.trunk,trunkWidth*.35);
   }
   const crownY=y-height*(type==='pine'?.76:.85);
   if(type==='pine'){
     for(let j=0;j<4;j++){
       const top=crownY-height*.29+j*height*.16;
       const half=height*(.18+j*.045);
       path(ctx,[{x:x+sway,y:top},{x:x-half+sway,y:top+height*.39},{x:x+half+sway,y:top+height*.39}],p.foliage[(item.species.tone+j)%p.foliage.length],outline,1);
     }
   }else if(type==='willow'){
     ellipse(ctx,x+sway,crownY,height*.44,height*.31,tone,outline,1);
     for(let j=0;j<28;j++){
       const xx=x+sway+(random()-.5)*height*.78;
       const yy=crownY-height*.16+random()*height*.30;
       const len=height*(.20+random()*.4);
       ctx.beginPath();ctx.moveTo(xx,yy);ctx.quadraticCurveTo(xx+len*.1,yy+len*.6,xx+sway*.2,yy+len);
       ctx.strokeStyle=p.foliage[(j+item.species.tone)%4];ctx.lineWidth=Math.max(.8,u*.023);ctx.stroke();
     }
   }else{
     // Chaque couronne est une composition de massifs et non une seule sphère.
     const clusters=type==='birch'?15:22;
     for(let j=0;j<clusters;j++){
       const a=random()*TAU;
       const dist=Math.sqrt(random());
       const breadth=type==='birch'?.38:.65;
       const yy=crownY+Math.sin(a)*dist*height*(type==='birch'?.37:.36);
       const xx=x+sway+Math.cos(a)*dist*height*breadth;
       const radius=height*(type==='birch'?.12:.15)*( .7+random()*.7);
       const paletteIndex=type==='blossom'?(j%4===0?4:((j+4)%p.foliage.length)):(item.species.tone+j%3)%p.foliage.length;
       circleLeaf(ctx,xx,yy,radius,p.foliage[paletteIndex],outline,random());
       if(j%3===0)ellipse(ctx,xx-radius*.2,yy-radius*.25,radius*.25,radius*.12,colorWithAlpha(p.waterShine,.30));
     }
   }
 } else if(type==='shrub'){
   for(let i=0;i<9;i++){
     const a=random()*TAU,rr=random();
     const bx=x+Math.cos(a)*height*.48*rr;
     const by=y-height*.45+Math.sin(a)*height*.3*rr;
     circleLeaf(ctx,bx,by,height*(.19+random()*.09),p.foliage[(item.species.tone+i%3)%p.foliage.length],outline,random());
   }
 } else if(type==='fern'){
   for(let i=0;i<7;i++){
     const angle=(i/6-.5)*2.2;
     const ex=x+Math.sin(angle)*height*.86;
     const ey=y-height*(.56+Math.cos(angle)*.17);
     ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(ex,y-height*.25,ex,ey);ctx.strokeStyle=p.trunk;ctx.lineWidth=Math.max(.7,u*.018);ctx.stroke();
     for(let j=1;j<7;j++){
       const t=j/8,px=x+(ex-x)*t,py=y+(ey-y)*t-height*.06*Math.sin(Math.PI*t);
       const leaf=height*(.16+Math.sin(t*Math.PI)*.13);
       for(const sign of [-1,1])circleLeaf(ctx,px+sign*leaf*.36,py-leaf*.16,leaf*.43,tone,outline,random());
     }
   }
 } else if(type==='flower'){
   for(let i=0;i<8;i++){
     const dx=(random()-.5)*height*1.7;
     const stemHeight=height*(.35+random()*.65);
     const yy=y-stemHeight;
     line(ctx,x+dx*.5,y,x+dx,yy,p.foliage[0],Math.max(.8,u*.017));
     const petal=p.flower[item.species.tone%p.flower.length];
     for(let j=0;j<5;j++){
       const a=j*TAU/5;
       ellipse(ctx,x+dx+Math.cos(a)*height*.095,yy+Math.sin(a)*height*.095,height*.07,height*.075,petal);
     }
     ellipse(ctx,x+dx,yy,height*.055,height*.055,p.flower[3]);
   }
 }else if(type==='grass'||type==='reeds'){
   for(let i=0;i<14;i++){
     const dx=(random()-.5)*height*1.1;
     const sh=height*(.4+random()*.75);
     const bend=(random()-.5)*height*.48+sway;
     ctx.beginPath();ctx.moveTo(x+dx,y);ctx.quadraticCurveTo(x+dx+bend*.4,y-sh*.7,x+dx+bend,y-sh);
     ctx.strokeStyle=p.foliage[(item.species.tone+i%3)%p.foliage.length];ctx.lineWidth=Math.max(.7,u*.018);ctx.stroke();
     if(type==='reeds')ellipse(ctx,x+dx+bend,y-sh,height*.032,height*.12,p.trunk);
   }
 }
 ctx.restore();
}

function renderAscii(ctx:Ctx,source:HTMLCanvasElement,w:number,h:number,style:RenderStyle):void{
 const step=Math.max(9,Math.min(13,Math.round(w/115)));
 const ch=step*1.38;
 const cols=Math.ceil(w/step),rows=Math.ceil(h/ch);
 const sampler=document.createElement('canvas');sampler.width=cols;sampler.height=rows;
 const s=sampler.getContext('2d',{willReadFrequently:true})!;
 s.drawImage(source,0,0,cols,rows);
 const pixels=s.getImageData(0,0,cols,rows).data;
 ctx.fillStyle=style.palette.bg;ctx.fillRect(0,0,w,h);
 const fontSize=step*1.36;
 ctx.font=`600 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
 ctx.textAlign='center';ctx.textBaseline='middle';
 const glyphs=[' ','.',':','·','+','*','o','x','%','@'];
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
   const i=(y*cols+x)*4,rr=pixels[i],gg=pixels[i+1],bb=pixels[i+2];
   const brightness=(rr*.2126+gg*.7152+bb*.0722)/255;
   const vegetation=gg>rr*.8 && gg>bb*.82;
   const water=bb>gg*.96&&bb>rr*1.1;
   if(brightness<.09)continue;
   // Les caractères sont choisis par luminance et matériau, pas jetés au hasard.
   const idx=Math.max(1,Math.min(9,Math.floor(brightness*8.5+1)));
   const glyph=vegetation?(['·',':','*','+','✳','%','♣','@'][Math.min(7,Math.floor(brightness*7))]):water?(['~','≈','-','~','≈'][(x+y)%5]):glyphs[idx];
   ctx.fillStyle=`rgb(${Math.min(255,rr*1.16+12)},${Math.min(255,gg*1.16+14)},${Math.min(255,bb*1.15+10)})`;
   ctx.fillText(glyph,x*step+step*.5,y*ch+ch*.5);
 }
}

function renderStipple(ctx:Ctx,source:HTMLCanvasElement,w:number,h:number,style:RenderStyle):void{
 const step=5.6;const cols=Math.ceil(w/step),rows=Math.ceil(h/step);
 const sample=document.createElement('canvas');sample.width=cols;sample.height=rows;
 const s=sample.getContext('2d',{willReadFrequently:true})!;s.drawImage(source,0,0,cols,rows);
 const data=s.getImageData(0,0,cols,rows).data;
 ctx.fillStyle=style.palette.bg;ctx.fillRect(0,0,w,h);
 const rand=rng(2619);
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
   const i=(y*cols+x)*4;const rr=data[i],gg=data[i+1],bb=data[i+2];
   const lum=(rr+gg+bb)/765;
   const radius=Math.max(.33,step*(.16+(1-lum)*.35+rand()*.10));
   ctx.fillStyle=`rgba(${rr},${gg},${bb},${.75+rand()*.25})`;
   ctx.beginPath();ctx.arc(x*step+(rand()-.5)*3,y*step+(rand()-.5)*3,radius,0,TAU);ctx.fill();
 }
}
function renderRiso(ctx:Ctx,source:HTMLCanvasElement,w:number,h:number):void{
 ctx.drawImage(source,0,0);
 const dot=9,cols=Math.ceil(w/dot),rows=Math.ceil(h/dot);
 const sample=document.createElement('canvas');sample.width=cols;sample.height=rows;
 const s=sample.getContext('2d',{willReadFrequently:true})!;s.drawImage(source,0,0,cols,rows);
 const pixels=s.getImageData(0,0,cols,rows).data;
 ctx.save();ctx.globalCompositeOperation='multiply';
 for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
   const o=(j*cols+i)*4;const r=pixels[o],g=pixels[o+1],b=pixels[o+2];
   const lum=(r*.25+g*.6+b*.15)/255;
   if(lum>.91)continue;
   const radius=(1-lum)*dot*.38;
   ctx.beginPath();ctx.arc(i*dot+2,j*dot+2,radius,0,TAU);
   ctx.fillStyle= (g>r)?'#548d8280':'#c46d7080';ctx.fill();
 }
 ctx.restore();
}
function renderEtching(ctx:Ctx,source:HTMLCanvasElement,w:number,h:number):void{
 ctx.drawImage(source,0,0);
 // Hachures selon la luminance de l'image peinte, sous forme de traits courts.
 const step=8, cols=Math.ceil(w/step),rows=Math.ceil(h/step);
 const sample=document.createElement('canvas');sample.width=cols;sample.height=rows;
 const s=sample.getContext('2d',{willReadFrequently:true})!;s.drawImage(source,0,0,cols,rows);
 const pixels=s.getImageData(0,0,cols,rows).data;
 ctx.strokeStyle='#344f4a50';ctx.lineWidth=.65;
 ctx.beginPath();
 for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
   const o=(j*cols+i)*4;
   const lum=(pixels[o]*.23+pixels[o+1]*.66+pixels[o+2]*.11)/255;
   if(lum>.69)continue;
   const x=i*step,y=j*step;
   ctx.moveTo(x,y+step*.72);ctx.lineTo(x+step*(1-lum),y+step*(lum-.15));
 }
 ctx.stroke();
}

/** Rendu Canvas 2D entièrement autonome. La géométrie reste identique entre les styles. */
export function renderGarden(canvas:HTMLCanvasElement,scene:GardenScene,style:RenderStyle,time:number):number{
 const w=canvas.width,h=canvas.height;
 if(w===0||h===0)return 0;
 const start=performance.now();
 const ctx=canvas.getContext('2d',{alpha:false})!;
 const isPost=['ascii','stipple','riso','etching'].includes(style.id);
 const source=isPost?document.createElement('canvas'):canvas;
 source.width=w;source.height=h;
 const base=source.getContext('2d',{alpha:false})!;
 drawBase(base,w,h,scene,style,time);
 if(style.id==='ascii')renderAscii(ctx,source,w,h,style);
 else if(style.id==='stipple')renderStipple(ctx,source,w,h,style);
 else if(style.id==='riso')renderRiso(ctx,source,w,h);
 else if(style.id==='etching')renderEtching(ctx,source,w,h);
 return performance.now()-start;
}
