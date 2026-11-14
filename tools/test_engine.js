const D=require('../src/data.js'), HC=require('../src/engine.js');
const user=process.argv[2]||'KC';
let G=HC.newLeague(D,user,'Test Coach');
function playSeason(){
 let tot={pts:0,g:0,ties:0};
 for(let w=1;w<=18;w++){
  const ev=G.user.pendingEvent; if(ev) HC.applyChoice(G,ev,w%ev.ch.length);
  // vary the position practice plan
  const pl=G.user.plan; HC.PGROUPS.forEach((g,i)=>{ pl.int[g.k]=['light','normal','hard'][(w+i)%3]; pl.drill[g.k]=g.drills[(w+i)%g.drills.length][0]; });
  pl.gp=w%3===0?1:0; pl.cond=w%4===0?1:0; if(HC.planHours(pl)>HC.PRAC_BUDGET){pl.gp=0;pl.cond=0;}
  const g=HC.userGame(G);
  if(g){ const gs=HC.newGame(G,g.h,g.a); let n=0; while(!gs.over&&n++<500){ HC.runPlay(G,gs,HC.aiOffCall(G,gs),HC.aiDefCall(G,gs)); } HC.recordUserGame(G,gs); if(G.user.pressPending){HC.applyChoice(G,G.user.pressPending,1);G.user.pressPending=null;} }
  // contracts: try FA sign + release + extension
  if(w===3){ const fa=HC.faList(G)[0]; const ask=HC.askFor(G,fa,user); const rel=HC.teamPlayers(G,user).sort((a,b)=>a.ovr-b.ovr)[0]; HC.release(G,rel); console.log('offer',HC.offer(G,fa,user,ask.sal,ask.yrs).msg); const ex=HC.teamPlayers(G,user).find(p=>p.yrs===1&&p.ovr>70); if(ex){const a2=HC.askFor(G,ex,user);console.log('ext',HC.offer(G,ex,user,Math.round(a2.sal*.9),a2.yrs).msg, HC.offer(G,ex,user,a2.sal+500,a2.yrs).msg);} }
  if(w===2){ const other=G.order.find(ab=>ab!==user&&HC.direction(G,ab)==='rebuild')||G.order.find(ab=>ab!==user);
    const myPk=HC.teamPicks(G,user).find(k=>k.r===1&&k.yr===G.season+1);
    const tp=HC.teamPlayers(G,other).filter(p=>p.ovr>=74&&p.age>=27).sort((a,b)=>b.ovr-a.ovr)[0];
    if(myPk&&tp){ let o={a:user,b:other,aGive:{pl:[],pk:[myPk.id]},bGive:{pl:[tp.id],pk:[]}}; let r=HC.proposeTrade(G,o); if(!r.ok&&r.counter){ r=HC.proposeTrade(G,r.counter);} console.log('trade try',tp.pos,tp.ln,'from',other,':',r.msg);
      if(r.ok){ if(G.players[tp.id].tm!==user) throw new Error('player did not move'); if(G.picks.find(k=>k.id===myPk.id).own!==other) throw new Error('pick did not move'); G.__traded=myPk; } }
    // put the worst-morale player on the block
    const bl=HC.teamPlayers(G,user).sort((a,b)=>a.mor-b.mor)[0]; bl.block=1; }
  if(w===9){ const o=G.user.offers&&G.user.offers[0]; if(o){ console.log('block offer:',HC.respondOffer(G,o.id,true)); } }
  if(w===10){ const p1=HC.teamPlayers(G,user)[0], p2=HC.teamPlayers(G,'KC')[0]; const err=HC.validateTrade(G,{a:user,b:'KC',aGive:{pl:[p1.id],pk:[]},bGive:{pl:[p2.id],pk:[]}}); if(!/deadline/.test(err)) throw new Error('deadline not enforced'); }
  HC.advanceWeek(G);
 }
 G.sched.forEach(wk=>wk.forEach(g=>{tot.pts+=g.hs+g.as;tot.g++; if(g.hs===g.as)tot.ties++;}));
 console.log('avg pts/team',(tot.pts/tot.g/2).toFixed(1),'ties',tot.ties,'games',tot.g);
 const st=HC.standings(G); console.log(st.slice(0,6).map(t=>t.ab+' '+HC.rec(t)).join(', '),' ... ',st.slice(-3).map(t=>t.ab+' '+HC.rec(t)).join(', '));
 console.log('user',user,HC.rec(G.teams[user]),'chem',G.teams[user].chem.toFixed(1),'disc',G.user.disc,'unity',G.user.unity,'cap space',HC.fmtM(HC.capSpace(G,user)));
 ['py','ptd','int','ry','recy','sck','dint','fgm'].forEach(k=>console.log(k,HC.leaders(G,k,3).map(p=>p.ln+'('+p.tm+') '+p.st[k]).join(', ')));
 const rpt=G.user.lastReport.map(r=>G.players[r.id].ln+' '+r.d.toFixed(2)); console.log('dev',rpt.join(', '));
 let g2=0; while(G.phase==='playoffs'&&g2++<10){ const ug=HC.userGame(G); if(ug){const gs=HC.newGame(G,ug.h,ug.a,{playoff:true,neutral:ug.neutral}); HC.simToEnd(G,gs); HC.recordUserGame(G,gs);} HC.advancePlayoffs(G); }
 console.log('champ',G.playoffs.champ,'phase',G.phase, 'rounds', G.playoffs.rounds.map(r=>r.map(g=>g.a+' '+g.as+'@'+g.h+' '+g.hs).join(' | ')).join('\n  '));
 // ---- free agency period ----
 if(G.phase!=='freeagency') throw new Error('expected freeagency after SB, got '+G.phase);
 const fa0=HC.faList(G).filter(p=>p.ovr>=70).length; let bids=0, signedMine=0;
 while(G.phase==='freeagency'){
   const tgt=HC.faList(G).filter(p=>p.ovr>=68).slice(0,2);
   tgt.forEach(p=>{const a=HC.askFor(G,p,user); const r=HC.offer(G,p,user,a.sal,a.yrs); bids++; if(r.ok) signedMine++;});
   HC.advanceFA(G); G.fa&&G.fa.results&&G.fa.results.forEach(x=>{if(x.ok)signedMine++;});
 }
 const aiSigned=G.news.filter(n=>/^SIGNED/.test(n.s)).length;
 console.log('FA: 70+ on market',fa0,'still unsigned 70+',HC.faList(G).filter(p=>p.ovr>=70).length,'AI rosters',Math.min(...G.order.map(a=>HC.teamPlayers(G,a).length))+'-'+Math.max(...G.order.map(a=>HC.teamPlayers(G,a).length)),'user bids',bids,'user signed',signedMine,'signing news',aiSigned,'phase',G.phase,'caps ok',G.order.every(ab=>HC.capUsed(G,ab)<=G.cap*1.02));
 // traded pick honoured in draft order
 const tr=G.tradeLog?G.tradeLog.length:0; console.log('trades so far',tr);
 G.draft.order.filter(o=>o.orig!==o.ab).slice(0,3).forEach(o=>console.log('  traded pick R'+o.r+' #'+o.n+' orig '+o.orig+' -> '+o.ab));
 G.dclass.slice(0,20).forEach(id=>HC.scout(G,G.players[id]));
 let n=0; while(G.phase==='draft'&&n++<400){ HC.simDraftToUser(G); if(G.phase!=='draft')break; const best=G.dclass.find(id=>G.players[id].tm==='DRAFT'); HC.draftPlayer(G,best); }
 console.log('after draft phase',G.phase,'user roster',HC.teamPlayers(G,user).length, 'top 3 picks', G.draft.order.slice(0,3).map(o=>o.ab+':'+G.players[o.pid].pos+' '+G.players[o.pid].ovr));
 const r=HC.newSeason(G); console.log('new season',G.season,'left',r.left.length,'retired',r.retired.length,'roster',HC.teamPlayers(G,user).length,'cap used',HC.fmtM(HC.capUsed(G,user)),'min roster',Math.min(...G.order.map(a=>HC.teamPlayers(G,a).length)),'max',Math.max(...G.order.map(a=>HC.teamPlayers(G,a).length)));
}
playSeason();
const s=JSON.stringify(G); console.log('save size KB',(s.length/1024).toFixed(0));
G=JSON.parse(s); playSeason();
// practice planner sanity: drill focus grows targeted attributes faster
{
 const G2=HC.newLeague(D,'DET','Drill Test'); const qbs=HC.teamPlayers(G2,'DET'); const pl=G2.user.plan;
 HC.PGROUPS.forEach(g=>{pl.hrs[g.k]=g.def;pl.int[g.k]='normal';pl.drill[g.k]='bal';}); pl.hrs.OL=8; pl.int.OL='hard'; pl.drill.OL='pass'; pl.hrs.QB=1;
 const ol=qbs.filter(p=>['OT','G','C'].includes(p.pos)), b=ol.map(p=>({pb:p.a.PBK,rb:p.a.RBK}));
 for(let w=0;w<10;w++){ G2.user.pendingEvent=null; const g=HC.userGame(G2); if(g){const gs=HC.quickSim(G2,g.h,g.a); HC.recordUserGame(G2,gs); G2.user.pressPending=null;} HC.advanceWeek(G2); }
 let dpb=0,drb=0; ol.forEach((p,i)=>{dpb+=p.a.PBK-b[i].pb; drb+=p.a.RBK-b[i].rb;});
 const fat=HC.avg(ol.map(p=>p.fat));
 console.log('OL pass-pro drill 10 wks: PBK +'+(dpb/ol.length).toFixed(2)+' vs RBK +'+(drb/ol.length).toFixed(2)+' avg fatigue '+fat.toFixed(0));
 if(!(dpb>drb)) throw new Error('drill focus did not favor PBK');
 const rep=G2.user.prac; if(!rep||!rep.groups.OL) throw new Error('no practice report'); console.log('report groups',Object.keys(rep.groups).join(','));
 const chars={}; Object.values(G2.players).forEach(p=>{chars[p.pers]=(chars[p.pers]||0)+1;}); console.log('personality mix',JSON.stringify(chars));
}
// old save (pre-practice-planner) migrates and keeps playing
const fs=require('fs'); if(fs.existsSync('/workspace/hc_old/old_save.json')){
 const O=JSON.parse(fs.readFileSync('/workspace/hc_old/old_save.json','utf8')); if(O.user.plan) throw new Error('old save already has plan?');
 HC.migrate(O); for(let w=0;w<3;w++){O.user.pendingEvent=null; const g=HC.userGame(O); if(g){const gs=HC.quickSim(O,g.h,g.a); HC.recordUserGame(O,gs); O.user.pressPending=null;} HC.advanceWeek(O);}
 console.log('old save migrated: week',O.week,'plan hrs',HC.planHours(O.user.plan),'report',!!O.user.prac,'sample',(p=>p.ln+' '+p.pers+' eth'+p.eth+' clu'+p.clu)(HC.teamPlayers(O,O.user.ab)[0]));
}
console.log('OK');
