const fs=require('fs');
const rows=fs.readFileSync(process.argv[2],'utf8').trim().split('\n').map(l=>{const a=l.split(',');return{t:+a[0],w:a[1],b:[+a[2],+a[3],+a[4]]}}).filter(r=>r.w!=='-');
const map={G:[[0,'godhuman','Z - Soaring Beast','z'],[1,'godhuman','X - Heaven and Earth','x'],[2,'godhuman','C - Sixth Realm Gun','c']],
 C:[[1,'cdk','Z - Revolving Ravager','z'],[2,'cdk','X - Slayer of Goliath','x']],
 S:[[1,'soul guitar','Z - Soul Shaker','z'],[2,'soul guitar','X - El Diablo','x']]};
const FULL=480,ev=[];
for(const w in map)for(const [s,folder,sub,key] of map[w]){
 let active=null,prev=null;
 for(const r of rows){
  const full=r.w===w&&r.b[s]>=FULL;
  if(full&&!active&&prev&&prev.w===w&&prev.b[s]<FULL)active={start:r.t};
  if(active&&!full){active.end=r.t;if(active.end-active.start>=0.2)ev.push({folder,sub,key,...active});active=null;}
  prev=r;}
 if(active){active.end=rows[rows.length-1].t;ev.push({folder,sub,key,...active});}
}
ev.sort((a,b)=>a.start-b.start);
console.log(JSON.stringify(ev));
