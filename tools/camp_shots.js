// iPad-size (1180x820, touch) run-through of training camp, preseason, cutdown and day-by-day practice, with screenshots.
const { chromium } = require('playwright-core');
const fs = require('fs');
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, hasTouch: true, isMobile: false });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  p.on('dialog', d => d.accept());
  const D = '/workspace/headcoach/screenshots/';
  const clean = () => p.evaluate(() => { document.querySelectorAll('#ov,.toast').forEach(o => o.remove()); });
  const tap = async (sel, w) => { await clean(); await p.tap(sel); await p.waitForTimeout(w || 250); };
  const shot = async (name, full) => { await clean(); await p.waitForTimeout(150); await p.screenshot({ path: D + name, fullPage: !!full }); console.log('shot', name); };
  const info = () => p.evaluate(() => { const G = UI.state().G, S = UI.state().S; return { phase: G.phase, day: G.camp && G.camp.day, type: G.camp && G.camp.days[G.camp.day].t, week: G.week, roster: HC.teamPlayers(G, G.user.ab).length, screen: S.screen }; });
  await p.goto('file:///workspace/headcoach/headcoach.html');
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(300);
  // new career at training camp
  await tap('[data-act=newc]', 600);
  await tap('[data-act=pickteam][data-arg=WSH]', 300);
  await p.fill('#coachName', 'Howard Wentworth');
  await tap('[data-act=startmode][data-arg=camp]');
  await tap('[data-act=start][data-arg=WSH]', 900);
  console.log('started', JSON.stringify(await info()));
  // plan a few days by tap
  await tap('[data-act=csel][data-arg="3"]'); await tap('[data-act=cday][data-arg="3:np"]');
  await tap('[data-act=csel][data-arg="8"]'); await tap('[data-act=cday][data-arg="8:off"]');
  await tap('[data-act=csel][data-arg="6"]'); await tap('[data-act=cplan][data-arg="c:6"]', 400);
  await tap('[data-act=pint][data-arg="QB:hard"]'); await tap('[data-act=pdrill][data-arg="QB:read"]');
  await p.evaluate(() => window.scrollTo(0, 0));
  await shot('camp_day_plan_editor.png');
  await tap('[data-act=cplandone]', 400);
  const custom = await p.evaluate(() => { const C = UI.state().G.camp; return { d3: C.days[3].t, d8: C.days[8].t, d6plan: !!C.days[6].plan, qb: C.days[6].plan && C.days[6].plan.int.QB, team: UI.state().G.user.plan.int.QB }; });
  console.log('custom days', JSON.stringify(custom));
  await tap('[data-act=csim][data-arg="1"]', 500);
  await tap('[data-act=csim][data-arg="1"]', 500);
  await tap('[data-act=csim][data-arg="7"]', 900);
  await tap('[data-act=csim][data-arg="1"]', 500);
  await tap('[data-act=csel][data-arg="11"]');
  await shot('camp_calendar.png');
  await tap('[data-act=ctab][data-arg=day]', 400);
  await shot('camp_day_report.png');
  await shot('camp_day_report_full.png', true);
  await tap('[data-act=ctab][data-arg=cal]');
  // to the first preseason game
  await tap('[data-act=csimg]', 1200);
  console.log('game day?', JSON.stringify(await info()));
  await tap('[data-act=csq][data-arg="2"]');
  await p.evaluate(() => { const g = document.querySelector('.gsetup'); if (g) { g.scrollIntoView({ block: 'start' }); window.scrollBy(0, -90); } });
  await shot('preseason_game_setup.png');
  await p.evaluate(() => window.scrollTo(0, 0));
  // coach it live (sim to end on the game screen)
  await tap('.camphd [data-act=play]', 1200);
  await p.waitForTimeout(400);
  await tap('[data-act=gend]', 800);
  await p.waitForSelector('[data-act=gfinish]', { timeout: 10000 });
  await tap('[data-act=gfinish]', 900);
  console.log('after PS1', JSON.stringify(await info()));
  await shot('preseason_results.png');
  // PS2 and PS3 quick sims, different playing time
  await tap('[data-act=ctab][data-arg=cal]');
  await tap('[data-act=csimg]', 1000); await tap('[data-act=csq][data-arg="1"]'); await tap('.gsetup [data-act=quicksim]', 900);
  // save + reload mid-camp
  await p.evaluate(() => UI.act('save')); await p.reload(); await p.waitForTimeout(400); await tap('[data-act=cont]', 700);
  console.log('reloaded mid-camp', JSON.stringify(await info()));
  await tap('[data-act=ctab][data-arg=cal]');
  await tap('[data-act=csimg]', 1000); await tap('[data-act=csq][data-arg="0"]'); await tap('.gsetup [data-act=quicksim]', 900);
  await tap('[data-act=ctab][data-arg=battles]', 400);
  await shot('camp_battles.png');
  await tap('[data-act=cdepth]', 400);
  await tap('[data-act=ctab][data-arg=pre]', 300);
  await shot('preseason_summary.png');
  await tap('[data-act=ctab][data-arg=cal]');
  await tap('[data-act=csimg]', 1000);
  console.log('cut day?', JSON.stringify(await info()));
  await tap('[data-act=nav][data-arg=dash]', 500);
  // cutdown: try confirm without enough cuts (button disabled), apply staff recs, change one
  await tap('[data-act=cstaff]', 500);
  const ids = await p.evaluate(() => { const G = UI.state().G; const c = G.camp.cuts; const keepers = HC.teamPlayers(G, G.user.ab).filter(x => c.indexOf(x.id) < 0 && x.pos === 'WR').sort((a, b) => a.ovr - b.ovr); const cutWR = G.camp.cuts.map(id => G.players[id]).filter(x => x.pos === 'WR').sort((a, b) => b.ovr - a.ovr)[0]; return { keepWR: cutWR && cutWR.id, cutWR: keepers[0] && keepers[0].id }; });
  if (ids.keepWR && ids.cutWR) { await tap('[data-act=cutf][data-arg=WR]'); await tap('[data-act=ccut][data-arg="' + ids.keepWR + '"]'); await tap('[data-act=ccut][data-arg="' + ids.cutWR + '"]'); }
  await tap('[data-act=cutf][data-arg=BUBBLE]', 300);
  await shot('cutdown.png');
  await tap('[data-act=cutf][data-arg=ALL]', 300);
  await shot('cutdown_full.png', true);
  await tap('[data-act=cconfirm]', 1200);
  console.log('after cutdown', JSON.stringify(await info()));
  // regular season: day-by-day strip
  await p.evaluate(() => { const G = UI.state().G; G.user.pendingEvent = null; UI.go('dash'); });
  await tap('[data-act=wday][data-arg="2"]'); // padded -> non-padded
  await tap('[data-act=wsim]', 400); await tap('[data-act=wsim]', 400); await tap('[data-act=wsim]', 400);
  await p.evaluate(() => { const c = [...document.querySelectorAll('.card')].find(x => /Day by Day/.test(x.textContent)); if (c) c.scrollIntoView({ block: 'center' }); });
  await shot('week_day_by_day.png');
  await p.evaluate(() => window.scrollTo(0, 0));
  const w1 = await p.evaluate(() => { const G = UI.state().G; return { d: G.user.wk.d, t: G.user.wk.t.join(','), rep: G.user.prac && G.user.prac.label }; });
  console.log('week strip', JSON.stringify(w1));
  await tap('[data-act=quicksim]', 900);
  const after1 = await p.evaluate(() => { const G = UI.state().G; return { week: G.week, rec: HC.rec(G.teams[G.user.ab]), wk: G.user.wk && G.user.wk.w }; });
  console.log('after week 1 game', JSON.stringify(after1));
  // rest of the season, playoffs, FA, draft, next camp via the UI actions
  const r2 = await p.evaluate(() => {
    const G = UI.state().G; let g = 0;
    while (G.phase === 'regular' && g++ < 40) { document.querySelectorAll('#ov').forEach(o => o.remove()); G.user.pendingEvent = null; const ug = HC.userGame(G); if (ug && ug.hs === null) { UI.act('quicksim'); document.querySelectorAll('#ov').forEach(o => o.remove()); if (G.user.pressPending) { G.user.pressPending = null; HC.advanceWeek(G); } } else UI.act('advance'); }
    g = 0; while (G.phase === 'playoffs' && g++ < 10) { document.querySelectorAll('#ov').forEach(o => o.remove()); const ug = HC.userGame(G); if (ug && ug.hs === null) { UI.act('quicksim'); document.querySelectorAll('#ov').forEach(o => o.remove()); if (G.user.pressPending) { G.user.pressPending = null; HC.advancePlayoffs(G); } } else UI.act('simround'); }
    g = 0; while (G.phase === 'freeagency' && g++ < 10) UI.act('faday');
    g = 0; while (G.phase === 'draft' && g++ < 30) { const o = G.draft.order[G.draft.cur]; if (o.ab === G.user.ab) UI.act('dauto'); else UI.act('dsim'); }
    UI.go('dash'); const ph = G.phase; UI.act('newseason');
    return ph + ' -> ' + G.phase + ' ' + G.season + ' camp roster ' + HC.teamPlayers(G, G.user.ab).length + ' saveKB ' + Math.round(JSON.stringify(G).length / 1024);
  });
  console.log('season 2:', r2);
  await tap('[data-act=csimg]', 1500);
  const r3 = await p.evaluate(() => { const G = UI.state().G; HC.campAuto(G); UI.act('save'); UI.go('dash'); return G.phase + ' week ' + G.week + ' season ' + G.season + ' roster ' + HC.teamPlayers(G, G.user.ab).length + ' saveKB ' + Math.round(localStorage.getItem('headcoach26_save_v1').length / 1024); });
  console.log('season 2 camp done:', r3);
  // old save (mid-season, before camp existed) just continues
  const old = fs.readFileSync('/workspace/hc_old/old_save.json', 'utf8');
  await p.evaluate(s => localStorage.setItem('headcoach26_save_v1', s), old);
  await p.reload(); await p.waitForTimeout(300); await tap('[data-act=cont]', 700);
  const o1 = await p.evaluate(() => { const G = UI.state().G; G.user.pendingEvent = null; const w = G.week; UI.act('quicksim'); document.querySelectorAll('#ov').forEach(o => o.remove()); if (G.user.pressPending) { G.user.pressPending = null; HC.advanceWeek(G); } UI.go('dash'); return 'old save: phase ' + G.phase + ' week ' + w + ' -> ' + G.week + ' daily ' + G.user.daily + ' strip ' + !!document.querySelector('.wstrip'); });
  console.log(o1);
  console.log('ERRORS', errs.length, JSON.stringify(errs.slice(0, 5)));
  await b.close();
})();
