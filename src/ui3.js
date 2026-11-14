  // ---------- contracts & cap ----------
  VIEWS.cap = function () {
    var me = G.user.ab, T = G.teams[me], ps = HC.teamPlayers(G, me), used = HC.capUsed(G, me), dead = T.dead || 0, space = G.cap - used;
    var grp = { QB: 0, 'Skill (RB/WR/TE)': 0, 'O-Line': 0, 'D-Line/EDGE': 0, 'LB': 0, 'Secondary': 0, 'Special Teams': 0 }, col = ['#f59e0b', '#3b82f6', '#06b6d4', '#ef4444', '#a855f7', '#22c55e', '#64748b'];
    ps.forEach(function (p) { var k = p.pos === 'QB' ? 'QB' : /RB|WR|TE/.test(p.pos) ? 'Skill (RB/WR/TE)' : /OT|^G$|^C$/.test(p.pos) ? 'O-Line' : /EDGE|DT/.test(p.pos) ? 'D-Line/EDGE' : p.pos === 'LB' ? 'LB' : /CB|^S$/.test(p.pos) ? 'Secondary' : 'Special Teams'; grp[k] += p.sal; });
    var h = '<div class="row" style="margin-bottom:14px"><h2>Contracts & Salary Cap</h2><span class="sp"></span><span class="pill">' + G.season + ' cap: ' + fmtM(G.cap) + '</span></div>';
    h += '<div class="card"><div class="row" style="gap:30px;margin-bottom:14px"><div class="stat" style="align-items:flex-start"><b>' + fmtM(used - dead) + '</b><span>Active contracts</span></div><div class="stat" style="align-items:flex-start"><b class="bad">' + fmtM(dead) + '</b><span>Dead cap</span></div><div class="stat" style="align-items:flex-start"><b class="' + (space < 0 ? 'bad' : 'good') + '">' + fmtM(space) + '</b><span>Cap space</span></div></div>';
    h += '<div style="display:flex;height:22px;border-radius:8px;overflow:hidden;background:#1c2638">';
    var i = 0; for (var k in grp) { h += '<div title="' + k + ' ' + fmtM(grp[k]) + '" style="width:' + (grp[k] / G.cap * 100) + '%;background:' + col[i++] + '"></div>'; }
    h += '<div title="Dead cap" style="width:' + (dead / G.cap * 100) + '%;background:repeating-linear-gradient(45deg,#7f1d1d 0 6px,#991b1b 6px 12px)"></div></div><div class="row wrap" style="margin-top:10px;font-size:12px;gap:16px">';
    i = 0; for (k in grp) h += '<span><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:' + col[i++] + ';margin-right:5px"></span>' + k + ' ' + fmtM(grp[k]) + '</span>';
    h += '</div></div>';
    var exp = ps.filter(function (p) { return p.yrs <= 1; }).sort(function (a, b) { return b.ovr - a.ovr; });
    h += '<div class="card" style="margin-top:16px"><div class="hd"><h3>Expiring After This Season</h3><span class="sp"></span><span class="mut" style="font-size:12px">These players become free agents when the next season starts unless extended.</span></div>';
    h += exp.length ? '<table class="t"><tr><th>Player</th><th>Pos</th><th>Age</th><th>OVR</th><th>Morale</th><th>Current</th><th>Market</th><th></th></tr>' + exp.slice(0, 14).map(function (p) { return '<tr><td class="cl" data-act="player" data-arg="' + p.id + '" style="cursor:pointer"><b>' + nm(p) + '</b></td><td><span class="tag">' + p.pos + '</span></td><td>' + p.age + '</td><td>' + ovr(p.ovr) + '</td><td>' + morBar(p.mor) + '</td><td>' + fmtM(p.sal) + '</td><td>' + fmtM(HC.marketValue(p)) + '</td><td class="r"><button class="btn sm pri" data-act="negotiate" data-arg="' + p.id + '">Negotiate</button></td></tr>'; }).join('') + '</table>' : '<div class="empty">No expiring deals.</div>';
    h += '</div>';
    var all = sortList(ps.slice());
    h += '<div class="card flat" style="margin-top:16px"><div class="tw" style="max-height:520px"><table class="t"><thead><tr>' + th('name', 'Player') + th('pos', 'Pos') + th('age', 'Age') + th('ovr', 'OVR') + th('sal', 'Salary') + th('yrs', 'Years') + '<th>Cap %</th><th>Dead if cut</th><th></th></tr></thead><tbody>' + all.map(function (p) { return '<tr><td class="cl" data-act="player" data-arg="' + p.id + '" style="cursor:pointer"><b>' + nm(p) + '</b></td><td><span class="tag">' + p.pos + '</span></td><td>' + p.age + '</td><td>' + ovr(p.ovr) + '</td><td>' + fmtM(p.sal) + '</td><td>' + p.yrs + '</td><td>' + (p.sal / G.cap * 100).toFixed(1) + '%</td><td class="bad">' + fmtM(HC.deadCap(p)) + '</td><td class="r"><button class="btn sm" data-act="negotiate" data-arg="' + p.id + '">Extend</button> <button class="btn sm danger" data-act="release" data-arg="' + p.id + '">Release</button></td></tr>'; }).join('') + '</tbody></table></div></div>';
    return h;
  };
  // ---------- free agency ----------
  VIEWS.fa = function () {
    var me = G.user.ab, list = HC.faList(G).filter(function (p) { return filterPos(p, S.faFilter); }).slice(0, 150);
    list.forEach(function (p) { var a = HC.askFor(G, p, me); p._ask = a.sal; p._int = a.interest; });
    list = sortList(list);
    var h = '<div class="row" style="margin-bottom:14px"><h2>Free Agency</h2><span class="pill">Roster ' + HC.teamPlayers(G, me).length + '/' + HC.rosterLimit(G) + '</span><span class="pill">Cap space ' + fmtM(HC.capSpace(G, me)) + '</span><span class="sp"></span><span class="mut" style="font-size:12px">Interest depends on your record, team chemistry and whether he would start.</span></div>' + chips(S.faFilter, 'ffilter');
    h += '<div class="card flat" style="margin-top:14px"><div class="tw"><table class="t"><thead><tr>' + th('name', 'Player') + th('pos', 'Pos') + th('age', 'Age') + th('ovr', 'OVR') + th('pot', 'POT') + th('ask', 'Asking / yr') + '<th>Interest</th><th></th></tr></thead><tbody>';
    list.forEach(function (p) { var c = p._int >= 60 ? '#22c55e' : p._int >= 35 ? '#eab308' : '#ef4444'; h += '<tr class="cl" data-act="player" data-arg="' + p.id + '"><td><b>' + nm(p) + '</b> ' + (p.real ? '' : '<span class="tag">GEN</span>') + '</td><td><span class="tag">' + p.pos + '</span></td><td>' + p.age + '</td><td>' + ovr(p.ovr) + '</td><td>' + HC.potGrade(p.pot) + '</td><td>' + fmtM(p._ask) + '</td><td style="width:140px">' + bar(p._int, c) + '</td><td class="r"><button class="btn sm pri" data-act="negotiate" data-arg="' + p.id + '">Negotiate</button></td></tr>'; });
    h += '</tbody></table>' + (list.length ? '' : '<div class="empty">No free agents at this position.</div>') + '</div></div>';
    return h;
  };
  // ---------- negotiation ----------
  function openNeg(id, msg) {
    var p = G.players[id], me = G.user.ab, a = HC.askFor(G, p, me), mine = p.tm === me;
    S.neg = S.neg && S.neg.id === id ? S.neg : { id: id, sal: a.sal, yrs: a.yrs, hist: [] };
    if (msg) S.neg.hist.unshift(msg);
    var t = G.teams[p.tm] || { c1: '#334155' }, n = S.neg, ic = a.interest >= 60 ? '#22c55e' : a.interest >= 35 ? '#eab308' : '#ef4444';
    var h = '<div class="ov" id="ov"><div class="modal"><div class="pcard-top" style="--c1:' + (mine ? t.c1 : G.teams[me].c1) + ';padding:18px 22px"><div class="bigovr" style="width:70px;height:70px"><b style="font-size:34px">' + p.ovr + '</b><span>' + p.pos + '</span></div><div style="position:relative;z-index:1"><div style="font-size:12px;opacity:.8;font-weight:700;letter-spacing:.1em;text-transform:uppercase">' + (mine ? 'Contract Extension' : 'Free Agent Negotiation') + '</div><div style="font-family:var(--cond);font-size:32px;font-weight:900;text-transform:uppercase;line-height:1">' + nm(p) + '</div><div style="font-size:12px;opacity:.85">Age ' + p.age + ' · ' + (mine ? 'Current deal ' + fmtM(p.sal) + ' × ' + p.yrs + ' yrs' : 'Unsigned') + '</div></div><button class="x" data-act="close">✕</button></div><div class="mb">';
    h += '<div class="kv"><div><span>Market Value</span><b>' + fmtM(HC.marketValue(p)) + '</b></div><div><span>Asking</span><b>' + fmtM(a.sal) + ' × ' + a.yrs + '</b></div><div><span>Your Cap Space</span><b>' + fmtM(HC.capSpace(G, me) + (mine ? p.sal : 0)) + '</b></div><div><span>Talks left this week</span><b>' + Math.max(0, 3 - (p.neg || 0)) + '</b></div></div>';
    h += '<div style="margin:16px 0 6px" class="row"><b>Interest in your team</b><span class="sp"></span><b style="color:' + ic + '">' + a.interest + '/100</b></div>' + bar(a.interest, ic);
    h += '<div class="mut" style="font-size:12px;margin-top:6px">Factors: team record ' + HC.rec(G.teams[me]) + ' · chemistry ' + Math.round(G.teams[me].chem) + ' · ' + (HC.wouldStart(G, p, me) ? 'would START for you' : 'would be a backup') + (mine ? ' · his morale ' + Math.round(p.mor) : '') + '</div>';
    var lo = Math.max(900, Math.round(a.sal * .5 / 50) * 50), hi = Math.round(a.sal * 1.6 / 50) * 50 + 500;
    h += '<div style="margin-top:18px"><div class="row"><b>Salary per year</b><span class="sp"></span><b id="negSalL" style="font-family:var(--cond);font-size:22px">' + fmtM(n.sal) + '</b></div><input type="range" id="negSal" min="' + lo + '" max="' + hi + '" step="50" value="' + n.sal + '"></div>';
    h += '<div style="margin-top:10px"><div class="row"><b>Years</b><span class="sp"></span><b id="negYrsL" style="font-family:var(--cond);font-size:22px">' + n.yrs + '</b></div><input type="range" id="negYrs" min="1" max="5" step="1" value="' + n.yrs + '"></div>';
    h += '<div class="mut" style="font-size:12px;margin-top:8px">Total value: <b id="negTot">' + fmtM(n.sal * n.yrs) + '</b>. ' + (mine ? 'A new deal replaces his current one immediately.' : '') + ' Lowball offers can insult the player.</div>';
    if (n.hist.length) h += '<div style="margin-top:14px">' + n.hist.slice(0, 4).map(function (m, i) { return '<div class="task" style="' + (i ? 'opacity:.55' : '') + '"><div class="ic">💬</div><div>' + esc(m) + '</div></div>'; }).join('') + '</div>';
    h += '</div><div class="mf"><button class="btn ghost" data-act="close">Walk away</button><button class="btn" data-act="negask">Meet asking price</button><button class="btn pri" data-act="negoffer">Submit Offer</button></div></div></div>';
    closeOv(); document.body.insertAdjacentHTML('beforeend', h);
    var sl = $('#negSal'), yl = $('#negYrs');
    function upd() { n.sal = +sl.value; n.yrs = +yl.value; $('#negSalL').textContent = fmtM(n.sal); $('#negYrsL').textContent = n.yrs; $('#negTot').textContent = fmtM(n.sal * n.yrs); }
    sl.oninput = upd; yl.oninput = upd;
  }
  // ---------- practice ----------
  var FOCUS = {
    balanced: { i: '⚖️', n: 'Balanced', d: 'Even reps for everyone. Steady growth across the roster.' },
    offense: { i: '🎯', n: 'Offensive Install', d: 'Offensive players develop faster (+60%); defense slower.' },
    defense: { i: '🛡️', n: 'Defensive Install', d: 'Defensive players develop faster (+60%); offense slower.' },
    young: { i: '🌱', n: 'Young Player Reps', d: 'Players 25 and under get double reps. Veterans develop slowly.' },
    conditioning: { i: '🫀', n: 'Conditioning', d: 'Injury risk −40% this week. Slower skill development.' },
    gameplan: { i: '📘', n: 'Opponent Game Plan', d: '+1.8 to all units in next game. Little development.' }
  };
  VIEWS.practice = function () {
    var me = G.user.ab, u = G.user;
    var h = '<div class="row" style="margin-bottom:14px"><h2>Practice & Development</h2><span class="sp"></span><span class="mut" style="font-size:12px">Growth depends on age, potential, morale, practice focus and your Development culture (' + Math.round(u.dev) + ').</span></div>';
    h += '<div class="card"><div class="hd"><h3>Weekly Focus</h3></div><div class="grid g3">' + Object.keys(FOCUS).map(function (k) { var f = FOCUS[k]; return '<button class="focus' + (u.focus === k ? ' on' : '') + '" data-act="focus" data-arg="' + k + '"><div class="fi">' + f.i + '</div><b>' + f.n + '</b><span>' + f.d + '</span></button>'; }).join('') + '</div>';
    h += '<div class="hd" style="margin-top:18px"><h3>Intensity</h3></div><div class="grid g3">' + [['light', '🌤️ Light', 'Growth ×0.7 · morale ↑ · fewer injuries'], ['normal', '🏈 Normal', 'Standard growth and risk'], ['hard', '🔥 Hard', 'Growth ×1.4 · morale ↓ · more injuries']].map(function (x) { return '<button class="focus' + (u.intensity === x[0] ? ' on' : '') + '" data-act="intensity" data-arg="' + x[0] + '"><b>' + x[1] + '</b><span>' + x[2] + '</span></button>'; }).join('') + '</div></div>';
    h += '<div class="grid g2" style="margin-top:16px"><div class="card"><div class="hd"><h3>Last Week\'s Top Risers</h3></div>' + (u.lastReport.length ? u.lastReport.map(function (r) { var p = G.players[r.id]; if (!p) return ''; return '<div class="row" style="padding:6px 0;cursor:pointer" data-act="player" data-arg="' + p.id + '">' + ovr(p.ovr) + '<span class="tag">' + p.pos + '</span><span class="sp">' + nm(p) + ' <span class="dim">(' + p.age + ')</span></span><b class="good">+' + r.d.toFixed(2) + '</b></div>'; }).join('') : '<div class="empty">Play a week to see the development report.</div>') + '</div>';
    var young = HC.teamPlayers(G, me).filter(function (p) { return p.age <= 25 && p.pot - p.ovr >= 4; }).sort(function (a, b) { return b.pot - a.pot; }).slice(0, 10);
    h += '<div class="card"><div class="hd"><h3>Development Watch List</h3><span class="sp"></span><span class="dim" style="font-size:11px">OVR → POT</span></div>' + young.map(function (p) { return '<div style="margin-bottom:10px;cursor:pointer" data-act="player" data-arg="' + p.id + '"><div class="row" style="font-size:13px;margin-bottom:4px"><span class="tag">' + p.pos + '</span><span class="sp">' + nm(p) + ' <span class="dim">age ' + p.age + '</span></span><b>' + p.ovr + '</b><span class="dim">→ ' + p.pot + '</span><span class="' + ((p.prog || 0) > 0 ? 'good' : 'dim') + '" style="width:44px;text-align:right">+' + Math.max(0, p.prog || 0).toFixed(1) + '</span></div><div class="bar" style="height:6px"><i style="width:' + (p.ovr / p.pot * 100) + '%;background:linear-gradient(90deg,#3b82f6,#a855f7)"></i></div></div>'; }).join('') + '</div></div>';
    return h;
  };
  // ---------- locker room ----------
  VIEWS.locker = function () {
    var me = G.user.ab, T = G.teams[me], ps = HC.teamPlayers(G, me), u = G.user;
    var avgM = HC.avg(ps.map(function (p) { return p.mor; }));
    var h = '<div class="row" style="margin-bottom:14px"><h2>Locker Room</h2>' + (u.pendingEvent ? '<button class="btn pri" data-act="event">🗣️ Team Meeting: ' + esc(u.pendingEvent.title) + '</button>' : '') + '</div><div class="grid" style="grid-template-columns:auto 1fr 1fr">';
    h += '<div class="card c">' + gauge(T.chem, 'Chemistry', chemColor(T.chem)) + '<div class="mut" style="font-size:12px;margin-top:10px;max-width:170px">Chemistry adds up to ±2.5 to every unit on game day.</div></div>';
    h += '<div class="card"><div class="hd"><h3>Culture Pillars</h3></div>' + pillars() + '<div class="mut" style="font-size:12px">Your choices in team meetings and press conferences move these. Each drifts slowly back toward neutral unless reinforced.</div></div>';
    var dist = [0, 0, 0]; ps.forEach(function (p) { dist[p.mor >= 70 ? 0 : p.mor >= 45 ? 1 : 2]++; });
    h += '<div class="card"><div class="hd"><h3>Morale</h3><span class="sp"></span><b>' + Math.round(avgM) + ' avg</b></div><div class="row" style="gap:20px"><div><b class="good" style="font-size:26px;font-family:var(--cond)">' + dist[0] + '</b><div class="mut" style="font-size:11px">HAPPY</div></div><div><b class="warn" style="font-size:26px;font-family:var(--cond)">' + dist[1] + '</b><div class="mut" style="font-size:11px">CONTENT</div></div><div><b class="bad" style="font-size:26px;font-family:var(--cond)">' + dist[2] + '</b><div class="mut" style="font-size:11px">UNHAPPY</div></div></div><div class="mut" style="font-size:12px;margin-top:10px">Morale is driven by wins, playing time, contracts, practice intensity and your decisions.</div></div></div>';
    var low = ps.slice().sort(function (a, b) { return a.mor - b.mor; }).slice(0, 12);
    h += '<div class="grid g2" style="margin-top:16px"><div class="card"><div class="hd"><h3>Players to Watch</h3></div><table class="t"><tr><th>Player</th><th>OVR</th><th>Morale</th><th>Concern</th></tr>' + low.map(function (p) { var why = p.wantsSnaps ? 'Wants more playing time' : p.wantsDeal ? 'Wants a new contract' : p.mor < 45 ? 'Frustrated' : 'OK'; return '<tr class="cl" data-act="player" data-arg="' + p.id + '"><td><span class="tag">' + p.pos + '</span> ' + nm(p) + '</td><td>' + ovr(p.ovr) + '</td><td>' + morBar(p.mor) + ' <span class="dim">' + Math.round(p.mor) + '</span></td><td class="mut">' + why + '</td></tr>'; }).join('') + '</table></div>';
    h += '<div class="card"><div class="hd"><h3>Your Decisions</h3></div>' + (u.log.length ? u.log.slice(0, 14).map(function (l) { return '<div class="task"><div class="ic">📌</div><div><div class="dim" style="font-size:11px">' + esc(l.w) + ' · ' + esc(l.title) + '</div><b style="font-size:13px">' + esc(l.choice) + '</b></div></div>'; }).join('') : '<div class="empty">No decisions yet.</div>') + '</div></div>';
    return h;
  };
  // ---------- schedule / standings / leaders ----------
  VIEWS.sched = function () {
    var me = G.user.ab, h = '<div class="row" style="margin-bottom:14px"><h2>' + G.season + ' Schedule</h2><span class="sp"></span><span class="mut" style="font-size:12px">Real 2026 NFL matchups' + (G.season > 2026 ? ' (home/away flipped in later seasons)' : '') + '</span></div><div class="card flat"><table class="t"><tr><th>Week</th><th>Opponent</th><th></th><th>Result</th></tr>';
    G.sched.forEach(function (wk, i) {
      var g = wk.filter(function (x) { return x.h === me || x.a === me; })[0];
      if (!g) { h += '<tr class="' + (G.phase === 'regular' && G.week === i + 1 ? 'me' : '') + '"><td>' + (i + 1) + '</td><td class="dim">BYE</td><td></td><td></td></tr>'; return; }
      var opp = g.h === me ? g.a : g.h, res = '';
      if (g.hs !== null) { var ms = g.h === me ? g.hs : g.as, os = g.h === me ? g.as : g.hs; res = '<b class="' + (ms > os ? 'good' : ms < os ? 'bad' : 'warn') + '">' + (ms > os ? 'W' : ms < os ? 'L' : 'T') + ' ' + ms + '-' + os + (g.ot ? ' OT' : '') + '</b>'; }
      h += '<tr class="' + (G.phase === 'regular' && G.week === i + 1 ? 'me' : '') + '"><td>' + (i + 1) + '</td><td><div class="row" style="gap:10px">' + badge(opp, 28) + '<span>' + (g.h === me ? 'vs ' : '@ ') + esc(G.teams[opp].city + ' ' + G.teams[opp].name) + '</span></div></td><td class="dim">' + HC.rec(G.teams[opp]) + '</td><td>' + res + '</td></tr>';
    });
    return h + '</table></div>';
  };
  VIEWS.stand = function () {
    var me = G.user.ab, h = '<div class="row" style="margin-bottom:14px"><h2>Standings</h2></div>';
    ['AFC', 'NFC'].forEach(function (c) {
      var seeds = HC.seeds(G, c);
      h += '<h3 style="margin:10px 0">' + c + '</h3><div class="grid g4" style="margin-bottom:16px">';
      ['East', 'North', 'South', 'West'].forEach(function (d) {
        h += '<div class="card flat"><div style="padding:10px 12px;font-weight:800;font-family:var(--cond);letter-spacing:.06em;text-transform:uppercase">' + c + ' ' + d + '</div><table class="t"><tr><th>Team</th><th>W-L-T</th><th>Diff</th></tr>' + HC.standings(G, c, c + ' ' + d).map(function (t) { var s = seeds.indexOf(t.ab); return '<tr class="' + (t.ab === me ? 'me' : '') + '"><td><div class="row" style="gap:8px">' + badge(t.ab, 22) + esc(t.name) + (s >= 0 ? ' <span class="tag">' + (s + 1) + '</span>' : '') + '</div></td><td>' + HC.rec(t) + '</td><td class="' + (t.pf - t.pa >= 0 ? 'good' : 'bad') + '">' + (t.pf - t.pa > 0 ? '+' : '') + (t.pf - t.pa) + '</td></tr>'; }).join('') + '</table></div>';
      });
      h += '</div>';
    });
    return h + '<div class="mut" style="font-size:12px">Numbers show current playoff seeding (7 teams per conference; #1 seed gets a bye).</div>';
  };
  VIEWS.leaders = function () {
    var cats = [['py', 'Passing Yards'], ['ptd', 'Passing TD'], ['ry', 'Rushing Yards'], ['rtd', 'Rushing TD'], ['recy', 'Receiving Yards'], ['rec', 'Receptions'], ['sck', 'Sacks'], ['dint', 'Interceptions'], ['tkl', 'Tackles']];
    var h = '<div class="row" style="margin-bottom:14px"><h2>League Leaders</h2></div><div class="grid g3">';
    cats.forEach(function (c) { var L = HC.leaders(G, c[0], 8); h += '<div class="card"><div class="hd"><h3>' + c[1] + '</h3></div>' + (L.length ? L.map(function (p, i) { return '<div class="row" style="padding:5px 0;cursor:pointer;' + (p.tm === G.user.ab ? 'color:#fff;font-weight:700' : '') + '" data-act="player" data-arg="' + p.id + '"><span class="dim" style="width:16px">' + (i + 1) + '</span>' + badge(p.tm, 22) + '<span class="sp">' + nm(p) + '</span><b>' + p.st[c[0]] + '</b></div>'; }).join('') : '<div class="dim">No games played yet.</div>') + '</div>'; });
    return h + '</div>';
  };
  VIEWS.saves = function () {
    return '<h2 style="margin-bottom:14px">Save / Load</h2><div class="grid g2"><div class="card"><h3>Browser Save</h3><p class="mut">Your career auto-saves after every week. Saves live in this browser\'s local storage.</p><div class="row"><button class="btn pri" data-act="save">💾 Save Now</button><button class="btn" data-act="loadsave">↺ Reload Last Save</button></div></div><div class="card"><h3>Backup File</h3><p class="mut">Download your career as a file or restore one, e.g. to move to another computer or browser.</p><div class="row"><button class="btn" data-act="export">⬇ Export Save</button><label class="btn">⬆ Import Save<input type="file" id="impfile" accept=".json" style="display:none"></label></div></div><div class="card"><h3>Start Over</h3><p class="mut">Begin a new career with any team. Your current save is overwritten when the new career saves.</p><button class="btn danger" data-act="newc">New Career</button></div></div>';
  };
  POST.saves = function () { var f = $('#impfile'); if (f) f.onchange = function () { if (f.files[0]) importSave(f.files[0]); }; };
  function aboutHtml() {
    return '<div class="card" style="max-width:900px"><h2>About Head Coach 26</h2><p>An unofficial, fan-made NFL head coach simulation inspired by <i>Head Coach 09</i>. You run the front office and call the plays; the players on the field are simulated.</p>' +
      '<h3 style="margin-top:16px">Data</h3><ul class="mut" style="line-height:1.7"><li><b>Rosters:</b> all 32 teams use real 2026 NFL rosters (active players, ' + HC_DATA.players.filter(function (p) { return p[4] !== 'FA'; }).length + ' players, pulled from ESPN\'s public roster and depth-chart feeds on ' + HC_DATA.fetched + '). The free-agent pool is made up of real practice-squad and surplus players.</li><li><b>Schedule:</b> the real 2026 regular-season schedule (all 272 games).</li><li><b>Ratings:</b> overall ratings, attributes, potential and contract figures are <b>the game\'s own estimates</b>. They come from depth-chart role, draft slot, experience, 2025/2026 production and reputation. They are not official numbers.</li><li><b>Salary cap:</b> $301.2M, the official 2026 NFL salary cap (rises about 6% per simulated season).</li><li><b>Draft classes</b> are fictional, generated prospects. College names are real schools.</li><li>No official NFL or team logos are used. Teams appear as colored badges with abbreviations; Washington uses an original feathers-and-spear badge.</li></ul>' +
      '<h3 style="margin-top:16px">How to Play</h3><ul class="mut" style="line-height:1.7"><li>Each week: handle the team meeting, set practice focus, then coach or quick-sim your game.</li><li>On game day, pick an offensive play when you have the ball and a defensive call when you don\'t. Matchups matter: the blitz is great against deep drops but gets burned by screens, prevent gives up the run, and so on.</li><li>Keep players happy: playing time, winning, contracts and your culture decisions move morale and chemistry.</li><li>Scout draft prospects all season. Ratings start out fuzzy and sharpen with every scouting level.</li><li>After the Super Bowl, run the Draft, re-sign key players, and start the next season.</li></ul></div>';
  }
  VIEWS.about = aboutHtml;
