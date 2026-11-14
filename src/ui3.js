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
    HC.migrate(G);
    var me = G.user.ab, show = S.faShow || 'all', space = HC.capSpace(G, me), inFA = G.phase === 'freeagency' && G.fa;
    var list = HC.faList(G).filter(function (p) { return filterPos(p, S.faFilter) && p.ovr >= (S.faMin || 0); }).slice(0, 300);
    list.forEach(function (p) { var a = HC.askFor(G, p, me); p._ask = a.sal; p._int = a.interest; p._yrs = a.yrs; p._st = HC.wouldStart(G, p, me); });
    list = list.filter(function (p) { return show === 'all' || (show === 'afford' && p._ask <= space) || (show === 'start' && p._st) || (show === 'int' && p._int >= 50); });
    list = sortList(list).slice(0, 150);
    var h = inFA ? faPhaseCard() : '';
    h += '<div class="row" style="margin-bottom:14px"><h2>Free Agency</h2><span class="pill">Roster ' + HC.teamPlayers(G, me).length + '/' + HC.rosterLimit(G) + '</span><span class="pill">Cap space ' + fmtM(HC.capSpace(G, me)) + '</span><span class="sp"></span><span class="mut" style="font-size:12px">Interest depends on your record, team chemistry and whether he would start.</span></div>' + chips(S.faFilter, 'ffilter');
    h += '<div class="chips" style="margin-top:8px"><span class="dim" style="font-size:12px;align-self:center;margin-right:4px">Show:</span>' + [['all', 'Everyone'], ['afford', '💰 Fits my cap'], ['start', '⭐ Would start'], ['int', '🤝 Interested (50+)']].map(function (o) { return '<span class="chip' + (show === o[0] ? ' on' : '') + '" data-act="fashow" data-arg="' + o[0] + '">' + o[1] + '</span>'; }).join('') + '<span class="dim" style="font-size:12px;align-self:center;margin:0 4px 0 12px">Min OVR:</span>' + [0, 60, 70, 75, 80].map(function (v) { return '<span class="chip' + ((S.faMin || 0) === v ? ' on' : '') + '" data-act="famin" data-arg="' + v + '">' + (v ? v + '+' : 'Any') + '</span>'; }).join('') + '</div>';
    h += '<div class="card flat" style="margin-top:14px"><div class="tw"><table class="t"><thead><tr>' + th('name', 'Player') + th('pos', 'Pos') + th('age', 'Age') + th('ovr', 'OVR') + th('pot', 'POT') + th('ask', 'Asking / yr') + th('int', 'Interest') + (inFA ? '<th>Bids</th>' : '') + '<th>Character</th><th></th></tr></thead><tbody>';
    list.forEach(function (p) { var c = p._int >= 60 ? '#22c55e' : p._int >= 35 ? '#eab308' : '#ef4444', pend = inFA && G.fa.mine[p.id], nb = inFA ? HC.faOffersFor(G, p.id).filter(function (o) { return o.ab !== me; }).length : 0; h += '<tr class="cl" data-act="player" data-arg="' + p.id + '"><td><b>' + nm(p) + '</b> ' + (p.real ? '' : '<span class="tag">GEN</span>') + (p.lastTm ? ' <span class="dim" style="font-size:11px">ex-' + p.lastTm + '</span>' : '') + (p._st ? ' <span class="ctag c-Grinder">STARTER</span>' : '') + '</td><td><span class="tag">' + p.pos + '</span></td><td>' + p.age + '</td><td>' + ovr(p.ovr) + '</td><td>' + HC.potGrade(p.pot) + '</td><td>' + fmtM(p._ask) + ' <span class="dim">× ' + p._yrs + '</span></td><td style="width:120px">' + bar(p._int, c) + '<span class="dim" style="font-size:10.5px">' + p._int + '</span></td>' + (inFA ? '<td>' + (nb ? '<b class="warn">' + nb + '</b>' : '<span class="dim">0</span>') + '</td>' : '') + '<td>' + persBadge(p) + '</td><td class="r"><button class="btn ' + (pend ? '' : 'pri') + '" style="min-height:40px" data-act="negotiate" data-arg="' + p.id + '">' + (pend ? 'Pending ' + fmtM(pend.sal) : inFA ? 'Offer' : 'Negotiate') + '</button></td></tr>'; });
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
    if (G.phase === 'freeagency' && p.tm === 'FA' && G.fa) h += '<div class="task" style="margin-top:12px"><div class="ic">📣</div><div style="font-size:12.5px"><b>Free agency Day ' + G.fa.day + '.</b> Your offer competes with other teams (' + HC.faOffersFor(G, p.id).filter(function (o) { return o.ab !== me; }).length + ' rival bids yesterday). He decides at the end of the day. Offer 12%+ over his ask to sign him on the spot.' + (HC.PERS[p.pers] ? ' As a ' + HC.PERS[p.pers].n + ', ' + ({ DIVA: 'money talks most.', COMP: 'he wants to win.', LEADER: 'he wants to win.', TEAM: 'winning and culture matter as much as money.', PRO: 'culture and stability matter to him.', HOT: 'he goes where he feels wanted.', CANCER: 'he chases the biggest check.' })[p.pers] : '') + '</div></div>';
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
  var FOCUS = { custom: { i: '🏋️', n: 'Position Plan', d: '' } };
  var GRP_IC = { QB: '🎯', RB: '🏃', WR: '🙌', TE: '🧱', OL: '🛡️', DL: '💥', LB: '🦾', CB: '🔒', S: '🦅', ST: '🦵' };
  function persBadge(p, big) {
    var P = HC.PERS[p.pers]; if (!P) return '';
    return '<span class="pers p-' + p.pers + (big ? ' big' : '') + '" title="' + esc(P.d) + '">' + P.i + ' ' + P.n + '</span>';
  }
  function charTagsHtml(p) {
    return HC.charTags(p).filter(function (t) { return !(t === 'Leader' && p.pers === 'LEADER') && !(t === 'Attitude' && HC.isAttitude(p)); }).map(function (t) { return '<span class="ctag c-' + t + '">' + t + '</span>'; }).join('');
  }
  function spark(arr, w, h, col) {
    w = w || 90; h = h || 24; if (!arr || arr.length < 2) return '<span class="dim" style="font-size:11px">—</span>';
    var mn = Math.min.apply(null, arr), mx = Math.max.apply(null, arr), rg = Math.max(.6, mx - mn);
    var pts = arr.map(function (v, i) { return (i / (arr.length - 1) * (w - 4) + 2).toFixed(1) + ',' + (h - 3 - (v - mn) / rg * (h - 6)).toFixed(1); });
    var up = arr[arr.length - 1] - arr[0], c = col || (up > .05 ? '#22c55e' : up < -.05 ? '#ef4444' : '#94a3b8');
    var last = pts[pts.length - 1].split(',');
    return '<svg class="spark" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '"><polyline fill="none" stroke="' + c + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="' + pts.join(' ') + '"/><circle cx="' + last[0] + '" cy="' + last[1] + '" r="2.6" fill="' + c + '"/></svg>';
  }
  function trendArrow(arr) {
    if (!arr || arr.length < 2) return '<span class="dim">→</span>';
    var n = Math.min(4, arr.length - 1), d = arr[arr.length - 1] - arr[arr.length - 1 - n];
    return d > .25 ? '<span class="good" title="Rising">▲▲</span>' : d > .04 ? '<span class="good" title="Improving">▲</span>' : d < -.25 ? '<span class="bad" title="Falling">▼▼</span>' : d < -.04 ? '<span class="bad" title="Slipping">▼</span>' : '<span class="dim" title="Flat">→</span>';
  }
  function sgn(v, dp) { return (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v).toFixed(dp == null ? 1 : dp); }
  function attrShort(k) { return k; }
  function planSummary() {
    var pl = G.user.plan; if (!pl) return 'Position-by-position plan';
    var hard = HC.PGROUPS.filter(function (g) { return pl.int[g.k] === 'hard'; }).map(function (g) { return g.k; });
    var drills = HC.PGROUPS.filter(function (g) { return pl.drill[g.k] && pl.drill[g.k] !== 'bal'; }).slice(0, 3).map(function (g) { return g.k + ' ' + HC.drillOf(g, pl.drill[g.k])[1]; });
    return HC.planHours(pl) + '/' + HC.PRAC_BUDGET + ' hrs' + (drills.length ? ' · ' + drills.join(', ') : '') + (hard.length ? ' · Hard: ' + hard.join(', ') : '') + (pl.fp.length ? ' · ' + pl.fp.length + ' focus player' + (pl.fp.length > 1 ? 's' : '') : '');
  }
  function groupCard(g) {
    var pl = G.user.plan, me = G.user.ab, ps = HC.groupPlayers(G, me, g), stp = ps.slice(0, g.st);
    var hrs = pl.hrs[g.k], it = pl.int[g.k], dr = HC.drillOf(g, pl.drill[g.k]), used = HC.planHours(pl);
    var so = stp.length ? Math.round(HC.avg(stp.map(function (p) { return p.ovr; }))) : 0;
    var fat = ps.length ? Math.round(HC.avg(stp.map(function (p) { return p.fat || 0; }))) : 0;
    var I = HC.INTEN[it], reps = .3 + .7 * Math.pow(hrs / 2.2, .85), gm = reps * I.g, load = Math.round(hrs * I.load);
    var trains = Object.keys(dr[3]).filter(function (k) { return ps.some(function (p) { return p.a[k] != null; }); }).map(function (k) { return HC.ATTR_NAMES[k]; });
    var h = '<div class="pg"><div class="pgh"><span class="pgi">' + GRP_IC[g.k] + '</span><div><b>' + g.k + '</b> <span class="mut">' + g.n + '</span><div class="dim" style="font-size:11.5px">' + stp.map(function (p) { return esc(p.ln); }).join(', ') + '</div></div><span class="sp"></span><div class="r"><div style="font-size:11px" class="mut">Starters</div>' + ovr(so) + '</div></div>';
    h += '<div class="pgrow"><div class="stepper"><button class="btn" data-act="phrs" data-arg="' + g.k + ':-1"' + (hrs <= 0 ? ' disabled' : '') + '>−</button><div class="sv"><b>' + hrs + '</b><span>hrs</span></div><button class="btn" data-act="phrs" data-arg="' + g.k + ':1"' + (hrs >= HC.MAX_HRS || used >= HC.PRAC_BUDGET ? ' disabled' : '') + '>+</button></div>';
    h += '<div class="seg">' + ['light', 'normal', 'hard'].map(function (x) { return '<button class="' + (it === x ? 'on i-' + x : '') + '" data-act="pint" data-arg="' + g.k + ':' + x + '">' + HC.INTEN[x].n + '</button>'; }).join('') + '</div></div>';
    h += '<div class="drills">' + g.drills.map(function (d) { return '<button class="drill' + (dr[0] === d[0] ? ' on' : '') + '" data-act="pdrill" data-arg="' + g.k + ':' + d[0] + '">' + d[1] + '</button>'; }).join('') + '</div>';
    h += '<div class="pgf"><span>' + esc(dr[2]) + (trains.length ? ' · <span class="dim">Trains ' + trains.join(', ') + '</span>' : '') + '</span></div>';
    h += '<div class="pgm"><span>Growth <b class="' + (gm >= 1.15 ? 'good' : gm < .7 ? 'bad' : '') + '">×' + gm.toFixed(2) + '</b></span><span>Fatigue load <b class="' + (load >= 30 ? 'bad' : load >= 16 ? 'warn' : '') + '">+' + load + '</b></span><span>Starter fatigue <b class="' + (fat >= 45 ? 'bad' : fat >= 25 ? 'warn' : 'good') + '">' + fat + '</b></span></div>';
    return h + '</div>';
  }
  function practiceTabs() {
    var t = S.pracTab || 'plan';
    return '<div class="seg big">' + [['plan', '📋 Planner'], ['report', '📊 Weekly Report'], ['prog', '📈 Season Progress']].map(function (x) { return '<button class="' + (t === x[0] ? 'on' : '') + '" data-act="ptab" data-arg="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';
  }
  VIEWS.practice = function () {
    HC.migrate(G);
    var u = G.user, t = S.pracTab || 'plan';
    var h = '<div class="row wrap" style="margin-bottom:14px"><h2>Practice & Development</h2><span class="sp"></span>' + practiceTabs() + '</div>';
    if (t === 'report') return h + practiceReport();
    if (t === 'prog') return h + practiceProgress();
    var pl = u.plan, used = HC.planHours(pl), left = HC.PRAC_BUDGET - used;
    h += '<div class="card"><div class="row wrap" style="gap:16px"><div style="min-width:220px"><h3>Weekly Practice Hours</h3><div class="row" style="gap:8px;margin-top:6px"><b class="cond" style="font-size:34px;line-height:1">' + used + '</b><span class="mut">of ' + HC.PRAC_BUDGET + ' hours used</span></div><div class="bar" style="margin-top:8px;height:10px"><i style="width:' + (used / HC.PRAC_BUDGET * 100) + '%;background:' + (left < 0 ? 'var(--bad)' : 'linear-gradient(90deg,#3b82f6,#a855f7)') + '"></i></div><div class="dim" style="font-size:11.5px;margin-top:4px">' + (left > 0 ? left + ' hours unassigned' : 'Fully booked') + '</div></div>';
    h += '<button class="tog' + (pl.gp ? ' on' : '') + '" data-act="psess" data-arg="gp"><span class="ti">📘</span><b>Game Plan Install</b><span>' + HC.SESSION_COST.gp + ' hrs · +1.8 to every unit in this week\'s game</span></button>';
    h += '<button class="tog' + (pl.cond ? ' on' : '') + '" data-act="psess" data-arg="cond"><span class="ti">🫀</span><b>Conditioning</b><span>' + HC.SESSION_COST.cond + ' hrs · game-day injury risk −40%</span></button>';
    h += '<div class="col" style="gap:8px;margin-left:auto"><button class="btn" data-act="pauto">📋 Staff Auto-Plan</button><button class="btn ghost" data-act="pbal">Reset: all Balanced / Normal</button></div></div>';
    h += '<div class="mut" style="font-size:12px;margin-top:10px">More hours and harder intensity = faster growth for that group, but more fatigue (tired players play worse and get hurt more) and lower morale. Growth also depends on each player\'s age, potential, morale, <b>work ethic</b> and <b>coachability</b>, plus your Development culture (' + Math.round(u.dev) + ').</div></div>';
    h += '<div class="hd" style="margin:18px 0 10px"><h3>Offense</h3></div><div class="grid g2">' + HC.PGROUPS.filter(function (g) { return g.side === 'off'; }).map(groupCard).join('') + '</div>';
    h += '<div class="hd" style="margin:18px 0 10px"><h3>Defense & Special Teams</h3></div><div class="grid g2">' + HC.PGROUPS.filter(function (g) { return g.side !== 'off'; }).map(groupCard).join('') + '</div>';
    // focus players
    var me = u.ab, fp = pl.fp.map(function (id) { return G.players[id]; }).filter(Boolean);
    var sug = HC.teamPlayers(G, me).filter(function (p) { return pl.fp.indexOf(p.id) < 0 && p.age <= 26 && p.pot - p.ovr >= 4 && HC.GROUP_OF[p.pos] && HC.GROUP_OF[p.pos].k !== 'ST'; }).sort(function (a, b) { return (b.pot - b.ovr) - (a.pot - a.ovr); }).slice(0, 8);
    h += '<div class="card" style="margin-top:18px"><div class="hd"><h3>⭐ Focus Players (' + fp.length + '/' + HC.FOCUS_MAX + ')</h3><span class="sp"></span><span class="mut" style="font-size:12px">Extra 1-on-1 coaching: +60% growth, a bit more fatigue. You can also tap ⭐ on any player card.</span></div><div class="grid g3">';
    for (var i = 0; i < HC.FOCUS_MAX; i++) {
      var p = fp[i];
      h += p ? '<div class="fpc"><div class="row" style="gap:8px">' + ovr(p.ovr) + '<span class="tag">' + p.pos + '</span><b class="sp" data-act="player" data-arg="' + p.id + '" style="cursor:pointer">' + nm(p) + '</b></div><div class="mut" style="font-size:12px;margin:6px 0">Age ' + p.age + ' · POT ' + HC.potGrade(p.pot) + ' · Work ethic ' + (p.eth || '—') + '</div><div class="row">' + spark(p.dh, 110, 26) + '<span class="sp"></span><button class="btn sm danger" data-act="pfocus" data-arg="' + p.id + '">Remove</button></div></div>' : '<div class="fpc empty" style="padding:18px">Empty slot</div>';
    }
    h += '</div><div class="dim" style="font-size:12px;margin:14px 0 8px">Suggestions: young players with room to grow</div><div class="drills">' + sug.map(function (p) { return '<button class="drill" data-act="pfocus" data-arg="' + p.id + '"' + (fp.length >= HC.FOCUS_MAX ? ' disabled' : '') + '>+ ' + p.pos + ' ' + esc(p.fn.charAt(0) + '. ' + p.ln) + ' <span class="dim">' + p.ovr + '→' + HC.potGrade(p.pot) + '</span></button>'; }).join('') + '</div></div>';
    return h;
  };
  function practiceReport() {
    var r = G.user.prac;
    if (!r) return '<div class="card"><div class="empty">No practice report yet. Play or sim this week\'s game and advance — the report appears after each week of practice.</div></div>';
    var all = []; for (var k in r.groups) r.groups[k].forEach(function (x) { all.push(x); });
    var up = all.filter(function (x) { return x.d >= .05; }).length, top = all.slice().sort(function (a, b) { return b.d - a.d; })[0], tp = top && G.players[top.id];
    var avgF = Math.round(HC.avg(all.map(function (x) { return x.fat; })));
    var h = '<div class="card"><div class="row wrap" style="gap:24px"><div><h3>' + esc(r.label) + ' · ' + r.season + '</h3><div class="mut" style="font-size:12px">' + r.hrs + ' practice hours</div></div>';
    h += '<div class="kstat"><b class="good">' + up + '</b><span>Players improved</span></div><div class="kstat"><b>' + (tp ? esc(tp.ln) + ' <span class="good">' + sgn(top.d, 2) + '</span>' : '—') + '</b><span>Top riser</span></div><div class="kstat"><b class="' + (avgF >= 40 ? 'bad' : avgF >= 22 ? 'warn' : 'good') + '">' + avgF + '</b><span>Avg fatigue</span></div><div class="kstat"><b class="' + (r.inj.length ? 'bad' : 'good') + '">' + r.inj.length + '</b><span>Practice injuries</span></div></div>';
    if (r.inj.length) h += '<div class="bad" style="font-size:13px;margin-top:10px">🚑 ' + r.inj.map(function (x) { var p = G.players[x.id]; return p ? p.pos + ' ' + nm(p) + ' (out ' + x.w + ' wk' + (x.w > 1 ? 's' : '') + ')' : ''; }).join(', ') + '</div>';
    h += '</div><div class="grid g2" style="margin-top:16px">';
    HC.PGROUPS.forEach(function (g) {
      var rows = r.groups[g.k] || []; if (!rows.length) return;
      var pl = G.user.plan, dr = HC.drillOf(g, pl.drill[g.k]);
      h += '<div class="card" style="padding:14px"><div class="hd" style="margin-bottom:8px"><span class="pgi sm">' + GRP_IC[g.k] + '</span><h3 style="color:var(--txt)">' + g.k + '</h3><span class="mut" style="font-size:12px">' + g.n + '</span><span class="sp"></span><span class="dim" style="font-size:11px">Now: ' + dr[1] + ' · ' + HC.INTEN[pl.int[g.k]].n + ' · ' + pl.hrs[g.k] + 'h</span></div>';
      rows.slice(0, 7).forEach(function (x) {
        var p = G.players[x.id]; if (!p) return;
        h += '<div class="rp" data-act="player" data-arg="' + p.id + '">' + ovr(p.ovr) + '<div class="rpn"><b>' + (x.f ? '⭐ ' : '') + esc(p.fn.charAt(0) + '. ' + p.ln) + '</b>' + (x.inj ? ' <span class="tag" style="background:#4a1d24;color:#fecaca">INJ ' + x.inj + 'w</span>' : '') + '<div class="ats">' + (x.at.length ? x.at.map(function (a) { return '<span class="' + (a[1] > 0 ? 'good' : 'bad') + '">' + sgn(a[1], 1) + ' ' + a[0] + '</span>'; }).join('') : '<span class="dim">no change</span>') + '</div></div>';
        h += '<div class="c" style="width:52px"><b class="' + (x.d >= .05 ? 'good' : x.d <= -.05 ? 'bad' : 'dim') + '">' + sgn(x.d, 2) + '</b><div class="dim" style="font-size:10px">OVR</div></div>';
        h += '<div style="width:56px" title="Fatigue ' + x.fat + '"><div class="bar" style="height:6px"><i style="width:' + x.fat + '%;background:' + (x.fat >= 45 ? '#ef4444' : x.fat >= 25 ? '#eab308' : '#22c55e') + '"></i></div><div class="dim" style="font-size:10px;text-align:center">fatigue ' + x.fat + '</div></div>';
        h += spark(p.dh, 74, 24) + '<span style="width:24px;text-align:center">' + trendArrow(p.dh) + '</span></div>';
      });
      h += '</div>';
    });
    return h + '</div><div class="dim" style="font-size:12px;margin-top:10px">Attribute codes: ' + Object.keys(HC.ATTR_NAMES).map(function (k) { return k + ' ' + HC.ATTR_NAMES[k]; }).join(' · ') + '</div>';
  }
  function practiceProgress() {
    var me = G.user.ab, f = S.progFilter || 'ALL';
    var ps = HC.teamPlayers(G, me).filter(function (p) { var g = HC.GROUP_OF[p.pos]; return g && (f === 'ALL' || g.k === f); });
    ps.forEach(function (p) { HC.ensureP(G, p); });
    ps.sort(function (a, b) { return (b.prog || 0) - (a.prog || 0); });
    var h = '<div class="drills" style="margin-bottom:12px">' + ['ALL'].concat(HC.PGROUPS.map(function (g) { return g.k; })).map(function (k) { return '<button class="drill' + (f === k ? ' on' : '') + '" data-act="pprog" data-arg="' + k + '">' + (k === 'ALL' ? 'All groups' : k) + '</button>'; }).join('') + '</div>';
    h += '<div class="card flat"><div class="tw"><table class="t"><thead><tr><th>Player</th><th>Pos</th><th>Age</th><th>OVR</th><th>Δ Season</th><th>Trend</th><th>Biggest gains since Week 1</th><th>Fatigue</th></tr></thead><tbody>';
    ps.forEach(function (p) {
      var d = p.prog || 0, gains = [];
      for (var k in (p.a0 || {})) if (p.a[k] != null) gains.push([k, p.a[k] - p.a0[k]]);
      gains.sort(function (a, b) { return b[1] - a[1]; });
      h += '<tr class="cl" data-act="player" data-arg="' + p.id + '"><td><b>' + (G.user.plan.fp.indexOf(p.id) >= 0 ? '⭐ ' : '') + nm(p) + '</b></td><td><span class="tag">' + p.pos + '</span></td><td>' + p.age + '</td><td>' + ovr(p.ovr) + '</td><td class="' + (d > .05 ? 'good' : d < -.05 ? 'bad' : 'dim') + '">' + sgn(d) + '</td><td><div class="row" style="gap:6px">' + spark(p.dh, 80, 22) + trendArrow(p.dh) + '</div></td><td class="ats">' + gains.slice(0, 3).filter(function (g) { return Math.abs(g[1]) >= .1; }).map(function (g) { return '<span class="' + (g[1] > 0 ? 'good' : 'bad') + '">' + sgn(g[1]) + ' ' + g[0] + '</span>'; }).join('') + '</td><td>' + Math.round(p.fat || 0) + '</td></tr>';
    });
    return h + '</tbody></table></div></div>';
  }
  function characterCard(ps) {
    ps.forEach(function (p) { HC.ensureP(G, p); });
    var me = G.user.ab, st = starterSet(me), cs = HC.culture(G, me);
    function row(p, val, lab) { return '<div class="rp" data-act="player" data-arg="' + p.id + '">' + ovr(p.ovr) + '<div class="rpn"><b>' + (st[p.id] ? '' : '<span class="dim">(bench)</span> ') + esc(p.fn.charAt(0) + '. ' + p.ln) + ' <span class="tag">' + p.pos + '</span></b><div style="margin-top:3px">' + persBadge(p) + '</div></div><div class="c" style="width:58px"><b class="cond" style="font-size:20px">' + val + '</b><div class="dim" style="font-size:10px">' + lab + '</div></div></div>'; }
    var leaders = ps.slice().sort(function (a, b) { return (b.ldr + (b.pers === 'LEADER' ? 12 : 0)) - (a.ldr + (a.pers === 'LEADER' ? 12 : 0)); }).slice(0, 6);
    var clutch = ps.filter(function (p) { return st[p.id]; }).sort(function (a, b) { return b.clu - a.clu; }).slice(0, 6);
    var probs = ps.filter(function (p) { return HC.isAttitude(p) || p.att < 40 || p.eth < 48; }).sort(function (a, b) { return (a.mor - (a.pers === 'CANCER' ? 30 : 0)) - (b.mor - (b.pers === 'CANCER' ? 30 : 0)); }).slice(0, 6);
    var rattled = ps.filter(function (p) { return st[p.id] && p.clu < 50; }).sort(function (a, b) { return a.clu - b.clu; }).slice(0, 4);
    var mix = {}; ps.forEach(function (p) { mix[p.pers] = (mix[p.pers] || 0) + 1; });
    var h = '<div class="card" style="margin-top:16px"><div class="hd"><h3>Character & Leadership</h3><span class="sp"></span><span class="mut" style="font-size:12px">Locker-room culture effect on chemistry:</span><b class="' + (cs >= 1 ? 'good' : cs <= -1 ? 'bad' : 'warn') + '" style="font-size:18px">' + sgn(cs) + '</b></div>';
    h += '<div class="row wrap" style="gap:8px;margin-bottom:14px">' + Object.keys(HC.PERS).map(function (k) { var P = HC.PERS[k]; return '<span class="pers p-' + k + '" title="' + esc(P.d) + '">' + P.i + ' ' + P.n + ' <b>' + (mix[k] || 0) + '</b></span>'; }).join('') + '</div>';
    h += '<div class="grid g3"><div><h3 style="margin-bottom:8px">👑 Leaders</h3><div class="dim" style="font-size:11.5px;margin-bottom:6px">Lift team morale and chemistry every week when they are happy.</div>' + leaders.map(function (p) { return row(p, p.ldr, 'LEADERSHIP'); }).join('') + '</div>';
    h += '<div><h3 style="margin-bottom:8px">🧊 Who Takes Control</h3><div class="dim" style="font-size:11.5px;margin-bottom:6px">Starters with the best composure in crunch time, 3rd/4th down, red zone and playoffs.</div>' + clutch.map(function (p) { return row(p, p.clu, 'CLUTCH'); }).join('') + (rattled.length ? '<div class="dim" style="font-size:11.5px;margin:8px 0 4px">Can get rattled:</div>' + rattled.map(function (p) { return row(p, p.clu, 'CLUTCH'); }).join('') : '') + '</div>';
    h += '<div><h3 style="margin-bottom:8px">⚠️ Attitude & Problem Players</h3><div class="dim" style="font-size:11.5px;margin-bottom:6px">Hotheads draw flags; Me-First and Cancer types drag chemistry down when unhappy.</div>' + (probs.length ? probs.map(function (p) { return row(p, Math.round(p.mor), 'MORALE'); }).join('') : '<div class="empty">No attitude problems on this roster.</div>') + '</div></div></div>';
    return h;
  }
  // ---------- locker room ----------
  VIEWS.locker = function () {
    var me = G.user.ab, T = G.teams[me], ps = HC.teamPlayers(G, me), u = G.user;
    var avgM = HC.avg(ps.map(function (p) { return p.mor; }));
    var h = '<div class="row" style="margin-bottom:14px"><h2>Locker Room</h2>' + (u.pendingEvent ? '<button class="btn pri" data-act="event">🗣️ Team Meeting: ' + esc(u.pendingEvent.title) + '</button>' : '') + '</div><div class="grid" style="grid-template-columns:auto 1fr 1fr">';
    h += '<div class="card c">' + gauge(T.chem, 'Chemistry', chemColor(T.chem)) + '<div class="mut" style="font-size:12px;margin-top:10px;max-width:170px">Chemistry adds up to ±2.5 to every unit on game day.</div></div>';
    h += '<div class="card"><div class="hd"><h3>Culture Pillars</h3></div>' + pillars() + '<div class="mut" style="font-size:12px">Your choices in team meetings and press conferences move these. Each drifts slowly back toward neutral unless reinforced.</div></div>';
    var dist = [0, 0, 0]; ps.forEach(function (p) { dist[p.mor >= 70 ? 0 : p.mor >= 45 ? 1 : 2]++; });
    h += '<div class="card"><div class="hd"><h3>Morale</h3><span class="sp"></span><b>' + Math.round(avgM) + ' avg</b></div><div class="row" style="gap:20px"><div><b class="good" style="font-size:26px;font-family:var(--cond)">' + dist[0] + '</b><div class="mut" style="font-size:11px">HAPPY</div></div><div><b class="warn" style="font-size:26px;font-family:var(--cond)">' + dist[1] + '</b><div class="mut" style="font-size:11px">CONTENT</div></div><div><b class="bad" style="font-size:26px;font-family:var(--cond)">' + dist[2] + '</b><div class="mut" style="font-size:11px">UNHAPPY</div></div></div><div class="mut" style="font-size:12px;margin-top:10px">Morale is driven by wins, playing time, contracts, practice intensity and your decisions.</div></div></div>';
    h += characterCard(ps);
    var low = ps.slice().sort(function (a, b) { return a.mor - b.mor; }).slice(0, 12);
    h += '<div class="grid g2" style="margin-top:16px"><div class="card"><div class="hd"><h3>Players to Watch</h3></div><table class="t"><tr><th>Player</th><th>OVR</th><th>Morale</th><th>Concern</th></tr>' + low.map(function (p) { var why = p.wantsSnaps ? 'Wants more playing time' : p.wantsDeal ? 'Wants a new contract' : p.mor < 45 ? 'Frustrated' : 'OK'; return '<tr class="cl" data-act="player" data-arg="' + p.id + '"><td><span class="tag">' + p.pos + '</span> ' + nm(p) + ' ' + persBadge(p) + '</td><td>' + ovr(p.ovr) + '</td><td>' + morBar(p.mor) + ' <span class="dim">' + Math.round(p.mor) + '</span></td><td class="mut">' + why + '</td></tr>'; }).join('') + '</table></div>';
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
      '<h3 style="margin-top:16px">Data</h3><ul class="mut" style="line-height:1.7"><li><b>Rosters:</b> all 32 teams use real 2026 NFL rosters (active players, ' + HC_DATA.players.filter(function (p) { return p[4] !== 'FA'; }).length + ' players, pulled from ESPN\'s public roster and depth-chart feeds on ' + HC_DATA.fetched + '). The free-agent pool is made up of real practice-squad and surplus players.</li><li><b>Schedule:</b> the real 2026 regular-season schedule (all 272 games).</li><li><b>Ratings:</b> overall ratings, attributes, potential and contract figures are <b>the game\'s own estimates</b>. They come from depth-chart role, draft slot, experience, 2025/2026 production and reputation. They are not official numbers.</li><li><b>Salary cap:</b> $301.2M, the official 2026 NFL salary cap (rises about 6% per simulated season).</li><li><b>Character</b> ratings (work ethic, personality, leadership, clutch) are the game\'s own estimates, not real scouting reports.</li><li><b>Draft classes</b> are fictional, generated prospects. College names are real schools.</li><li>No official NFL or team logos are used. Teams appear as colored badges with abbreviations; Washington uses an original feathers-and-spear badge.</li></ul>' +
      '<h3 style="margin-top:16px">How to Play</h3><ul class="mut" style="line-height:1.7"><li>Each week: handle the team meeting, set your position-by-position practice plan (hours, intensity and drill for QB, RB, WR, TE, OL, DL, LB, CB, S and special teams, plus up to 3 focus players), then coach or quick-sim your game. After each week, the Weekly Report shows who improved and which skills.</li><li>Every player has a character profile: work ethic (practice growth), personality (Leader, Quiet Pro, Team First, Competitor, Hothead, Me-First, Locker Room Cancer), leadership and clutch/composure (how he plays in crunch time, on 3rd/4th down, in the red zone and in the playoffs).</li><li>On game day, pick an offensive play when you have the ball and a defensive call when you don\'t. Matchups matter: the blitz is great against deep drops but gets burned by screens, prevent gives up the run, and so on.</li><li>Keep players happy: playing time, winning, contracts and your culture decisions move morale and chemistry.</li><li>Scout draft prospects all season. Ratings start out fuzzy and sharpen with every scouting level.</li><li>After the Super Bowl, expiring contracts hit a 5-day free agency period where every team bids with its cap room and needs. Then comes the Draft, then the next season. Free agents left over can be signed any time.</li><li>Trades: deal players and draft picks (this year plus the next two) with any team, in season up to the deadline after Week 9 and again in the offseason. Put players on the trade block to draw offers. Unhappy Me-First, Hothead and Cancer types may demand a trade.</li></ul></div>';
  }
  VIEWS.about = aboutHtml;
