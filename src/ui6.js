  // ---------- actions ----------
  function curTeamAb() { return G.user.ab; }
  var ACT = {
    newc: function () { tmpG = null; S.sel = null; go('select'); },
    cont: function () { if (load()) go('dash'); },
    about0: function () { document.body.insertAdjacentHTML('beforeend', '<div class="ov" id="ov"><div class="modal" style="width:min(940px,100%)"><div class="mb">' + aboutHtml() + '</div><div class="mf"><button class="btn" data-act="close">Close</button></div></div></div>'); },
    home: function () { go('title'); },
    pickteam: function (ab) { var i = $('#coachName'); if (i) S.coach = i.value; S.sel = ab; setTheme(ab); render(); },
    start: function (ab) { var i = $('#coachName'), name = (i && i.value.trim()) || 'Coach'; G = HC.newLeague(HC_DATA, ab, name); tmpG = null; setTheme(ab); save(true); go('dash'); },
    nav: function (s) { go(s); },
    save: function () { save(); },
    event: function () { openEvent(G.user.pendingEvent, false); },
    choose: function (i) {
      var c = S.evCtx; if (!c) return; closeOv();
      var out = HC.applyChoice(G, c.ev, +i);
      if (c.isPress) G.user.pressPending = null; else G.user.pendingEvent = null;
      toast('📌 ' + esc(c.ev.ch[+i].l));
      S.evCtx = null;
      if (c.after) { c.after(); }
      else render();
      out.forEach(function (o) { if (o[0] === 'negotiate') { S.neg = null; openNeg(o[1]); } });
    },
    play: function () { startGame(); },
    quicksim: function () {
      var g = HC.userGame(G); if (!g || g.hs !== null) return;
      var gs = HC.quickSim(G, g.h, g.a, G.phase === 'playoffs', g.neutral);
      HC.recordUserGame(G, gs);
      var me = G.user.ab, o = HC.other(gs, me);
      toast((gs.sc[me] > gs.sc[o] ? '✅ Win! ' : gs.sc[me] < gs.sc[o] ? '❌ Loss. ' : 'Tie. ') + G.teams[me].name + ' ' + gs.sc[me] + ', ' + G.teams[o].name + ' ' + gs.sc[o], 3500);
      postGameFlow();
    },
    advance: function () { HC.advanceWeek(G); save(true); go('dash'); },
    player: function (id) { openPlayer(id); },
    close: function () { closeOv(); },
    negotiate: function (id) { S.neg = null; openNeg(id); },
    negoffer: function () { negSubmit(); },
    negask: function () { var p = G.players[S.neg.id], a = HC.askFor(G, p, G.user.ab); S.neg.sal = a.sal; S.neg.yrs = a.yrs; negSubmit(); },
    release: function (id) {
      var p = G.players[id]; if (!p) return;
      if (!window.confirm('Release ' + p.fn + ' ' + p.ln + '?\nDead cap this season: ' + fmtM(HC.deadCap(p)) + '.')) return;
      HC.release(G, p); closeOv(); toast('Released ' + esc(p.fn + ' ' + p.ln)); render();
    },
    promote: function (id) { var p = G.players[id], dd = G.teams[G.user.ab].depth[p.pos], i = dd.indexOf(id); if (i > 0) { dd.splice(i, 1); dd.unshift(id); } closeOv(); toast(esc(p.ln) + ' is now your #1 ' + p.pos); render(); },
    dup: function (a) { var s = a.split(':'), d = G.teams[G.user.ab].depth[s[0]], i = +s[1]; if (i > 0) { var t = d[i - 1]; d[i - 1] = d[i]; d[i] = t; } render(); },
    ddown: function (a) { var s = a.split(':'), d = G.teams[G.user.ab].depth[s[0]], i = +s[1]; if (i < d.length - 1) { var t = d[i + 1]; d[i + 1] = d[i]; d[i] = t; } render(); },
    autodepth: function () { HC.autoDepth(G, G.user.ab); toast('Depth chart sorted by overall'); render(); },
    sort: function (k) { if (S.sort.k === k) S.sort.d *= -1; else S.sort = { k: k, d: k === 'name' || k === 'pos' ? 1 : -1 }; render(); },
    rfilter: function (f) { S.rosterFilter = f; render(); },
    ffilter: function (f) { S.faFilter = f; render(); },
    dfilter: function (f) { S.draftFilter = f; render(); },
    focus: function (k) { G.user.focus = k; render(); },
    intensity: function (k) { G.user.intensity = k; render(); },
    phrs: function (a) {
      var x = a.split(':'), pl = G.user.plan, cur = pl.hrs[x[0]] || 0, nv = Math.max(0, Math.min(HC.MAX_HRS, cur + (+x[1])));
      if (nv > cur && HC.planHours(pl) + (nv - cur) > HC.PRAC_BUDGET) { toast('Out of practice hours. Take hours from another group first.'); return; }
      pl.hrs[x[0]] = nv; save(true); render();
    },
    pint: function (a) { var x = a.split(':'); G.user.plan.int[x[0]] = x[1]; save(true); render(); },
    pdrill: function (a) { var x = a.split(':'); G.user.plan.drill[x[0]] = x[1]; save(true); render(); },
    psess: function (k) {
      var pl = G.user.plan;
      if (!pl[k] && HC.planHours(pl) + HC.SESSION_COST[k] > HC.PRAC_BUDGET) { toast('Needs ' + HC.SESSION_COST[k] + ' free hours. Take hours from a position group first.'); return; }
      pl[k] = pl[k] ? 0 : 1; save(true); render();
    },
    pauto: function () { var old = G.user.plan, np = HC.autoPlan(G, G.user.ab); if (old.fp.length) np.fp = old.fp.slice(); np.gp = 0; np.cond = 0; G.user.plan = np; save(true); toast('📋 Staff plan loaded: hours go to your weakest units and young talent.'); render(); },
    pbal: function () { var pl = G.user.plan; HC.PGROUPS.forEach(function (g) { pl.hrs[g.k] = g.def; pl.int[g.k] = 'normal'; pl.drill[g.k] = 'bal'; }); pl.gp = 0; pl.cond = 0; save(true); render(); },
    pfocus: function (id) {
      HC.migrate(G); var fp = G.user.plan.fp, i = fp.indexOf(id), p = G.players[id];
      if (i >= 0) fp.splice(i, 1);
      else { if (fp.length >= HC.FOCUS_MAX) { toast('You can have ' + HC.FOCUS_MAX + ' focus players. Remove one first.'); return; } if (!p || p.tm !== G.user.ab) return; fp.push(id); toast('⭐ ' + esc(p.ln) + ' gets extra 1-on-1 coaching'); }
      save(true); if ($('#ov')) openPlayer(id); else render();
    },
    ptab: function (t) { S.pracTab = t; render(); },
    pprog: function (k) { S.progFilter = k; render(); },
    cfilter: function (k) { S.charFilter = k; render(); },
    scout: function (id) { var p = G.players[id], err = HC.scout(G, p); if (err) toast(err); var open = !!$('#ov'); if (open) openPlayer(id); else render(); },
    dpick: function (id) { if (HC.draftPlayer(G, id)) { var p = G.players[id]; closeOv(); toast('🎉 You drafted ' + p.pos + ' ' + esc(p.fn + ' ' + p.ln)); save(true); render(); } },
    dsim: function () { HC.simDraftToUser(G); save(true); render(); },
    dnext: function () { HC.aiPick(G); render(); },
    dauto: function () { var o = G.draft.order[G.draft.cur]; ACT.dpick(HC.aiChoice(G, o.ab, o.r)); },
    simround: function () { HC.advancePlayoffs(G); save(true); render(); },
    newseason: function () {
      var exp = HC.expiring(G, G.user.ab).filter(function (p) { return p.ovr >= 70; });
      if (exp.length && !window.confirm(exp.length + ' players rated 70+ will leave in free agency (e.g. ' + exp.slice(0, 3).map(function (p) { return p.ln; }).join(', ') + '). Continue?')) return;
      var r = HC.newSeason(G); save(true); go('dash'); toast('Welcome to ' + G.season + '! ' + r.left.length + ' left in FA, ' + r.retired.length + ' retired.', 4000);
    },
    speed: function (s) { S.speed = +s; document.querySelectorAll('[data-act=speed]').forEach(function (c) { c.classList.toggle('on', +c.dataset.arg === S.speed); }); },
    call: function (k) { doPlay(k); },
    gauto: function () { doPlay('AUTO'); },
    gdrive: function () { if (S.busy || S.gs.over) return; HC.simDrive(G, S.gs); S.lastCall = null; setFormation(false); updateGame(); },
    gend: function () { if (S.busy) return; HC.simToEnd(G, S.gs); S.lastCall = null; setFormation(false); updateGame(); },
    gtab: function (t) { S.gameTab = t; document.querySelectorAll('[data-act=gtab]').forEach(function (c) { c.classList.toggle('on', c.dataset.arg === t); }); renderSide(); },
    gfinish: function () { finishGame(); },
    export: function () { exportSave(); },
    loadsave: function () { if (load()) { go('dash'); toast('Save loaded'); } }
  };
  function negSubmit() {
    var n = S.neg, p = G.players[n.id], r = HC.offer(G, p, G.user.ab, n.sal, n.yrs);
    if (r.ok) { closeOv(); toast('✍️ ' + esc(r.msg), 3500); S.neg = null; save(true); render(); return; }
    if (r.counter) { n.sal = r.counter; n.yrs = r.cyrs || n.yrs; }
    openNeg(n.id, r.msg);
  }
  // preserve scroll on re-render
  var _render = render;
  render = function () {
    var tw = document.querySelector('.tw'), st = tw ? tw.scrollTop : 0, same = S._lastScreen === S.screen, wy = window.scrollY;
    _render();
    if (same) { var t2 = document.querySelector('.tw'); if (t2) t2.scrollTop = st; window.scrollTo(0, wy); }
    S._lastScreen = S.screen;
  };
  function init() {
    app = document.getElementById('app');
    document.addEventListener('click', function (e) {
      var el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
      var f = ACT[el.dataset.act]; if (!f) return;
      e.preventDefault(); e.stopPropagation();
      try { f(el.dataset.arg); } catch (err) { console.error(err); toast('⚠️ ' + esc(err.message)); }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (S.evCtx) return; closeOv(); } });
    render();
  }
  return { init: init, act: function (n, a) { return ACT[n](a); }, state: function () { return { G: G, S: S }; }, go: go };
})();
document.addEventListener('DOMContentLoaded', UI.init);
