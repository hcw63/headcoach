const D=require('../src/data.js'), HC=require('../src/engine.js');
const user=process.argv[2]||'KC';
let G=HC.newLeague(D,user,'Test Coach');
function playSeason(){
 let tot={pts:0,g:0,ties:0};
 for(let w=1;w<=18;w++){
  const ev=G.user.pendingEvent; if(ev) HC.applyChoice(G,ev,w%ev.ch.length);
  G.user.focus=['balanced','offense','defense','young','conditioning','gameplan'][w%6];
  const g=HC.userGame(G);
  if(g){ const gs=HC.newGame(G,g.h,g.a); let n=0; while(!gs.over&&n++<500){ HC.runPlay(G,gs,HC.aiOffCall(G,gs),HC.aiDefCall(G,gs)); } HC.recordUserGame(G,gs); if(G.user.pressPending){HC.applyChoice(G,G.user.pressPending,1);G.user.pressPending=null;} }
  // contracts: try FA sign + release + extension
  if(w===3){ const fa=HC.faList(G)[0]; const ask=HC.askFor(G,fa,user); const rel=HC.teamPlayers(G,user).sort((a,b)=>a.ovr-b.ovr)[0]; HC.release(G,rel); console.log('offer',HC.offer(G,fa,user,ask.sal,ask.yrs).msg); const ex=HC.teamPlayers(G,user).find(p=>p.yrs===1&&p.ovr>70); if(ex){const a2=HC.askFor(G,ex,user);console.log('ext',HC.offer(G,ex,user,Math.round(a2.sal*.9),a2.yrs).msg, HC.offer(G,ex,user,a2.sal+500,a2.yrs).msg);} }
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
 G.dclass.slice(0,20).forEach(id=>HC.scout(G,G.players[id]));
 let n=0; while(G.phase==='draft'&&n++<400){ HC.simDraftToUser(G); if(G.phase!=='draft')break; const best=G.dclass.find(id=>G.players[id].tm==='DRAFT'); HC.draftPlayer(G,best); }
 console.log('after draft phase',G.phase,'user roster',HC.teamPlayers(G,user).length, 'top 3 picks', G.draft.order.slice(0,3).map(o=>o.ab+':'+G.players[o.pid].pos+' '+G.players[o.pid].ovr));
 const r=HC.newSeason(G); console.log('new season',G.season,'left',r.left.length,'retired',r.retired.length,'roster',HC.teamPlayers(G,user).length,'cap used',HC.fmtM(HC.capUsed(G,user)),'min roster',Math.min(...G.order.map(a=>HC.teamPlayers(G,a).length)),'max',Math.max(...G.order.map(a=>HC.teamPlayers(G,a).length)));
}
playSeason();
const s=JSON.stringify(G); console.log('save size KB',(s.length/1024).toFixed(0));
G=JSON.parse(s); playSeason();
console.log('OK');
