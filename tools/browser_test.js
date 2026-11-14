const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  p.on('dialog', d => d.accept());
  await p.goto('file:///workspace/headcoach/headcoach.html');
  await p.waitForTimeout(500);
  await p.screenshot({ path: 'shot_title.png' });
  await p.click('[data-act=newc]');
  await p.waitForTimeout(400);
  await p.click('[data-act=pickteam][data-arg=DET]');
  await p.fill('#coachName', 'Howard Wentworth');
  await p.waitForTimeout(300);
  await p.screenshot({ path: 'shot_team_select.png' });
  await p.click('[data-act=start]');
  await p.waitForTimeout(900);
  await p.screenshot({ path: 'shot_event.png' });
  // resolve event
  if (await p.$('.choice')) await p.click('.choice');
  await p.waitForTimeout(500);
  await p.evaluate(() => document.querySelectorAll('#ov').forEach(o => o.remove()));
  await p.screenshot({ path: 'shot_dashboard.png', fullPage: false });
  for (const s of ['roster', 'depth', 'cap', 'fa', 'trade', 'practice', 'locker', 'draft', 'sched', 'stand', 'leaders', 'saves', 'about']) {
    await p.click(`[data-act=nav][data-arg=${s}]`); await p.waitForTimeout(150);
  }
  await p.click('[data-act=nav][data-arg=roster]'); await p.waitForTimeout(200);
  await p.screenshot({ path: 'shot_roster.png' });
  await p.click('tr.cl'); await p.waitForTimeout(300);
  await p.screenshot({ path: 'shot_player.png' });
  await p.click('[data-act=negotiate]'); await p.waitForTimeout(300);
  await p.click('[data-act=negoffer]'); await p.waitForTimeout(300);
  await p.screenshot({ path: 'shot_negotiate.png' });
  if (await p.$('.modal [data-act=close]')) await p.click('.modal [data-act=close]');
  await p.click('[data-act=nav][data-arg=dash]'); await p.waitForTimeout(300);
  await p.click('[data-act=play]'); await p.waitForTimeout(800);
  // call several plays with animation
  for (let i = 0; i < 6; i++) {
    const btns = await p.$$('[data-act=call]:not([disabled])');
    if (!btns.length) { await p.waitForTimeout(600); continue; }
    await btns[Math.min(i % 5, btns.length - 1)].click();
    await p.waitForTimeout(i === 5 ? 700 : 2600);
  }
  await p.evaluate(() => window.scrollTo(0, 0)); await p.screenshot({ path: 'shot_gameday_anim.png' });
  await p.waitForTimeout(2500);
  await p.evaluate(() => window.scrollTo(0, 0)); await p.screenshot({ path: 'shot_gameday.png' });
  await p.click('[data-act=gdrive]'); await p.waitForTimeout(400);
  await p.click('[data-act=gtab][data-arg=box]'); await p.waitForTimeout(200);
  await p.click('[data-act=gend]'); await p.waitForTimeout(600);
  await p.evaluate(() => window.scrollTo(0, 0)); await p.screenshot({ path: 'shot_final.png' });
  await p.click('[data-act=gfinish]'); await p.waitForTimeout(600);
  if (await p.$('.choice')) { await p.click('.choice'); await p.waitForTimeout(600); }
  // fast-forward the season via UI actions
  const r = await p.evaluate(() => {
    const out = [];
    let guard = 0;
    while (UI.state().G.phase === 'regular' && guard++ < 40) {
      const G = UI.state().G;
      document.querySelectorAll('#ov').forEach(o => o.remove());
      if (G.user.pendingEvent) { UI.state().S.evCtx = { ev: G.user.pendingEvent, isPress: false }; UI.act('choose', '0'); }
      document.querySelectorAll('#ov').forEach(o => o.remove());
      const g = HC.userGame(G);
      if (g && g.hs === null) { UI.act('quicksim'); if (G.user.pressPending) { UI.state().S.evCtx = { ev: G.user.pressPending, isPress: true, after: null }; UI.act('choose', '0'); HC.advanceWeek(G); } }
      else UI.act('advance');
    }
    out.push('after reg: ' + UI.state().G.phase + ' ' + HC.rec(UI.state().G.teams.DET));
    return out;
  });
  console.log(r);
  await p.click('[data-act=nav][data-arg=dash]'); await p.waitForTimeout(300);
  await p.screenshot({ path: 'shot_playoffs.png' });
  const r2 = await p.evaluate(() => {
    const G = UI.state().G; let g = 0;
    while (G.phase === 'playoffs' && g++ < 10) { document.querySelectorAll('#ov').forEach(o => o.remove()); const ug = HC.userGame(G); if (ug && ug.hs === null) { UI.act('quicksim'); document.querySelectorAll('#ov').forEach(o => o.remove()); if (G.user.pressPending) { G.user.pressPending = null; HC.advancePlayoffs(G); } } else UI.act('simround'); }
    return G.phase + ' champ ' + (G.playoffs && G.playoffs.champ);
  });
  console.log(r2);
  // free agency period via the UI: bid on two players each day, then end the day
  const rfa = await p.evaluate(() => {
    const G = UI.state().G; const out = []; let g = 0;
    UI.go('fa');
    while (G.phase === 'freeagency' && g++ < 10) {
      document.querySelectorAll('#ov').forEach(o => o.remove());
      HC.faList(G).filter(x => x.ovr >= 70).slice(0, 2).forEach(pl => { UI.act('negotiate', pl.id); UI.act('negask'); document.querySelectorAll('#ov').forEach(o => o.remove()); });
      UI.act('faday');
    }
    return 'after FA: ' + G.phase + ' roster ' + HC.teamPlayers(G, G.user.ab).length;
  });
  console.log(rfa);
  await p.evaluate(() => { document.querySelectorAll('#ov').forEach(o => o.remove()); UI.go('dash'); });
  await p.waitForTimeout(300);
  // scout a couple and draft
  await p.evaluate(() => { const G = UI.state().G; G.dclass.slice(0, 5).forEach(id => UI.act('scout', id)); document.querySelectorAll('#ov').forEach(o => o.remove()); UI.act('dsim'); });
  await p.waitForTimeout(300);
  await p.screenshot({ path: 'shot_draft.png' });
  const r3 = await p.evaluate(() => { const G = UI.state().G; let g = 0; while (G.phase === 'draft' && g++ < 20) { const o = G.draft.order[G.draft.cur]; if (o.ab === G.user.ab) UI.act('dauto'); else UI.act('dsim'); } UI.go('dash'); return G.phase; });
  console.log('after draft', r3);
  await p.waitForTimeout(300);
  await p.screenshot({ path: 'shot_offseason.png' });
  await p.click('[data-act=newseason]'); await p.waitForTimeout(800);
  await p.evaluate(() => document.querySelectorAll('#ov').forEach(o => o.remove()));
  await p.screenshot({ path: 'shot_season2.png' });
  const r4 = await p.evaluate(() => { const G = UI.state().G; UI.act('save'); return G.season + ' ' + G.phase + ' week ' + G.week + ' roster ' + HC.teamPlayers(G, G.user.ab).length + ' saveKB ' + Math.round(localStorage.getItem('headcoach26_save_v1').length / 1024); });
  console.log(r4);
  await p.reload(); await p.waitForTimeout(500);
  await p.click('[data-act=cont]'); await p.waitForTimeout(500);
  console.log('continued:', await p.evaluate(() => UI.state().G.season + ' ' + UI.state().S.screen));
  console.log('ERRORS', errs.length, errs.slice(0, 10));
  await b.close();
})();
