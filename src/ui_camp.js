  // ---------- TRAINING CAMP · PRESEASON · CUTDOWN · DAILY PRACTICE ----------
  var SQ_OPTS = [[0, 'Sit starters', 'No risk to starters; backups get every snap'], [1, '1st quarter', 'A tune-up series or two'], [2, 'First half', 'Dress rehearsal'], [3, 'Three quarters', 'Lots of starter reps, real injury risk'], [4, 'Whole game', 'Starters all game: most risk, no evaluation reps']];
  var PT_TYPES = ['pad', 'np', 'walk', 'off'];
  function dayCell(i) {
    var C = G.camp, d = C.days[i], T = HC.DAY_T[d.t], dt = HC.campDate(G, i), me = G.user.ab;
    var cls = 'cd t-' + d.t + (d.done ? ' done' : '') + (i === C.day ? ' cur' : '') + (S.campSel === i ? ' sel' : '') + (d.plan ? ' cust' : '');
    var extra = '';
    if (d.t === 'game') {
      var k = HC.PS_DAYS.indexOf(i), g = (C.ps[k] || []).filter(function (x) { return x.h === me || x.a === me; })[0];
      if (g) { var opp = g.h === me ? g.a : g.h, r = C.res[k]; extra = '<div class="cdo">' + (g.h === me ? 'vs ' : '@ ') + opp + '</div>' + (r ? '<div class="cdr ' + (r.us > r.them ? 'good' : r.us < r.them ? 'bad' : '') + '">' + (r.us > r.them ? 'W ' : r.us < r.them ? 'L ' : 'T ') + r.us + '-' + r.them + '</div>' : ''); }
    } else if (d.t === 'cut') extra = '<div class="cdo">to 53</div>';
    return '<div class="' + cls + '" data-act="csel" data-arg="' + i + '"><div class="cdn">' + (dt.getUTCDate() === 1 || i === 0 ? HC.dateLabel(dt).slice(4) : dt.getUTCDate()) + '</div><div class="cdi">' + T.ic + '</div><div class="cdt">' + (d.t === 'game' ? 'PS ' + (HC.PS_DAYS.indexOf(i) + 1) : T.n) + '</div>' + extra + (d.done ? '<span class="cdk">✓</span>' : '') + (d.plan ? '<span class="cdp" title="Custom plan">✎</span>' : '') + '</div>';
  }
  function campCalendar() {
    var C = G.camp, first = HC.campDate(G, 0).getUTCDay(), lead = (first + 6) % 7, h = '<div class="cal">';
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(function (d) { h += '<div class="cdh">' + d + '</div>'; });
    for (var b = 0; b < lead; b++) h += '<div class="cd blank"></div>';
    for (var i = 0; i < C.days.length; i++) h += dayCell(i);
    var op = HC.openerDate(G);
    h += '<div class="cd t-wk1"><div class="cdn">' + HC.dateLabel(op).slice(4) + '</div><div class="cdi">🏁</div><div class="cdt">Week 1</div><div class="cdo">opener</div></div>';
    return h + '</div>';
  }
  function startersFat(ab) { var L = HC.lineup(G, ab), a = []; for (var pos in L) L[pos].forEach(function (p) { if (!p.rep) a.push(p.fat || 0); }); return Math.round(HC.avg(a)); }
  function dayPanel(i) {
    var C = G.camp, d = C.days[i], T = HC.DAY_T[d.t], dt = HC.campDate(G, i), me = G.user.ab;
    var h = '<div class="card"><div class="hd"><h3>Day ' + (i + 1) + ' · ' + HC.dateLabel(dt) + '</h3><span class="sp"></span>' + (d.done ? '<span class="pill good">✓ Done</span>' : i === C.day ? '<span class="pill" style="color:var(--gold)">Today</span>' : '') + '</div>';
    if (d.t === 'game') {
      var k = HC.PS_DAYS.indexOf(i), g = (C.ps[k] || []).filter(function (x) { return x.h === me || x.a === me; })[0], r = C.res[k];
      h += '<div class="row" style="gap:10px">' + (g ? badge(g.h === me ? g.a : g.h, 40) : '') + '<div><b>Preseason Week ' + (k + 1) + '</b><div class="mut" style="font-size:12px">' + (g ? (g.h === me ? 'vs ' : '@ ') + esc(G.teams[g.h === me ? g.a : g.h].city + ' ' + G.teams[g.h === me ? g.a : g.h].name) : '') + ' · not counted in the standings</div></div></div>';
      if (r) h += '<div style="margin-top:10px">Final: <b>' + r.us + '-' + r.them + '</b> · starters played ' + SQ_OPTS[r.sq][1].toLowerCase() + '</div>';
      else if (i !== C.day) h += '<div class="mut" style="font-size:12.5px;margin-top:10px">You choose how long your starters play on game day.</div>';
      return h + '</div>';
    }
    if (d.t === 'cut') return h + '<b>✂️ Cutdown to 53</b><div class="mut" style="font-size:12.5px;margin-top:6px">Every team must cut from ' + HC.teamPlayers(G, me).length + ' to 53 before Week 1. You decide who stays, using camp and preseason grades. Cut players become free agents, and other teams can claim them.</div></div>';
    var locked = d.done || i < C.day, plan = d.plan || G.user.plan;
    h += '<div class="seg big" style="width:100%;display:flex">' + PT_TYPES.map(function (t) { return '<button style="flex:1" class="' + (d.t === t ? 'on' + (t === 'pad' ? ' i-hard' : t === 'off' ? ' i-light' : '') : '') + '" data-act="cday" data-arg="' + i + ':' + t + '"' + (locked ? ' disabled' : '') + '>' + HC.DAY_T[t].ic + ' ' + HC.DAY_T[t].n + '</button>'; }).join('') + '</div>';
    h += '<div class="mut" style="font-size:12.5px;margin:10px 0">' + esc(T.d) + '</div>';
    if (d.t !== 'off') h += '<div class="pgm" style="margin-bottom:10px"><span>On the field <b>≈' + HC.dayHours(plan, d.t) + ' hrs</b></span><span>Growth <b>×' + T.g + '</b></span><span>Load <b class="' + (T.load >= 1 ? 'warn' : 'good') + '">×' + T.load + '</b></span><span>Injury risk <b class="' + (T.inj >= 1 ? 'warn' : 'good') + '">×' + T.inj + '</b></span></div>';
    if (d.t !== 'off') h += '<div class="row wrap" style="gap:8px"><span class="mut" style="font-size:12.5px">Plan: <b>' + (d.plan ? 'Custom for this day' : 'Team practice plan') + '</b></span><span class="sp"></span><button class="btn" data-act="cplan" data-arg="c:' + i + '"' + (locked ? ' disabled' : '') + '>✎ ' + (d.plan ? 'Edit day plan' : 'Customize this day') + '</button>' + (d.plan && !locked ? '<button class="btn ghost" data-act="cplanreset" data-arg="c:' + i + '">Use team plan</button>' : '') + '</div>';
    return h + '</div>';
  }
  function campHeader() {
    var C = G.camp, me = G.user.ab, d = C.days[C.day], dt = HC.campDate(G, C.day), n = HC.teamPlayers(G, me).length;
    var inj = HC.teamPlayers(G, me).filter(function (p) { return p.inj; }).length, isG = d.t === 'game', isC = d.t === 'cut';
    var h = '<div class="card camphd"><div class="row wrap" style="gap:16px"><div><div class="tagline" style="margin:0;font-size:11px">' + G.season + ' Training Camp</div><h2 style="margin:2px 0">Day ' + (C.day + 1) + ' of ' + C.days.length + ' · ' + HC.dateLabel(dt, true) + '</h2><div class="mut" style="font-size:12.5px">' + (isG ? '🏈 Preseason game day' : isC ? '✂️ Cutdown day: get to 53' : HC.DAY_T[d.t].ic + ' ' + HC.DAY_T[d.t].n + (d.t === 'off' ? ' day' : ' practice') + ' today') + ' · Week 1 kicks off ' + HC.dateLabel(HC.openerDate(G)) + '</div></div><span class="sp"></span>';
    h += '<div class="kstat"><b>' + n + '<span class="dim" style="font-size:14px">/90</span></b><span>Camp roster</span></div><div class="kstat"><b class="' + (startersFat(me) >= 40 ? 'bad' : startersFat(me) >= 25 ? 'warn' : 'good') + '">' + startersFat(me) + '</b><span>Starter fatigue</span></div><div class="kstat"><b class="' + (inj ? 'bad' : 'good') + '">' + inj + '</b><span>Injured</span></div></div>';
    h += '<div class="bar" style="margin:12px 0;height:8px"><i style="width:' + (C.day / (C.days.length - 1) * 100) + '%;background:linear-gradient(90deg,#22c55e,#eab308)"></i></div>';
    h += '<div class="row wrap simbar" style="gap:10px">';
    if (isC) h += '<button class="btn pri big" data-act="nav" data-arg="cutdown">✂️ Go to Cutdown</button>';
    else if (isG) h += '<button class="btn pri big" data-act="play">🏈 Coach the Game</button><button class="btn big" data-act="quicksim">⚡ Quick Sim Game</button>';
    else h += '<button class="btn pri big" data-act="csim" data-arg="1">▶ Sim Day</button><button class="btn big" data-act="csim" data-arg="7">⏩ Sim Week</button><button class="btn big" data-act="csimg">⏭ Sim to Next Game</button>';
    h += '<span class="sp"></span><button class="btn" data-act="nav" data-arg="practice">🏋️ Team practice plan</button></div></div>';
    return h;
  }
  function gameSetup() {
    var C = G.camp, me = G.user.ab, k = HC.PS_DAYS.indexOf(C.day), g = HC.campGame(G); if (!g) return '';
    var opp = g.h === me ? g.a : g.h, O = G.teams[opp], T = G.teams[me], om = HC.teamOvr(G, me), oo = HC.teamOvr(G, opp), sq = C.sq;
    var h = '<div class="card gsetup"><div class="hd"><h3>Preseason Week ' + (k + 1) + ' · Game Setup</h3><span class="sp"></span><span class="pill">' + (g.h === me ? '🏠 Home' : '✈️ Away') + '</span><span class="pill">Not counted in standings</span></div>';
    h += '<div class="matchup" style="margin:6px 0 12px"><div class="mteam">' + badge(me, 58) + '<div><div class="n">' + esc(T.name) + '</div><div class="rec">OVR ' + om.ovr + ' · OFF ' + om.off + ' · DEF ' + om.def + '</div></div></div><div class="vs">VS</div><div class="mteam rt">' + badge(opp, 58) + '<div><div class="n">' + esc(O.name) + '</div><div class="rec">OVR ' + oo.ovr + ' · OFF ' + oo.off + ' · DEF ' + oo.def + '</div></div></div></div>';
    h += '<h3 style="margin:4px 0 8px">How long do your starters play?</h3><div class="seg big sqseg">' + SQ_OPTS.map(function (o) { return '<button class="' + (sq === o[0] ? 'on' : '') + '" data-act="csq" data-arg="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>';
    var exp = [0, 1, 2, 3, 4][sq] / 4;
    h += '<div class="mut" style="font-size:12.5px;margin:8px 0 12px">' + esc(SQ_OPTS[sq][2]) + '.</div><div class="grid g3" style="gap:10px">';
    h += '<div class="mini"><span>Starter injury exposure</span>' + bar(exp * 100, exp >= .75 ? '#ef4444' : exp >= .5 ? '#eab308' : '#22c55e') + '</div><div class="mini"><span>Evaluation reps for backups</span>' + bar((1 - exp * .8) * 100, '#60a5fa') + '</div><div class="mini"><span>Week 1 sharpness (starter preseason snaps)</span>' + bar(Math.min(100, ((G.teams[me].sharp || 0) + sq) / 6 * 100), '#a78bfa') + '</div></div>';
    var L0 = HC.lineup(G, me, 0), L1 = HC.lineup(G, me, 1), L2 = HC.lineup(G, me, 2);
    function q(L) { return ['QB', 'RB', 'WR'].map(function (pos) { var p = L[pos][0]; return p && !p.rep ? pos + ' ' + esc(p.ln) : ''; }).filter(Boolean).join(', '); }
    var rows = [];
    for (var qq = 1; qq <= 4; qq++) { var lv = qq <= sq ? 0 : qq >= 4 ? 2 : 1; rows.push('<div class="qrow"><b>Q' + qq + '</b><span class="tag">' + ['Starters', '2nd string', '3rd string'][lv] + '</span><span class="dim">' + q([L0, L1, L2][lv]) + '</span></div>'); }
    h += '<div style="margin-top:12px">' + rows.join('') + '</div>';
    var bt = HC.battles(G, me).slice(0, 4);
    if (bt.length) h += '<div class="mut" style="font-size:12.5px;margin-top:10px">⚔️ Battles to watch: ' + bt.map(function (b) { return b.spot + ' ' + esc(G.players[b.lead].ln) + ' vs ' + esc(G.players[b.chase].ln); }).join(' · ') + '</div>';
    h += '<div class="row" style="margin-top:14px"><button class="btn pri big" data-act="play">🏈 Coach the Game</button><button class="btn big" data-act="quicksim">⚡ Quick Sim</button></div></div>';
    return h;
  }
  function campTabs() {
    var t = S.campTab || 'cal';
    return '<div class="seg big">' + [['cal', '📅 Calendar'], ['day', '📊 Day Report'], ['battles', '⚔️ Battles'], ['pre', '🏈 Preseason']].map(function (x) { return '<button class="' + (t === x[0] ? 'on' : '') + '" data-act="ctab" data-arg="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';
  }
  function standouts(n, low) {
    var me = G.user.ab, ps = HC.teamPlayers(G, me).filter(function (p) { return p.cmp && p.cmp.pn; });
    ps.sort(function (a, b) { return (b.cmp.ps / b.cmp.pn) - (a.cmp.ps / a.cmp.pn); });
    if (low) ps.reverse();
    return ps.slice(0, n);
  }
  function campDayReport() {
    var C = G.camp, r = C.last, h = '';
    if (!r) return '<div class="card"><div class="empty">No practice yet. Tap ▶ Sim Day to run the first day of camp.</div></div>';
    if (r.off) h += '<div class="card"><h3>' + esc(r.label) + '</h3><p class="mut">Rest day: fatigue across the roster dropped by half and morale ticked up.</p></div>';
    var up = standouts(6), dn = standouts(4, true);
    h += '<div class="grid g2" style="margin-bottom:14px"><div class="card"><div class="hd"><h3>🔥 Turning Heads</h3><span class="sp"></span><span class="mut" style="font-size:12px">Camp practice grade to date</span></div>' + up.map(function (p) { return campRow(p); }).join('') + '</div><div class="card"><div class="hd"><h3>🧊 Struggling</h3></div>' + dn.map(function (p) { return campRow(p); }).join('') + '</div></div>';
    if (!r.off) h += practiceReport(r);
    return h;
  }
  function campRow(p, extra) { return '<div class="rp" data-act="player" data-arg="' + p.id + '">' + ovr(p.ovr) + '<div class="rpn"><b>' + esc(p.fn.charAt(0) + '. ' + p.ln) + ' <span class="tag">' + p.pos + '</span>' + (p.cb ? ' <span class="tag">UDFA</span>' : p.rookie ? ' <span class="tag">ROOKIE</span>' : '') + '</b><div class="dim" style="font-size:11.5px">Age ' + p.age + ' · POT ' + HC.potGrade(p.pot) + (extra ? ' · ' + extra : '') + '</div></div><div class="c" style="width:54px"><b class="cond cgr g-' + HC.campGrade(p).charAt(0) + '" style="font-size:20px">' + HC.campGrade(p) + '</b><div class="dim" style="font-size:10px">camp</div></div></div>'; }
  function campBattles() {
    var me = G.user.ab, bt = HC.battles(G, me);
    var h = '<div class="card"><div class="row wrap"><div><h3>⚔️ Position Battles</h3><div class="mut" style="font-size:12.5px">Battle score = rating + camp practice + preseason grades. Close races (within 3 points) for a starting job are listed here.</div></div><span class="sp"></span><button class="btn pri" data-act="cdepth">📋 Set depth chart from camp results</button></div></div><div class="grid g2" style="margin-top:12px">';
    if (!bt.length) h += '<div class="card"><div class="empty">No close battles right now. Your starters are clearly ahead.</div></div>';
    bt.forEach(function (b) {
      var a = G.players[b.lead], c = G.players[b.chase];
      h += '<div class="card" style="padding:14px"><div class="hd" style="margin-bottom:6px"><h3 style="color:var(--txt)">' + b.spot + '</h3><span class="sp"></span><span class="pill">' + (b.gap <= 1 ? 'Dead heat' : 'Gap ' + b.gap) + '</span>' + (b.onDepth ? '' : '<span class="pill warn">Depth chart differs</span>') + '</div>';
      [a, c].concat(b.others.map(function (id) { return G.players[id]; })).forEach(function (p, i) {
        var gl = p.cmp && p.cmp.g.length ? p.cmp.g.map(function (x) { return x.g; }).join(', ') : '—';
        h += campRow(p, (i === 0 ? '<span class="good">leads</span> · ' : '') + 'PS grades ' + gl + ' · score ' + HC.battleScore(p).toFixed(1));
      });
      h += '</div>';
    });
    return h + '</div>';
  }
  function campPreseason() {
    var C = G.camp, me = G.user.ab, h = '<div class="grid g3">';
    HC.PS_DAYS.forEach(function (day, k) {
      var g = (C.ps[k] || []).filter(function (x) { return x.h === me || x.a === me; })[0], r = C.res[k];
      if (!g) return;
      var opp = g.h === me ? g.a : g.h;
      h += '<div class="card"><div class="hd"><h3>PS Week ' + (k + 1) + '</h3><span class="sp"></span><span class="mut" style="font-size:12px">' + HC.dateLabel(HC.campDate(G, day)) + '</span></div><div class="row" style="gap:10px">' + badge(opp, 40) + '<div><b>' + (g.h === me ? 'vs ' : '@ ') + esc(G.teams[opp].name) + '</b><div class="mut" style="font-size:12px">' + (r ? 'Final ' + r.us + '-' + r.them + ' · starters: ' + SQ_OPTS[r.sq][1].toLowerCase() : 'Upcoming') + '</div></div>' + (r ? '<span class="sp"></span><b class="cond ' + (r.us > r.them ? 'good' : r.us < r.them ? 'bad' : '') + '" style="font-size:26px">' + (r.us > r.them ? 'W' : r.us < r.them ? 'L' : 'T') + '</b>' : '') + '</div>';
      if (r) {
        h += '<div class="dim" style="font-size:11px;margin:10px 0 4px;text-transform:uppercase;letter-spacing:.08em">Top grades</div>' + r.top.map(function (x) { var p = G.players[x.id]; if (!p) return ''; var gg = (p.cmp && p.cmp.g || []).filter(function (y) { return y.k === k; })[0]; return '<div class="row" style="padding:3px 0;font-size:12.5px;cursor:pointer" data-act="player" data-arg="' + p.id + '"><b class="good" style="width:26px">' + x.g + '</b><span class="tag">' + p.pos + '</span><span class="sp">' + esc(p.fn.charAt(0) + '. ' + p.ln) + '</span><span class="dim">' + esc(gg ? gg.s : '') + '</span></div>'; }).join('');
        if (r.inj.length) h += '<div class="bad" style="font-size:12px;margin-top:6px">🚑 ' + r.inj.map(function (id) { var p = G.players[id]; return p ? p.pos + ' ' + esc(p.ln) : ''; }).join(', ') + '</div>';
      }
      h += '</div>';
    });
    return h + '</div>';
  }
  function vCamp() {
    var C = G.camp; if (!C) return '<div class="empty">No camp</div>';
    if (C.days[C.day].t === 'cut' && S.campTab !== 'pre' && S.campTab !== 'battles' && S.campTab !== 'day') return VIEWS.cutdown();
    if (S.campSel == null || S.campSel < 0 || S.campSel >= C.days.length) S.campSel = C.day;
    var t = S.campTab || 'cal', h = campHeader();
    h += '<div class="row wrap" style="margin:14px 0 12px"><span class="sp"></span>' + campTabs() + '</div>';
    if (t === 'day') return h + campDayReport();
    if (t === 'battles') return h + campBattles();
    if (t === 'pre') return h + campPreseason();
    if (C.days[C.day].t === 'game') h += gameSetup();
    h += '<div class="grid" style="grid-template-columns:1.45fr 1fr;align-items:start;margin-top:12px"><div class="card">' + campCalendar() + '<div class="dim" style="font-size:11.5px;margin-top:10px">Tap a day to plan it. 🛡️ Padded · 👕 Non-padded · 🚶 Walkthrough · 😴 Rest · 🏈 Preseason game · ✂️ Cutdown · ✎ custom plan</div></div><div class="col">' + dayPanel(S.campSel);
    var last = C.last;
    h += '<div class="card"><div class="hd"><h3>Latest Day</h3><span class="sp"></span><button class="btn sm" data-act="ctab" data-arg="day">Full report</button></div>' + (last ? '<div class="mut" style="font-size:12.5px;margin-bottom:8px">' + esc(last.label) + '</div>' + standouts(3).map(function (p) { return campRow(p); }).join('') : '<div class="mut">Camp opens today. Run the first practice with ▶ Sim Day.</div>') + '</div>';
    h += '</div></div>';
    return h;
  }
  // ---------- cutdown ----------
  VIEWS.cutdown = function () {
    if (G.phase !== 'camp' || !G.camp) return '<div class="card"><div class="empty">Cutdown happens on the last day of training camp.</div></div>';
    var C = G.camp, me = G.user.ab, isDay = C.days[C.day].t === 'cut', marks = {}, f = S.cutFilter || 'ALL';
    C.cuts = (C.cuts || []).filter(function (id) { return G.players[id] && G.players[id].tm === me; });
    C.cuts.forEach(function (id) { marks[id] = 1; });
    var staff = {}; HC.staffCuts(G, me, 53).forEach(function (id) { staff[id] = 1; });
    var chk = HC.cutdownCheck(G, C.cuts), all = HC.teamPlayers(G, me), need = chk.over;
    var h = '<div class="card camphd"><div class="row wrap" style="gap:16px"><div><div class="tagline" style="margin:0;font-size:11px">' + G.season + ' Roster Cutdown · ' + HC.dateLabel(HC.campDate(G, HC.CUT_DAY)) + '</div><h2 style="margin:2px 0">Cut down to 53</h2><div class="mut" style="font-size:12.5px">' + (isDay ? 'Mark who goes. Cut players become free agents (other teams can claim them). Dead cap only applies to bigger contracts.' : 'Cutdown day is ' + HC.dateLabel(HC.campDate(G, HC.CUT_DAY)) + '. You can plan your cuts now.') + '</div></div><span class="sp"></span>';
    h += '<div class="kstat"><b>' + all.length + '</b><span>Camp roster</span></div><div class="kstat"><b class="bad">' + C.cuts.length + '</b><span>Marked to cut</span></div><div class="kstat"><b class="' + (need ? 'warn' : 'good') + '">' + (need ? need : '✓') + '</b><span>' + (need ? 'More cuts needed' : 'At 53 or fewer') + '</span></div><div class="kstat"><b>' + fmtM(chk.dead) + '</b><span>Dead cap</span></div></div>';
    var posRow = HC.POS_ORDER.concat(['LS']).filter(function (pos, i, a) { return a.indexOf(pos) === i; }).map(function (pos) { var n = chk.cnt[pos] || 0, mn = ({ QB: 2, RB: 3, WR: 5, TE: 3, OT: 3, G: 3, C: 2, EDGE: 4, DT: 4, LB: 4, CB: 5, S: 4, K: 1, P: 1, LS: 1 })[pos] || 0; return '<span class="pchip' + (n < mn ? ' short' : '') + '">' + pos + ' <b>' + n + '</b></span>'; }).join('');
    h += '<div class="row wrap" style="gap:6px;margin-top:12px">' + posRow + '</div>';
    if (chk.short.length) h += '<div class="warn" style="font-size:12.5px;margin-top:8px">⚠️ Below the usual minimum at ' + chk.short.join(', ') + '. Backups from other spots or replacement players will fill in.</div>';
    h += '<div class="row wrap simbar" style="gap:10px;margin-top:12px"><button class="btn big" data-act="cstaff">📋 Apply staff recommendations</button><button class="btn big ghost" data-act="cclear">Clear marks</button><span class="sp"></span>' + (isDay ? '<button class="btn pri big" data-act="cconfirm"' + (need ? ' disabled' : '') + '>✅ Confirm cutdown' + (need ? ' (' + need + ' more)' : '') + '</button>' : '<button class="btn big" data-act="nav" data-arg="dash">← Back to camp</button>') + '</div><div class="row wrap" style="gap:8px;margin-top:10px"><span class="mut" style="font-size:12px">Review first:</span><button class="btn sm" data-act="cview" data-arg="battles">⚔️ Battles</button><button class="btn sm" data-act="cview" data-arg="pre">🏈 Preseason results</button><button class="btn sm" data-act="cview" data-arg="day">📊 Camp report</button></div></div>';
    var groups = ['ALL', 'BUBBLE'].concat(HC.PGROUPS.map(function (g) { return g.k; }));
    h += '<div class="drills" style="margin:14px 0 10px">' + groups.map(function (k) { return '<button class="drill' + (f === k ? ' on' : '') + '" data-act="cutf" data-arg="' + k + '">' + (k === 'ALL' ? 'All' : k === 'BUBBLE' ? '🫧 On the bubble' : k) + '</button>'; }).join('') + '</div>';
    var sc = {}; all.forEach(function (p) { sc[p.id] = HC.cutScore(G, p); });
    var rank = all.slice().sort(function (a, b) { return sc[b.id] - sc[a.id]; }), rk = {}; rank.forEach(function (p, i) { rk[p.id] = i; });
    var list = all.filter(function (p) { var g = HC.GROUP_OF[p.pos]; return f === 'ALL' || (f === 'BUBBLE' ? Math.abs(rk[p.id] - 52) <= 9 : g && g.k === f); });
    var po = {}; HC.POS_ORDER.forEach(function (p, i) { po[p] = i; });
    list.sort(function (a, b) { return (po[a.pos] == null ? 99 : po[a.pos]) - (po[b.pos] == null ? 99 : po[b.pos]) || sc[b.id] - sc[a.id]; });
    h += '<div class="card flat"><div class="tw" style="max-height:none"><table class="t cut"><thead><tr><th style="width:96px"></th><th>Player</th><th>Pos</th><th>Age</th><th>OVR</th><th>POT</th><th>Camp</th><th>Preseason</th><th>Salary</th><th>If cut</th><th>Staff</th></tr></thead><tbody>';
    list.forEach(function (p) {
      var m = marks[p.id], gs = (p.cmp && p.cmp.g) || [], avgG = gs.length ? Math.round(HC.avg(gs.map(function (x) { return x.g; }))) : null, lastL = gs.length ? gs[gs.length - 1].s : '';
      h += '<tr class="' + (m ? 'cutm' : '') + '"><td><button class="btn ' + (m ? 'danger' : '') + ' kc" data-act="ccut" data-arg="' + p.id + '">' + (m ? '✂️ Cut' : '✓ Keep') + '</button></td><td class="cl" data-act="player" data-arg="' + p.id + '"><b>' + nm(p) + '</b>' + (p.cb ? ' <span class="tag">UDFA</span>' : p.rookie ? ' <span class="tag">ROOKIE</span>' : '') + (p.inj ? ' <span class="tag" style="background:#4a1d24;color:#fecaca">INJ ' + p.inj + 'w</span>' : '') + '</td><td><span class="tag">' + p.pos + '</span></td><td>' + p.age + '</td><td>' + ovr(p.ovr) + '</td><td>' + HC.potGrade(p.pot) + '</td><td><b class="cgr g-' + HC.campGrade(p).charAt(0) + '">' + HC.campGrade(p) + '</b></td><td>' + (avgG == null ? '<span class="dim">did not play</span>' : '<b>' + avgG + '</b> <span class="dim" style="font-size:11.5px">' + esc(lastL) + '</span>') + '</td><td>' + fmtM(p.sal) + '</td><td class="' + (HC.cutDead(G, p) ? 'bad' : 'dim') + '">' + (HC.cutDead(G, p) ? fmtM(HC.cutDead(G, p)) + ' dead' : 'free') + '</td><td>' + (staff[p.id] ? '<span class="bad">✂️ cut</span>' : '<span class="good">keep</span>') + '</td></tr>';
    });
    return h + '</tbody></table></div></div>';
  };
  // ---------- in-season day-by-day strip (dashboard) ----------
  function weekStrip() {
    if (!G.user.daily || G.phase !== 'regular') return '';
    var w = HC.weekDays(G), g = HC.userGame(G), last = w.last;
    var h = '<div class="card"><div class="hd"><h3>This Week\'s Practice · Day by Day</h3><span class="sp"></span><button class="btn sm ghost" data-act="pdaily">Switch to weekly</button></div><div class="wstrip">';
    HC.WK_NAMES.forEach(function (n, i) {
      var t = w.t[i], T = HC.DAY_T[t];
      h += '<div class="wd t-' + t + (i < w.d ? ' done' : '') + (i === w.d ? ' cur' : '') + '" data-act="wday" data-arg="' + i + '"><div class="cdn">' + n + '</div><div class="cdi">' + T.ic + '</div><div class="cdt">' + T.n + '</div>' + (i < w.d ? '<span class="cdk">✓</span>' : '') + (w.plans[i] ? '<span class="cdp">✎</span>' : '') + '</div>';
    });
    h += '<div class="wd t-game' + (w.d >= 6 ? ' cur' : '') + '"><div class="cdn">Sun</div><div class="cdi">🏈</div><div class="cdt">' + (g ? 'Game' : 'Bye') + '</div></div></div>';
    h += '<div class="row wrap" style="gap:10px;margin-top:12px">' + (w.d < 6 ? '<button class="btn pri" data-act="wsim">▶ Sim Day (' + HC.WK_NAMES[w.d] + ')</button><button class="btn" data-act="wsimall">⏭ Sim to Game Day</button><span class="mut" style="font-size:12px">Tap a future day to change its session. Playing or simming the game runs any days left automatically.</span>' : '<span class="good">✓ Practice week complete. Ready for game day.</span>') + '<span class="sp"></span>' + (last ? '<button class="btn sm" data-act="ptabgo" data-arg="report">Week report</button>' : '') + '</div>';
    if (last) { var up = 0; for (var k in last.groups) last.groups[k].forEach(function (x) { if (x.d >= .02) up++; }); h += '<div class="mut" style="font-size:12px;margin-top:8px">Last: ' + esc(last.label) + (last.off ? ' (rest day)' : ' · ' + up + ' players improved' + (last.inj.length ? ' · <span class="bad">' + last.inj.length + ' hurt</span>' : '')) + ' · starter fatigue ' + startersFat(G.user.ab) + '</div>'; }
    return h + '</div>';
  }
  function curPlanRef() {
    var x = S.planDay; if (!x) return null;
    var s = x.split(':'), i = +s[1];
    if (s[0] === 'c' && G.phase === 'camp' && G.camp && G.camp.days[i] && !G.camp.days[i].done) return { kind: 'c', i: i, label: 'Camp Day ' + (i + 1) + ' · ' + HC.dateLabel(HC.campDate(G, i)) + ' (' + HC.DAY_T[G.camp.days[i].t].n + ')', get: function () { var d = G.camp.days[i]; if (!d.plan) d.plan = JSON.parse(JSON.stringify(G.user.plan)); return d.plan; }, set: function (p) { G.camp.days[i].plan = p; }, reset: function () { delete G.camp.days[i].plan; } };
    if (s[0] === 'w' && G.phase === 'regular') { var w = HC.weekDays(G); if (i < w.d) return null; return { kind: 'w', i: i, label: 'Week ' + G.week + ' · ' + HC.WK_NAMES[i] + ' (' + HC.DAY_T[w.t[i]].n + ')', get: function () { if (!w.plans[i]) w.plans[i] = JSON.parse(JSON.stringify(G.user.plan)); return w.plans[i]; }, set: function (p) { w.plans[i] = p; }, reset: function () { delete w.plans[i]; } }; }
    return null;
  }
  function curPlan() { var r = curPlanRef(); if (!r) { S.planDay = null; return G.user.plan; } var p = r.get(); p.fp = G.user.plan.fp; return p; }
  var CAMP_ACT = {
    csel: function (i) { S.campSel = +i; render(); },
    ctab: function (t) { S.campTab = t; render(); },
    cview: function (t) { S.campTab = t; go('dash'); },
    cday: function (a) { var x = a.split(':'), err = HC.setDayType(G, +x[0], x[1]); if (err) toast(err); else save(true); render(); },
    csim: function (n) {
      var r = HC.campSim(G, +n), d = G.camp && G.camp.days[G.camp.day];
      save(true); S.campSel = G.camp ? G.camp.day : null;
      toast(r.days ? '✅ ' + r.days + ' day' + (r.days > 1 ? 's' : '') + ' of camp complete' + (r.stop === 'game' ? '. Preseason game day: set your starters\' playing time.' : r.stop === 'cut' ? '. Cutdown day is here.' : '.') : (d && d.t === 'game' ? 'Play or sim the preseason game first.' : 'Nothing to sim.'), 3200);
      render();
    },
    csimg: function () { var r = HC.campSim(G, 99, true); save(true); S.campSel = G.camp ? G.camp.day : null; toast('⏭ ' + r.days + ' days simmed' + (r.stop === 'game' ? '. It\'s preseason game day.' : r.stop === 'cut' ? '. Cutdown day is here.' : '.'), 3200); render(); },
    csq: function (n) { G.camp.sq = +n; save(true); render(); },
    cplan: function (k) { S.planDay = k; S.pracTab = 'plan'; go('practice'); },
    cplanreset: function (k) { var o = S.planDay; S.planDay = k; var r = curPlanRef(); if (r) r.reset(); S.planDay = o === k ? null : o; save(true); toast('Back to the team plan for that day'); render(); },
    cplandone: function () { var r = curPlanRef(); S.planDay = null; save(true); if (r && r.kind === 'c') go('dash'); else go('dash'); },
    cdepth: function () {
      var me = G.user.ab, before = {}; HC.POS_ORDER.forEach(function (pos) { (G.teams[me].depth[pos] || []).slice(0, HC.LINEUP[pos] || 0).forEach(function (id) { before[id] = 1; }); });
      HC.campDepth(G, me); var won = [];
      HC.POS_ORDER.forEach(function (pos) { (G.teams[me].depth[pos] || []).slice(0, HC.LINEUP[pos] || 0).forEach(function (id) { if (!before[id]) { won.push(id); var p = G.players[id]; p.mor = Math.min(100, p.mor + 3); } }); });
      HC.POS_ORDER.forEach(function (pos) { Object.keys(before).forEach(function (id) { var p = G.players[id]; if (p && p.pos === pos && (G.teams[me].depth[pos] || []).indexOf(id) >= (HC.LINEUP[pos] || 0)) p.mor = Math.max(0, p.mor - (p.pers === 'DIVA' || p.pers === 'CANCER' || p.pers === 'HOT' ? 3.5 : 2)); }); });
      save(true); toast('📋 Depth chart set from camp results' + (won.length ? ': ' + won.slice(0, 4).map(function (id) { return esc(G.players[id].ln); }).join(', ') + ' won starting jobs' : ' (no changes)'), 4000); render();
    },
    cutf: function (k) { S.cutFilter = k; render(); },
    ccut: function (id) { var C = G.camp, i = C.cuts.indexOf(id); if (i >= 0) C.cuts.splice(i, 1); else C.cuts.push(id); save(true); render(); },
    cstaff: function () { G.camp.cuts = HC.staffCuts(G, G.user.ab, 53); save(true); toast('📋 Staff marked ' + G.camp.cuts.length + ' players to cut. Review and change any of them.', 3500); render(); },
    cclear: function () { G.camp.cuts = []; save(true); render(); },
    cconfirm: function () {
      var chk = HC.cutdownCheck(G, G.camp.cuts);
      if (chk.short.length && !window.confirm('You will be short at ' + chk.short.join(', ') + '. Confirm the cutdown anyway?')) return;
      var r = HC.cutdown(G, G.camp.cuts.slice());
      if (!r.ok) { toast(esc(r.msg), 3500); return; }
      save(true); S.campTab = 'cal'; go('dash'); toast('✂️ ' + esc(r.msg) + ' Week 1 is next!', 4500);
    },
    wday: function (i) { i = +i; var w = HC.weekDays(G); if (i < w.d) { toast('That day is done.'); return; } var t = w.t[i], nx = PT_TYPES[(PT_TYPES.indexOf(t) + 1) % PT_TYPES.length]; HC.setWeekDayType(G, i, nx); save(true); render(); },
    wsim: function () { var r = HC.simWeekDay(G); save(true); if (r) toast('✅ ' + esc(r.label) + (r.inj.length ? ' · 🚑 ' + r.inj.length + ' injured' : ''), 2800); render(); },
    wsimall: function () { HC.finishWeekDays(G); save(true); toast('⏭ Practice week complete. Game day!', 2800); render(); },
    pdaily: function () { if (G.user.daily && G.phase === 'regular' && HC.weekDays(G).d > 0) HC.finishWeekDays(G); G.user.daily = G.user.daily ? 0 : 1; if (G.user.daily) HC.weekDays(G); save(true); toast(G.user.daily ? 'Day-by-day practice on: plan and sim each day.' : 'Weekly practice: the whole week runs after each game.', 3200); render(); },
    ptabgo: function (t) { S.pracTab = t; go('practice'); },
    startmode: function (m) { var i = $('#coachName'); if (i) S.coach = i.value; S.startCamp = m === 'camp'; render(); }
  };
