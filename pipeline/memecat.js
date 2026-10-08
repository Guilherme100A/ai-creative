const {execFileSync}=require('child_process');const fs=require('fs');const path=require('path');
const ff=require('ffmpeg-static');const fp=require('ffprobe-static').path;
const {catalogo,ASSETS,ffEsc}=require('./paths');const P=catalogo().pasta;
const out=path.join(__dirname,'memecat');fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out);
const items=[];
for(const [dir,kind] of [['VÍDEOS','v'],['IMAGENS','i']])for(const f of fs.readdirSync(path.join(P,dir)).sort()){
 const full=path.join(P,dir,f);const ext=path.extname(f).toLowerCase();const isV=ext==='.mp4';
 let dur=0,w=0,h=0,aud=false;
 try{const j=JSON.parse(execFileSync(fp,['-v','error','-show_entries','format=duration:stream=codec_type,width,height','-of','json',full]));dur=+j.format.duration||0;for(const s of j.streams){if(s.codec_type==='video'&&!w){w=s.width;h=s.height}if(s.codec_type==='audio')aud=true}}catch(e){}
 const id=(isV?'V':'I')+String(items.filter(x=>x.tipo===(isV?'video':'imagem')).length+1).padStart(3,'0');
 const th=path.join(out,id+'.jpg');
 try{execFileSync(ff,['-v','error','-y',...(isV?['-ss',String(Math.max(0,dur*0.45))]:[]),'-i',full,'-frames:v','1','-vf',`scale=220:220:force_original_aspect_ratio=decrease,pad=220:240:(ow-iw)/2:0:black,drawtext=fontfile='${ffEsc(ASSETS+'/fontes/Sniglet-ExtraBold.ttf')}':text='${id}':x=6:y=218:fontsize=20:fontcolor=yellow`,th]);}catch(e){}
 items.push({id,tipo:isV?'video':'imagem',arquivo:path.join(dir,f).split(path.sep).join('/'),dur:+dur.toFixed(2),w,h,audio:aud});}
fs.writeFileSync(path.join(out,'itens.json'),JSON.stringify(items,null,1));
for(const pre of ['V','I']){const ids=items.filter(x=>x.id[0]===pre).map(x=>x.id);
 for(let k=0;k*40<ids.length;k++){const lst=ids.slice(k*40,k*40+40);const inputs=lst.flatMap(id=>['-i',path.join(out,id+'.jpg')]);
  execFileSync(ff,['-v','error','-y',...inputs,'-filter_complex',lst.map((_,j)=>`[${j}]`).join('')+`xstack=inputs=${lst.length}:layout=${lst.map((_,j)=>`${(j%10)*220}_${Math.floor(j/10)*240}`).join('|')}:fill=black`,path.join(out,`sheet_${pre}${k+1}.jpg`)]);}}
console.log(items.length);
