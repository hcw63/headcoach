const D=require('../src/data.js'), HC=require('../src/engine.js');
let G=HC.newLeague(D,'KC','T');
let agg={plays:0,pass:0,comp:0,py:0,rush:0,ry:0,sack:0,int:0,pts:0,g:0,fga:0,fgm:0,punt:0,td:0,to:0,games:[]};
const teams=G.order;
for(let i=0;i<300;i++){const h=teams[i%32],a=teams[(i*7+3)%32]; if(h===a)continue; const gs=HC.newGame(G,h,a); HC.simToEnd(G,gs); for(const id in G.players)G.players[id].inj=0;
 agg.g++; agg.pts+=gs.sc[h]+gs.sc[a];
 gs.log.forEach(l=>{ if(!l.oc)return; agg.plays++; const k=l.anim&&l.anim.kind;
  if(l.oc.startsWith('RUN')){agg.rush++;agg.ry+=l.yards;}
  else if(['PASS_S','PASS_M','PASS_D','SCREEN','PA'].includes(l.oc)){ if(k==='sack')agg.sack++; else {agg.pass++; if(k==='pass'&&l.anim.comp){agg.comp++;agg.py+=l.yards;} if(k==='int')agg.int++;} }
  else if(l.oc==='FG'){agg.fga++; if(l.anim.good)agg.fgm++;} else if(l.oc==='PUNT')agg.punt++;
  if(l.td)agg.td++; if(l.to)agg.to++;});
}
const g=agg.g*2;
console.log('ppg',(agg.pts/g).toFixed(1),'plays/team',(agg.plays/g).toFixed(1),'pass att',(agg.pass/g).toFixed(1),'comp%',(agg.comp/agg.pass*100).toFixed(1),'ypa',(agg.py/agg.pass).toFixed(2),'rush',(agg.rush/g).toFixed(1),'ypc',(agg.ry/agg.rush).toFixed(2),'sacks',(agg.sack/g).toFixed(2),'int',(agg.int/g).toFixed(2),'fga',(agg.fga/g).toFixed(2),'fg%',(agg.fgm/agg.fga*100).toFixed(0),'punts',(agg.punt/g).toFixed(2),'td',(agg.td/g).toFixed(2),'to',(agg.to/g).toFixed(2));
// unit spread
const u=teams.map(t=>{const U=HC.units(G,t,false);return [t,...['pass','recv','pblk','rblk','rush','prs','rdef','cov'].map(k=>U[k].toFixed(0))].join(' ')});
console.log(u.slice(0,6).join('\n'));
