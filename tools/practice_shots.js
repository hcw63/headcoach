// iPad-size screenshots of the practice planner/report, player card and locker room; plus old-save load check.
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
  await p.goto('file:///workspace/headcoach/headcoach.html');
  // 1) old save from the previous build must load
  const old = fs.readFileSync('/workspace/hc_old/old_save.json', 'utf8');
  await p.evaluate(s => localStorage.setItem('headcoach26_save_v1', s), old);
  await p.reload(); await p.waitForTimeout(400);
  await p.tap('[data-act=cont]'); await p.waitForTimeout(600);
  const oldInfo = await p.evaluate(() => { const G = UI.state().G; return { week: G.week, team: G.teams[G.user.ab].name, plan: !!G.user.plan, hrs: HC.planHours(G.user.plan), screen: UI.state().S.screen }; });
  console.log('old save loaded:', JSON.stringify(oldInfo));
  await p.evaluate(() => document.querySelectorAll('#ov').forEach(o => o.remove()));
  // 2) planner interactions by tap
  await p.tap('[data-act=nav][data-arg=practice]'); await p.waitForTimeout(300);
  await p.tap('[data-act=pauto]'); await p.waitForTimeout(300);
  await p.tap('[data-act=phrs][data-arg="QB:-1"]'); await p.waitForTimeout(150);
  await p.tap('[data-act=phrs][data-arg="OL:1"]'); await p.waitForTimeout(150);
  await p.tap('[data-act=pdrill][data-arg="OL:pass"]'); await p.waitForTimeout(150);
  await p.tap('[data-act=pdrill][data-arg="QB:pocket"]'); await p.waitForTimeout(150);
  await p.tap('[data-act=pint][data-arg="DL:hard"]'); await p.waitForTimeout(150);
  await p.tap('[data-act=pdrill][data-arg="DL:rush"]'); await p.waitForTimeout(150);
  await p.tap('[data-act=pint][data-arg="CB:light"]'); await p.waitForTimeout(150);
  await p.tap('[data-act=pdrill][data-arg="WR:release"]'); await p.waitForTimeout(150);
  await p.tap('[data-act=pdrill][data-arg="RB:ballsec"]'); await p.waitForTimeout(150);
  const plan = await p.evaluate(() => JSON.stringify(UI.state().G.user.plan));
  console.log('plan after taps:', plan);
  // play this week + two more so the report has trends
  await p.evaluate(() => {
    const G = UI.state().G;
    for (let i = 0; i < 3; i++) {
      document.querySelectorAll('#ov').forEach(o => o.remove());
      G.user.pendingEvent = null;
      const g = HC.userGame(G); if (g && g.hs === null) { const gs = HC.quickSim(G, g.h, g.a); HC.recordUserGame(G, gs); }
      G.user.pressPending = null; UI.act('advance');
    }
    document.querySelectorAll('#ov').forEach(o => o.remove());
    UI.go('practice');
  });
  await p.waitForTimeout(900);
  await p.evaluate(() => { document.querySelectorAll('#ov').forEach(o => o.remove()); window.scrollTo(0, 0); });
  await p.waitForTimeout(200);
  await p.screenshot({ path: D + 'practice_planner.png' });
  await p.screenshot({ path: D + 'practice_planner_full.png', fullPage: true });
  await p.tap('[data-act=ptab][data-arg=report]'); await p.waitForTimeout(400);
  await p.screenshot({ path: D + 'practice_report.png' });
  await p.screenshot({ path: D + 'practice_report_full.png', fullPage: true });
  await p.tap('[data-act=ptab][data-arg=prog]'); await p.waitForTimeout(300);
  await p.screenshot({ path: D + 'practice_progress.png' });
  // player card: QB starter
  await p.evaluate(() => { const G = UI.state().G; UI.act('player', G.teams[G.user.ab].depth.QB[0]); });
  await p.waitForTimeout(400);
  await p.screenshot({ path: D + 'player_card.png' });
  await p.evaluate(() => { const m = document.querySelector('.modal'); m.scrollTop = 520; });
  await p.waitForTimeout(200);
  await p.screenshot({ path: D + 'player_card_character.png' });
  await p.evaluate(() => document.querySelectorAll('.toast').forEach(t => t.remove()));
  await p.evaluate(() => document.querySelectorAll('#ov').forEach(o => o.remove()));
  // locker room character view
  await p.tap('[data-act=nav][data-arg=locker]'); await p.waitForTimeout(400);
  await p.evaluate(() => { const el = [...document.querySelectorAll('h3')].find(h => /Character/.test(h.textContent)); el && el.scrollIntoView(); window.scrollBy(0, -90); });
  await p.waitForTimeout(200);
  await p.screenshot({ path: D + 'locker_room_character.png' });
  // roster with character columns, attitude filter
  await p.tap('[data-act=nav][data-arg=roster]'); await p.waitForTimeout(300);
  await p.screenshot({ path: D + 'roster_character.png' });
  await p.tap('[data-act=cfilter][data-arg=Attitude]'); await p.waitForTimeout(300);
  await p.tap('th[data-act=sort][data-arg=clu]'); await p.waitForTimeout(300);
  await p.screenshot({ path: D + 'roster_attitude_filter.png' });
  // check crunch-time / flag text exists somewhere in a simulated game log
  const pbp = await p.evaluate(() => { const G = UI.state().G; let hero = 0, flag = 0, rat = 0; for (let i = 0; i < 12; i++) { const gs = HC.newGame(G, 'KC', 'BUF', { playoff: true }); HC.simToEnd(G, gs); gs.log.forEach(l => { if (/crunch time|big moment|ice cold/.test(l.t)) hero++; if (/FLAG/.test(l.t)) flag++; if (/rattled/.test(l.t)) rat++; }); } return { hero, flag, rat }; });
  console.log('12 sim games: clutch callouts', pbp.hero, 'attitude flags', pbp.flag, 'rattled', pbp.rat);
  console.log('ERRORS', errs.length, errs.slice(0, 10));
  await b.close();
})();
