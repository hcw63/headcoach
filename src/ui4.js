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
      h += '<div class="clockbanner" style="--c1:' + T.c1 + '">' + badge(o.ab, 60) + '<div><div style="font-size:12px;letter-spacing:.14em;font-weight:700;opacity:.8">ROUND ' + o.r + ' · PICK ' + o.n + ' (#' + ((o.r - 1) * 32 + o.n) + ' overall)' + (o.orig && o.orig !== o.ab ? ' · VIA ' + o.orig : '') + '</div><div style="font-family:var(--cond);font-size:32px;font-weight:900;text-transform:uppercase;line-height:1">' + (myTurn ? 'You are on the clock!' : esc(T.city + ' ' + T.name) + ' on the clock') + '</div><div style="font-size:12px;opacity:.8">' + (myNext ? 'Your next pick: #' + ((myNext.r - 1) * 32 + myNext.n) : 'You have no picks left') + ' · Rookie deal at this slot: ' + fmtM(HC.rookieDeal(o)) + ' × 4</div></div><span class="sp"></span>';
      h += myTurn ? '<button class="btn big" data-act="dauto">Auto-pick (BPA)</button>' : '<button class="btn pri big" data-act="dsim">' + (myNext ? 'Sim to My Pick ⏭' : 'Finish Draft ⏭') + '</button><button class="btn big" data-act="dnext">Next Pick</button>';
      h += '</div>';
      var recent = D.order.slice(Math.max(0, D.cur - 12), D.cur).reverse();
      if (recent.length) h += '<div class="ticker" style="margin-bottom:14px">' + recent.map(function (x) { var p = G.players[x.pid]; return '<div style="' + (x.ab === me ? 'border-color:var(--gold)' : '') + '"><span class="dim">#' + ((x.r - 1) * 32 + x.n) + '</span> ' + badge(x.ab, 18) + ' <b>' + p.pos + '</b> ' + esc(p.fn.charAt(0) + '. ' + p.ln) + '</div>'; }).join('') + '</div>';
    } else {
      h += '<div class="row" style="margin-bottom:10px"><h2>' + (G.season + 1) + ' Draft Class · Scouting</h2><span class="sp"></span></div><div class="mut" style="font-size:13px;margin-bottom:12px">Ratings start as wide estimates. Each scouting level narrows them (costs 3 / 4 / 6 points). You earn 8 scouting points per week. The Draft starts after the Super Bowl. Draft order is by record (traded picks go to their new owner).</div>';
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
    h += '<div class="card"><div class="hd"><h3>Expiring Contracts</h3><span class="sp"></span><span class="mut" style="font-size:12px">Unsigned players leave when the new season starts</span></div>' + (exp.length ? exp.slice(0, 16).map(function (p) { return '<div class="row" style="padding:5px 0">' + ovr(p.ovr) + '<span class="tag">' + p.pos + '</span><span class="sp" style="cursor:pointer" data-act="player" data-arg="' + p.id + '">' + nm(p) + ' <span class="dim">age ' + p.age + '</span></span><span class="mut">' + fmtM(HC.marketValue(p)) + '</span><button class="btn sm pri" data-act="negotiate" data-arg="' + p.id + '">Re-sign</button></div>'; }).join('') : '<div class="empty">Nobody is expiring. Leftover free agents can still be signed in Free Agency, and trades are open.</div>') + '</div></div>';
    h += '<div class="card" style="margin-top:16px"><div class="row"><div><h3>Ready for ' + (G.season + 1) + '?</h3><div class="mut" style="font-size:13px;margin-top:4px">Roster: ' + n + ' players (offseason limit 90; it is cut to 53 automatically, lowest OVR first, keeping position minimums). Players age, develop or decline, and veterans may retire.</div></div><span class="sp"></span><button class="btn pri big" data-act="newseason">Begin ' + (G.season + 1) + ' Season →</button></div></div>';
    return h;
  }
  // ---------- trades ----------
  function trS() { if (!S.tr) S.tr = { team: null, give: { pl: [], pk: [] }, get: { pl: [], pk: [] }, tab: 'build', msg: '', counter: null, pf: 'ALL' }; return S.tr; }
  function pickById(id) { var a = G.picks || []; for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i]; return null; }
  function needsOf(ab) {
    var o = []; ['QB', 'RB', 'WR', 'TE', 'OT', 'G', 'C', 'EDGE', 'DT', 'LB', 'CB', 'S'].forEach(function (pos) {
      var n = HC.LINEUP[pos], ps = HC.teamPlayers(G, ab).filter(function (p) { return p.pos === pos; }).sort(function (a, b) { return b.ovr - a.ovr; });
      var w = ps.length >= n ? ps[n - 1].ovr : 40; if (w < 70) o.push([pos, w]);
    });
    return o.sort(function (a, b) { return a[1] - b[1]; }).slice(0, 5);
  }
  function dirTag(ab) { var d = HC.direction(G, ab); return '<span class="dtag d-' + d + '">' + HC.DIR_NAMES[d] + '</span>'; }
  function assetRow(p, side, inDeal) {
    return '<div class="ta' + (inDeal ? ' on' : '') + '" data-act="tadd" data-arg="' + side + ':pl:' + p.id + '">' + ovr(p.ovr) + '<span class="tag">' + p.pos + '</span><div class="tan"><b>' + esc(p.fn.charAt(0) + '. ' + p.ln) + '</b>' + (p.block ? ' <span class="ctag c-Attitude">BLOCK</span>' : '') + (p.tradeReq ? ' <span class="ctag c-Attitude">WANTS OUT</span>' : '') + '<div class="dim" style="font-size:11px">Age ' + p.age + ' · ' + fmtM(p.sal) + ' × ' + p.yrs + (p.pers && HC.PERS[p.pers] ? ' · ' + HC.PERS[p.pers].i + ' ' + HC.PERS[p.pers].n : '') + (p.inj ? ' · <span class="bad">INJ</span>' : '') + '</div></div><span class="tadd">' + (inDeal ? '✓' : '+') + '</span></div>';
  }
  function pickRow(k, side, inDeal) {
    return '<div class="ta' + (inDeal ? ' on' : '') + '" data-act="tadd" data-arg="' + side + ':pk:' + k.id + '"><span class="pkb">R' + k.r + '</span><div class="tan"><b>' + k.yr + ' Round ' + k.r + '</b><div class="dim" style="font-size:11px">' + (k.orig !== k.own ? 'Originally ' + esc(G.teams[k.orig].name) + "'" : esc(G.teams[k.orig].name) + "' own") + ' pick · value ≈ ' + fmtM(HC.pickValue(G, k)) + '</div></div><span class="tadd">' + (inDeal ? '✓' : '+') + '</span></div>';
  }
  function dealList(side, d) {
    var items = d.pl.map(function (id) { var p = G.players[id]; return p ? '<div class="di" data-act="tadd" data-arg="' + side + ':pl:' + id + '">' + ovr(p.ovr) + ' <span class="tag">' + p.pos + '</span> ' + esc(p.fn.charAt(0) + '. ' + p.ln) + ' <span class="dim">' + fmtM(p.sal) + '</span><span class="x">✕</span></div>' : ''; })
      .concat(d.pk.map(function (id) { var k = pickById(id); return k ? '<div class="di" data-act="tadd" data-arg="' + side + ':pk:' + id + '"><span class="pkb sm">R' + k.r + '</span> ' + k.yr + ' Round ' + k.r + (k.orig !== k.own ? ' <span class="dim">(' + k.orig + ')</span>' : '') + '<span class="x">✕</span></div>' : ''; }));
    return items.length ? items.join('') : '<div class="dim" style="font-size:12px;padding:8px 0">Tap players or picks to add.</div>';
  }
  function neutralValue(d) { var v = 0; d.pl.forEach(function (id) { if (G.players[id]) v += HC.playerValue(G.players[id]); }); d.pk.forEach(function (id) { var k = pickById(id); if (k) v += HC.pickValue(G, k); }); return v; }
  VIEWS.trade = function () {
    HC.migrate(G);
    var me = G.user.ab, T = trS(), closed = HC.tradeAllowed(G), offers = G.user.offers || [];
    var h = '<div class="row wrap" style="margin-bottom:14px"><h2>Trades</h2>';
    h += closed ? '<span class="pill" style="color:#fca5a5">' + esc(closed) + '</span>' : (G.phase === 'regular' ? '<span class="pill">Trade deadline: after Week ' + HC.TRADE_DEADLINE + ' · ' + (HC.TRADE_DEADLINE - G.week + 1) + ' week' + (HC.TRADE_DEADLINE - G.week ? 's' : '') + ' left</span>' : '<span class="pill">Offseason trading is open</span>');
    h += '<span class="sp"></span><div class="seg big"><button class="' + (T.tab === 'build' ? 'on' : '') + '" data-act="ttab" data-arg="build">🔁 Build a Trade</button><button class="' + (T.tab === 'block' ? 'on' : '') + '" data-act="ttab" data-arg="block">📢 Trade Block & Offers' + (offers.length ? ' (' + offers.length + ')' : '') + '</button></div></div>';
    if (T.tab === 'block') return h + tradeBlockView();
    if (!T.team) T.team = G.order.filter(function (ab) { return ab !== me; })[0];
    h += '<div class="tpick">' + G.order.filter(function (ab) { return ab !== me; }).map(function (ab) { return '<button class="' + (T.team === ab ? 'on' : '') + '" data-act="tteam" data-arg="' + ab + '">' + badge(ab, 34) + '<span>' + ab + '</span></button>'; }).join('') + '</div>';
    var O = G.teams[T.team], nd = needsOf(T.team);
    h += '<div class="card" style="margin:12px 0;padding:12px 16px"><div class="row wrap" style="gap:14px">' + badge(T.team, 40) + '<div><b style="font-size:17px">' + esc(O.city + ' ' + O.name) + '</b><div class="mut" style="font-size:12px">' + HC.rec(O) + ' · Cap space ' + fmtM(HC.capSpace(G, T.team)) + ' · Roster ' + HC.teamPlayers(G, T.team).length + '</div></div>' + dirTag(T.team) + '<span class="sp"></span><div class="mut" style="font-size:12px">Needs: ' + (nd.length ? nd.map(function (x) { return '<b style="color:#fde68a">' + x[0] + '</b>'; }).join(', ') : 'none obvious') + '</div></div></div>';
    var mine = HC.teamPlayers(G, me).sort(function (a, b) { return b.ovr - a.ovr; }), theirs = HC.teamPlayers(G, T.team).sort(function (a, b) { return b.ovr - a.ovr; });
    if (T.pf !== 'ALL') theirs = theirs.filter(function (p) { return filterPos(p, T.pf); });
    var gv = neutralValue(T.give), rv = neutralValue(T.get);
    var capMe = HC.capAfter(G, me, T.give.pl, T.get.pl), capThem = HC.capAfter(G, T.team, T.get.pl, T.give.pl);
    h += '<div class="tgrid"><div class="card tcol"><div class="hd"><h3>Your Assets</h3><span class="sp"></span><span class="dim" style="font-size:11px">tap to offer</span></div><div class="tlist">' + mine.map(function (p) { return assetRow(p, 'g', T.give.pl.indexOf(p.id) >= 0); }).join('') + '<div class="tsec">Your draft picks</div>' + HC.teamPicks(G, me).map(function (k) { return pickRow(k, 'g', T.give.pk.indexOf(k.id) >= 0); }).join('') + '</div></div>';
    h += '<div class="card tmid"><h3>You Give</h3>' + dealList('g', T.give) + '<h3 style="margin-top:12px">You Get</h3>' + dealList('r', T.get);
    var tot = Math.max(1, gv + rv);
    h += '<div style="margin-top:14px"><div class="row" style="font-size:11.5px"><span class="mut">Value out</span><span class="sp"></span><span class="mut">Value in</span></div><div class="vbar"><i style="width:' + (gv / tot * 100) + '%"></i><b style="width:' + (rv / tot * 100) + '%"></b></div><div class="dim" style="font-size:11px;margin-top:4px">League-average estimate. Each GM also weighs his needs, age and whether he is contending or rebuilding.</div></div>';
    h += '<div class="capimp"><div><span>Your cap after</span><b class="' + (capMe > G.cap ? 'bad' : '') + '">' + fmtM(G.cap - capMe) + '</b><em>' + sgnM(HC.capUsed(G, me) - capMe) + '</em></div><div><span>' + esc(O.name) + ' cap after</span><b class="' + (capThem > G.cap ? 'bad' : '') + '">' + fmtM(G.cap - capThem) + '</b><em>' + sgnM(HC.capUsed(G, T.team) - capThem) + '</em></div></div>';
    var lim = HC.rosterLimit(G), nMe = mine.length - T.give.pl.length + T.get.pl.length;
    if (nMe > lim) h += '<div class="warn" style="font-size:12px;margin-top:6px">You would have ' + nMe + ' players: your lowest-rated ' + (nMe - lim) + ' will be released to get to ' + lim + '.</div>';
    h += '<button class="btn pri big" style="width:100%;margin-top:12px" data-act="tprop"' + (closed ? ' disabled' : '') + '>Propose Trade</button><button class="btn ghost" style="width:100%;margin-top:8px" data-act="tclear">Clear</button>';
    if (T.msg) h += '<div class="tmsg ' + (T.ok ? 'good' : '') + '">' + esc(T.msg) + (T.counter ? '<button class="btn pri" style="width:100%;margin-top:8px" data-act="tcounter">Accept their counter</button>' : '') + '</div>';
    h += '</div>';
    h += '<div class="card tcol"><div class="hd"><h3>' + esc(O.name) + ' Assets</h3><span class="sp"></span><select class="tsel" onchange="UI.act(\'tpf\', this.value)">' + ['ALL', 'OFF', 'DEF', 'QB', 'RB', 'WR', 'TE', 'OT', 'G', 'C', 'EDGE', 'DT', 'LB', 'CB', 'S', 'K', 'P'].map(function (x) { return '<option' + (T.pf === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></div><div class="tlist">' + theirs.map(function (p) { return assetRow(p, 'r', T.get.pl.indexOf(p.id) >= 0); }).join('') + '<div class="tsec">' + esc(O.name) + ' draft picks</div>' + HC.teamPicks(G, T.team).map(function (k) { return pickRow(k, 'r', T.get.pk.indexOf(k.id) >= 0); }).join('') + '</div></div></div>';
    return h;
  };
  function sgnM(v) { return (v >= 0 ? '+' : '−') + fmtM(Math.abs(v)); }
  function tradeBlockView() {
    var me = G.user.ab, offers = G.user.offers || [], ps = HC.teamPlayers(G, me).sort(function (a, b) { return b.ovr - a.ovr; });
    var h = '<div class="grid g2"><div class="card"><div class="hd"><h3>📨 Incoming Offers</h3></div>';
    h += offers.length ? offers.map(function (x) {
      var o = x.o, side = function (d) { return d.pl.map(function (id) { var p = G.players[id]; return p ? '<div class="di nox">' + ovr(p.ovr) + ' <span class="tag">' + p.pos + '</span> ' + nm(p) + ' <span class="dim">age ' + p.age + ' · ' + fmtM(p.sal) + '</span></div>' : ''; }).concat(d.pk.map(function (id) { var k = pickById(id); return k ? '<div class="di nox"><span class="pkb sm">R' + k.r + '</span> ' + k.yr + ' Round ' + k.r + '</div>' : ''; })).join(''); };
      return '<div class="offer"><div class="row">' + badge(o.a, 34) + '<b>' + esc(G.teams[o.a].city + ' ' + G.teams[o.a].name) + '</b>' + dirTag(o.a) + '<span class="sp"></span><span class="dim" style="font-size:11px">expires after Week ' + x.exp + '</span></div><div class="grid g2" style="gap:10px;margin-top:8px"><div><div class="mut" style="font-size:11px">YOU GET</div>' + side(o.aGive) + '</div><div><div class="mut" style="font-size:11px">YOU GIVE</div>' + side(o.bGive) + '</div></div><div class="row" style="margin-top:10px;justify-content:flex-end"><button class="btn" data-act="toffer" data-arg="' + x.id + ':0">Decline</button><button class="btn pri" data-act="toffer" data-arg="' + x.id + ':1">Accept Trade</button></div></div>';
    }).join('') : '<div class="empty">No offers right now. Put players on the block and AI teams may call during the week (until the deadline).</div>';
    h += '</div><div class="card"><div class="hd"><h3>Your Trade Block</h3><span class="sp"></span><span class="mut" style="font-size:12px">Tap to add or remove</span></div><div class="tlist" style="max-height:560px">' + ps.map(function (p) { return '<div class="ta' + (p.block ? ' on' : '') + '" data-act="tblock" data-arg="' + p.id + '">' + ovr(p.ovr) + '<span class="tag">' + p.pos + '</span><div class="tan"><b>' + nm(p) + '</b>' + (p.tradeReq ? ' <span class="ctag c-Attitude">WANTS OUT</span>' : '') + '<div class="dim" style="font-size:11px">Age ' + p.age + ' · ' + fmtM(p.sal) + ' × ' + p.yrs + ' · morale ' + Math.round(p.mor) + '</div></div>' + persBadge(p) + '<span class="tadd">' + (p.block ? 'ON' : '+') + '</span></div>'; }).join('') + '</div></div></div>';
    var log = (G.tradeLog || []).slice(0, 10);
    h += '<div class="card" style="margin-top:16px"><div class="hd"><h3>Recent League Trades</h3></div>' + (log.length ? log.map(function (t) { var d = function (s) { return s.pl.map(function (id) { var p = G.players[id]; return p ? p.pos + ' ' + p.ln : 'player'; }).concat(s.pk.map(function (id) { var m = id.split('-'); return m[0] + ' R' + m[1]; })).join(', '); }; return '<div class="row" style="padding:6px 0;border-bottom:1px solid var(--line);font-size:13px">' + badge(t.a, 24) + '<span class="mut">' + esc(d(t.ag)) + '</span><span>⇄</span>' + badge(t.b, 24) + '<span class="mut">' + esc(d(t.bg)) + '</span><span class="sp"></span><span class="dim" style="font-size:11px">' + t.s + (t.ph === 'regular' ? ' Wk ' + t.w : ' ' + t.ph) + '</span></div>'; }).join('') : '<div class="empty">No trades yet.</div>') + '</div>';
    return h;
  }
  // ---------- free agency period ----------
  function faPhaseCard() {
    var F = G.fa, me = G.user.ab; if (!F) return '';
    var mine = Object.keys(F.mine || {}).map(function (id) { return [G.players[id], F.mine[id]]; }).filter(function (x) { return x[0]; });
    var h = '<div class="hero" style="--c1:' + G.teams[me].c1 + ';--c2:' + G.teams[me].c2 + ';margin-bottom:14px"><div class="row wrap"><div><div style="font-size:12px;letter-spacing:.14em;font-weight:700;opacity:.8">' + (G.season + 1) + ' FREE AGENCY</div><div style="font-family:var(--cond);font-size:38px;font-weight:900;text-transform:uppercase;line-height:1">Day ' + F.day + ' of ' + F.days + '</div><div style="opacity:.85;font-size:13px">Make offers, then end the day. Every team bids with its cap room and needs. Players weigh money, winning, culture, playing time and loyalty, and their personality changes what matters most. The Draft follows free agency.</div></div><span class="sp"></span><button class="btn pri big" data-act="faday">' + (F.day >= F.days ? 'Finish Free Agency → Draft' : 'End Day ' + F.day + ' →') + '</button></div></div>';
    h += '<div class="grid g2" style="margin-bottom:14px"><div class="card"><div class="hd"><h3>Your Pending Offers (' + mine.length + ')</h3><span class="sp"></span><span class="mut" style="font-size:12px">Committed ' + fmtM(mine.reduce(function (s, x) { return s + x[1].sal; }, 0)) + ' of ' + fmtM(HC.capSpace(G, me)) + ' space</span></div>' + (mine.length ? mine.map(function (x) { var p = x[0]; return '<div class="rp" data-act="negotiate" data-arg="' + p.id + '">' + ovr(p.ovr) + '<div class="rpn"><b>' + p.pos + ' ' + nm(p) + '</b><div class="dim" style="font-size:11px">Your offer ' + fmtM(x[1].sal) + ' × ' + x[1].yrs + ' · asking ' + fmtM(HC.askFor(G, p, me).sal) + '</div></div><span class="pill">' + HC.faOffersFor(G, p.id).length + ' rival bids yesterday</span></div>'; }).join('') : '<div class="dim" style="font-size:13px">No offers out. Tap Offer on any free agent below.</div>') + '</div>';
    h += '<div class="card"><div class="hd"><h3>Yesterday\'s Decisions</h3></div>' + ((F.results || []).length ? F.results.map(function (r) { var p = G.players[r.id]; if (!p) return ''; return '<div class="row" style="padding:5px 0;font-size:13px">' + ovr(p.ovr) + '<span class="tag">' + p.pos + '</span><span class="sp">' + nm(p) + '</span>' + (r.wait ? '<span class="warn">Still deciding (' + r.n + ' offers)</span>' : r.ok ? '<b class="good">✍️ Signed with you</b>' : '<span class="bad">Chose ' + esc(G.teams[r.to].name) + ' (' + fmtM(r.sal) + ')</span>') + '</div>'; }).join('') : '<div class="dim" style="font-size:13px">Decisions on your offers show up here after each day.</div>') + '</div></div>';
    var ex = HC.faList(G).filter(function (p) { return p.lastTm === me; }).slice(0, 10);
    if (ex.length) h += '<div class="card" style="margin-bottom:14px"><div class="hd"><h3>Your Former Players on the Market</h3><span class="sp"></span><span class="mut" style="font-size:12px">Their contracts expired. They give you a loyalty edge if you bid.</span></div><div class="drills">' + ex.map(function (p) { var pend = F.mine[p.id]; return '<button class="drill' + (pend ? ' on' : '') + '" data-act="negotiate" data-arg="' + p.id + '">' + p.pos + ' ' + esc(p.fn.charAt(0) + '. ' + p.ln) + ' <b>' + p.ovr + '</b> <span class="dim">' + (pend ? 'pending ' + fmtM(pend.sal) : 'ask ' + fmtM(HC.askFor(G, p, me).sal)) + '</span></button>'; }).join('') + '</div></div>';
    return h;
  }
