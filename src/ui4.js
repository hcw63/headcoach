  // ---------- playoffs ----------
  function vPlayoffs() {
    var P = G.playoffs, me = G.user.ab, ug = HC.userGame(G), alive = HC.userAlive(G);
    var h = '<div class="row" style="margin-bottom:14px"><h2>' + G.season + ' NFL Playoffs</h2><span class="pill">' + HC.roundName(P.round) + '</span><span class="sp"></span>';
    h += (ug && ug.hs === null) ? '' : '<button class="btn pri big" data-act="simround">' + (P.round === 3 ? 'Play the Super Bowl →' : 'Sim ' + HC.roundName(P.round) + ' →') + '</button>';
    h += '</div>';
    if (ug && ug.hs === null) h += matchupCard(ug, HC.roundName(P.round), true).replace('Quick Sim', 'Quick Sim');
    else if (!alive) h += '<div class="card" style="margin-bottom:16px"><b>' + (P.seeds.AFC.concat(P.seeds.NFC).indexOf(me) < 0 ? 'Your season is over: you missed the playoffs.' : 'Your season is over: eliminated in the ' + HC.roundName((P.elim[me] || 1) - 1) + '.') + '</b> <span class="mut">Sim the rest of the playoffs to reach the Draft. Use the time to scout prospects.</span></div>';
    h += '<div class="bracket" style="margin-top:16px">';
    for (var r = 0; r < 4; r++) {
      h += '<div><h3 style="margin-bottom:10px">' + HC.roundName(r) + '</h3>';
      if (r === 0) ['AFC', 'NFC'].forEach(function (c) { h += '<div class="bg" style="opacity:.85"><div class="bt">' + badge(P.seeds[c][0], 22) + '<span>' + esc(G.teams[P.seeds[c][0]].name) + '</span><b class="dim" style="font-size:12px">#1 BYE</b></div></div>'; });
      (P.rounds[r] || []).forEach(function (g) {
        var done = g.hs !== null, hw = done && g.hs > g.as;
        function line(ab, s, w) { var conf = g.conf === 'SB' ? G.teams[ab].conf : g.conf, seed = P.seeds[conf].indexOf(ab) + 1; return '<div class="bt ' + (done ? (w ? 'w' : 'l') : '') + '" style="' + (ab === me ? 'color:var(--gold)' : '') + '">' + badge(ab, 22) + '<span class="dim" style="font-size:11px">' + seed + '</span><span>' + esc(G.teams[ab].name) + '</span><b>' + (done ? s : '') + '</b></div>'; }
        h += '<div class="bg">' + line(g.a, g.as, done && !hw) + line(g.h, g.hs, hw) + '</div>';
      });
      h += '</div>';
    }
    h += '</div>';
    if (P.champ) h += '<div class="card c" style="margin-top:16px"><h2>🏆 ' + esc(G.teams[P.champ].city + ' ' + G.teams[P.champ].name) + ' win Super Bowl LXI</h2></div>';
    return h;
  }
  // ---------- draft & scouting ----------
  VIEWS.draft = function () { return vDraft(); };
  function vDraft() {
    var me = G.user.ab, inDraft = G.phase === 'draft', D = G.draft;
    var list = G.dclass.map(function (id) { return G.players[id]; }).filter(function (p) { return p && p.tm === 'DRAFT' && filterPos(p, S.draftFilter); });
    var h = '';
    if (inDraft) {
      var o = D.order[D.cur], T = G.teams[o.ab], myTurn = o.ab === me;
      var myNext = D.order.slice(D.cur).filter(function (x) { return x.ab === me; })[0];
      h += '<div class="clockbanner" style="--c1:' + T.c1 + '">' + badge(o.ab, 60) + '<div><div style="font-size:12px;letter-spacing:.14em;font-weight:700;opacity:.8">ROUND ' + o.r + ' · PICK ' + o.n + ' (#' + ((o.r - 1) * 32 + o.n) + ' overall)</div><div style="font-family:var(--cond);font-size:32px;font-weight:900;text-transform:uppercase;line-height:1">' + (myTurn ? 'You are on the clock!' : esc(T.city + ' ' + T.name) + ' on the clock') + '</div><div style="font-size:12px;opacity:.8">' + (myNext ? 'Your next pick: #' + ((myNext.r - 1) * 32 + myNext.n) : 'You have no picks left') + ' · Rookie deal at this slot: ' + fmtM(HC.rookieDeal(o)) + ' × 4</div></div><span class="sp"></span>';
      h += myTurn ? '<button class="btn big" data-act="dauto">Auto-pick (BPA)</button>' : '<button class="btn pri big" data-act="dsim">' + (myNext ? 'Sim to My Pick ⏭' : 'Finish Draft ⏭') + '</button><button class="btn big" data-act="dnext">Next Pick</button>';
      h += '</div>';
      var recent = D.order.slice(Math.max(0, D.cur - 12), D.cur).reverse();
      if (recent.length) h += '<div class="ticker" style="margin-bottom:14px">' + recent.map(function (x) { var p = G.players[x.pid]; return '<div style="' + (x.ab === me ? 'border-color:var(--gold)' : '') + '"><span class="dim">#' + ((x.r - 1) * 32 + x.n) + '</span> ' + badge(x.ab, 18) + ' <b>' + p.pos + '</b> ' + esc(p.fn.charAt(0) + '. ' + p.ln) + '</div>'; }).join('') + '</div>';
    } else {
      h += '<div class="row" style="margin-bottom:10px"><h2>' + (G.season + 1) + ' Draft Class · Scouting</h2><span class="sp"></span></div><div class="mut" style="font-size:13px;margin-bottom:12px">Ratings start as wide estimates. Each scouting level narrows them (costs 3 / 4 / 6 points). You earn 8 scouting points per week. The Draft starts after the Super Bowl. Draft order is by record.</div>';
    }
    h += '<div class="row" style="margin-bottom:12px"><span class="pill" style="font-size:13px">🔍 Scouting points: <b style="color:#fff">' + G.user.sp + '</b></span><span class="sp"></span>' + chips(S.draftFilter, 'dfilter') + '</div>';
    h += '<div class="card flat"><div class="tw"><table class="t"><thead><tr><th>Rank</th><th>Prospect</th><th>Pos</th><th>College</th><th>Ht / Wt</th><th>40</th><th>Est. OVR</th><th>POT</th><th>Scouted</th><th></th></tr></thead><tbody>';
    list.slice(0, 200).forEach(function (p) {
      var v = HC.scoutView(p), myTurn = inDraft && D.order[D.cur].ab === me;
      h += '<tr class="cl" data-act="player" data-arg="' + p.id + '"><td class="dim">' + p.media + '</td><td><b>' + nm(p) + '</b></td><td><span class="tag">' + p.pos + '</span></td><td class="mut">' + esc(p.col) + '</td><td>' + ht(p.ht) + ' / ' + p.wt + '</td><td>' + p.forty.toFixed(2) + '</td><td>' + (v.exact ? ovr(p.ovr) : '<span class="ovr o0" style="min-width:58px">' + v.lo + '-' + v.hi + '</span>') + '</td><td><b>' + v.pot + '</b>' + (v.exact ? '' : '<span class="dim">?</span>') + '</td><td>' + '●●●'.split('').map(function (c, i) { return '<span style="color:' + (i < v.lv ? 'var(--gold)' : '#334155') + '">●</span>'; }).join('') + '</td><td class="r">' + (v.exact ? '' : '<button class="btn sm" data-act="scout" data-arg="' + p.id + '">Scout ' + HC.SC_COST[v.lv] + '</button> ') + (myTurn ? '<button class="btn sm pri" data-act="dpick" data-arg="' + p.id + '">Draft</button>' : '') + '</td></tr>';
    });
    h += '</tbody></table></div></div>';
    return h;
  }
  POST.draft = function () {};
  // ---------- offseason ----------
  function vOffseason() {
    var me = G.user.ab, T = G.teams[me], P = G.playoffs, el = P ? (P.elim[me] || 0) : 0;
    var fin = el === 5 ? '🏆 Super Bowl Champions' : el === 4 ? 'Lost in the Super Bowl' : el === 3 ? 'Lost in the Conference Championship' : el === 2 ? 'Lost in the Divisional Round' : el === 1 ? 'Lost in the Wild Card Round' : 'Missed the playoffs';
    var rookies = HC.teamPlayers(G, me).filter(function (p) { return p.rookie; }).sort(function (a, b) { return b.ovr - a.ovr; });
    var exp = HC.expiring(G, me).sort(function (a, b) { return b.ovr - a.ovr; });
    var n = HC.teamPlayers(G, me).length;
    var h = '<div class="hero" style="--c1:' + T.c1 + ';--c2:' + T.c2 + ';margin-bottom:16px"><div class="row">' + badge(me, 70) + '<div><div style="font-size:12px;letter-spacing:.14em;font-weight:700;opacity:.8">' + G.season + ' SEASON IN REVIEW</div><div style="font-family:var(--cond);font-size:40px;font-weight:900;text-transform:uppercase;line-height:1">' + HC.rec(T) + ' · ' + fin + '</div><div style="opacity:.85">Champion: ' + (P && P.champ ? esc(G.teams[P.champ].city + ' ' + G.teams[P.champ].name) : '—') + ' · Final chemistry ' + Math.round(T.chem) + '</div></div></div></div>';
    h += '<div class="grid g2"><div class="card"><div class="hd"><h3>Your ' + G.draft.year + ' Draft Class</h3></div>' + rookies.map(function (p) { return '<div class="row" style="padding:6px 0;cursor:pointer" data-act="player" data-arg="' + p.id + '">' + ovr(p.ovr) + '<span class="tag">' + p.pos + '</span><span class="sp">' + nm(p) + ' <span class="dim">' + esc(p.col) + '</span></span><span class="mut">' + esc(p.draft) + '</span><b>POT ' + HC.potGrade(p.pot) + '</b></div>'; }).join('') + '</div>';
    h += '<div class="card"><div class="hd"><h3>Expiring Contracts</h3><span class="sp"></span><span class="mut" style="font-size:12px">Unsigned players leave when the new season starts</span></div>' + (exp.length ? exp.slice(0, 16).map(function (p) { return '<div class="row" style="padding:5px 0">' + ovr(p.ovr) + '<span class="tag">' + p.pos + '</span><span class="sp" style="cursor:pointer" data-act="player" data-arg="' + p.id + '">' + nm(p) + ' <span class="dim">age ' + p.age + '</span></span><span class="mut">' + fmtM(HC.marketValue(p)) + '</span><button class="btn sm pri" data-act="negotiate" data-arg="' + p.id + '">Re-sign</button></div>'; }).join('') : '<div class="empty">Nobody is expiring.</div>') + '</div></div>';
    h += '<div class="card" style="margin-top:16px"><div class="row"><div><h3>Ready for ' + (G.season + 1) + '?</h3><div class="mut" style="font-size:13px;margin-top:4px">Roster: ' + n + ' players (offseason limit 90; it is cut to 53 automatically, lowest OVR first, keeping position minimums). Players age, develop or decline, and veterans may retire.</div></div><span class="sp"></span><button class="btn pri big" data-act="newseason">Begin ' + (G.season + 1) + ' Season →</button></div></div>';
    return h;
  }
