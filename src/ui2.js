  // ---------- dashboard ----------
  function gauge(v, label, color) {
    var r = 62, c = 2 * Math.PI * r, off = c * (1 - v / 100);
    return '<div class="gauge"><svg width="150" height="150"><circle cx="75" cy="75" r="' + r + '" stroke="#1c2638" stroke-width="12" fill="none"/><circle cx="75" cy="75" r="' + r + '" stroke="' + color + '" stroke-width="12" fill="none" stroke-linecap="round" stroke-dasharray="' + c + '" stroke-dashoffset="' + off + '" style="transition:stroke-dashoffset 1s ease;filter:drop-shadow(0 0 6px ' + color + ')"/></svg><div class="v"><b>' + Math.round(v) + '</b><span>' + label + '</span></div></div>';
  }
  function chemColor(v) { return v >= 65 ? '#22c55e' : v >= 45 ? '#eab308' : '#ef4444'; }
  function cmpRow(label, a, b, ca, cb) {
    var mx = Math.max(a, b, 1);
    return '<div class="cmp"><b class="r">' + Math.round(a) + '</b><div class="l"><i style="width:' + (a / mx * 100) + '%;background:' + ca + '"></i></div><span class="c mut">' + label + '</span><div class="rr"><i style="width:' + (b / mx * 100) + '%;background:' + cb + '"></i></div><b>' + Math.round(b) + '</b></div>';
  }
  function matchupCard(g, title, playoff) {
    var me = G.user.ab, opp = g.h === me ? g.a : g.h, T = G.teams[me], O = G.teams[opp];
    var um = HC.units(G, me, g.h === me), uo = HC.units(G, opp, g.h === opp), om = HC.teamOvr(G, me), oo = HC.teamOvr(G, opp);
    var ca = accent(T), cb = accent(O);
    var h = '<div class="card"><div class="hd"><h3>' + title + '</h3><span class="sp"></span><span class="pill">' + (g.neutral ? 'Neutral site' : g.h === me ? '🏠 Home' : '✈️ Away') + '</span></div>';
    h += '<div class="matchup"><div class="mteam">' + badge(me, 70) + '<div><div class="n">' + esc(T.name) + '</div><div class="rec">' + HC.rec(T) + ' · OVR ' + om.ovr + '</div></div></div><div class="vs">VS</div><div class="mteam rt">' + badge(opp, 70) + '<div><div class="n">' + esc(O.name) + '</div><div class="rec">' + HC.rec(O) + ' · OVR ' + oo.ovr + '</div></div></div></div>';
    h += cmpRow('Passing', um.pass * .55 + um.recv * .45, uo.pass * .55 + uo.recv * .45, ca, cb) + cmpRow('Rushing', um.rush * .5 + um.rblk * .5, uo.rush * .5 + uo.rblk * .5, ca, cb) + cmpRow('Pass Pro', um.pblk, uo.pblk, ca, cb) + cmpRow('Pass Rush', um.prs, uo.prs, ca, cb) + cmpRow('Run Defense', um.rdef, uo.rdef, ca, cb) + cmpRow('Coverage', um.cov, uo.cov, ca, cb);
    var oq = G.players[O.depth.QB[0]], os = HC.teamPlayers(G, opp).sort(function (a, b) { return b.ovr - a.ovr; })[0];
    h += '<div class="mut" style="font-size:12px;margin-top:12px">Scouting report: ' + esc(O.name) + ' QB ' + nm(oq) + ' (' + oq.ovr + ') · Best player: ' + os.pos + ' ' + nm(os) + ' (' + os.ovr + ')</div>';
    var block = G.user.pendingEvent ? ' disabled title="Handle the team meeting first"' : '';
    h += '<div class="row" style="margin-top:16px"><button class="btn pri big" data-act="play"' + block + '>🏈 Coach the Game</button><button class="btn big" data-act="quicksim"' + block + '>⚡ Quick Sim</button>' + (G.user.pendingEvent ? '<span class="warn" style="font-size:12px">Resolve the team meeting first</span>' : '') + '</div></div>';
    return h;
  }
  VIEWS.dash = function () {
    if (G.phase === 'playoffs') return vPlayoffs();
    if (G.phase === 'draft') return vDraft();
    if (G.phase === 'offseason') return vOffseason();
    var me = G.user.ab, T = G.teams[me], g = HC.userGame(G), h = '<div class="grid" style="grid-template-columns:1.5fr 1fr">';
    h += '<div class="col">';
    if (g && g.hs === null) h += matchupCard(g, 'Week ' + G.week + ' Matchup');
    else if (g) h += '<div class="card"><h3>Week ' + G.week + '</h3><p>Game complete.</p><button class="btn pri big" data-act="advance">Advance to Week ' + (G.week + 1) + ' →</button></div>';
    else h += '<div class="card"><div class="hd"><h3>Week ' + G.week + '</h3></div><h2>Bye Week</h2><p class="mut">No game this week. Your players rest (injuries heal) and practice continues.</p><button class="btn pri big" data-act="advance">Advance to Week ' + (G.week + 1) + ' →</button></div>';
    // tasks
    var ev = G.user.pendingEvent, F = FOCUS[G.user.focus];
    h += '<div class="card"><div class="hd"><h3>This Week\'s Checklist</h3></div>';
    h += '<div class="task' + (ev ? ' need' : '') + '"><div class="ic">🗣️</div><div class="sp"><b>' + (ev ? esc(ev.title) : 'Team meeting handled') + '</b><div class="mut" style="font-size:12px">' + (ev ? 'A locker-room situation needs your decision.' : 'Culture decisions shape chemistry, discipline and development.') + '</div></div>' + (ev ? '<button class="btn pri sm" data-act="event">Decide</button>' : '<span class="good">✓</span>') + '</div>';
    h += '<div class="task"><div class="ic">' + F.i + '</div><div class="sp"><b>Practice: ' + F.n + ' · ' + G.user.intensity.charAt(0).toUpperCase() + G.user.intensity.slice(1) + ' intensity</b><div class="mut" style="font-size:12px">' + F.d + '</div></div><button class="btn sm" data-act="nav" data-arg="practice">Change</button></div>';
    var unhappy = HC.teamPlayers(G, me).filter(function (p) { return p.mor < 45; }).length, exp = HC.teamPlayers(G, me).filter(function (p) { return p.yrs === 1 && p.ovr >= 75; }).length;
    h += '<div class="task"><div class="ic">😤</div><div class="sp"><b>' + unhappy + ' unhappy player' + (unhappy === 1 ? '' : 's') + '</b><div class="mut" style="font-size:12px">Low morale slows development and raises contract demands.</div></div><button class="btn sm" data-act="nav" data-arg="locker">View</button></div>';
    h += '<div class="task"><div class="ic">📝</div><div class="sp"><b>' + exp + ' key player' + (exp === 1 ? '' : 's') + ' in a contract year</b><div class="mut" style="font-size:12px">Extend them before they hit free agency after the season.</div></div><button class="btn sm" data-act="nav" data-arg="cap">Contracts</button></div>';
    h += '</div>';
    h += '<div class="card"><div class="hd"><h3>League News</h3></div><div class="news">' + G.news.slice(0, 30).map(function (n) { return '<div><span class="wk">' + esc(n.w) + '</span><span class="' + n.tag + '">' + esc(n.s) + '</span></div>'; }).join('') + '</div></div>';
    h += '</div><div class="col">';
    h += '<div class="card"><div class="hd"><h3>Team Culture</h3></div><div class="row" style="gap:20px">' + gauge(T.chem, 'Chemistry', chemColor(T.chem)) + '<div class="sp">' + pillars() + '</div></div></div>';
    var div = HC.standings(G, null, T.div);
    h += '<div class="card"><div class="hd"><h3>' + T.div + '</h3></div><table class="t"><tr><th>Team</th><th>W-L-T</th><th>PF</th><th>PA</th></tr>' + div.map(function (t) { return '<tr class="' + (t.ab === me ? 'me' : '') + '"><td><div class="row" style="gap:8px">' + badge(t.ab, 24) + esc(t.name) + '</div></td><td>' + HC.rec(t) + '</td><td>' + t.pf + '</td><td>' + t.pa + '</td></tr>'; }).join('') + '</table></div>';
    var stars = HC.teamPlayers(G, me).sort(function (a, b) { return b.ovr - a.ovr; }).slice(0, 6);
    h += '<div class="card"><div class="hd"><h3>Franchise Players</h3></div>' + stars.map(function (p) { return '<div class="row cl" style="padding:6px 0;cursor:pointer" data-act="player" data-arg="' + p.id + '">' + ovr(p.ovr) + '<span class="tag">' + p.pos + '</span><span class="sp">' + nm(p) + '</span>' + morBar(p.mor) + '</div>'; }).join('') + '</div>';
    h += '</div></div>';
    return h;
  };
  POST.dash = function () { if (G.phase === 'regular' && G.user.pendingEvent && S.autoEvent !== G.season + '-' + G.week) { S.autoEvent = G.season + '-' + G.week; setTimeout(function () { openEvent(G.user.pendingEvent, false); }, 350); } if (G.phase === 'draft') POST.draft(); };
  function pillars() {
    var u = G.user;
    function p(n, v, c, d) { return '<div class="pillar" title="' + d + '"><div class="row"><span>' + n + '</span><span>' + Math.round(v) + '</span></div>' + bar(v, c) + '</div>'; }
    return p('Discipline', u.disc, '#60a5fa', 'Fewer turnovers & mistakes on game day') + p('Unity', u.unity, '#34d399', 'Boosts morale & chemistry every week') + p('Development', u.dev, '#f472b6', 'Faster player progression in practice');
  }
  // ---------- events ----------
  function openEvent(ev, isPress, after) {
    if (!ev) return;
    var who = ev.who && G.players[ev.who];
    var h = '<div class="ov" id="ov"><div class="modal"><div class="mh">' + (who ? '<div class="bigovr" style="width:64px;height:64px;background:' + G.teams[G.user.ab].c1 + '"><b style="font-size:28px">' + who.ovr + '</b><span>' + who.pos + '</span></div>' : '<div class="badge" style="width:56px;height:56px;background:#1b2740;font-size:26px">' + (isPress ? '🎤' : '🗣️') + '</div>') + '<div><div class="mut" style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:700">' + (isPress ? 'Media Room' : 'Locker Room · Week ' + G.week) + '</div><h2>' + esc(ev.title) + '</h2></div></div><div class="mb"><p style="font-size:15px;line-height:1.55;margin-top:0">' + esc(ev.text) + '</p>';
    ev.ch.forEach(function (c, i) { h += '<button class="choice" data-act="choose" data-arg="' + i + '"><b>' + esc(c.l) + '</b><span>' + esc(c.d) + '</span></button>'; });
    h += '</div></div></div>';
    document.body.insertAdjacentHTML('beforeend', h);
    S.evCtx = { ev: ev, isPress: isPress, after: after };
  }
  function closeOv() { var o = $('#ov'); if (o) o.remove(); }
  // ---------- roster ----------
  var GROUPS = { ALL: null, OFF: HC.OFF, DEF: HC.DEF, ST: { K: 1, P: 1, LS: 1 } };
  function filterPos(p, f) { if (f === 'ALL') return true; if (GROUPS[f]) return !!GROUPS[f][p.pos]; return p.pos === f; }
  function sortList(list, key) {
    var s = S.sort, get = { ovr: function (p) { return p.ovr; }, pot: function (p) { return p.pot; }, age: function (p) { return p.age; }, sal: function (p) { return p.sal; }, yrs: function (p) { return p.yrs; }, mor: function (p) { return p.mor; }, name: function (p) { return p.ln; }, pos: function (p) { return HC.POS_ORDER.indexOf(p.pos) * 100 - p.ovr; }, ask: function (p) { return p._ask || 0; }, prog: function (p) { return p.prog || 0; } }[s.k] || function (p) { return p.ovr; };
    return list.sort(function (a, b) { var x = get(a), y = get(b); return (x > y ? 1 : x < y ? -1 : 0) * s.d; });
  }
  function th(k, label) { return '<th data-act="sort" data-arg="' + k + '">' + label + (S.sort.k === k ? (S.sort.d < 0 ? ' ▼' : ' ▲') : '') + '</th>'; }
  function chips(cur, act) {
    var opts = ['ALL', 'OFF', 'DEF', 'ST'].concat(HC.POS_ORDER);
    return '<div class="chips">' + opts.map(function (o) { return '<span class="chip' + (cur === o ? ' on' : '') + '" data-act="' + act + '" data-arg="' + o + '">' + (o === 'ALL' ? 'All' : o === 'OFF' ? 'Offense' : o === 'DEF' ? 'Defense' : o === 'ST' ? 'Special Teams' : o) + '</span>'; }).join('') + '</div>';
  }
  function starterSet(ab) { var L = HC.lineup(G, ab), s = {}; for (var k in L) L[k].forEach(function (p) { s[p.id] = 1; }); return s; }
  function status(p) { var s = []; if (p.inj) s.push('<span class="tag" style="background:#4a1d24;color:#fecaca">INJ ' + p.inj + 'w</span>'); if (p.rookie || p.exp === 0) s.push('<span class="tag" style="background:#1d3a2a;color:#bbf7d0">ROOKIE</span>'); if (p.yrs === 1) s.push('<span class="tag" style="background:#3a2f12;color:#fde68a">CONTRACT YR</span>'); if (p.wantsSnaps) s.push('<span class="tag">WANTS SNAPS</span>'); if (!p.real) s.push('<span class="tag" title="Generated player">GEN</span>'); return s.join(' '); }
  VIEWS.roster = function () {
    var me = G.user.ab, st = starterSet(me), list = sortList(HC.teamPlayers(G, me).filter(function (p) { return filterPos(p, S.rosterFilter); }));
    var h = '<div class="row" style="margin-bottom:14px"><h2>Roster</h2><span class="pill">' + HC.teamPlayers(G, me).length + ' / ' + HC.rosterLimit(G) + ' players</span><span class="sp"></span><span class="mut" style="font-size:12px">Click a player for his card. Highlighted rows are starters.</span></div>' + chips(S.rosterFilter, 'rfilter');
    h += '<div class="card flat" style="margin-top:14px"><div class="tw"><table class="t"><thead><tr><th>#</th>' + th('name', 'Player') + th('pos', 'Pos') + th('age', 'Age') + th('ovr', 'OVR') + th('pot', 'POT') + th('prog', 'Δ Season') + th('mor', 'Morale') + th('sal', 'Salary') + th('yrs', 'Yrs') + '<th>Status</th></tr></thead><tbody>';
    list.forEach(function (p) {
      var d = p.prog || 0;
      h += '<tr class="cl' + (st[p.id] ? ' st' : '') + '" data-act="player" data-arg="' + p.id + '"><td class="dim">' + esc(p.num) + '</td><td><b>' + nm(p) + '</b></td><td><span class="tag">' + p.pos + '</span></td><td>' + p.age + '</td><td>' + ovr(p.ovr) + '</td><td>' + HC.potGrade(p.pot) + '</td><td class="' + (d > .05 ? 'good' : d < -.05 ? 'bad' : 'dim') + '">' + (d > 0 ? '+' : '') + d.toFixed(1) + '</td><td>' + morBar(p.mor) + '</td><td>' + fmtM(p.sal) + '</td><td>' + p.yrs + '</td><td>' + status(p) + '</td></tr>';
    });
    h += '</tbody></table></div></div>';
    return h;
  };
  // ---------- depth chart ----------
  VIEWS.depth = function () {
    var me = G.user.ab, T = G.teams[me]; HC.syncDepth(G, me);
    var h = '<div class="row" style="margin-bottom:14px"><h2>Depth Chart</h2><span class="sp"></span><span class="mut" style="font-size:12px">Starters are highlighted. Benching a good player hurts his morale.</span><button class="btn" data-act="autodepth">Auto-sort by OVR</button></div><div class="grid g4">';
    HC.POS_ORDER.forEach(function (pos) {
      var n = HC.LINEUP[pos] || 1, ids = T.depth[pos] || [];
      h += '<div class="card" style="padding:14px"><div class="hd" style="margin-bottom:8px"><h3>' + pos + '</h3><span class="sp"></span><span class="dim" style="font-size:11px">' + n + ' starter' + (n > 1 ? 's' : '') + '</span></div>';
      ids.forEach(function (id, i) {
        var p = G.players[id];
        h += '<div class="row" style="gap:8px;padding:5px 6px;border-radius:8px;margin-bottom:3px;' + (i < n ? 'background:color-mix(in srgb,var(--acc) 16%,transparent);' : '') + (p.inj ? 'opacity:.55' : '') + '"><span class="dim" style="width:14px;font-size:11px">' + (i + 1) + '</span>' + ovr(p.ovr) + '<span class="sp" style="cursor:pointer;font-size:13px" data-act="player" data-arg="' + p.id + '">' + esc(p.fn.charAt(0) + '. ' + p.ln) + (p.inj ? ' <span class="bad">(inj)</span>' : '') + '</span><button class="btn sm ghost" style="padding:2px 7px" data-act="dup" data-arg="' + pos + ':' + i + '"' + (i === 0 ? ' disabled' : '') + '>▲</button><button class="btn sm ghost" style="padding:2px 7px" data-act="ddown" data-arg="' + pos + ':' + i + '"' + (i === ids.length - 1 ? ' disabled' : '') + '>▼</button></div>';
      });
      h += '</div>';
    });
    return h + '</div>';
  };
  // ---------- player card ----------
  function openPlayer(id) {
    var p = G.players[id]; if (!p) return;
    var t = G.teams[p.tm] || { c1: '#334155', c2: '#94a3b8', name: p.tm === 'FA' ? 'Free Agent' : 'Draft Prospect', city: '' };
    var me = G.user.ab, mine = p.tm === me, isP = p.tm === 'DRAFT';
    var sv = isP ? HC.scoutView(p) : null;
    var h = '<div class="ov" id="ov"><div class="modal"><div class="pcard-top" style="--c1:' + t.c1 + '"><span class="num">' + esc(p.num || p.pos) + '</span>' +
      '<div class="bigovr"><b>' + (isP ? (sv.exact ? p.ovr : sv.lo + '-' + sv.hi) : p.ovr) + '</b><span>OVR</span></div><div style="position:relative;z-index:1"><div style="font-size:12px;opacity:.8;font-weight:700;letter-spacing:.1em;text-transform:uppercase">' + p.pos + ' · ' + esc(t.city + ' ' + t.name) + '</div><div style="font-family:var(--cond);font-size:38px;font-weight:900;text-transform:uppercase;line-height:1">' + nm(p) + '</div><div style="font-size:12.5px;opacity:.85;margin-top:4px">' + (p.real ? 'Real player' : 'Generated player') + ' · ' + esc(p.col || '—') + ' · ' + esc(p.draft || (isP ? 'Draft prospect' : '')) + '</div></div><button class="x" data-act="close">✕</button></div><div class="mb">';
    h += '<div class="kv"><div><span>Age</span><b>' + p.age + '</b></div><div><span>Experience</span><b>' + (p.exp === 0 ? 'Rookie' : p.exp + ' yrs') + '</b></div><div><span>Height / Weight</span><b>' + ht(p.ht) + ' · ' + p.wt + '</b></div><div><span>Potential</span><b>' + (isP ? sv.pot + (sv.exact ? '' : ' (est.)') : HC.potGrade(p.pot) + ' <span class="mut" style="font-size:12px">(' + p.pot + ')</span>') + '</b></div>';
    if (!isP) h += '<div><span>Contract</span><b>' + (p.tm === 'FA' ? '—' : fmtM(p.sal) + ' × ' + p.yrs) + '</b></div><div><span>Market Value</span><b>' + fmtM(HC.marketValue(p)) + '</b></div><div><span>Morale</span><b style="color:' + chemColor(p.mor) + '">' + Math.round(p.mor) + '</b></div><div><span>Season Δ</span><b class="' + ((p.prog || 0) >= 0 ? 'good' : 'bad') + '">' + ((p.prog || 0) >= 0 ? '+' : '') + (p.prog || 0).toFixed(1) + '</b></div>';
    else h += '<div><span>40-yard dash</span><b>' + p.forty + 's</b></div><div><span>Media Rank</span><b>#' + p.media + '</b></div><div><span>Scouting Level</span><b>' + sv.lv + ' / 3</b></div><div><span>Status</span><b>' + (p.inj ? 'Injured' : 'Healthy') + '</b></div>';
    h += '</div><div class="grid g2" style="margin-top:18px"><div><h3 style="margin-bottom:10px">Attributes</h3>';
    for (var k in HC.ATTR[p.pos]) {
      var v = Math.round(p.a[k]), shown = v;
      if (isP && !sv.exact) { var w = [12, 7, 3][sv.lv]; shown = null; h += '<div class="attr"><span class="mut">' + HC.ATTR_NAMES[k] + '</span>' + bar(50, '#334155') + '<b class="dim">??</b></div>'; continue; }
      h += '<div class="attr"><span class="mut">' + HC.ATTR_NAMES[k] + '</span>' + bar(v, v >= 85 ? '#22c55e' : v >= 70 ? '#3b82f6' : '#64748b') + '<b>' + shown + '</b></div>';
    }
    if (isP && !sv.exact) h += '<div class="dim" style="font-size:12px">Scout him fully to reveal exact attributes.</div>';
    h += '</div><div><h3 style="margin-bottom:10px">' + G.season + ' Stats</h3>' + statLines(p) + '</div></div>';
    h += '</div><div class="mf">';
    if (mine) {
      h += '<button class="btn" data-act="negotiate" data-arg="' + p.id + '">✍️ Extend / Re-sign</button><button class="btn danger" data-act="release" data-arg="' + p.id + '">Release (dead cap ' + fmtM(HC.deadCap(p)) + ')</button>';
      h += '<button class="btn" data-act="promote" data-arg="' + p.id + '">⬆ Make starter</button>';
    } else if (p.tm === 'FA') h += '<button class="btn pri" data-act="negotiate" data-arg="' + p.id + '">✍️ Negotiate Contract</button>';
    else if (isP) h += '<button class="btn" data-act="scout" data-arg="' + p.id + '"' + (sv.exact ? ' disabled' : '') + '>🔍 Scout (' + (sv.exact ? 'done' : HC.SC_COST[sv.lv] + ' pts') + ')</button>' + (G.phase === 'draft' && G.draft.order[G.draft.cur].ab === me ? '<button class="btn pri" data-act="dpick" data-arg="' + p.id + '">Draft Him</button>' : '');
    h += '<button class="btn ghost" data-act="close">Close</button></div></div></div>';
    closeOv(); document.body.insertAdjacentHTML('beforeend', h);
  }
  function statLines(p) {
    var s = p.st || {}, rows = [];
    function r(l, v) { rows.push('<tr><td class="mut">' + l + '</td><td class="r"><b>' + v + '</b></td></tr>'); }
    r('Games', s.gp || 0);
    if (p.pos === 'QB') { r('Comp / Att', (s.pc || 0) + ' / ' + (s.pa || 0)); r('Pass Yards', s.py || 0); r('TD / INT', (s.ptd || 0) + ' / ' + (s.int || 0)); }
    if (s.ra) { r('Rushes', s.ra); r('Rush Yards', s.ry || 0); r('Rush TD', s.rtd || 0); }
    if (s.rec) { r('Receptions', s.rec); r('Rec Yards', s.recy || 0); r('Rec TD', s.rectd || 0); }
    if (HC.DEF[p.pos]) { r('Tackles', s.tkl || 0); r('Sacks', s.sck || 0); r('Interceptions', s.dint || 0); r('Passes Defended', s.pd || 0); }
    if (p.pos === 'K') { r('FG', (s.fgm || 0) + ' / ' + (s.fga || 0)); r('XP', (s.xpm || 0) + ' / ' + (s.xpa || 0)); }
    return '<table class="t boxs">' + rows.join('') + '</table>';
  }
