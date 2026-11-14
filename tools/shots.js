const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  const clr = () => p.evaluate(() => document.querySelectorAll('#ov').forEach(o => o.remove()));
  const D = 'screenshots/';
  await p.goto('file:///workspace/headcoach/headcoach.html'); await p.waitForTimeout(400);
  await p.screenshot({ path: D + 'title.png' });
  await p.click('[data-act=newc]'); await p.waitForTimeout(300);
  await p.click('[data-act=pickteam][data-arg=DET]'); await p.fill('#coachName', 'Howard Wentworth'); await p.waitForTimeout(300);
  await p.screenshot({ path: D + '1_team_select.png' });
  await p.click('[data-act=start]'); await p.waitForTimeout(900);
  await p.screenshot({ path: D + 'team_meeting.png' });
  await p.click('.choice'); await p.waitForTimeout(400); await clr();
  // quick-sim 3 weeks for some data
  await p.evaluate(() => { for (let i = 0; i < 3; i++) { const G = UI.state().G; if (G.user.pendingEvent) { UI.state().S.evCtx = { ev: G.user.pendingEvent }; UI.act('choose', '1'); } document.querySelectorAll('#ov').forEach(o => o.remove()); const g = HC.userGame(G); if (g && g.hs === null) { UI.act('quicksim'); } else UI.act('advance'); document.querySelectorAll('#ov').forEach(o => o.remove()); if (G.user.pressPending) { G.user.pressPending = null; HC.advanceWeek(G); } } UI.go('dash'); });
  await p.waitForTimeout(500); await clr();
  await p.evaluate(() => { const G = UI.state().G; if (G.user.pendingEvent) { UI.state().S.evCtx = { ev: G.user.pendingEvent }; UI.act('choose', '0'); } document.querySelectorAll('#ov').forEach(o => o.remove()); UI.go('dash'); });
  await p.waitForTimeout(500); await clr();
  await p.screenshot({ path: D + '2_dashboard.png' });
  for (const s of ['cap', 'roster', 'depth', 'practice', 'locker', 'fa', 'draft', 'stand']) { await p.evaluate(s => UI.go(s), s); await p.waitForTimeout(350); await p.screenshot({ path: D + 'fo_' + s + '.png' }); }
  await p.evaluate(() => UI.go('roster')); await p.waitForTimeout(200);
  await p.click('tr.cl'); await p.waitForTimeout(300); await p.screenshot({ path: D + 'player_card.png' });
  await p.click('.mf [data-act=negotiate]'); await p.waitForTimeout(300);
  await p.evaluate(() => { const s = document.querySelector('#negSal'); s.value = Math.round(s.min * 1.05); s.oninput(); }); await p.click('[data-act=negoffer]'); await p.waitForTimeout(300);
  await p.screenshot({ path: D + '3_contract_negotiation.png' }); await clr();
  // game day
  await p.evaluate(() => UI.go('dash')); await p.waitForTimeout(300); await clr();
  await p.click('[data-act=play]'); await p.waitForTimeout(700);
  await p.evaluate(() => { const s = UI.state().S; for (let i = 0; i < 3; i++) HC.simDrive(UI.state().G, s.gs); UI.act('gdrive'); });
  await p.waitForTimeout(300);
  for (let i = 0; i < 4; i++) { const btns = await p.$$('[data-act=call]:not([disabled])'); if (btns.length) await btns[[3, 4, 0, 5][i] % btns.length].click(); await p.waitForTimeout(2700); }
  const btns = await p.$$('[data-act=call]:not([disabled])'); if (btns.length) await btns[Math.min(4, btns.length - 1)].click();
  await p.waitForTimeout(900);
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.screenshot({ path: D + '4_game_day.png' });
  await p.waitForTimeout(2500);
  await p.click('[data-act=gtab][data-arg=box]'); await p.click('[data-act=gend]'); await p.waitForTimeout(500);
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.screenshot({ path: D + 'game_final.png' });
  console.log('errors', errs);
  await b.close();
})();
