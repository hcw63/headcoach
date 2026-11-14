/* Head Coach 26 — core engine (no DOM). Runs in browser and in node for tests. */
var HC = (function () {
  'use strict';
  var E = {};
  var rnd = Math.random;
  function ri(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
  function rf(a, b) { return a + rnd() * (b - a); }
  function gauss() { var u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function pick(a) { return a[Math.floor(rnd() * a.length)]; }
  function wpick(items, wf) { var t = 0, i, w = items.map(function (x) { var v = Math.max(0.0001, wf(x)); t += v; return v; }); var r = rnd() * t; for (i = 0; i < items.length; i++) { r -= w[i]; if (r <= 0) return items[i]; } return items[items.length - 1]; }
  E.util = { ri: ri, rf: rf, gauss: gauss, clamp: clamp, pick: pick, wpick: wpick };

  // ---------- Positions & attributes ----------
  var ATTR = {
    QB: { THP: .25, ACC: .35, DEC: .30, SPD: .10 },
    RB: { SPD: .30, ELU: .25, BCV: .25, BTK: .10, CTH: .10 },
    WR: { SPD: .28, CTH: .30, RTE: .30, REL: .12 },
    TE: { CTH: .35, RTE: .22, RBK: .28, SPD: .15 },
    OT: { PBK: .50, RBK: .35, STR: .15 },
    G: { PBK: .40, RBK: .45, STR: .15 },
    C: { PBK: .40, RBK: .40, AWR: .20 },
    EDGE: { PRS: .55, RST: .25, SPD: .20 },
    DT: { PRS: .35, RST: .45, STR: .20 },
    LB: { TKL: .35, RST: .25, COV: .25, SPD: .15 },
    CB: { COV: .45, ZON: .25, SPD: .20, BSK: .10 },
    S: { ZON: .35, COV: .20, TKL: .25, SPD: .20 },
    K: { KPW: .5, KAC: .5 }, P: { KPW: .6, KAC: .4 }, LS: { AWR: 1 }
  };
  var ATTR_NAMES = { THP: 'Throw Power', ACC: 'Accuracy', DEC: 'Decision Making', SPD: 'Speed', ELU: 'Elusiveness', BCV: 'Ball Carrier Vision', BTK: 'Break Tackle', CTH: 'Catching', RTE: 'Route Running', REL: 'Release', RBK: 'Run Block', PBK: 'Pass Block', STR: 'Strength', AWR: 'Awareness', PRS: 'Pass Rush', RST: 'Run Stop', TKL: 'Tackling', COV: 'Man Coverage', ZON: 'Zone Coverage', BSK: 'Ball Skills', KPW: 'Kick Power', KAC: 'Kick Accuracy' };
  // Extra trainable skills that feed the sim but are not part of OVR (keeps ratings comparable across saves)
  var EXTRA = { QB: { POC: -8 }, RB: { BSC: 0 }, WR: { BSC: 0 }, TE: { BSC: 0 }, LB: { PRS: -8 }, S: { RST: -6 } };
  ATTR_NAMES.POC = 'Pocket Presence'; ATTR_NAMES.BSC = 'Ball Security';
  function allAttrs(pos) { return Object.keys(ATTR[pos] || {}).concat(Object.keys(EXTRA[pos] || {})); }
  E.EXTRA = EXTRA; E.allAttrs = allAttrs;
  var POS_ORDER = ['QB', 'RB', 'WR', 'TE', 'OT', 'G', 'C', 'EDGE', 'DT', 'LB', 'CB', 'S', 'K', 'P', 'LS'];
  var OFF = { QB: 1, RB: 1, WR: 1, TE: 1, OT: 1, G: 1, C: 1 };
  var DEF = { EDGE: 1, DT: 1, LB: 1, CB: 1, S: 1 };
  var LINEUP = { QB: 1, RB: 1, WR: 3, TE: 1, OT: 2, G: 2, C: 1, EDGE: 2, DT: 2, LB: 2, CB: 3, S: 2, K: 1, P: 1 };
  var POS_MAX = { QB: 55000, EDGE: 40000, WR: 36000, OT: 29000, DT: 30000, CB: 27000, LB: 19000, S: 19000, TE: 17000, G: 20000, C: 16000, RB: 14000, K: 5500, P: 3800, LS: 1400 };
  var ROSTER_MIN = { QB: 2, RB: 3, WR: 5, TE: 3, OT: 3, G: 3, C: 2, EDGE: 4, DT: 4, LB: 4, CB: 5, S: 4, K: 1, P: 1, LS: 1 };
  E.ATTR = ATTR; E.ATTR_NAMES = ATTR_NAMES; E.POS_ORDER = POS_ORDER; E.LINEUP = LINEUP; E.OFF = OFF; E.DEF = DEF;

  function calcOvr(p) { var w = ATTR[p.pos], s = 0, k; for (k in w) s += w[k] * p.a[k]; return Math.round(clamp(s, 25, 99)); }
  function genAttrs(pos, ovr) {
    var w = ATTR[pos], a = {}, k, s = 0;
    for (k in w) { a[k] = ovr + gauss() * 5; s += w[k] * a[k]; }
    var shift = ovr - s;
    for (k in w) a[k] = clamp(a[k] + shift, 25, 99);
    var x = EXTRA[pos] || {}; for (k in x) a[k] = clamp(ovr + x[k] + gauss() * 5, 25, 99);
    return a;
  }
  E.calcOvr = calcOvr;
  function wovr(p) { var w = ATTR[p.pos], s = 0, k; for (k in w) s += w[k] * p.a[k]; return clamp(s, 25, 99); }
  E.wovr = wovr;

  // ---------- League creation ----------
  E.newLeague = function (D, userAb, coachName, opts) {
    var G = { v: 1, season: D.season, cap: D.cap, phase: 'regular', week: 1, teams: {}, players: {}, order: [], news: [], sched: [], user: null, playoffs: null, draft: null, history: [] };
    D.teams.forEach(function (t) {
      G.teams[t[0]] = { ab: t[0], city: t[1], name: t[2], c1: t[3], c2: t[4], div: t[5], conf: t[5].slice(0, 3), realHC: t[6], w: 0, l: 0, t: 0, pf: 0, pa: 0, chem: ri(52, 68), dead: 0, depth: {}, streak: 0, divW: 0 };
      G.order.push(t[0]);
    });
    D.players.forEach(function (r) {
      var p = { id: r[0], fn: r[1], ln: r[2], pos: r[3], tm: r[4], age: r[5], exp: r[6], num: r[7], pot: r[9], sal: r[10], yrs: r[11], draft: r[12], col: r[13], ht: r[14], wt: r[15], real: r[16], mor: ri(58, 82), inj: 0, st: {}, prog: 0, neg: 0 };
      p.a = genAttrs(p.pos, r[8]); p.ovr = calcOvr(p); p.pot = Math.max(p.pot, p.ovr);
      if (p.tm === 'FA') { p.sal = 0; p.yrs = 0; }
      G.players[p.id] = p;
    });
    G.order.forEach(function (ab) { autoDepth(G, ab); });
    G.sched = D.weeks.map(function (wk) { return wk.map(function (g) { return { h: g[0], a: g[1], hs: null, as: null }; }); });
    var t = G.teams[userAb];
    G.user = { ab: userAb, coach: coachName || 'Coach', focus: 'balanced', intensity: 'normal', disc: 50, unity: 50, dev: 50, sp: 40, pendingEvent: null, lastReport: [], gameplanBonus: 0, pressPending: null, log: [] };
    G.user.plan = autoPlan(G, userAb);
    E.migrate(G);
    E.genDraftClass(G);
    addNews(G, 'Welcome, Coach ' + G.user.coach + '! You take over the ' + t.city + ' ' + t.name + (t.realHC ? ' (replacing ' + t.realHC + ')' : '') + '.', 'big');
    if (opts && opts.camp) { G.user.daily = 1; E.startCamp(G); } else E.newWeeklyEvent(G);
    return G;
  };
  function addNews(G, s, tag) { G.news.unshift({ w: G.phase === 'regular' ? 'Wk ' + G.week : G.phase === 'playoffs' ? 'Playoffs' : G.phase === 'draft' ? 'Draft' : G.phase === 'camp' ? 'Camp' : 'Offseason', s: s, tag: tag || '' }); if (G.news.length > 80) G.news.length = 80; }
  E.addNews = addNews;

  // ---------- Roster helpers ----------
  function teamPlayers(G, ab) { var o = [], id; for (id in G.players) if (G.players[id].tm === ab) o.push(G.players[id]); return o; }
  E.teamPlayers = teamPlayers;
  function autoDepth(G, ab) {
    var ps = teamPlayers(G, ab), d = {};
    POS_ORDER.forEach(function (pos) { d[pos] = ps.filter(function (p) { return p.pos === pos; }).sort(function (a, b) { return b.ovr - a.ovr; }).map(function (p) { return p.id; }); });
    G.teams[ab].depth = d;
  }
  E.autoDepth = autoDepth;
  function syncDepth(G, ab) {
    var t = G.teams[ab], ps = teamPlayers(G, ab);
    POS_ORDER.forEach(function (pos) {
      var cur = (t.depth[pos] || []).filter(function (id) { var p = G.players[id]; return p && p.tm === ab && p.pos === pos; });
      ps.forEach(function (p) { if (p.pos === pos && cur.indexOf(p.id) < 0) { var at = cur.findIndex(function (id) { return G.players[id].ovr < p.ovr; }); if (at < 0) cur.push(p.id); else cur.splice(at, 0, p.id); } });
      t.depth[pos] = cur;
    });
  }
  E.syncDepth = syncDepth;
  var FILL = { OT: ['G', 'C'], G: ['C', 'OT'], C: ['G', 'OT'], EDGE: ['DT', 'LB'], DT: ['EDGE'], LB: ['S', 'EDGE'], CB: ['S'], S: ['CB', 'LB'], WR: ['TE', 'RB'], TE: ['WR', 'OT'], RB: ['WR'], QB: [], K: ['P'], P: ['K'] };
  function lineup(G, ab, lvl) {
    var t = G.teams[ab], L = {}, used = {}, pos;
    syncDepth(G, ab);
    for (pos in LINEUP) {
      var ids = (t.depth[pos] || []).filter(function (id) { return !G.players[id].inj; });
      // lvl 1 / 2 = second / third string (preseason): skip the players ahead of them on the depth chart
      var s0 = lvl ? Math.max(0, Math.min(LINEUP[pos] * lvl, ids.length - LINEUP[pos])) : 0;
      L[pos] = ids.slice(s0, s0 + LINEUP[pos]).map(function (id) { used[id] = 1; return G.players[id]; });
    }
    for (pos in LINEUP) {
      var guard = 0;
      while (L[pos].length < LINEUP[pos] && guard++ < 6) {
        var cand = null;
        (FILL[pos] || []).some(function (fp) {
          var c = (t.depth[fp] || []).map(function (id) { return G.players[id]; }).filter(function (p) { return !p.inj && !used[p.id]; })[0];
          if (c) { cand = c; return true; } return false;
        });
        if (!cand) cand = { id: 'rep' + pos + guard, fn: 'Replacement', ln: 'Player', pos: pos, ovr: 45, a: genAttrs(pos, 45), st: {}, tm: ab, rep: true };
        used[cand.id] = 1; L[pos].push(cand);
      }
    }
    return L;
  }
  E.lineup = lineup;
  function avg(a) { return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : 50; }
  E.avg = avg;
  function A(p, k) { var v = p.a[k] != null ? p.a[k] : p.ovr - 8; return p.fat > 40 ? v - (p.fat - 40) * .06 : v; }
  function units(G, ab, home, lvl) {
    var L = lineup(G, ab, lvl), t = G.teams[ab];
    var qb = L.QB[0], rb = L.RB[0], ol = L.OT.concat(L.G, L.C);
    var u = {
      L: L,
      pass: A(qb, 'ACC') * .4 + A(qb, 'DEC') * .3 + A(qb, 'THP') * .3,
      recv: avg(L.WR.map(function (p) { return A(p, 'RTE') * .35 + A(p, 'CTH') * .35 + A(p, 'REL') * .15 + A(p, 'SPD') * .15; })) * .8 + (A(L.TE[0], 'CTH') * .6 + A(L.TE[0], 'RTE') * .4) * .2,
      rel: avg(L.WR.map(function (p) { return A(p, 'REL'); })),
      pblk: avg(ol.map(function (p) { return A(p, 'PBK'); })),
      rblk: avg(ol.map(function (p) { return A(p, 'RBK'); })) * .85 + A(L.TE[0], 'RBK') * .15,
      rush: A(rb, 'SPD') * .3 + A(rb, 'ELU') * .25 + A(rb, 'BCV') * .3 + A(rb, 'BTK') * .15,
      prs: avg(L.EDGE.map(function (p) { return A(p, 'PRS'); })) * .65 + avg(L.DT.map(function (p) { return A(p, 'PRS'); })) * .35,
      rdef: avg(L.DT.concat(L.EDGE).map(function (p) { return A(p, 'RST'); })) * .6 + avg(L.LB.map(function (p) { return (A(p, 'RST') + A(p, 'TKL')) / 2; })) * .3 + avg(L.S.map(function (p) { return (A(p, 'RST') + A(p, 'TKL')) / 2; })) * .1,
      blz: avg(L.LB.map(function (p) { return A(p, 'PRS'); })),
      bsk: avg(L.CB.map(function (p) { return A(p, 'BSK'); })),
      cov: avg(L.CB.map(function (p) { return A(p, 'COV') * .6 + A(p, 'ZON') * .4; })) * .6 + avg(L.S.map(function (p) { return A(p, 'ZON'); })) * .3 + avg(L.LB.map(function (p) { return A(p, 'COV'); })) * .1,
      k: L.K[0], p: L.P[0],
      cluD: avg(L.EDGE.concat(L.DT, L.LB, L.CB, L.S).map(function (p) { return p.clu || 60; })),
      hot: L.EDGE.concat(L.DT, L.LB, L.CB, L.S).filter(function (p) { return !p.rep && (p.pers === 'HOT' || p.pers === 'CANCER' || (p.att != null && p.att < 35)); })
    };
    var bonus = (t.chem - 50) / 50 * 2.5 + (home ? 1 : 0);
    if (G.user && G.user.ab === ab) bonus += (G.user.plan && G.user.plan.gp) ? 1.8 : (G.user.gameplanBonus || 0);
    // Week 1 sharpness: starters who got preseason snaps start faster (0 quarters = rusty, ~3 = league norm)
    if (G.phase === 'regular' && G.week === 1 && t.sharp != null) bonus += clamp((t.sharp - 3) * .12, -.4, 1.1);
    ['pass', 'recv', 'pblk', 'rblk', 'rush', 'prs', 'rdef', 'cov'].forEach(function (k) { u[k] += bonus; });
    u.disc = (G.user && G.user.ab === ab) ? G.user.disc : 50;
    return u;
  }
  E.units = units;
  E.teamOvr = function (G, ab) {
    var L = lineup(G, ab), o = 0, on = 0, d = [];
    for (var pos in L) L[pos].forEach(function (p) { if (OFF[pos]) { var w = pos === 'QB' ? 3 : 1; o += p.ovr * w; on += w; } else if (DEF[pos]) d.push(p.ovr); });
    var off = o / on, def = avg(d);
    return { off: Math.round(off), def: Math.round(def), ovr: Math.round(off * .52 + def * .48) };
  };
  // In training camp only the top 51 salaries count against the cap (NFL offseason rule)
  E.capUsed = function (G, ab) {
    var s = G.teams[ab].dead || 0, a = teamPlayers(G, ab).map(function (p) { return p.sal || 0; });
    if (G.phase === 'camp' && a.length > 51) { a.sort(function (x, y) { return y - x; }); a.length = 51; }
    a.forEach(function (v) { s += v; }); return s;
  };
  E.capSpace = function (G, ab) { return G.cap - E.capUsed(G, ab); };

  // ---------- Play calling & simulation ----------
  var OFF_PLAYS = {
    RUN_IN: { n: 'Inside Run', g: 'run', d: 'Power between the tackles' },
    RUN_OUT: { n: 'Outside Run', g: 'run', d: 'Stretch to the edge' },
    SCREEN: { n: 'Screen Pass', g: 'pass', d: 'Punishes the blitz' },
    PASS_S: { n: 'Quick Pass', g: 'pass', d: 'Slants & outs, 3-7 yds' },
    PASS_M: { n: 'Medium Pass', g: 'pass', d: 'Digs & curls, 10-18 yds' },
    PASS_D: { n: 'Deep Shot', g: 'pass', d: 'Go routes & posts, 25+ yds' },
    PA: { n: 'Play Action', g: 'pass', d: 'Sell the run, attack 15+' },
    PUNT: { n: 'Punt', g: 'st', d: 'Flip the field' },
    FG: { n: 'Field Goal', g: 'st', d: 'Kick it' },
    KNEEL: { n: 'Kneel', g: 'st', d: 'Run the clock' }
  };
  var DEF_PLAYS = {
    BASE: { n: 'Base 4-3', d: 'Balanced vs run & pass' },
    BLITZ: { n: 'Blitz', d: 'Bring pressure. High risk, high reward' },
    C2: { n: 'Cover 2', d: 'Two deep safeties, soft vs the run' },
    C3: { n: 'Cover 3', d: 'Zone, takes away intermediate' },
    MAN: { n: 'Man Press', d: 'Jam receivers, disrupt timing' },
    PREVENT: { n: 'Prevent', d: 'Nothing deep, concedes underneath' }
  };
  E.OFF_PLAYS = OFF_PLAYS; E.DEF_PLAYS = DEF_PLAYS;
  var PASS = {
    PASS_S: { c: .75, air: 4, asd: 2.5, yac: 2.5, int: .018, sk: .03 },
    PASS_M: { c: .61, air: 10, asd: 3.5, yac: 2.3, int: .028, sk: .045 },
    PASS_D: { c: .37, air: 25, asd: 7, yac: 3, int: .044, sk: .06 },
    SCREEN: { c: .82, air: -1.5, asd: 1, yac: 5.0, int: .007, sk: .015 },
    PA: { c: .61, air: 12.5, asd: 5, yac: 2.8, int: .025, sk: .055 }
  };
  // [comp, yards, sack, int]
  var MOD = {
    BASE: { RUN_IN: [0, -.3], RUN_OUT: [0, 0], PASS_S: [.02, 0, 0, 0], PASS_M: [0, 0, 0, 0], PASS_D: [0, 0, 0, 0], SCREEN: [0, 0, 0, 0], PA: [.06, 2, 0, 0] },
    BLITZ: { RUN_IN: [0, .2], RUN_OUT: [0, .6], PASS_S: [.05, .5, .05, 0], PASS_M: [.02, 1, .09, .005], PASS_D: [.05, 6, .12, 0], SCREEN: [.06, 5, -.01, 0], PA: [-.03, 2, .10, 0] },
    C2: { RUN_IN: [0, 1.2], RUN_OUT: [0, .8], PASS_S: [-.04, -.5, 0, .004], PASS_M: [.04, 1, 0, 0], PASS_D: [-.12, -4, 0, .012], SCREEN: [0, 0, 0, 0], PA: [-.02, 0, 0, .004] },
    C3: { RUN_IN: [0, .4], RUN_OUT: [0, .2], PASS_S: [.04, .5, 0, 0], PASS_M: [-.06, -1, 0, .008], PASS_D: [-.09, -3, 0, .01], SCREEN: [0, 0, 0, 0], PA: [-.03, -1, 0, .004] },
    MAN: { RUN_IN: [0, .4], RUN_OUT: [0, .5], PASS_S: [-.04, 0, .01, 0], PASS_M: [0, 0, .01, .004], PASS_D: [.04, 3, .01, .006], SCREEN: [-.03, -1, 0, 0], PA: [0, 1, 0, 0] },
    PREVENT: { RUN_IN: [0, 2.2], RUN_OUT: [0, 2.6], PASS_S: [.09, 2, -.02, 0], PASS_M: [.05, 1, -.02, 0], PASS_D: [-.2, -6, -.03, .02], SCREEN: [.05, 2, 0, 0], PA: [-.05, 0, -.02, .006] }
  };
  E.newGame = function (G, home, away, opts) {
    opts = opts || {};
    var gs = { home: home, away: away, sc: {}, q: 1, clock: 900, pos: null, ball: 35, down: 1, togo: 10, over: false, log: [], drives: [], ot: false, playoff: !!opts.playoff, plays: 0, tst: {}, last: null, recentRuns: 0, injuries: [], neutral: !!opts.neutral, pre: !!opts.pre, sq: opts.sq || {}, lvl: {}, played: {}, pg: {} };
    gs.sc[home] = 0; gs.sc[away] = 0;
    [home, away].forEach(function (ab) { gs.tst[ab] = { yds: 0, pass: 0, rush: 0, to: 0, fd: 0, plays: 0, top: 0, sacks: 0 }; });
    gs.U = {}; [home, away].forEach(function (ab) { gs.lvl[ab] = preLevel(gs, ab, 1); setU(G, gs, ab); });
    gs.recv1 = rnd() < .5 ? home : away;
    kickoff(G, gs, gs.recv1);
    return gs;
  };
  function other(gs, ab) { return ab === gs.home ? gs.away : gs.home; }
  E.other = other;
  // preseason: starters play quarters 1..sq, then the 2nd string, 3rd string in the 4th quarter
  function preLevel(gs, ab, q) { if (!gs.pre) return 0; var sq = gs.sq[ab] == null ? 1 : gs.sq[ab]; return q <= sq ? 0 : q >= 4 ? 2 : 1; }
  function setU(G, gs, ab) {
    gs.U[ab] = units(G, ab, ab === gs.home && !gs.neutral, gs.lvl ? gs.lvl[ab] : 0);
    if (gs.played) { var L = gs.U[ab].L; for (var pos in L) L[pos].forEach(function (p) { if (!p.rep) gs.played[p.id] = 1; }); }
  }
  function preSwap(G, gs) {
    [gs.home, gs.away].forEach(function (ab) {
      var lv = preLevel(gs, ab, gs.q); if (lv === gs.lvl[ab]) return;
      gs.lvl[ab] = lv; setU(G, gs, ab);
      log(gs, { t: G.teams[ab].name + ': ' + (lv === 1 ? 'the second string takes over.' : lv === 2 ? 'third-stringers and camp bodies are in.' : 'starters back in.'), sys: 1 });
    });
  }
  function pname(p) { return p.rep ? 'a replacement' : (p.fn.charAt(0) + '. ' + p.ln); }
  E.pname = pname;
  var CUR = { pre: 0, pg: null };
  function st(G, p, k, v) {
    if (!p || p.rep) return;
    if (CUR.pre) { var ps = p.pst || (p.pst = {}); ps[k] = (ps[k] || 0) + v; var o = CUR.pg[p.id] || (CUR.pg[p.id] = {}); o[k] = (o[k] || 0) + v; return; }
    p.st[k] = (p.st[k] || 0) + v;
  }
  function startDrive(gs, ab, ball) { gs.pos = ab; gs.ball = ball; gs.down = 1; gs.togo = Math.min(10, 100 - ball); gs.drive = { team: ab, start: ball, plays: 0, yds: 0, q: gs.q, clock: gs.clock, result: '' }; }
  function endDrive(gs, res) { if (gs.drive) { gs.drive.result = res; gs.drive.end = gs.ball; gs.drives.push(gs.drive); gs.drive = null; } }
  function kickoff(G, gs, recv) {
    var r = rnd(), ball, txt;
    if (r < .62) { ball = 35; txt = 'Touchback.'; }
    else if (r < .996) { ball = clamp(Math.round(24 + gauss() * 7), 8, 55); txt = 'Returned to the ' + (ball < 50 ? recv + ' ' + ball : ball === 50 ? '50' : other(gs, recv) + ' ' + (100 - ball)) + '.'; }
    else ball = 100;
    if (ball === 100) {
      gs.sc[recv] += 7; log(gs, { t: 'KICKOFF RETURNED FOR A TOUCHDOWN! The ' + G.teams[recv].name + ' take it to the house!', big: 1, score: 1, team: recv, anim: { kind: 'ko' } });
      kickoff(G, gs, other(gs, recv)); return;
    }
    log(gs, { t: G.teams[other(gs, recv)].name + ' kick off. ' + txt, team: recv, ko: 1, anim: { kind: 'ko' } });
    startDrive(gs, recv, ball);
  }
  function log(gs, o) { o.q = gs.q; o.clock = gs.clock; o.sc = {}; o.sc[gs.home] = gs.sc[gs.home]; o.sc[gs.away] = gs.sc[gs.away]; o.n = gs.log.length; gs.log.push(o); gs.last = o; }

  E.aiOffCall = function (G, gs) {
    var ab = gs.pos, lead = gs.sc[ab] - gs.sc[other(gs, ab)], late = gs.q >= 4 && gs.clock < 300, fgDist = 100 - gs.ball + 17;
    var K = gs.U[ab].k, fgRange = 50 + (A(K, 'KPW') - 70) / 3;
    if (gs.q >= 4 && gs.clock < 100 && lead > 0) return 'KNEEL';
    if (gs.down === 4) {
      var need = late && lead < 0;
      if (gs.q >= 4 && gs.clock < 25 && lead >= -3 && lead <= 0 && fgDist <= fgRange + 3) return 'FG';
      if (!need) {
        if (gs.togo <= 1 && gs.ball >= 40 && gs.ball <= 75 && rnd() < .55) return rnd() < .6 ? 'RUN_IN' : 'PASS_S';
        if (fgDist <= fgRange) return 'FG';
        if (gs.togo <= 3 && gs.ball > 55 && rnd() < .3) return 'PASS_S';
        return 'PUNT';
      }
      if (lead < -3 || fgDist > fgRange || gs.clock > 40) return gs.togo > 6 ? 'PASS_M' : 'PASS_S';
      return 'FG';
    }
    if (gs.q === 2 && gs.clock < 8 && fgDist <= fgRange) return 'FG';
    if (gs.q >= 4 && gs.clock < 8 && lead >= -3 && lead <= 0 && fgDist <= fgRange) return 'FG';
    var hurry = (late && lead < 0) || (gs.q === 2 && gs.clock < 120);
    var runP = gs.togo <= 3 ? .58 : gs.togo >= 10 ? .3 : .44;
    if (hurry) runP = .12;
    if (late && lead > 0) runP = .75;
    if (gs.down === 3 && gs.togo > 4) runP = .1;
    if (rnd() < runP) return rnd() < .55 ? 'RUN_IN' : 'RUN_OUT';
    var r = rnd();
    if (gs.togo >= 15 || (hurry && gs.ball < 60)) return r < .4 ? 'PASS_D' : r < .85 ? 'PASS_M' : 'PASS_S';
    if (gs.togo <= 4) return r < .5 ? 'PASS_S' : r < .7 ? 'SCREEN' : r < .9 ? 'PASS_M' : 'PA';
    return r < .3 ? 'PASS_S' : r < .62 ? 'PASS_M' : r < .78 ? 'PASS_D' : r < .9 ? 'PA' : 'SCREEN';
  };
  E.aiDefCall = function (G, gs) {
    var ab = other(gs, gs.pos), lead = gs.sc[ab] - gs.sc[gs.pos], r = rnd();
    if (gs.q >= 4 && gs.clock < 150 && lead > 0 && lead <= 8 && gs.ball < 75) return r < .6 ? 'PREVENT' : 'C2';
    if (gs.togo <= 2) return r < .45 ? 'BASE' : r < .7 ? 'BLITZ' : 'MAN';
    if (gs.togo >= 10) return r < .3 ? 'C2' : r < .6 ? 'C3' : r < .8 ? 'MAN' : 'BLITZ';
    return r < .3 ? 'BASE' : r < .48 ? 'C3' : r < .64 ? 'C2' : r < .82 ? 'MAN' : 'BLITZ';
  };
  function chooseTarget(L, call) {
    var c = L.WR.map(function (p, i) { return { p: p, w: [.32, .24, .15][i] * (p.ovr / 70) * (call === 'PASS_D' ? 1.4 : 1) }; });
    c.push({ p: L.TE[0], w: .17 * (L.TE[0].ovr / 70) * (call === 'PASS_D' ? .4 : 1) });
    c.push({ p: L.RB[0], w: (call === 'SCREEN' ? 1.2 : call === 'PASS_S' ? .16 : .06) * (L.RB[0].ovr / 70) });
    return wpick(c, function (x) { return x.w; }).p;
  }
  function tackler(L, kind) {
    var pool = kind === 'run' ? L.LB.concat(L.DT, L.EDGE, L.S) : kind === 'deep' ? L.S.concat(L.CB) : L.CB.concat(L.LB, L.S);
    return wpick(pool, function (p) { return A(p, 'TKL') * (p.pos === 'LB' ? 1.4 : 1); });
  }
  function injuryCheck(G, gs, p) {
    if (!p || p.rep || p.inj) return '';
    var risk = .0028;
    risk *= 1 + (p.fat || 0) / 200;
    if (G.user && p.tm === G.user.ab && G.user.plan && G.user.plan.cond) risk *= .6;
    if (rnd() < risk) {
      p.inj = pick([1, 1, 1, 2, 2, 3, 4, 6, 8]);
      gs.injuries.push(p.id);
      setU(G, gs, p.tm);
      return ' INJURY: ' + pname(p) + ' leaves the game (out ' + p.inj + ' wk' + (p.inj > 1 ? 's' : '') + ').';
    }
    return '';
  }
  function yardStr(y) { return y === 0 ? 'no gain' : y < 0 ? 'a loss of ' + (-y) : y + (y === 1 ? ' yard' : ' yards'); }
  function merge(a, b) { for (var k in b) a[k] = b[k]; return a; }
  function teamYd(G, gs) { var b = gs.ball; if (b === 50) return 'the 50'; return b < 50 ? gs.pos + ' ' + b : other(gs, gs.pos) + ' ' + (100 - b); }
  E.teamYd = teamYd;
  function ddText(gs) { return (gs.down === 1 ? '1st' : gs.down === 2 ? '2nd' : gs.down === 3 ? '3rd' : '4th') + ' & ' + (gs.ball + gs.togo >= 100 ? 'Goal' : gs.togo); }
  E.ddText = ddText;

  function runPlay(G, gs, oc, dc) {
    if (gs.over) return null;
    CUR.pre = gs.pre ? 1 : 0; CUR.pg = gs.pre ? (gs.pg || (gs.pg = {})) : null;
    var off = gs.pos, def = other(gs, off), U = gs.U[off], D = gs.U[def], L = U.L, DL = D.L;
    var discF = 1.15 - (U.disc / 100) * .3;
    var margin = Math.abs(gs.sc[off] - gs.sc[def]), crunch = (gs.q >= 4 && gs.clock <= 300 && margin <= 8) || gs.q >= 5;
    var lev = crunch ? 1 : 0; if (gs.down >= 3) lev += .5; if (gs.ball >= 80) lev += .5; if (gs.playoff) lev += .3; lev = Math.min(1, lev);
    var heroP = null, goatP = null;
    var hurry = (gs.q >= 4 && gs.clock < 300 && gs.sc[off] < gs.sc[def]) || (gs.q === 2 && gs.clock < 120);
    var res = { oc: oc, dc: dc, off: off, def: def, startBall: gs.ball, down: gs.down, togo: gs.togo, yards: 0, anim: {} };
    var txt = '', time = 0, yards = 0, turnover = false, score = 0, extra = '';
    var head = ddText(gs) + ' at ' + teamYd(G, gs) + ': ';
    gs.plays++; gs.tst[off].plays++;
    if (gs.drive) gs.drive.plays++;
    if (oc === 'KNEEL') {
      yards = -1; time = 40; txt = pname(L.QB[0]) + ' takes a knee.'; res.anim = { kind: 'kneel' };
    } else if (oc === 'PUNT') {
      var P = U.p, net = Math.round(41 + (A(P, 'KPW') - 70) / 4 + gauss() * 6), land = gs.ball + net, nb, ret = 0;
      if (land >= 100) { nb = 20; txt = pname(P) + ' punts into the end zone. Touchback.'; }
      else { ret = Math.max(0, Math.round(gauss() * 5 + 6)); if (land > 90 && rnd() < .6) ret = 0; nb = clamp(100 - land + ret, 1, 99); if (rnd() < .004) nb = 100; txt = pname(P) + ' punts ' + net + ' yards' + (ret ? ', returned ' + ret + ' yards.' : ', fair catch.'); }
      res.anim = { kind: 'punt', land: Math.min(land, 100), ret: ret };
      tickClock(gs, 8);
      endDrive(gs, 'Punt');
      if (nb === 100) { gs.sc[def] += 7; log(gs, merge(res, { t: head + txt + ' PUNT RETURN TOUCHDOWN!', big: 1, score: 1, team: def })); kickoff(G, gs, off); return afterClock(G, gs) || gs.last; }
      log(gs, merge(res, { t: head + txt, team: off })); startDrive(gs, def, nb); afterClock(G, gs); return gs.last;
    } else if (oc === 'FG') {
      var K = U.k, dist = 100 - gs.ball + 17, center = 50 + (A(K, 'KPW') - 75) * .28, acc = (A(K, 'KAC') - 75) * .004;
      var prob = clamp(1 / (1 + Math.exp((dist - center) / 4.2)) + acc, .02, .985);
      res.anim = { kind: 'fg', good: false, dist: dist };
      tickClock(gs, 5);
      st(G, K, 'fga', 1);
      if (rnd() < prob) {
        gs.sc[off] += 3; st(G, K, 'fgm', 1); res.anim.good = true;
        log(gs, merge(res, { t: head + pname(K) + ' ' + dist + '-yard field goal is GOOD.', score: 1, team: off })); endDrive(gs, 'FG'); kickoff(G, gs, def); afterClock(G, gs); return gs.last;
      }
      log(gs, merge(res, { t: head + pname(K) + ' ' + dist + '-yard field goal is NO GOOD.', team: off, bad: 1 })); endDrive(gs, 'Missed FG');
      startDrive(gs, def, clamp(100 - gs.ball - 7, 20, 99)); afterClock(G, gs); return gs.last;
    } else if (oc === 'RUN_IN' || oc === 'RUN_OUT') {
      var rb = L.RB[0];
      if (rnd() < .07 && A(L.QB[0], 'SPD') > 76) rb = L.QB[0];
      var diff = (U.rblk * .5 + U.rush * .5) - D.rdef + ((rb.clu || 60) - (D.cluD || 60)) * .08 * lev, m = MOD[dc][oc];
      var mean = (oc === 'RUN_IN' ? 3.25 : 3.4) + diff / 9 + m[1], sd = oc === 'RUN_IN' ? 2.8 : 4.3;
      if (dc === 'BLITZ') sd *= 1.35;
      yards = Math.round(mean + gauss() * sd);
      if (yards < 0 && rnd() < .5) yards = Math.round(yards / 2);
      var brk = .018 + diff * .001 + (dc === 'BLITZ' ? .02 : 0) + (dc === 'PREVENT' ? .01 : 0);
      if (rnd() < brk) yards += ri(12, 55);
      if (gs.ball + yards >= 100) yards = 100 - gs.ball;
      if (gs.ball + yards <= 0) yards = -gs.ball;
      var tk = tackler(DL, 'run');
      st(G, rb, 'ra', 1); st(G, rb, 'ry', yards);
      if (crunch && yards >= 7 && (rb.clu || 0) >= 78) heroP = rb;
      gs.tst[off].rush += yards;
      if (rnd() < .007 * discF * clamp(1 + (72 - A(rb, 'BSC')) * .03, .4, 2)) {
        turnover = true; st(G, tk, 'ff', 1); if (crunch && (rb.clu || 60) < 48) goatP = rb;
        txt = pname(rb) + ' runs ' + (oc === 'RUN_IN' ? 'up the middle' : 'to the outside') + ' and FUMBLES! ' + pname(tk) + ' forces it, ' + G.teams[def].name + ' recover.';
      } else {
        txt = pname(rb) + (oc === 'RUN_IN' ? pick([' up the middle', ' between the tackles', ' behind the guard']) : pick([' around the left end', ' around the right end', ' on the stretch'])) + ' for ' + yardStr(yards) + '.';
        if (gs.ball + yards < 100) { txt += ' Tackled by ' + pname(tk) + '.'; st(G, tk, 'tkl', 1); }
      }
      extra = injuryCheck(G, gs, rb) || injuryCheck(G, gs, tk);
      time = hurry ? 18 : ri(33, 45);
      res.anim = { kind: 'run', out: oc === 'RUN_OUT', carrier: rb.id, qbRun: rb.pos === 'QB' };
      gs.recentRuns++;
      if (gs.ball + yards >= 100 && !turnover) { score = 6; st(G, rb, 'rtd', 1); }
    } else {
      var P0 = PASS[oc], mm = MOD[dc][oc], qb = L.QB[0];
      var dpass = (U.pass * .55 + U.recv * .45) - D.cov, dprot = U.pblk - D.prs;
      dpass += ((qb.clu || 60) - (D.cluD || 60)) * .1 * lev;
      if (dc === 'MAN' || dc === 'BLITZ') dpass += ((U.rel || 72) - 72) * .2;
      if (dc === 'BLITZ') dprot -= ((D.blz || 62) - 62) * .25;
      var pa = oc === 'PA' ? clamp(gs.recentRuns * .012, 0, .06) : 0;
      var sackP = clamp(P0.sk + mm[2] * .75 - dprot * .0022 - (A(qb, 'DEC') - 70) * .0008 - (A(qb, 'POC') - 70) * .0008, .005, .3);
      var compP = clamp(P0.c + mm[0] + dpass * .005 + pa, .1, .93);
      var intP = clamp((P0.int + (mm[3] || 0) - dpass * .0007 - (A(qb, 'DEC') - 70) * .0006) * discF * clamp(1 + ((D.bsk || 70) - 70) * .012, .7, 1.4), .002, .12);
      time = hurry ? 17 : ri(32, 43);
      if (rnd() < sackP) {
        var sk = wpick(DL.EDGE.concat(DL.DT, DL.LB), function (p) { return A(p, 'PRS') * (p.pos === 'EDGE' ? 1.6 : 1); });
        yards = -ri(3, 10); if (gs.ball + yards <= 0) yards = -gs.ball;
        st(G, sk, 'sck', 1); st(G, sk, 'tkl', 1); gs.tst[def].sacks++;
        if (crunch) { if ((sk.clu || 0) >= 76) heroP = sk; else if ((qb.clu || 60) < 52) goatP = qb; }
        txt = pname(qb) + ' is SACKED by ' + pname(sk) + ' for a loss of ' + (-yards) + '.';
        res.anim = { kind: 'sack' };
        gs.tst[off].pass += yards;
        if (rnd() < .06 * discF) { turnover = true; txt += ' FUMBLE! ' + G.teams[def].name + ' recover!'; }
        extra = injuryCheck(G, gs, qb);
      } else {
        var tgt = chooseTarget(L, oc), air = Math.round(P0.air + mm[1] * .5 + gauss() * P0.asd);
        if (gs.ball + air >= 100) air = Math.max(1, 99 - gs.ball + ri(0, 1));
        st(G, qb, 'pa', 1);
        var tq = ((A(tgt, 'CTH') * .6 + A(tgt, 'RTE') * .4) - 70) * .003;
        if (rnd() < intP) {
          var db = wpick(DL.CB.concat(DL.S, DL.LB), function (p) { return (p.a.BSK || p.a.ZON || 50) * (p.pos === 'LB' ? .3 : 1); });
          st(G, qb, 'int', 1); st(G, db, 'dint', 1); turnover = true;
          if (crunch) { if ((db.clu || 0) >= 76) heroP = db; else if ((qb.clu || 60) < 52) goatP = qb; }
          txt = pname(qb) + ' throws ' + (oc === 'PASS_D' ? 'deep ' : '') + 'for ' + pname(tgt) + '... INTERCEPTED by ' + pname(db) + '!';
          yards = air; res.anim = { kind: 'int', air: air, tgt: tgt.id };
          res.intRet = Math.max(0, Math.round(gauss() * 8 + 6));
          if (rnd() < .035) res.pick6 = true;
        } else if (rnd() < compP + tq) {
          var yac = Math.max(0, Math.round(P0.yac + mm[1] * .5 + gauss() * 3.2 + (A(tgt, 'SPD') - 75) * .06));
          if (rnd() < .02 + Math.max(0, dpass) * .0012) yac += ri(10, 40);
          yards = air + yac; if (gs.ball + yards >= 100) yards = 100 - gs.ball; if (gs.ball + yards <= 0) yards = -gs.ball + 1;
          st(G, qb, 'pc', 1); st(G, qb, 'py', yards); st(G, tgt, 'rec', 1); st(G, tgt, 'recy', yards);
          if (crunch && yards >= 10) { if ((tgt.clu || 0) >= 78 && (tgt.clu || 0) > (qb.clu || 0)) heroP = tgt; else if ((qb.clu || 0) >= 76) heroP = qb; }
          gs.tst[off].pass += yards;
          txt = pname(qb) + (oc === 'SCREEN' ? ' screen to ' : oc === 'PASS_D' ? ' launches deep... CAUGHT by ' : ' complete to ') + pname(tgt) + ' for ' + yardStr(yards) + '.';
          if (gs.ball + yards < 100) { var tk2 = tackler(DL, oc === 'PASS_D' ? 'deep' : 'pass'); st(G, tk2, 'tkl', 1); if (rnd() < .4) txt += ' Brought down by ' + pname(tk2) + '.'; }
          if (gs.ball + yards < 100 && rnd() < .006 * discF * clamp(1 + (72 - A(tgt, 'BSC')) * .03, .4, 2)) { turnover = true; txt += ' FUMBLE after the catch! ' + G.teams[def].name + ' recover.'; }
          res.anim = { kind: 'pass', air: air, tgt: tgt.id, tpos: tgt.pos, comp: true };
          if (gs.ball + yards >= 100 && !turnover) { score = 6; st(G, qb, 'ptd', 1); st(G, tgt, 'rectd', 1); }
          extra = injuryCheck(G, gs, tgt);
        } else {
          yards = 0; time = 8;
          var dbx = wpick(DL.CB.concat(DL.S), function (p) { return A(p, 'COV'); });
          txt = pname(qb) + ' pass ' + (oc === 'PASS_D' ? 'deep ' : '') + 'incomplete, intended for ' + pname(tgt) + (rnd() < .45 ? '. Broken up by ' + pname(dbx) + '.' : '.');
          if (rnd() < .45) st(G, dbx, 'pd', 1);
          res.anim = { kind: 'pass', air: air, tgt: tgt.id, tpos: tgt.pos, comp: false };
        }
      }
      gs.recentRuns = Math.max(0, gs.recentRuns - 1);
    }
    if (!turnover && score !== 6 && D.hot && D.hot.length && gs.ball + yards + 15 < 100 && rnd() < .0032 * D.hot.length * (1.3 - (D.disc || 50) / 100 * .6)) {
      var hp = pick(D.hot); yards += 15; st(G, hp, 'pen', 1);
      txt += ' 🚩 FLAG: unnecessary roughness on ' + pname(hp) + ' (' + G.teams[def].name + '), 15 yards.';
    }
    if (heroP && !heroP.rep && rnd() < .8) txt += ' 🧊 ' + pname(heroP) + pick([' is taking over in crunch time!', ' wants the ball in the big moment, and delivers!', ' is ice cold when it matters most.']);
    else if (goatP && !goatP.rep && rnd() < .8) txt += ' 😬 ' + pname(goatP) + ' looks rattled in the big moment.';
    res.yards = yards;
    gs.tst[off].yds += yards;
    tickClock(gs, time);
    gs.tst[off].top += time;
    if (gs.drive) gs.drive.yds += yards;
    if (turnover) {
      gs.tst[off].to++;
      var nb2;
      if (res.anim.kind === 'int') { nb2 = clamp(100 - (gs.ball + yards) + (res.intRet || 0), 1, 99); if (res.pick6) nb2 = 100; }
      else nb2 = clamp(100 - (gs.ball + yards), 1, 99);
      endDrive(gs, res.anim.kind === 'int' ? 'Interception' : 'Fumble');
      if (nb2 >= 100) { gs.sc[def] += 7; log(gs, merge(res, { t: head + txt + ' RETURNED FOR A TOUCHDOWN!' + extra, big: 1, score: 1, to: 1, team: off })); kickoff(G, gs, off); afterClock(G, gs); return gs.last; }
      log(gs, merge(res, { t: head + txt + extra, to: 1, big: 1, team: off }));
      startDrive(gs, def, nb2); afterClock(G, gs); return gs.last;
    }
    if (score === 6) {
      var K2 = U.k, xp = rnd() < clamp(.94 + (A(K2, 'KAC') - 75) * .002, .85, .995);
      gs.sc[off] += xp ? 7 : 6; st(G, K2, 'xpa', 1); if (xp) st(G, K2, 'xpm', 1);
      log(gs, merge(res, { t: head + txt + ' TOUCHDOWN, ' + G.teams[off].name.toUpperCase() + '!' + (xp ? '' : ' (Extra point no good)') + extra, big: 1, score: 1, td: 1, team: off }));
      endDrive(gs, 'Touchdown'); kickoff(G, gs, def); afterClock(G, gs); return gs.last;
    }
    if (gs.ball + yards <= 0) {
      gs.sc[def] += 2; log(gs, merge(res, { t: head + txt + ' SAFETY!', big: 1, score: 1, team: off })); endDrive(gs, 'Safety');
      startDrive(gs, def, 35); afterClock(G, gs); return gs.last;
    }
    gs.ball += yards;
    var first = false;
    if (yards >= gs.togo) { gs.down = 1; gs.togo = Math.min(10, 100 - gs.ball); first = true; gs.tst[off].fd++; }
    else { gs.down++; gs.togo -= yards; }
    if (gs.down > 4) {
      log(gs, merge(res, { t: head + txt + ' Turnover on downs.' + extra, team: off, bad: 1 })); endDrive(gs, 'Downs');
      startDrive(gs, def, 100 - gs.ball); afterClock(G, gs); return gs.last;
    }
    log(gs, merge(res, { t: head + txt + (first ? ' First down.' : '') + extra, team: off, first: first }));
    afterClock(G, gs); return gs.last;
  }
  function tickClock(gs, sec) { gs.clock -= sec; if (gs.clock < 0) gs.clock = 0; }
  function afterClock(G, gs) {
    if (gs.over) return null;
    if (gs.ot && gs.q >= 5 && gs.sc[gs.home] !== gs.sc[gs.away]) { finish(G, gs); return null; }
    if (gs.clock > 0) return null;
    if (gs.q === 1 || gs.q === 3) { gs.q++; gs.clock = 900; log(gs, { t: 'End of the ' + (gs.q === 2 ? '1st' : '3rd') + ' quarter.', sys: 1 }); if (gs.pre) preSwap(G, gs); return null; }
    if (gs.q === 2) { gs.q = 3; gs.clock = 900; endDrive(gs, 'Half'); log(gs, { t: 'HALFTIME: ' + G.teams[gs.away].name + ' ' + gs.sc[gs.away] + ', ' + G.teams[gs.home].name + ' ' + gs.sc[gs.home] + '.', sys: 1, big: 1 }); if (gs.pre) preSwap(G, gs); kickoff(G, gs, other(gs, gs.recv1)); return null; }
    if (gs.sc[gs.home] !== gs.sc[gs.away]) { finish(G, gs); return null; }
    if (gs.pre) { finish(G, gs); return null; } // no overtime in the preseason
    if (gs.q >= 5 && !gs.playoff) { finish(G, gs); return null; }
    gs.q++; gs.clock = gs.playoff ? 900 : 600; gs.ot = true; endDrive(gs, 'End of regulation');
    log(gs, { t: (gs.q === 5 ? 'OVERTIME' : 'ANOTHER OVERTIME') + ': tied at ' + gs.sc[gs.home] + '. Next score wins.', sys: 1, big: 1 });
    kickoff(G, gs, rnd() < .5 ? gs.home : gs.away); return null;
  }
  function finish(G, gs) {
    if (gs.over) return;
    gs.over = true; endDrive(gs, 'End of game');
    var h = gs.sc[gs.home], a = gs.sc[gs.away];
    log(gs, { t: 'FINAL' + (gs.ot ? '/OT' : '') + ': ' + G.teams[gs.away].name + ' ' + a + ', ' + G.teams[gs.home].name + ' ' + h + '.', sys: 1, big: 1, final: 1 });
  }
  E.runPlay = runPlay;
  E.simToEnd = function (G, gs) {
    var guard = 0;
    while (!gs.over && guard++ < 800) runPlay(G, gs, E.aiOffCall(G, gs), E.aiDefCall(G, gs));
    if (!gs.over) finish(G, gs);
  };
  E.simDrive = function (G, gs, stopFn) {
    var start = gs.drives.length, guard = 0;
    while (!gs.over && gs.drives.length === start && guard++ < 60) { runPlay(G, gs, E.aiOffCall(G, gs), E.aiDefCall(G, gs)); if (stopFn && stopFn()) break; }
  };
  E.finalizeGame = function (G, gs, game) {
    var h = gs.home, a = gs.away, hs = gs.sc[h], as = gs.sc[a];
    game.hs = hs; game.as = as; game.ot = gs.ot;
    if (gs.pre) {
      CUR.pre = 1; CUR.pg = gs.pg || (gs.pg = {});
      for (var pid in gs.played) if (G.players[pid]) st(G, G.players[pid], 'gp', 1);
      CUR.pre = 0; CUR.pg = null;
      preGrades(G, gs, game);
      return;
    }
    CUR.pre = 0; CUR.pg = null;
    [h, a].forEach(function (ab) { var L = gs.U[ab].L; for (var pos in L) L[pos].forEach(function (p) { st(G, p, 'gp', 1); }); });
    if (gs.playoff) return;
    var TH = G.teams[h], TA = G.teams[a];
    TH.pf += hs; TH.pa += as; TA.pf += as; TA.pa += hs;
    if (hs > as) { TH.w++; TA.l++; TH.streak = Math.max(1, TH.streak + 1); TA.streak = Math.min(-1, TA.streak - 1); if (TH.div === TA.div) TH.divW++; }
    else if (as > hs) { TA.w++; TH.l++; TA.streak = Math.max(1, TA.streak + 1); TH.streak = Math.min(-1, TH.streak - 1); if (TH.div === TA.div) TA.divW++; }
    else { TH.t++; TA.t++; TH.streak = 0; TA.streak = 0; }
  };
  E.quickSim = function (G, h, a, playoff, neutral, extra) { var o = extra || {}; o.playoff = playoff; o.neutral = neutral; var gs = E.newGame(G, h, a, o); E.simToEnd(G, gs); return gs; };

  // ---------- Week flow ----------
  E.userGame = function (G) {
    if (G.phase === 'regular') { var wk = G.sched[G.week - 1] || []; for (var i = 0; i < wk.length; i++) if (wk[i].h === G.user.ab || wk[i].a === G.user.ab) return wk[i]; return null; }
    if (G.phase === 'playoffs' && G.playoffs) { var r = G.playoffs.rounds[G.playoffs.round] || []; for (var j = 0; j < r.length; j++) if (r[j].h === G.user.ab || r[j].a === G.user.ab) return r[j]; }
    if (G.phase === 'camp') return E.campGame(G);
    return null;
  };
  E.recordUserGame = function (G, gs) {
    if (G.phase === 'camp') return campRecord(G, gs);
    var g = E.userGame(G); if (!g || g.hs !== null) return;
    E.finalizeGame(G, gs, g);
    g.box = { tst: gs.tst, ot: gs.ot };
    var me = G.user.ab, opp = other(gs, me), won = gs.sc[me] > gs.sc[opp], lost = gs.sc[me] < gs.sc[opp];
    G.user.lastResult = won ? 'W' : lost ? 'L' : 'T';
    G.user.pressPending = (rnd() < .7 || G.phase === 'playoffs') ? E.makePress(G, won, lost) : null;
    addNews(G, (won ? 'WIN: ' : lost ? 'LOSS: ' : 'TIE: ') + G.teams[me].name + ' ' + gs.sc[me] + ', ' + G.teams[opp].name + ' ' + gs.sc[opp] + (gs.ot ? ' (OT)' : '') + '.', won ? 'win' : lost ? 'loss' : '');
  };
  E.advanceWeek = function (G) {
    if (G.phase !== 'regular') return;
    if (G.user.daily) E.finishWeekDays(G);
    var wk = G.sched[G.week - 1];
    wk.forEach(function (g) { if (g.hs === null) { var gs = E.quickSim(G, g.h, g.a); E.finalizeGame(G, gs, g); if (g.h === G.user.ab || g.a === G.user.ab) { var me = G.user.ab, o = g.h === me ? g.a : g.h; G.user.lastResult = gs.sc[me] > gs.sc[o] ? 'W' : gs.sc[me] < gs.sc[o] ? 'L' : 'T'; addNews(G, 'SIMMED: ' + G.teams[me].name + ' ' + gs.sc[me] + ', ' + G.teams[o].name + ' ' + gs.sc[o] + '.', G.user.lastResult === 'W' ? 'win' : 'loss'); } } });
    weeklyUpdate(G, wk);
    G.week++;
    G.user.pressPending = null;
    if (G.week > 18) { E.startPlayoffs(G); return; }
    E.newWeeklyEvent(G);
  };
  function weeklyUpdate(G, wk) {
    var me = G.user.ab, id;
    E.migrate(G);
    for (id in G.players) { var p0 = G.players[id]; if (p0.inj > 0) p0.inj--; }
    practiceWeek(G, false);
    G.user.gameplanBonus = 0;
    G.order.forEach(function (ab) { delete G.teams[ab].sharp; });
    weeklyTrades(G); tradeRequests(G);
    var res = G.user.lastResult, Lm = lineup(G, me), starters = {}, pos;
    for (pos in Lm) Lm[pos].forEach(function (p) { starters[p.id] = 1; });
    var cancers = 0, leaders = 0;
    teamPlayers(G, me).forEach(function (p) { if (p.pers === 'CANCER' && p.mor < 45) cancers++; if (p.pers === 'LEADER' && p.mor >= 60) leaders++; });
    teamPlayers(G, me).forEach(function (p) {
      var d = 0, pt = p.pers, rx = pt === 'COMP' ? 1.5 : pt === 'HOT' ? 1.6 : pt === 'PRO' ? .5 : pt === 'LEADER' ? .8 : 1;
      if (res === 'W') d += 1.5 * (pt === 'HOT' ? 1 : rx); else if (res === 'L') d -= 1.5 * rx;
      d += Math.min(1.2, leaders * .25) - Math.min(2, cancers * .5) * (pt === 'CANCER' ? 0 : 1);
      p.wantsSnaps = 0;
      if (starters[p.id]) d += .5;
      else if (p.ovr >= 70 && !p.inj && LINEUP[p.pos]) {
        var top = (G.teams[me].depth[p.pos] || []).slice(0, LINEUP[p.pos]).map(function (i) { return G.players[i].ovr; });
        var bx = pt === 'DIVA' ? 1.7 : pt === 'CANCER' ? 1.5 : pt === 'TEAM' ? .3 : pt === 'PRO' ? .6 : 1;
        if (p.ovr >= Math.min.apply(null, top) - 2) { d -= 3 * bx; p.wantsSnaps = 1; } else d -= .5 * bx;
      }
      if (p.yrs === 1 && marketValue(p) > p.sal * 1.6 && p.ovr >= 75) { d -= 1.2 * (pt === 'DIVA' ? 1.6 : pt === 'TEAM' ? .5 : 1); p.wantsDeal = 1; } else p.wantsDeal = 0;
      d += (G.user.unity - 50) / 40 + ((pt === 'PRO' ? 68 : pt === 'CANCER' ? 55 : 62) - p.mor) * .12;
      p.mor = clamp(p.mor + d, 0, 100);
    });
    G.user.lastResult = null;
    G.order.forEach(function (ab) {
      var t = G.teams[ab], wp = winPct(t), target;
      if (ab === me) {
        var ms = teamPlayers(G, me).sort(function (a, b) { return b.ovr - a.ovr; }).slice(0, 30).map(function (p) { return p.mor; });
        target = avg(ms) * .6 + G.user.unity * .25 + wp * 20 - 3 + clamp(t.streak * 1.5, -6, 6) + E.culture(G, ab) * .6;
      } else target = 50 + (wp - .5) * 40 + clamp(t.streak * 1.5, -6, 6) + E.culture(G, ab) * .6;
      t.chem = clamp(t.chem + (target - t.chem) * .3, 5, 99);
    });
    G.user.sp += 8;
    ['disc', 'unity', 'dev'].forEach(function (k) { G.user[k] += (50 - G.user[k]) * .04; });
    for (id in G.players) G.players[id].neg = 0;
    var big = wk.filter(function (g) { return g.hs !== null && g.h !== me && g.a !== me; }).sort(function (a, b) { return Math.abs(b.hs - b.as) - Math.abs(a.hs - a.as); })[0];
    if (big) { var w = big.hs > big.as ? big.h : big.a, l = w === big.h ? big.a : big.h; addNews(G, 'The ' + G.teams[w].name + ' rout the ' + G.teams[l].name + ', ' + Math.max(big.hs, big.as) + '-' + Math.min(big.hs, big.as) + '.'); }
  }
  function develop(G, p, focus, inten, devCulture, weeks) {
    var age = p.age, ageF = age <= 23 ? 1.4 : age <= 26 ? 1.0 : age <= 29 ? .45 : age <= 31 ? .05 : -.45;
    var isOff = OFF[p.pos], isDef = DEF[p.pos], fF = 1;
    if (focus === 'offense') fF = isOff ? 1.6 : .55; else if (focus === 'defense') fF = isDef ? 1.6 : .55;
    else if (focus === 'young') fF = age <= 25 ? 2.0 : .45; else if (focus === 'conditioning') fF = .7; else if (focus === 'gameplan') fF = .5;
    var iF = inten === 'hard' ? 1.4 : inten === 'light' ? .7 : 1;
    var mF = .7 + p.mor / 100 * .6, cF = .8 + devCulture / 100 * .5;
    var gap = p.pot - p.ovr, d;
    if (ageF > 0) d = .07 * ageF * fF * iF * mF * cF * (gap > 0 ? (.4 + gap / 10) : .1) * rf(.2, 1.8);
    else d = .07 * ageF * rf(.3, 1.7) / (fF > 1 ? 1.3 : 1);
    d *= weeks;
    if (p.inj) d *= .3;
    allAttrs(p.pos).forEach(function (k) { if (p.a[k] != null) p.a[k] = clamp(p.a[k] + d * rf(.5, 1.5), 25, 99); });
    p.ovr = calcOvr(p); if (p.ovr > p.pot) p.pot = p.ovr;
    p.prog = (p.prog || 0) + d;
    return d;
  }
  E.develop = develop;
  // ---------- Character & personality ----------
  var PERS = {
    LEADER: { n: 'Leader', i: '👑', co: 82, eg: 40, at: 86, eth: 8, ldr: 26, clu: 6, d: 'Vocal and respected. Lifts the locker room and steadies teammates.' },
    PRO: { n: 'Quiet Pro', i: '🧰', co: 86, eg: 25, at: 82, eth: 10, ldr: 0, clu: 2, d: 'Shows up, handles his job, no drama. Steady morale.' },
    TEAM: { n: 'Team First', i: '🤝', co: 80, eg: 18, at: 86, eth: 4, ldr: 6, clu: 0, d: 'Takes any role that helps the team. Rarely complains about snaps or money.' },
    COMP: { n: 'Competitor', i: '🔥', co: 66, eg: 55, at: 70, eth: 6, ldr: 4, clu: 8, d: 'Hates losing. Rises in big moments but takes losses hard.' },
    HOT: { n: 'Hothead', i: '💢', co: 46, eg: 60, at: 38, eth: -2, ldr: -6, clu: -5, d: 'Emotional. Draws personal fouls and blows up after bad weeks.' },
    DIVA: { n: 'Me-First', i: '💎', co: 40, eg: 92, at: 44, eth: -6, ldr: -8, clu: 2, d: 'Wants the ball and the money. Pouts when he is not featured.' },
    CANCER: { n: 'Locker Room Cancer', i: '☣️', co: 25, eg: 86, at: 18, eth: -12, ldr: -16, clu: -6, d: 'Divisive. Drags down chemistry and teammates when unhappy.' }
  };
  E.PERS = PERS;
  function seedRng(str) {
    var h = 2166136261 >>> 0, i;
    for (i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () { h = (h + 0x6D2B79F5) | 0; var t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function genChar(p) {
    var r = seedRng('ch|' + p.id + '|' + p.fn + p.ln), g = function () { return (r() + r() + r() + r() - 2) * 1.7; };
    var vet = clamp((p.exp || 0) / 8, 0, 1), star = clamp((p.ovr - 70) / 20, 0, 1);
    var w = { LEADER: 5 + 14 * vet + (p.pos === 'QB' ? 8 : 0) + 6 * star, PRO: 24, TEAM: 20, COMP: 18, HOT: 11, DIVA: 5 + 12 * star * (p.pos === 'WR' ? 1.7 : 1), CANCER: 4 };
    var tot = 0, k; for (k in w) tot += w[k];
    var x = r() * tot, t = 'PRO'; for (k in w) { x -= w[k]; if (x <= 0) { t = k; break; } }
    var P = PERS[t];
    p.pers = t;
    p.eth = Math.round(clamp(67 + g() * 11 + P.eth, 30, 99));
    p.ldr = Math.round(clamp(40 + 22 * vet + g() * 9 + P.ldr * .8 + (p.pos === 'QB' ? 5 : 0), 15, 99));
    p.clu = Math.round(clamp(61 + g() * 11 + 6 * star + P.clu, 25, 99));
    p.coa = Math.round(clamp(P.co + g() * 7, 10, 99));
    p.ego = Math.round(clamp(P.eg + g() * 7, 5, 99));
    p.att = Math.round(clamp(P.at + g() * 7, 5, 99));
  }
  function charTags(p) {
    var o = [];
    if (!p.pers) return o;
    if (p.pers === 'LEADER' || p.ldr >= 80) o.push('Leader');
    if (p.pers === 'HOT' || p.pers === 'DIVA' || p.pers === 'CANCER' || p.att < 40) o.push('Attitude');
    if (p.clu >= 82) o.push('Clutch'); else if (p.clu < 45) o.push('Rattles');
    if (p.eth >= 85) o.push('Grinder'); else if (p.eth < 50) o.push('Lazy');
    return o;
  }
  E.charTags = charTags;
  E.isAttitude = function (p) { return p.pers === 'HOT' || p.pers === 'DIVA' || p.pers === 'CANCER'; };
  function snapA(p) { var o = {}; allAttrs(p.pos).forEach(function (k) { if (p.a[k] != null) o[k] = Math.round(p.a[k] * 10) / 10; }); return o; }
  function ensureP(G, p) {
    if (!p || !p.a) return;
    var x = EXTRA[p.pos] || {}, k;
    for (k in x) if (p.a[k] == null) p.a[k] = clamp(p.ovr + x[k] + gauss() * 5, 25, 99);
    if (!p.pers || p.eth == null || p.clu == null) genChar(p);
    if (p.fat == null) p.fat = 0;
    if (!p.a0) p.a0 = snapA(p);
    if (G && G.user && p.tm === G.user.ab && !p.dh) p.dh = [Math.round(wovr(p) * 10) / 10];
  }
  E.ensureP = ensureP;
  // Team culture from character (all 32 teams, so the league stays balanced)
  E.culture = function (G, ab) {
    var ps = teamPlayers(G, ab).sort(function (a, b) { return b.ovr - a.ovr; }).slice(0, 30), s = 0;
    ps.forEach(function (p) {
      if (!p.pers) return;
      if (p.pers === 'LEADER') s += .5 + (p.ldr - 70) / 40 + (p.mor - 55) / 60;
      else if (p.ldr >= 80) s += .35;
      if (p.pers === 'HOT') s -= p.mor < 50 ? .7 : .15;
      if (p.pers === 'DIVA') s -= p.mor < 55 ? .9 : .25;
      if (p.pers === 'CANCER') s -= p.mor < 60 ? 2 : .8;
    });
    return clamp(s, -8, 8);
  };

  // ---------- Practice planner ----------
  var PRAC_BUDGET = 24, SESSION_COST = { gp: 3, cond: 2 }, MAX_HRS = 8, FOCUS_MAX = 3;
  var INTEN = { light: { n: 'Light', g: .7, load: 2, inj: .5, mor: .6 }, normal: { n: 'Normal', g: 1, load: 4, inj: 1, mor: 0 }, hard: { n: 'Hard', g: 1.4, load: 7.5, inj: 2.2, mor: -1.2 } };
  var BAL = ['bal', 'Balanced', 'Even work on every skill', {}];
  var PGROUPS = [
    { k: 'QB', n: 'Quarterbacks', side: 'off', pos: ['QB'], st: 1, def: 3, drills: [BAL, ['acc', 'Accuracy & Timing', 'Ball placement: more completions', { ACC: .75, DEC: .25 }], ['arm', 'Arm Strength', 'Velocity on deep and outside throws', { THP: .8, ACC: .2 }], ['read', 'Reading Defenses', 'Film and progressions: fewer picks and sacks', { DEC: .8, POC: .2 }], ['pocket', 'Pocket Presence', 'Feel the rush: fewer sacks', { POC: .75, SPD: .25 }]] },
    { k: 'RB', n: 'Running Backs', side: 'off', pos: ['RB'], st: 1, def: 2, drills: [BAL, ['vision', 'Vision & Cuts', 'Find the hole: more yards per carry', { BCV: .65, ELU: .35 }], ['ballsec', 'Ball Security', 'High-and-tight: fewer fumbles', { BSC: .8, BTK: .2 }], ['catch', 'Pass Catching', 'Hands out of the backfield', { CTH: .8, SPD: .2 }], ['power', 'Power Running', 'Break tackles after contact', { BTK: .7, SPD: .3 }]] },
    { k: 'WR', n: 'Wide Receivers', side: 'off', pos: ['WR'], st: 3, def: 2, drills: [BAL, ['routes', 'Route Running', 'Separation on every route', { RTE: .8, REL: .2 }], ['hands', 'Hands', 'Catch everything, protect the ball', { CTH: .7, BSC: .3 }], ['release', 'Release vs Press', 'Beat man coverage and the blitz', { REL: .8, SPD: .2 }], ['speed', 'Speed & YAC', 'Run after the catch', { SPD: .7, RTE: .3 }]] },
    { k: 'TE', n: 'Tight Ends', side: 'off', pos: ['TE'], st: 1, def: 2, drills: [BAL, ['block', 'Blocking', 'Seal the edge in the run game', { RBK: .85, SPD: .15 }], ['recv', 'Receiving', 'Routes and hands over the middle', { CTH: .5, RTE: .5 }]] },
    { k: 'OL', n: 'Offensive Line', side: 'off', pos: ['OT', 'G', 'C'], st: 5, def: 3, drills: [BAL, ['pass', 'Pass Protection', 'Keep the QB clean: fewer sacks', { PBK: .8, STR: .1, AWR: .1 }], ['run', 'Run Blocking', 'Open lanes for the backs', { RBK: .8, STR: .2 }], ['anchor', 'Strength & Technique', 'Anchor, hand placement, calls', { STR: .5, AWR: .3, PBK: .1, RBK: .1 }]] },
    { k: 'DL', n: 'Defensive Line', side: 'def', pos: ['EDGE', 'DT'], st: 4, def: 3, drills: [BAL, ['rush', 'Pass Rush Moves', 'Win 1-on-1s: more sacks', { PRS: .8, SPD: .2 }], ['runstop', 'Run Stopping', 'Hold the point of attack', { RST: .75, STR: .25 }], ['getoff', 'Get-Off & Power', 'First step and bull rush', { SPD: .5, STR: .5 }]] },
    { k: 'LB', n: 'Linebackers', side: 'def', pos: ['LB'], st: 2, def: 2, drills: [BAL, ['tackle', 'Tackling', 'Wrap up, no missed tackles', { TKL: .8, RST: .2 }], ['cover', 'Coverage', 'Carry backs and tight ends', { COV: .8, SPD: .2 }], ['blitz', 'Blitzing', 'Timing and rush lanes on blitzes', { PRS: .8, SPD: .2 }], ['runfit', 'Run Fits', 'Fill the right gap', { RST: .7, TKL: .3 }]] },
    { k: 'CB', n: 'Cornerbacks', side: 'def', pos: ['CB'], st: 3, def: 2, drills: [BAL, ['man', 'Man Coverage', 'Press and mirror', { COV: .8, SPD: .2 }], ['zone', 'Zone Coverage', 'Read the QB, break on throws', { ZON: .8, BSK: .2 }], ['ball', 'Ball Skills', 'Turn PBUs into interceptions', { BSK: .8, ZON: .2 }]] },
    { k: 'S', n: 'Safeties', side: 'def', pos: ['S'], st: 2, def: 2, drills: [BAL, ['deep', 'Deep Coverage', 'Range in the deep half', { ZON: .6, COV: .2, SPD: .2 }], ['tackle', 'Tackling', 'Last line of defense', { TKL: .8, SPD: .2 }], ['support', 'Run Support', 'Come downhill vs the run', { RST: .7, TKL: .3 }]] },
    { k: 'ST', n: 'Special Teams', side: 'st', pos: ['K', 'P', 'LS'], st: 2, def: 1, drills: [BAL, ['power', 'Leg Strength', 'Longer field goals and punts', { KPW: .85, KAC: .15 }], ['accuracy', 'Accuracy', 'Fewer misses', { KAC: .85, KPW: .15 }]] }
  ];
  var GROUP_OF = {}; PGROUPS.forEach(function (g) { g.pos.forEach(function (pos) { GROUP_OF[pos] = g; }); });
  E.PGROUPS = PGROUPS; E.GROUP_OF = GROUP_OF; E.INTEN = INTEN; E.PRAC_BUDGET = PRAC_BUDGET; E.SESSION_COST = SESSION_COST; E.MAX_HRS = MAX_HRS; E.FOCUS_MAX = FOCUS_MAX;
  function drillOf(g, key) { for (var i = 0; i < g.drills.length; i++) if (g.drills[i][0] === key) return g.drills[i]; return g.drills[0]; }
  E.drillOf = drillOf;
  E.planHours = function (plan) { var s = 0; PGROUPS.forEach(function (g) { s += plan.hrs[g.k] || 0; }); return s + (plan.gp ? SESSION_COST.gp : 0) + (plan.cond ? SESSION_COST.cond : 0); };
  function groupPlayers(G, ab, g) { return teamPlayers(G, ab).filter(function (p) { return g.pos.indexOf(p.pos) >= 0; }).sort(function (a, b) { return b.ovr - a.ovr; }); }
  E.groupPlayers = groupPlayers;
  // Staff recommendation: also used every week by the 31 AI teams
  function autoPlan(G, ab) {
    var plan = { hrs: {}, int: {}, drill: {}, gp: 0, cond: 0, fp: [] }, W = {}, tw = 0, avail = 22;
    PGROUPS.forEach(function (g) {
      var ps = groupPlayers(G, ab, g), st = ps.slice(0, g.st);
      var so = st.length ? avg(st.map(function (p) { return p.ovr; })) : 60;
      var up = 0; ps.forEach(function (p) { if (p.age <= 25) up += Math.max(0, p.pot - p.ovr) / 10; });
      var base = g.k === 'ST' ? .45 : (g.k === 'QB' || g.k === 'OL' || g.k === 'DL') ? 1.3 : (g.k === 'WR' || g.k === 'CB') ? 1.1 : 1;
      W[g.k] = base * (1 + clamp((76 - so) / 25, -.3, .6) + Math.min(.5, up * .08)); tw += W[g.k];
      // drill: attack the starters' weakest trained skill
      var best = 'bal', bestV = 1e9, all = [];
      g.drills.forEach(function (d) {
        if (d[0] === 'bal') return;
        var v = 0, ws = 0, k;
        for (k in d[3]) { var vals = st.filter(function (p) { return p.a[k] != null; }).map(function (p) { return p.a[k]; }); if (vals.length) { v += avg(vals) * d[3][k]; ws += d[3][k]; } }
        if (ws > 0) { v /= ws; all.push(v); if (v < bestV) { bestV = v; best = d[0]; } }
      });
      var spread = all.length ? Math.max.apply(null, all) - Math.min.apply(null, all) : 0;
      plan.drill[g.k] = spread >= 3 ? best : 'bal';
      plan.int[g.k] = 'normal';
    });
    var used = 0;
    PGROUPS.forEach(function (g) { var h = Math.max(1, Math.min(MAX_HRS, Math.round(W[g.k] / tw * avail))); plan.hrs[g.k] = h; used += h; });
    var order = PGROUPS.slice().sort(function (a, b) { return W[b.k] - W[a.k]; }), gi = 0;
    while (used > avail && gi < 50) { var g1 = order[order.length - 1 - (gi % order.length)]; if (plan.hrs[g1.k] > 1) { plan.hrs[g1.k]--; used--; } gi++; }
    gi = 0; while (used < avail && gi < 50) { var g2 = order[gi % order.length]; if (plan.hrs[g2.k] < MAX_HRS) { plan.hrs[g2.k]++; used++; } gi++; }
    plan.fp = teamPlayers(G, ab).filter(function (p) { return p.age <= 25 && p.pot - p.ovr >= 5 && !p.inj && GROUP_OF[p.pos] && GROUP_OF[p.pos].k !== 'ST'; }).sort(function (a, b) { return (b.pot - b.ovr) * (b.eth || 70) - (a.pot - a.ovr) * (a.eth || 70); }).slice(0, FOCUS_MAX).map(function (p) { return p.id; });
    return plan;
  }
  E.autoPlan = autoPlan;
  function fixPlan(G, plan) {
    plan.hrs = plan.hrs || {}; plan.int = plan.int || {}; plan.drill = plan.drill || {}; plan.fp = (plan.fp || []).filter(function (id) { return G.players[id] && G.players[id].tm === G.user.ab; }).slice(0, FOCUS_MAX);
    PGROUPS.forEach(function (g) { if (plan.hrs[g.k] == null) plan.hrs[g.k] = g.def; if (!INTEN[plan.int[g.k]]) plan.int[g.k] = 'normal'; if (!plan.drill[g.k]) plan.drill[g.k] = 'bal'; });
    return plan;
  }
  E.migrate = function (G) {
    var u = G.user;
    if (!u.plan) {
      u.plan = autoPlan(G, u.ab);
      if (u.focus === 'gameplan') u.plan.gp = 1;
      if (u.focus === 'conditioning') u.plan.cond = 1;
      if (u.intensity === 'hard' || u.intensity === 'light') PGROUPS.forEach(function (g) { u.plan.int[g.k] = u.intensity; });
    }
    fixPlan(G, u.plan);
    for (var id in G.players) ensureP(G, G.players[id]);
    E.migrateTrades(G);
    if (u.daily == null) { u.daily = 1; if (G.phase === 'regular') u.wk = { s: G.season, w: G.week, d: 6, t: ['off', 'off', 'pad', 'pad', 'np', 'walk'], plans: {}, agg: null, last: null }; }
    if (G.phase === 'camp' && !G.camp) E.startCamp(G);
    if (!G.v || G.v < 4) G.v = 4;
    return G;
  };
  function growthD(p, mult, devCulture) {
    var age = p.age, ageF = age <= 23 ? 1.4 : age <= 26 ? 1.0 : age <= 29 ? .45 : age <= 31 ? .05 : -.45;
    var mF = .7 + p.mor / 100 * .6, cF = .8 + devCulture / 100 * .5, eF = .75 + (p.eth == null ? 70 : p.eth) / 100 * .35;
    var gap = p.pot - p.ovr, d;
    if (ageF > 0) d = .062 * ageF * mult * mF * cF * eF * (gap > 0 ? (.4 + gap / 10) : .1) * rf(.2, 1.8);
    else d = .07 * ageF * rf(.3, 1.7) / (mult > 1.2 ? 1.3 : 1) * (1.25 - eF * .25);
    if (p.inj) d *= .3;
    return d;
  }
  function applyGrowth(p, d, w) {
    var keys = allAttrs(p.pos).filter(function (k) { return p.a[k] != null; }), ws = 0, wn = {};
    keys.forEach(function (k) { ws += w[k] || 0; });
    var coach = .85 + (p.coa == null ? 70 : p.coa) / 100 * .3;
    keys.forEach(function (k) { wn[k] = ws > 0 ? (w[k] || 0) / ws : 0; });
    keys.forEach(function (k) {
      var m;
      if (ws <= 0) m = 1;
      else if (d >= 0) m = .35 + 2.6 * wn[k] * coach;
      else m = 1.15 - .9 * wn[k];
      p.a[k] = clamp(p.a[k] + d * m * rf(.6, 1.4), 25, 99);
    });
  }
  function runPractice(G, ab, plan, devCulture, isUser, o) {
    o = o || {};
    var gF = o.g == null ? 1 : o.g, lF = o.lf == null ? 1 : o.lf, keep = o.keep == null ? .45 : o.keep, iF = o.ik == null ? 1 : o.ik, mF = o.mf == null ? 1 : o.mf;
    var sumH = 0; PGROUPS.forEach(function (g) { sumH += plan.hrs[g.k] || 0; });
    var sess = (plan.gp ? SESSION_COST.gp : 0) + (plan.cond ? SESSION_COST.cond : 0);
    var scale = sumH + sess > PRAC_BUDGET && sumH > 0 ? Math.max(0, PRAC_BUDGET - sess) / sumH : 1;
    var rep = isUser ? { season: G.season, label: o.label || (G.phase === 'playoffs' ? 'Playoff week' : 'Week ' + G.week), groups: {}, inj: [], hrs: Math.round(E.planHours(plan) * (o.hrsF == null ? 1 : o.hrsF) * 10) / 10 } : null;
    teamPlayers(G, ab).forEach(function (p) {
      ensureP(G, p);
      var g = GROUP_OF[p.pos]; if (!g) return;
      var h = (plan.hrs[g.k] || 0) * scale, it = INTEN[plan.int[g.k]] || INTEN.normal, dr = drillOf(g, plan.drill[g.k]);
      var isF = plan.fp.indexOf(p.id) >= 0;
      var before = isUser ? snapA(p) : null, w0 = wovr(p);
      var repsF = .3 + .7 * Math.pow(h / 2.2, .85);
      var d = growthD(p, repsF * it.g * (isF ? 1.6 : 1), devCulture) * gF;
      applyGrowth(p, d, dr[3]);
      p.ovr = calcOvr(p); if (p.ovr > p.pot) p.pot = p.ovr;
      var dw = wovr(p) - w0; p.prog = (p.prog || 0) + dw;
      // fatigue & injury
      var load = h * it.load * (isF ? 1.15 : 1) * lF;
      p.fat = clamp((p.fat || 0) * keep + load, 0, 100);
      var injN = 0;
      if (!p.inj && h > 0 && rnd() < .0005 * h * it.inj * (1 + p.fat / 40) * iF) { injN = pick([1, 1, 1, 2, 2, 3]); p.inj = injN; }
      if (o.camp) campScore(p, d, h);
      // morale reaction to the workload (personality matters)
      var pm = it.mor;
      if (pm < 0 && (p.pers === 'COMP' || p.pers === 'PRO')) pm *= .5;
      if (pm < 0 && (p.pers === 'DIVA' || p.pers === 'CANCER' || p.pers === 'HOT')) pm *= 1.7;
      p.mor = clamp(p.mor + (pm + (h >= 5 ? -.4 : 0) + (isF ? .5 : 0)) * mF, 0, 100);
      if (isUser) {
        if (!p.dh) p.dh = [Math.round(w0 * 10) / 10];
        if (!o.noHist) { p.dh.push(Math.round(wovr(p) * 10) / 10); if (p.dh.length > 24) p.dh.shift(); }
        var at = [], k; for (k in before) { var dd = p.a[k] - before[k]; if (Math.abs(dd) >= (o.g != null ? .005 : .05)) at.push([k, dd]); }
        at.sort(function (a, b) { return Math.abs(b[1]) - Math.abs(a[1]); });
        (rep.groups[g.k] = rep.groups[g.k] || []).push({ id: p.id, d: Math.round(dw * 1000) / 1000, at: at.slice(0, 3).map(function (x) { return [x[0], Math.round(x[1] * 1000) / 1000]; }), fat: Math.round(p.fat), inj: injN, f: isF ? 1 : 0 });
        if (injN) rep.inj.push({ id: p.id, w: injN });
      }
    });
    if (isUser) for (var gk in rep.groups) rep.groups[gk].sort(function (a, b) { return b.d - a.d; });
    return rep;
  }
  E.runPractice = runPractice;
  function practiceWeek(G, playoffs) {
    var me = G.user.ab;
    G.order.forEach(function (ab) {
      var u = ab === me;
      if (playoffs && !u && G.playoffs && G.playoffs.elim[ab]) return;
      if (u && !playoffs && G.user.daily && G.user.wk && G.user.wk.s === G.season && G.user.wk.w === G.week && G.user.wk.d >= 6) return; // practiced day by day this week
      var rep = runPractice(G, ab, u ? G.user.plan : autoPlan(G, ab), u ? G.user.dev : 50, u);
      if (u) {
        G.user.prac = rep;
        var all = []; for (var k in rep.groups) rep.groups[k].forEach(function (r) { if (k !== 'ST') all.push({ id: r.id, d: r.d }); });
        all.sort(function (a, b) { return b.d - a.d; }); G.user.lastReport = all.slice(0, 8);
        if (rep.inj.length) addNews(G, 'Practice injur' + (rep.inj.length > 1 ? 'ies' : 'y') + ': ' + rep.inj.map(function (x) { var p = G.players[x.id]; return p.pos + ' ' + p.ln + ' (' + x.w + ' wk)'; }).join(', ') + '.', 'loss');
        G.user.plan.fp = G.user.plan.fp.filter(function (id) { return G.players[id] && G.players[id].tm === me; });
      } else if (!playoffs) { autoDepth(G, ab); aiFillRoster(G, ab); }
    });
  }
  E.practiceWeek = practiceWeek;

  function aiFillRoster(G, ab) {
    var t = G.teams[ab];
    for (var pos in LINEUP) {
      var healthy = (t.depth[pos] || []).filter(function (id) { return !G.players[id].inj; }).length;
      if (healthy < LINEUP[pos]) {
        var fa = faList(G).filter(function (p) { return p.pos === pos; })[0];
        if (fa && E.capSpace(G, ab) > 1300) {
          if (teamPlayers(G, ab).length >= 53) { var cut = teamPlayers(G, ab).filter(function (p) { return p.inj >= 3; }).sort(function (a, b) { return a.ovr - b.ovr; })[0]; if (!cut) continue; cut.tm = 'FA'; cut.sal = 0; cut.yrs = 0; }
          fa.tm = ab; fa.sal = 1200; fa.yrs = 1; autoDepth(G, ab);
        }
      }
    }
  }
  function faList(G) { var o = []; for (var id in G.players) if (G.players[id].tm === 'FA') o.push(G.players[id]); return o.sort(function (a, b) { return b.ovr - a.ovr; }); }
  E.faList = faList;

  // ---------- Contracts ----------
  function marketValue(p) {
    var f = Math.pow(Math.max(0, (p.ovr - 60) / 37), 2.3), v = 900 + (POS_MAX[p.pos] || 15000) * f;
    if (p.age >= 33) v *= .6; else if (p.age >= 30) v *= .85;
    if (p.age <= 25 && p.pot - p.ovr > 6) v *= 1.1;
    return Math.round(v / 50) * 50;
  }
  E.marketValue = marketValue;
  function winPct(t) { var gp = t.w + t.l + t.t; return gp ? (t.w + t.t * .5) / gp : .5; }
  E.winPct = winPct;
  E.wouldStart = function (G, p, ab) {
    var n = LINEUP[p.pos] || 1, starters = (G.teams[ab].depth[p.pos] || []).filter(function (id) { return id !== p.id; }).slice(0, n).map(function (id) { return G.players[id]; });
    return starters.length < n || starters.some(function (s) { return s.ovr < p.ovr; });
  };
  E.interest = function (G, p, ab) {
    var t = G.teams[ab], wp = winPct(t);
    var v = 50 + (wp - .5) * 50 + (t.chem - 50) * .4 + (E.wouldStart(G, p, ab) ? 12 : -10);
    if (p.tm === ab) v += (p.mor - 60) * .6;
    return Math.round(clamp(v, 0, 100));
  };
  E.askFor = function (G, p, ab) {
    var mv = marketValue(p), intr = E.interest(G, p, ab);
    var ask = mv * (1.12 - intr / 100 * .25);
    if (p.tm === ab) ask *= 1 + (60 - p.mor) / 250;
    ask *= ({ DIVA: 1.12, CANCER: 1.06, HOT: 1.03, TEAM: .94, PRO: .97, LEADER: .98 })[p.pers] || 1;
    var yrs = p.age <= 26 ? 5 : p.age <= 29 ? 4 : p.age <= 31 ? 3 : p.age <= 33 ? 2 : 1;
    if (p.ovr < 68) yrs = Math.min(yrs, 2);
    return { sal: Math.max(1000, Math.round(ask / 50) * 50), yrs: yrs, interest: intr };
  };
  E.rosterLimit = function (G) { return (G.phase === 'regular' || G.phase === 'playoffs') ? 53 : 90; };
  E.offer = function (G, p, ab, sal, yrs) {
    if (G.phase === 'freeagency' && p.tm === 'FA' && G.fa && ab === G.user.ab) return E.faBid(G, p, sal, yrs);
    var ask = E.askFor(G, p, ab), limit = E.rosterLimit(G);
    if (p.tm !== ab && teamPlayers(G, ab).length >= limit) return { ok: false, msg: 'Your roster is full (' + limit + ' max). Release a player first.' };
    var curSal = p.tm === ab ? p.sal : 0;
    if (sal - curSal > E.capSpace(G, ab)) return { ok: false, msg: 'Not enough cap space for this deal.' };
    if (p.neg >= 3) return { ok: false, msg: p.fn + ' ' + p.ln + ' is done negotiating this week. Try again next week.' };
    p.neg = (p.neg || 0) + 1;
    if (ask.interest < 15 && sal < ask.sal * 1.2) return { ok: false, msg: p.fn + ' ' + p.ln + ' has little interest in your situation (interest ' + ask.interest + '/100). Only a big overpay will do.' };
    var yrPen = Math.abs(yrs - ask.yrs) * .03, need = ask.sal * (1 + yrPen) * (1 - ask.interest / 100 * .06);
    if (sal >= need) { sign(G, p, ab, sal, yrs); return { ok: true, msg: p.fn + ' ' + p.ln + ' accepts! ' + fmtM(sal) + '/yr for ' + yrs + ' yr' + (yrs > 1 ? 's' : '') + '.' }; }
    if (sal < ask.sal * .8) { if (p.tm === ab) p.mor = clamp(p.mor - 4 * (p.pers === 'DIVA' || p.pers === 'HOT' || p.pers === 'CANCER' ? 2 : p.pers === 'TEAM' || p.pers === 'PRO' ? .5 : 1), 0, 100); return { ok: false, msg: 'That offer is insulting to ' + p.ln + "'s camp." + (p.tm === ab ? ' (His morale drops.)' : ''), counter: Math.round(need / 50) * 50, cyrs: ask.yrs }; }
    var counter = Math.round(need * rf(.99, 1.03) / 50) * 50;
    return { ok: false, msg: p.ln + "'s agent counters at " + fmtM(counter) + '/yr for ' + ask.yrs + ' yrs.', counter: counter, cyrs: ask.yrs };
  };
  function fmtM(k) { var neg = k < 0; k = Math.abs(k); return (neg ? '-' : '') + '$' + (k / 1000).toFixed(k >= 10000 ? 1 : 2) + 'M'; }
  E.fmtM = fmtM;
  function sign(G, p, ab, sal, yrs) {
    var wasFA = p.tm !== ab;
    p.tm = ab; p.sal = sal; p.yrs = yrs; p.mor = clamp(p.mor + 10, 0, 100); p.wantsDeal = 0; p.fresh = (G.phase === 'offseason' || G.phase === 'draft' || G.phase === 'freeagency') ? 1 : 0; p.tradeReq = 0; p.lastTm = undefined;
    if (wasFA && !p.num) p.num = '' + ri(1, 99);
    syncDepth(G, ab);
    addNews(G, (wasFA ? 'SIGNED: The ' + G.teams[ab].name + ' sign ' : 'EXTENDED: The ' + G.teams[ab].name + ' extend ') + p.pos + ' ' + p.fn + ' ' + p.ln + ' (' + fmtM(sal) + ' x ' + yrs + ').', 'deal');
  }
  E.deadCap = function (p) { if (p.yrs <= 0) return 0; return Math.round(p.sal * (p.rookie || /R1 /.test(p.draft) && p.exp <= 3 ? .6 : .4) * Math.min(p.yrs, 3) / 50) * 50; };
  E.release = function (G, p) {
    var ab = p.tm, dc = E.deadCap(p);
    G.teams[ab].dead = (G.teams[ab].dead || 0) + dc;
    p.tm = 'FA'; p.sal = 0; p.yrs = 0; p.mor = 45;
    syncDepth(G, ab);
    if (G.user && ab === G.user.ab && p.ovr >= 75) teamPlayers(G, ab).forEach(function (q) { q.mor = clamp(q.mor - 1, 0, 100); });
    addNews(G, 'RELEASED: The ' + G.teams[ab].name + ' release ' + p.pos + ' ' + p.fn + ' ' + p.ln + (dc ? ' (' + fmtM(dc) + ' dead cap).' : '.'), 'deal');
    return dc;
  };

  // ---------- Culture events ----------
  function topBy(G, ab, f) { return teamPlayers(G, ab).filter(f).sort(function (a, b) { return b.ovr - a.ovr; }); }
  function nm(p) { return p.fn + ' ' + p.ln; }
  var EVENTS = {
    snaps: function (G, ab) {
      var c = topBy(G, ab, function (p) { return p.wantsSnaps; })[0]; if (!c) return null;
      var s = G.players[G.teams[ab].depth[c.pos][0]]; if (!s || s.id === c.id) return null;
      return { title: 'Playing Time Complaint', who: c.id, text: nm(c) + ' (' + c.pos + ', ' + c.ovr + ' OVR) is frustrated about his snaps behind ' + nm(s) + ' and has asked to meet with you.', ch: [
        { l: 'Promise him more reps', d: 'His morale ↑↑ · starter morale ↓', fx: [['mor', c.id, 12], ['mor', s.id, -5]] },
        { l: '"Earn it on the practice field."', d: 'Discipline ↑ · his morale ↓', fx: [['disc', 4], ['mor', c.id, -8]] },
        { l: 'Name him the starter', d: 'Promotes him on the depth chart · starter morale ↓↓', fx: [['promote', c.id], ['mor', c.id, 15], ['mor', s.id, -12], ['unity', -2]] }] };
    },
    holdout: function (G, ab) {
      var c = topBy(G, ab, function (p) { return p.yrs === 1 && p.ovr >= 76; })[0]; if (!c) return null;
      return { title: 'Contract Year Distraction', who: c.id, text: nm(c) + "'s agent says his client is \"only focused on winning,\" but reporters won't stop asking about an extension.", ch: [
        { l: 'Open extension talks now', d: 'His morale ↑ · opens negotiation', fx: [['mor', c.id, 7], ['negotiate', c.id]] },
        { l: 'Business waits until the offseason', d: 'Discipline ↑ · his morale ↓↓', fx: [['disc', 3], ['mor', c.id, -10]] },
        { l: 'Praise him publicly', d: 'His morale ↑ · Unity ↑', fx: [['mor', c.id, 4], ['unity', 2]] }] };
    },
    late: function (G, ab) {
      var pool = topBy(G, ab, function () { return true; }).slice(0, 35), c = wpick(pool, function (p) { return p.eth < 55 || p.pers === 'DIVA' || p.pers === 'CANCER' ? 5 : p.pers === 'PRO' || p.pers === 'LEADER' ? .2 : 1; });
      return { title: 'Late to the Team Meeting', who: c.id, text: nm(c) + ' (' + c.pos + ') walked into this morning\'s team meeting 20 minutes late. The whole room noticed.', ch: [
        { l: 'Fine him', d: 'Discipline ↑↑ · his morale ↓', fx: [['disc', 6], ['mor', c.id, -7]] },
        { l: 'Handle it privately', d: 'Unity ↑ · Discipline ↓', fx: [['unity', 3], ['disc', -2], ['mor', c.id, 2]] },
        { l: 'Bench him for the first quarter', d: 'Discipline ↑↑↑ · his morale ↓↓ · Unity ↓', fx: [['disc', 9], ['mor', c.id, -14], ['unity', -2]] }] };
    },
    vets: function (G, ab) {
      var c = topBy(G, ab, function (p) { return p.age >= 29; })[0]; if (!c) return null;
      return { title: 'Veteran Leadership', who: c.id, text: 'Veteran ' + nm(c) + ' wants to hold a players-only meeting to set the tone for the week.', ch: [
        { l: 'Give them the room', d: 'Unity ↑↑ · Discipline ↓', fx: [['unity', 6], ['disc', -2], ['mor', c.id, 5]] },
        { l: 'Make it coach-led', d: 'Discipline ↑ · Unity ↑', fx: [['disc', 3], ['unity', 1]] }] };
    },
    film: function () {
      return { title: 'Film Room', text: 'Your coordinators want extra film sessions this week. Some players are grumbling about the long hours.', ch: [
        { l: 'Mandatory late film', d: 'Development ↑↑ · Discipline ↑ · team morale ↓', fx: [['dev', 5], ['disc', 2], ['team', -2.5]] },
        { l: 'Optional sessions', d: 'Development ↑', fx: [['dev', 2]] },
        { l: 'Give them the night off', d: 'Team morale ↑', fx: [['team', 2.5]] }] };
    },
    charity: function (G, ab) {
      return { title: 'Community Day', text: 'The ' + G.teams[ab].city + ' community office has a youth clinic Tuesday. It would cost you a practice block.', ch: [
        { l: 'Whole team attends', d: 'Unity ↑↑ · Development ↓', fx: [['unity', 6], ['dev', -2]] },
        { l: 'Send volunteers only', d: 'Unity ↑', fx: [['unity', 2]] },
        { l: 'Football comes first', d: 'Development ↑ · Unity ↓', fx: [['dev', 3], ['unity', -2]] }] };
    },
    trash: function (G, ab) {
      var g = E.userGame(G); if (!g) return null; var opp = g.h === ab ? g.a : g.h;
      var o = topBy(G, opp, function () { return true; })[0];
      return { title: 'Bulletin Board Material', text: G.teams[opp].name + ' star ' + nm(o) + ' told reporters your team is "soft" and "not ready for primetime."', ch: [
        { l: 'Fire back at the podium', d: 'Unity ↑ · Discipline ↓ · game-day fire', fx: [['unity', 4], ['disc', -3], ['gp', 1]] },
        { l: 'Take the high road', d: 'Discipline ↑', fx: [['disc', 3]] },
        { l: 'Pin the quote in the locker room', d: 'Unity ↑ · slight game-day edge', fx: [['unity', 2], ['gp', .6]] }] };
    },
    dinner: function (G, ab) {
      var q = G.players[G.teams[ab].depth.QB[0]]; if (!q) return null;
      return { title: 'Team Dinner', who: q.id, text: nm(q) + ' wants to take the offense out to dinner on his card. The defense is asking where their invite is.', ch: [
        { l: 'Make it a full-team dinner', d: 'Unity ↑↑', fx: [['unity', 5], ['mor', q.id, 3]] },
        { l: 'Let the offense have their night', d: 'Offense morale ↑ · defense morale ↓', fx: [['unitM', 'off', 3], ['unitM', 'def', -2]] }] };
    },
    social: function (G, ab) {
      var c = pick(topBy(G, ab, function (p) { return p.mor < 60 && p.pers !== 'PRO' && p.pers !== 'TEAM'; }).slice(0, 8)); if (!c) return null;
      return { title: 'Cryptic Social Media Post', who: c.id, text: nm(c) + ' posted a cryptic message about "needing a fresh start." The media is running with it.', ch: [
        { l: 'Fine him for the distraction', d: 'Discipline ↑ · his morale ↓↓', fx: [['disc', 5], ['mor', c.id, -9]] },
        { l: 'Sit down with him', d: 'His morale ↑↑ · Unity ↑', fx: [['mor', c.id, 10], ['unity', 1]] },
        { l: 'Ignore it', d: 'Discipline ↓', fx: [['disc', -2]] }] };
    },
    tradereq: function (G, ab) {
      var c = topBy(G, ab, function (p) { return p.tradeReq && !p.block; })[0]; if (!c) return null;
      return { title: 'Trade Request', who: c.id, text: nm(c) + ' (' + c.pos + ', ' + (PERS[c.pers] ? PERS[c.pers].n : '') + ', morale ' + Math.round(c.mor) + ') has formally asked to be traded. His agent is making noise in the media.', ch: [
        { l: 'Put him on the trade block', d: 'His morale ↑ · teams can make offers', fx: [['block', c.id], ['mor', c.id, 6]] },
        { l: '"He is under contract. He plays."', d: 'Discipline ↑ · his morale ↓↓ · Unity ↓', fx: [['disc', 4], ['mor', c.id, -10], ['unity', -2]] },
        { l: 'Promise him a bigger role', d: 'His morale ↑↑ · request withdrawn · Unity ↓', fx: [['mor', c.id, 14], ['unreq', c.id], ['unity', -2]] }] };
    },
    outburst: function (G, ab) {
      var c = topBy(G, ab, function (p) { return (p.pers === 'HOT' || p.pers === 'CANCER') && p.ovr >= 65; })[0]; if (!c) return null;
      return { title: 'Sideline Blow-Up', who: c.id, text: nm(c) + ' (' + c.pos + ', ' + PERS[c.pers].n + ') screamed at a position coach in practice and had to be separated from a teammate. Cameras caught part of it.', ch: [
        { l: 'Suspend him for a quarter', d: 'Discipline ↑↑↑ · his morale ↓↓ · Unity ↑', fx: [['disc', 8], ['mor', c.id, -10], ['unity', 2]] },
        { l: 'Private talk, no punishment', d: 'His morale ↑ · Discipline ↓↓', fx: [['mor', c.id, 6], ['disc', -5]] },
        { l: 'Let the team captains handle it', d: 'Unity ↑ · Discipline ↑', fx: [['unity', 3], ['disc', 2], ['mor', c.id, -3]] }] };
    },
    diva: function (G, ab) {
      var c = topBy(G, ab, function (p) { return p.pers === 'DIVA' && p.ovr >= 68; })[0]; if (!c) return null;
      return { title: 'He Wants the Ball', who: c.id, text: nm(c) + ' (' + c.pos + ', Me-First) told reporters he "can\'t help the team if they don\'t feed me." Teammates are rolling their eyes.', ch: [
        { l: 'Promise to feature him', d: 'His morale ↑↑ · Unity ↓', fx: [['mor', c.id, 12], ['unity', -3]] },
        { l: '"Nobody is bigger than the team."', d: 'Unity ↑↑ · Discipline ↑ · his morale ↓↓', fx: [['unity', 4], ['disc', 3], ['mor', c.id, -10]] },
        { l: 'Fine him for the comments', d: 'Discipline ↑↑ · his morale ↓↓↓', fx: [['disc', 6], ['mor', c.id, -15]] }] };
    },
    leader: function (G, ab) {
      var c = topBy(G, ab, function (p) { return p.pers === 'LEADER' || p.ldr >= 82; })[0]; if (!c) return null;
      return { title: 'A Leader Steps Up', who: c.id, text: nm(c) + ' (' + c.pos + ', Leadership ' + c.ldr + ') wants to be a voice in the room this week and asks to address the team before Saturday walkthrough.', ch: [
        { l: 'Give him the floor', d: 'Unity ↑↑ · team morale ↑', fx: [['unity', 5], ['team', 1.5], ['mor', c.id, 4]] },
        { l: 'Name him a team captain', d: 'Unity ↑ · Discipline ↑ · his morale ↑↑', fx: [['unity', 3], ['disc', 3], ['mor', c.id, 8]] },
        { l: '"I run this locker room."', d: 'Discipline ↑ · his morale ↓', fx: [['disc', 3], ['mor', c.id, -6]] }] };
    },
    rookies: function (G, ab) {
      var r = topBy(G, ab, function (p) { return p.exp <= 1 && p.pot - p.ovr >= 5; })[0]; if (!r) return null;
      return { title: 'Rookie Spotlight', who: r.id, text: 'Young ' + r.pos + ' ' + nm(r) + ' (POT ' + potGrade(r.pot) + ') has been turning heads in practice. Do you want to accelerate his development?', ch: [
        { l: 'Extra 1-on-1 coaching', d: 'His development jumps · vets feel overlooked', fx: [['boost', r.id, 1.5], ['unity', -1]] },
        { l: 'Pair him with a veteran mentor', d: 'Small boost · Unity ↑', fx: [['boost', r.id, .7], ['unity', 2]] },
        { l: 'Let him learn naturally', d: 'No change', fx: [] }] };
    }
  };
  E.newWeeklyEvent = function (G) {
    if (G.phase !== 'regular') { G.user.pendingEvent = null; return; }
    var keys = Object.keys(EVENTS), tries = 0, ev = null, k;
    if (teamPlayers(G, G.user.ab).some(function (p) { return p.tradeReq && !p.block; }) && rnd() < .6 && G.user.lastEvKey !== 'tradereq') { ev = EVENTS.tradereq(G, G.user.ab); k = 'tradereq'; }
    while (!ev && tries++ < 15) { k = pick(keys); if (k === G.user.lastEvKey) continue; ev = EVENTS[k](G, G.user.ab); }
    if (ev) { ev.key = k; G.user.lastEvKey = k; }
    G.user.pendingEvent = ev;
  };
  E.makePress = function (G, won, lost) {
    var me = G.user.ab, q = G.players[G.teams[me].depth.QB[0]];
    var dv = lost ? topBy(G, me, function (p) { return E.isAttitude(p) && p.mor < 55 && p.ovr >= 68; })[0] : null;
    if (dv && rnd() < .45) return { title: 'Post-Game Press Conference', press: 1, who: dv.id, text: 'After the loss, ' + nm(dv) + ' (' + PERS[dv.pers].n + ') told reporters at his locker that "some people need to look in the mirror, starting with the play-calling." A reporter asks for your response.', ch: [
      { l: '"We handle that in-house."', d: 'Unity ↑ · his morale ↓', fx: [['unity', 2], ['mor', dv.id, -4]] },
      { l: 'Call him out publicly', d: 'Discipline ↑↑ · his morale ↓↓↓ · Unity ↓', fx: [['disc', 6], ['mor', dv.id, -14], ['unity', -2]] },
      { l: '"He\'s a competitor. He cares."', d: 'His morale ↑ · Discipline ↓', fx: [['mor', dv.id, 6], ['disc', -3]] }] };
    if (lost) return { title: 'Post-Game Press Conference', press: 1, who: q.id, text: 'Tough loss. A reporter asks: "Coach, is ' + nm(q) + ' still your guy at quarterback?"', ch: [
      { l: '"He\'s our quarterback. Period."', d: 'QB morale ↑↑ · Unity ↑', fx: [['mor', q.id, 10], ['unity', 2]] },
      { l: '"Every job is open this week."', d: 'Discipline ↑↑ · QB morale ↓↓', fx: [['disc', 6], ['mor', q.id, -12], ['team', -1]] },
      { l: '"That one\'s on me." (Take the blame)', d: 'Team morale ↑ · Unity ↑', fx: [['team', 2], ['unity', 2]] }] };
    if (won) return { title: 'Post-Game Press Conference', press: 1, text: 'Big win! "Coach, what was the key out there today?"', ch: [
      { l: 'Credit the players', d: 'Team morale ↑ · Unity ↑', fx: [['team', 2], ['unity', 2]] },
      { l: '"We executed the game plan."', d: 'Discipline ↑ · Development ↑', fx: [['disc', 2], ['dev', 2]] },
      { l: '"We\'re just getting started."', d: 'Team morale ↑↑ · Discipline ↓', fx: [['team', 3.5], ['disc', -2]] }] };
    return { title: 'Post-Game Press Conference', press: 1, text: 'A tie. "Coach, how do you feel about that result?"', ch: [
      { l: '"Not good enough."', d: 'Discipline ↑', fx: [['disc', 3]] }, { l: '"We fought to the end."', d: 'Unity ↑', fx: [['unity', 3]] }] };
  };
  E.applyChoice = function (G, ev, idx) {
    var c = ev.ch[idx], me = G.user.ab, out = [];
    (c.fx || []).forEach(function (f) {
      var t = f[0];
      if (t === 'disc' || t === 'unity' || t === 'dev') G.user[t] = clamp(G.user[t] + f[1], 0, 100);
      else if (t === 'mor') { var p = G.players[f[1]]; if (p) { var sc = f[2] < 0 ? ({ HOT: 1.5, DIVA: 1.5, CANCER: 1.6, PRO: .6, TEAM: .7 })[p.pers] || 1 : 1; p.mor = clamp(p.mor + f[2] * sc, 0, 100); } }
      else if (t === 'block') { var pb = G.players[f[1]]; if (pb) pb.block = 1; }
      else if (t === 'unreq') { var pu = G.players[f[1]]; if (pu) pu.tradeReq = 0; }
      else if (t === 'team') teamPlayers(G, me).forEach(function (p) { p.mor = clamp(p.mor + f[1], 0, 100); });
      else if (t === 'unitM') teamPlayers(G, me).forEach(function (p) { if ((f[1] === 'off' ? OFF : DEF)[p.pos]) p.mor = clamp(p.mor + f[2], 0, 100); });
      else if (t === 'promote') { var pp = G.players[f[1]], dd = G.teams[me].depth[pp.pos], i = dd.indexOf(pp.id); if (i > 0) { dd.splice(i, 1); dd.unshift(pp.id); } }
      else if (t === 'gp') G.user.gameplanBonus = (G.user.gameplanBonus || 0) + f[1];
      else if (t === 'boost') { var b = G.players[f[1]]; if (b) { var o = b.ovr; for (var k in ATTR[b.pos]) b.a[k] = clamp(b.a[k] + f[2] * rf(.6, 1.4), 25, 99); b.ovr = calcOvr(b); b.prog = (b.prog || 0) + f[2]; if (b.pot < b.ovr) b.pot = b.ovr; } }
      else if (t === 'negotiate') out.push(['negotiate', f[1]]);
    });
    G.teams[me].chem = clamp(G.teams[me].chem + (G.user.unity - 50) * .02, 0, 100);
    G.user.log.unshift({ w: G.phase === 'regular' ? 'Wk ' + G.week : G.phase, title: ev.title, choice: c.l });
    if (G.user.log.length > 40) G.user.log.length = 40;
    return out;
  };
  function potGrade(p) { return p >= 90 ? 'A+' : p >= 85 ? 'A' : p >= 80 ? 'B+' : p >= 75 ? 'B' : p >= 70 ? 'C+' : p >= 65 ? 'C' : 'D'; }
  E.potGrade = potGrade;

  // ---------- Standings & playoffs ----------
  E.standings = function (G, conf, div) {
    var ts = G.order.map(function (ab) { return G.teams[ab]; }).filter(function (t) { return (!conf || t.conf === conf) && (!div || t.div === div); });
    return ts.sort(function (a, b) { return winPct(b) - winPct(a) || (b.divW - a.divW) || ((b.pf - b.pa) - (a.pf - a.pa)) || (b.pf - a.pf); });
  };
  E.seeds = function (G, conf) {
    var all = E.standings(G, conf), divs = {}, winners = [], rest = [];
    all.forEach(function (t) { if (!divs[t.div]) { divs[t.div] = t; winners.push(t); } else rest.push(t); });
    return winners.concat(rest.slice(0, 3)).map(function (t) { return t.ab; });
  };
  function rec(t) { return t.w + '-' + t.l + (t.t ? '-' + t.t : ''); }
  E.rec = rec;
  E.startPlayoffs = function (G) {
    G.phase = 'playoffs';
    var Aa = E.seeds(G, 'AFC'), N = E.seeds(G, 'NFC');
    G.playoffs = { seeds: { AFC: Aa, NFC: N }, round: 0, rounds: [], champ: null, elim: {} };
    var r0 = [];
    [Aa, N].forEach(function (S) { [[1, 6], [2, 5], [3, 4]].forEach(function (m) { r0.push({ h: S[m[0]], a: S[m[1]], hs: null, as: null, conf: G.teams[S[0]].conf }); }); });
    G.playoffs.rounds.push(r0);
    G.user.pendingEvent = null;
    var all = Aa.concat(N), i = all.indexOf(G.user.ab);
    addNews(G, i >= 0 ? 'PLAYOFFS! The ' + G.teams[G.user.ab].name + ' clinch the #' + (i % 7 + 1) + ' seed in the ' + G.teams[G.user.ab].conf + '.' : 'The ' + G.teams[G.user.ab].name + ' miss the playoffs at ' + rec(G.teams[G.user.ab]) + '.', 'big');
  };
  E.userAlive = function (G) { return G.playoffs && !G.playoffs.elim[G.user.ab] && (G.playoffs.seeds.AFC.concat(G.playoffs.seeds.NFC).indexOf(G.user.ab) >= 0); };
  E.advancePlayoffs = function (G) {
    var P = G.playoffs, games = P.rounds[P.round];
    games.forEach(function (g) { if (g.hs === null) { var gs = E.quickSim(G, g.h, g.a, true, g.neutral); E.finalizeGame(G, gs, g); } });
    for (var id in G.players) { var p = G.players[id]; if (p.inj > 0) p.inj--; }
    if (P.round < 3) { E.migrate(G); practiceWeek(G, true); }
    G.user.pressPending = null;
    var winners = {};
    games.forEach(function (g) { var w = g.hs > g.as ? g.h : g.a, l = w === g.h ? g.a : g.h; P.elim[l] = P.round + 1; (winners[g.conf] = winners[g.conf] || []).push(w); if (l === G.user.ab) addNews(G, 'Season over: the ' + G.teams[l].name + ' fall in the ' + E.roundName(P.round) + '.', 'loss'); });
    if (P.round === 3) { var g0 = games[0]; P.champ = g0.hs > g0.as ? g0.h : g0.a; P.elim[P.champ] = 5; addNews(G, 'SUPER BOWL LXI: The ' + G.teams[P.champ].city + ' ' + G.teams[P.champ].name + ' are world champions!', 'big'); E.startFA(G); return; }
    var next = [];
    if (P.round === 2) next.push({ h: winners.AFC[0], a: winners.NFC[0], hs: null, as: null, conf: 'SB', neutral: true });
    else ['AFC', 'NFC'].forEach(function (c) {
      var S = P.seeds[c], alive = (P.round === 0 ? [S[0]] : []).concat(winners[c]).sort(function (a, b) { return S.indexOf(a) - S.indexOf(b); });
      for (var i = 0; i < alive.length / 2; i++) next.push({ h: alive[i], a: alive[alive.length - 1 - i], hs: null, as: null, conf: c });
    });
    P.round++; P.rounds.push(next);
  };
  E.roundName = function (r) { return ['Wild Card Round', 'Divisional Round', 'Conference Championship', 'Super Bowl'][r]; };

  // ---------- Draft ----------
  var FN = 'Jalen Marcus Tyler Jaylen Devin Cameron Isaiah Elijah Malik Darius Trey Brandon Jordan Xavier Caleb Mason Logan Bryce Carson Tre Kendall Quincy Amari Damon Kobe Zion Jace Kade Bryson Deshawn Treyvon Rashad Micah Javion Landon Colby Grant Brady Owen Garrett Nolan Dante Keon Jamari Tavion Cortez Ricky Nate Austin Drew Luke Cole Wyatt Reid Sam Ty Myles Andre Terrell Cedric Omar Jaxon Kingston Ahmad Bo Chase Dorian Emeka Femi Kalani Manny Rocco Silas Easton Kellen Dashawn Marquise'.split(' ');
  var LN = 'Whitfield Okonkwo Brantley Castellano Merriweather Ashby Dorsey Kincaid Lockhart Prather Haddix Thornburg Vanterpool Wakefield Yarbrough Abernathy Bledsoe Calloway Delacroix Eubanks Faulkner Gaines Holloway Ivey Jessup Kimbrough Langford Mabry Nettles Oakes Pruitt Quarles Rainey Sutter Tolliver Upshaw Varnado Whitlock Youngblood Zeigler Akins Battle Clemons Dandridge Easley Fontenot Goolsby Hairston Ingram Jeffcoat Kearse Lattimore Mayfield Northcutt Ogletree Pettaway Ridley Strother Tisdale Underwood Vickers Winfrey Agbaje Boatwright Crumpler Draughn Etheridge Fairley Gentry Hightower Isom Jernigan Kelsey Lofton Mullins Nixon Overstreet Parham Renfro Sapp Truitt Usher Wingo Okafor Adebayo Faleolo Mbaye Toala Nwachukwu'.split(' ');
  var COL = 'Alabama,Georgia,Ohio State,Michigan,Texas,LSU,Oregon,Penn State,Clemson,USC,Notre Dame,Florida,Florida State,Miami,Oklahoma,Tennessee,Texas A&M,Auburn,Ole Miss,Washington,Utah,Iowa,Wisconsin,Missouri,Kentucky,Arizona State,Colorado,TCU,Baylor,Louisville,North Carolina,NC State,South Carolina,Arkansas,Kansas State,Boise State,BYU,Iowa State,Minnesota,Pittsburgh,Virginia Tech,Duke,UCLA,Stanford,Cincinnati,Houston,Tulane,Toledo,Memphis,Oregon State'.split(',');
  var DPOS = ['QB', 'RB', 'RB', 'WR', 'WR', 'WR', 'WR', 'TE', 'TE', 'OT', 'OT', 'OT', 'G', 'G', 'C', 'EDGE', 'EDGE', 'EDGE', 'DT', 'DT', 'DT', 'LB', 'LB', 'LB', 'CB', 'CB', 'CB', 'CB', 'S', 'S', 'S', 'K', 'P'];
  var BASE_WT = { QB: 220, RB: 210, WR: 195, TE: 250, OT: 315, G: 315, C: 305, EDGE: 260, DT: 305, LB: 235, CB: 190, S: 205, K: 190, P: 200, LS: 240 };
  var BASE_40 = { QB: 4.75, RB: 4.48, WR: 4.45, TE: 4.68, OT: 5.15, G: 5.2, C: 5.2, EDGE: 4.65, DT: 4.95, LB: 4.6, CB: 4.42, S: 4.5, K: 4.9, P: 4.9 };
  E.genDraftClass = function (G) {
    var ids = [], used = {};
    for (var i = 0; i < 300; i++) {
      var pos = i < 12 ? pick(['QB', 'QB', 'EDGE', 'EDGE', 'OT', 'WR', 'WR', 'CB', 'DT', 'RB', 'TE', 'S', 'LB']) : pick(DPOS);
      if ((pos === 'K' || pos === 'P') && (i < 120 || rnd() < .4)) pos = 'LB';
      var ovr = Math.round(clamp(74 - i * .085 + gauss() * 3.2, 40, 80));
      var pot = Math.round(clamp(ovr + (i < 40 ? ri(8, 22) : ri(2, 20)), ovr, 97));
      var id = 'd' + (G.season + 1) + '_' + i, fn, ln, g = 0;
      do { fn = pick(FN); ln = pick(LN); } while (used[fn + ln] && g++ < 20); used[fn + ln] = 1;
      var p = { id: id, fn: fn, ln: ln, pos: pos, tm: 'DRAFT', age: ri(21, 23), exp: 0, num: '', sal: 0, yrs: 0, draft: '', col: pick(COL), ht: ri(70, 78), wt: 200, real: 0, mor: 70, inj: 0, st: {}, prog: 0 };
      p.a = genAttrs(pos, ovr); p.ovr = calcOvr(p); p.pot = Math.max(pot, p.ovr);
      p.wt = BASE_WT[pos] + ri(-12, 12);
      p.ht = ({ QB: 75, RB: 70, WR: 73, TE: 77, OT: 78, G: 76, C: 75, EDGE: 76, DT: 75, LB: 74, CB: 72, S: 72, K: 72, P: 74 })[pos] + ri(-2, 2);
      p.forty = Math.round((BASE_40[pos] - ((p.a.SPD || 60) - 70) * .012 + gauss() * .04) * 100) / 100;
      p.sc = 0; p.errO = Math.round(gauss() * 7); p.errP = Math.round(gauss() * 8);
      p.media = i + gauss() * 14;
      G.players[id] = p; ids.push(id);
    }
    ids.sort(function (a, b) { return G.players[a].media - G.players[b].media; });
    ids.forEach(function (id, i) { G.players[id].media = i + 1; });
    G.dclass = ids;
    ids.forEach(function (id) { ensureP(G, G.players[id]); });
  };
  var SC_MULT = [1, .55, .22, 0], SC_COST = [3, 4, 6];
  E.SC_COST = SC_COST;
  E.scoutView = function (p) {
    var lv = p.sc || 0, m = SC_MULT[lv], w = [9, 5, 2, 0][lv];
    var o = clamp(p.ovr + Math.round(p.errO * m), 35, 95), pt = clamp(p.pot + Math.round(p.errP * m), 40, 99);
    return { lo: clamp(o - w, 30, 99), hi: clamp(o + w, 30, 99), est: o, pot: potGrade(pt), potEst: pt, lv: lv, exact: lv >= 3 };
  };
  E.scout = function (G, p) {
    if ((p.sc || 0) >= 3) return 'Fully scouted.';
    var c = SC_COST[p.sc || 0];
    if (G.user.sp < c) return 'Not enough scouting points.';
    G.user.sp -= c; p.sc = (p.sc || 0) + 1; return null;
  };
  E.startDraft = function (G) {
    G.phase = 'draft';
    var P = G.playoffs, teams = G.order.slice();
    teams.sort(function (a, b) { var ea = P.elim[a] || 0, eb = P.elim[b] || 0; if (ea !== eb) return ea - eb; return winPct(G.teams[a]) - winPct(G.teams[b]) || ((G.teams[a].pf - G.teams[a].pa) - (G.teams[b].pf - G.teams[b].pa)); });
    var order = [], yr = G.season + 1; ensurePicks(G); addPickYear(G, yr);
    var own = {}; G.picks.forEach(function (k) { if (k.yr === yr) own[k.r + '-' + k.orig] = k.own; });
    for (var r = 0; r < 7; r++) teams.forEach(function (ab, i) { var o = own[(r + 1) + '-' + ab] || ab; order.push({ r: r + 1, n: i + 1, ab: o, orig: ab, pid: null }); });
    G.picks = G.picks.filter(function (k) { return k.yr !== yr; });
    addPickYear(G, yr + 3);
    G.draft = { order: order, cur: 0, year: yr };
    addNews(G, 'The ' + (G.season + 1) + ' NFL Draft is here. The ' + G.teams[order[0].ab].name + ' are on the clock with the #1 pick.', 'big');
  };
  function rookieDeal(o) { if (o.r === 1) return Math.round((11500 - (o.n - 1) * 260) / 50) * 50; if (o.r === 2) return Math.round((2300 - o.n * 15) / 50) * 50; return 1150 + Math.max(0, 4 - o.r) * 150; }
  E.rookieDeal = rookieDeal;
  E.draftPlayer = function (G, pid) {
    var D = G.draft, o = D.order[D.cur], p = G.players[pid];
    if (!o || !p || p.tm !== 'DRAFT') return false;
    o.pid = pid; p.tm = o.ab; p.sal = rookieDeal(o); p.yrs = 4; p.draft = D.year + ' R' + o.r + ' P' + ((o.r - 1) * 32 + o.n); p.num = '' + ri(1, 99);
    p.rookie = 1; p.sc = 3; p.fresh = 1;
    syncDepth(G, o.ab);
    if (o.r === 1 || o.ab === G.user.ab) addNews(G, 'Pick ' + ((o.r - 1) * 32 + o.n) + ': The ' + G.teams[o.ab].name + ' select ' + p.pos + ' ' + p.fn + ' ' + p.ln + ' (' + p.col + ').', o.ab === G.user.ab ? 'big' : 'draft');
    D.cur++;
    if (D.cur >= D.order.length) E.endDraft(G);
    return true;
  };
  E.aiChoice = function (G, ab, r) {
    var avail = G.dclass.filter(function (id) { return G.players[id].tm === 'DRAFT'; });
    var have = {}; teamPlayers(G, ab).forEach(function (p) { if (p.ovr >= 70) have[p.pos] = (have[p.pos] || 0) + 1; });
    var best = null, bv = -1e9;
    avail.slice(0, 50).forEach(function (id) {
      var p = G.players[id], need = ((LINEUP[p.pos] || 1) - (have[p.pos] || 0)) * 2.5;
      var v = p.ovr * .55 + p.pot * .45 + Math.max(-3, need) + gauss() * 2.5 - p.media * .03 + (p.pos === 'QB' && !have.QB ? 4 : 0) - ((p.pos === 'K' || p.pos === 'P') && r < 5 ? 15 : 0);
      if (v > bv) { bv = v; best = id; }
    });
    return best || avail[0];
  };
  E.aiPick = function (G) { var o = G.draft.order[G.draft.cur]; return E.draftPlayer(G, E.aiChoice(G, o.ab, o.r)); };
  E.simDraftToUser = function (G) { var g = 0; while (G.phase === 'draft' && G.draft.order[G.draft.cur].ab !== G.user.ab && g++ < 300) E.aiPick(G); };
  E.endDraft = function (G) {
    G.phase = 'offseason';
    G.dclass.forEach(function (id) { var p = G.players[id]; if (p.tm === 'DRAFT') { p.tm = 'FA'; p.sal = 0; p.sc = 3; } });
    var mine = G.draft.order.filter(function (o) { return o.ab === G.user.ab; }).map(function (o) { return G.players[o.pid]; });
    addNews(G, 'Draft complete. Your class: ' + mine.slice(0, 3).map(function (p) { return p.pos + ' ' + p.fn + ' ' + p.ln; }).join(', ') + (mine.length > 3 ? ' and ' + (mine.length - 3) + ' more.' : '.'), 'big');
  };

  // ---------- New season ----------
  E.expiring = function (G, ab) { return teamPlayers(G, ab).filter(function (p) { return p.yrs <= 1 && !p.fresh; }); };
  E.newSeason = function (G) {
    var me = G.user.ab, retired = [], left = [], id;
    G.history.push({ season: G.season, rec: rec(G.teams[me]), champ: G.playoffs && G.playoffs.champ, elim: G.playoffs ? (G.playoffs.elim[me] || 0) : 0, chem: Math.round(G.teams[me].chem) });
    if (G.capRaised !== G.season) G.cap = Math.round(G.cap * 1.06 / 100) * 100;
    G.season++; G.fa = null; G.user.offers = [];
    for (id in G.players) {
      var p = G.players[id];
      if (p.tm === 'DRAFT') { delete G.players[id]; continue; }
      p.age++; p.exp++; p.st = {}; p.prog = 0; p.inj = 0; p.rookie = 0; p.neg = 0;
      develop(G, p, 'balanced', 'normal', p.tm === me ? G.user.dev : 50, CAMP_OFFSEASON_WEEKS);
      p.prog = 0;
      if (p.tm !== 'FA' && !p.fresh) p.yrs--;
      p.fresh = 0;
      if ((p.age >= 35 && rnd() < .55) || (p.age >= 31 && p.ovr < 58) || (p.tm === 'FA' && p.ovr < 50)) { if (p.tm === me) retired.push(p); delete G.players[id]; continue; }
      if (p.tm !== 'FA' && p.yrs <= 0) {
        if (p.tm === me) { left.push(p); p.tm = 'FA'; p.sal = 0; p.yrs = 0; }
        else if (p.ovr >= 68 && rnd() < .7) { p.sal = marketValue(p); p.yrs = ri(1, 4); }
        else { p.tm = 'FA'; p.sal = 0; p.yrs = 0; }
      }
    }
    G.order.forEach(function (ab) {
      var t = G.teams[ab]; t.w = t.l = t.t = t.pf = t.pa = t.divW = t.streak = 0; t.dead = 0;
      if (ab !== me) { var c = 0; while (E.capUsed(G, ab) > G.cap - 2000 && c++ < 40) { var cut = teamPlayers(G, ab).filter(function (p) { return p.sal > 2000; }).sort(function (a, b) { return (a.ovr / a.sal) - (b.ovr / b.sal); })[0]; if (!cut) break; cut.tm = 'FA'; cut.sal = 0; cut.yrs = 0; } }
      autoDepth(G, ab);
      cutTo(G, ab, 90, ab === me);
      autoDepth(G, ab);
    });
    var fas = faList(G); fas.slice(500).forEach(function (p) { delete G.players[p.id]; });
    G.sched = G.sched.map(function (wk) { return wk.map(function (g) { return { h: g.a, a: g.h, hs: null, as: null }; }); });
    G.phase = 'camp'; G.week = 1; G.playoffs = null; G.draft = null; G.user.sp += 40;
    for (id in G.players) { var q = G.players[id]; ensureP(G, q); q.a0 = snapA(q); q.fat = 0; q.dh = q.tm === me ? [Math.round(wovr(q) * 10) / 10] : undefined; }
    G.user.prac = null; G.user.plan.fp = G.user.plan.fp.filter(function (pid) { return G.players[pid] && G.players[pid].tm === me; });
    E.genDraftClass(G);
    addNews(G, 'Welcome to the ' + G.season + ' season! Salary cap: ' + fmtM(G.cap) + '.' + (left.length ? ' Left in free agency: ' + left.slice(0, 4).map(function (p) { return p.ln; }).join(', ') + (left.length > 4 ? ' +' + (left.length - 4) : '') + '.' : '') + (retired.length ? ' Retired: ' + retired.map(function (p) { return p.ln; }).join(', ') + '.' : ''), 'big');
    E.startCamp(G);
    return { left: left, retired: retired };
  };
  function cutTo(G, ab, n, isUser) {
    var ps = teamPlayers(G, ab);
    if (ps.length <= n) return [];
    var cnt = {}, keep = {}, kept = 0, cut = [];
    ps.sort(function (a, b) { return b.ovr - a.ovr; });
    ps.forEach(function (p) { if ((cnt[p.pos] || 0) < (ROSTER_MIN[p.pos] || 0)) { keep[p.id] = 1; kept++; cnt[p.pos] = (cnt[p.pos] || 0) + 1; } });
    ps.forEach(function (p) { if (!keep[p.id]) { if (kept < n) { keep[p.id] = 1; kept++; } else cut.push(p); } });
    cut.forEach(function (p) { p.tm = 'FA'; p.sal = 0; p.yrs = 0; });
    if (isUser && cut.length) addNews(G, 'Roster cutdown to ' + n + ': released ' + cut.length + ' players (' + cut.slice(0, 5).map(function (p) { return p.ln; }).join(', ') + (cut.length > 5 ? '…' : '') + ').');
    syncDepth(G, ab);
    return cut;
  }
  E.cutTo = cutTo;
  function aiFillMin(G, ab) {
    var cnt = {}; teamPlayers(G, ab).forEach(function (p) { cnt[p.pos] = (cnt[p.pos] || 0) + 1; });
    var fas = faList(G), n = teamPlayers(G, ab).length;
    for (var pos in ROSTER_MIN) {
      while ((cnt[pos] || 0) < ROSTER_MIN[pos] && n < 53) {
        var f = fas.filter(function (p) { return p.pos === pos && p.tm === 'FA'; })[0];
        if (!f) break; f.tm = ab; f.sal = Math.max(1100, Math.round(marketValue(f) * .8)); f.yrs = ri(1, 2); cnt[pos] = (cnt[pos] || 0) + 1; n++;
      }
    }
    var g = 0; while (n < 53 && g++ < 30) { var f2 = fas.filter(function (p) { return p.tm === 'FA'; })[0]; if (!f2) break; f2.tm = ab; f2.sal = 1100; f2.yrs = 1; n++; }
  }
  E.leaders = function (G, key, n, filter) {
    var a = []; for (var id in G.players) { var p = G.players[id]; if (p.st && p.st[key] && (!filter || filter(p))) a.push(p); }
    return a.sort(function (x, y) { return y.st[key] - x.st[key]; }).slice(0, n || 10);
  };
  // ---------- Draft picks ----------
  function nextDraftYear(G) { return (G.phase === 'draft' || G.phase === 'offseason') ? G.season + 2 : G.season + 1; }
  function addPickYear(G, yr) {
    if (G.picks.some(function (k) { return k.yr === yr; })) return;
    for (var r = 1; r <= 7; r++) G.order.forEach(function (ab) { G.picks.push({ id: yr + '-' + r + '-' + ab, yr: yr, r: r, orig: ab, own: ab }); });
  }
  function ensurePicks(G) {
    if (!G.picks) { G.picks = []; var y0 = nextDraftYear(G); for (var y = y0; y < y0 + 3; y++) addPickYear(G, y); }
  }
  E.ensurePicks = ensurePicks;
  E.teamPicks = function (G, ab) { ensurePicks(G); return G.picks.filter(function (k) { return k.own === ab; }).sort(function (a, b) { return a.yr - b.yr || a.r - b.r; }); };
  E.pickLabel = function (G, k) { return k.yr + ' Round ' + k.r + (k.own !== k.orig ? ' (from ' + k.orig + ')' : ''); };
  // projected slot (1-32) by current/last record
  function projSlot(G, ab) {
    var arr = G.order.slice().sort(function (a, b) { return winPct(G.teams[a]) - winPct(G.teams[b]) || (G.teams[a].pf - G.teams[a].pa) - (G.teams[b].pf - G.teams[b].pa); });
    var gp = G.teams[ab].w + G.teams[ab].l + G.teams[ab].t;
    var s = arr.indexOf(ab) + 1;
    return gp >= 3 ? s : Math.round((s + 16.5) / 2);
  }
  function pickValue(G, k) {
    var near = k.yr === nextDraftYear(G), slot = near ? projSlot(G, k.orig) : 16.5;
    var overall = (k.r - 1) * 32 + slot;
    var v = 30000 * Math.exp(-(overall - 1) / 28) + 220;
    return v * Math.pow(.85, Math.max(0, k.yr - nextDraftYear(G)));
  }
  E.pickValue = pickValue;

  // ---------- Team direction & trade value ----------
  E.direction = function (G, ab) {
    var t = G.teams[ab], gp = t.w + t.l + t.t, o = E.teamOvr(G, ab).ovr;
    var sc = o + (gp >= 4 ? (winPct(t) - .5) * 24 : 0);
    return sc >= 80 ? 'contend' : sc <= 73.5 ? 'rebuild' : 'middle';
  };
  E.DIR_NAMES = { contend: 'Contender', middle: 'Middle of the pack', rebuild: 'Rebuilding' };
  function playerValue(p) {
    var mv = marketValue(p), v = mv + (mv - p.sal) * Math.min(Math.max(p.yrs, 1), 3) * .35;
    if (p.age <= 25) v += Math.max(0, p.pot - p.ovr) * 260;
    if (p.inj >= 3) v *= .8;
    return v;
  }
  E.playerValue = playerValue;
  function valueFor(G, ab, p, incoming, dir) {
    var v = playerValue(p);
    if (dir === 'contend') v *= p.age >= 27 ? 1.15 : .95; else if (dir === 'rebuild') v *= p.age <= 25 ? 1.2 : p.age >= 29 ? .7 : 1;
    if (incoming) { var st = E.wouldStart(G, p, ab); v *= st ? 1.12 : .82; if (p.pers === 'CANCER') v *= .8; else if (p.pers === 'DIVA' || p.pers === 'HOT') v *= .92; else if (p.pers === 'LEADER') v *= 1.05; }
    else v *= 1.08; // endowment: AI values what it already has a little more
    return v;
  }
  function pickValueFor(G, k, dir) { var v = pickValue(G, k); return v * (dir === 'rebuild' ? 1.2 : dir === 'contend' ? .85 : 1); }
  function tradeAllowed(G) {
    if (G.phase === 'regular') return G.week <= TRADE_DEADLINE ? '' : 'The trade deadline (after Week ' + TRADE_DEADLINE + ') has passed. Trading reopens after the season.';
    if (G.phase === 'playoffs') return 'No trades during the playoffs.';
    if (G.phase === 'draft') return 'No trades while the draft is running.';
    return '';
  }
  var TRADE_DEADLINE = 9; E.TRADE_DEADLINE = TRADE_DEADLINE;
  E.tradeAllowed = tradeAllowed;
  // offer: { a: team, b: team, aGive: {pl:[], pk:[]}, bGive: {pl:[], pk:[]} }
  function capAfter(G, ab, outIds, inIds) {
    var s = E.capUsed(G, ab); outIds.forEach(function (id) { s -= G.players[id].sal; }); inIds.forEach(function (id) { s += G.players[id].sal; });
    return s;
  }
  E.capAfter = capAfter;
  E.validateTrade = function (G, o) {
    ensurePicks(G);
    var why = tradeAllowed(G); if (why) return why;
    if (o.a === o.b) return 'Pick another team.';
    var A = o.aGive, B = o.bGive;
    if (!A.pl.length && !A.pk.length) return 'Add something you are giving.';
    if (!B.pl.length && !B.pk.length) return 'Add something you want back.';
    var bad = A.pl.filter(function (id) { return !G.players[id] || G.players[id].tm !== o.a; }).concat(B.pl.filter(function (id) { return !G.players[id] || G.players[id].tm !== o.b; }));
    if (bad.length) return 'One of those players is no longer on that roster.';
    var pk = function (id) { for (var i = 0; i < G.picks.length; i++) if (G.picks[i].id === id) return G.picks[i]; return null; };
    if (A.pk.some(function (id) { var k = pk(id); return !k || k.own !== o.a; }) || B.pk.some(function (id) { var k = pk(id); return !k || k.own !== o.b; })) return 'One of those picks has already moved.';
    var lim = E.rosterLimit(G);
    var na = teamPlayers(G, o.a).length - A.pl.length + B.pl.length, nb = teamPlayers(G, o.b).length - B.pl.length + A.pl.length;
    if (na > lim + 3 || nb > lim + 3) return 'Too many incoming players for the roster limit (' + lim + ').';
    var ca = capAfter(G, o.a, A.pl, B.pl), cb = capAfter(G, o.b, B.pl, A.pl);
    if (ca > G.cap && ca > E.capUsed(G, o.a)) return 'The ' + G.teams[o.a].name + ' would be over the cap (' + fmtM(ca) + ' of ' + fmtM(G.cap) + ').';
    if (cb > G.cap && cb > E.capUsed(G, o.b)) return 'The ' + G.teams[o.b].name + ' would be over the cap (' + fmtM(cb) + ' of ' + fmtM(G.cap) + ').';
    return '';
  };
  function sideValue(G, ab, side, incoming, dir) {
    var v = 0;
    side.pl.forEach(function (id) { v += valueFor(G, ab, G.players[id], incoming, dir); });
    side.pk.forEach(function (id) { var k = G.picks.filter(function (x) { return x.id === id; })[0]; if (k) v += pickValueFor(G, k, dir) * (incoming ? 1 : 1.05); });
    return v;
  }
  // AI team `o.b` judges an offer from `o.a`
  E.evalTrade = function (G, o) {
    var dir = E.direction(G, o.b), vin = sideValue(G, o.b, o.aGive, true, dir), vout = sideValue(G, o.b, o.bGive, false, dir);
    var cb = capAfter(G, o.b, o.bGive.pl, o.aGive.pl), room = G.cap - cb;
    if (room < 1500 && cb > E.capUsed(G, o.b)) vin -= (1500 - room) * .6; // cap squeeze
    return { vin: vin, vout: vout, ratio: vout > 0 ? vin / vout : 9, dir: dir };
  };
  E.proposeTrade = function (G, o) {
    var err = E.validateTrade(G, o); if (err) return { ok: false, msg: err };
    var ev = E.evalTrade(G, o), T = G.teams[o.b];
    if (ev.ratio >= 1.04) { execTrade(G, o); return { ok: true, msg: 'Trade accepted! The ' + T.name + ' agree to the deal.' }; }
    if (ev.ratio >= .72) {
      // counter: ask for the cheapest extra asset of ours that closes the gap
      var need = ev.vout * 1.06 - ev.vin, cand = [];
      teamPlayers(G, o.a).forEach(function (p) { if (o.aGive.pl.indexOf(p.id) < 0) cand.push({ t: 'pl', id: p.id, v: valueFor(G, o.b, p, true, ev.dir), n: p.pos + ' ' + p.fn + ' ' + p.ln }); });
      E.teamPicks(G, o.a).forEach(function (k) { if (o.aGive.pk.indexOf(k.id) < 0) cand.push({ t: 'pk', id: k.id, v: pickValueFor(G, k, ev.dir), n: E.pickLabel(G, k) + ' pick' }); });
      cand = cand.filter(function (c) { return c.v >= need; }).sort(function (a, b) { return a.v - b.v; });
      for (var i = 0; i < cand.length && i < 6; i++) {
        var c = cand[i], co = JSON.parse(JSON.stringify(o)); co.aGive[c.t].push(c.id);
        if (!E.validateTrade(G, co)) return { ok: false, counter: co, msg: 'The ' + T.name + ' are close. They would do it if you add ' + c.n + '.' };
      }
      return { ok: false, msg: 'The ' + T.name + ' say it is close, but they need more value coming back.' };
    }
    return { ok: false, msg: 'The ' + T.name + ' turn it down flat. ' + (ev.dir === 'rebuild' ? 'They are rebuilding and want young players and picks.' : ev.dir === 'contend' ? 'They are contending and want players who help now.' : 'Not nearly enough value.') };
  };
  function execTrade(G, o, silent) {
    var me = G.user && G.user.ab;
    function move(side, from, to) {
      side.pl.forEach(function (id) {
        var p = G.players[id]; p.tm = to; p.fresh = p.fresh || 0; p.tradeReq = 0; p.block = 0; p.wantsSnaps = 0;
        p.mor = clamp(55 + (E.wouldStart(G, p, to) ? 10 : 0) + (p.pers === 'TEAM' || p.pers === 'PRO' ? 5 : 0), 0, 100);
        if (G.user) { G.user.plan && (G.user.plan.fp = G.user.plan.fp.filter(function (x) { return x !== id; })); }
        if (to === me) { p.dh = [Math.round(wovr(p) * 10) / 10]; }
      });
      side.pk.forEach(function (id) { G.picks.forEach(function (k) { if (k.id === id) k.own = to; }); });
    }
    move(o.aGive, o.a, o.b); move(o.bGive, o.b, o.a);
    // chemistry & culture fallout
    [[o.a, o.aGive, o.bGive], [o.b, o.bGive, o.aGive]].forEach(function (x) {
      var ab = x[0], t = G.teams[ab], outP = x[1].pl.map(function (id) { return G.players[id]; }), inP = x[2].pl.map(function (id) { return G.players[id]; });
      outP.forEach(function (p) {
        if (p.ovr >= 78) t.chem = clamp(t.chem - 1, 5, 99);
        if (p.pers === 'LEADER' || p.ldr >= 82) { t.chem = clamp(t.chem - 2, 5, 99); if (ab === me) { G.user.unity = clamp(G.user.unity - 3, 0, 100); teamPlayers(G, me).forEach(function (q) { q.mor = clamp(q.mor - 1.5, 0, 100); }); } }
        if (p.pers === 'CANCER' || (E.isAttitude(p) && p.mor < 45)) { t.chem = clamp(t.chem + 2, 5, 99); if (ab === me) G.user.unity = clamp(G.user.unity + 2, 0, 100); }
      });
      inP.forEach(function (p) { if (p.pers === 'CANCER') t.chem = clamp(t.chem - 2.5, 5, 99); if (p.pers === 'LEADER' && ab === me) G.user.unity = clamp(G.user.unity + 2, 0, 100); });
      syncDepth(G, ab); if (ab !== me) autoDepth(G, ab);
      var lim = E.rosterLimit(G); if (teamPlayers(G, ab).length > lim) cutTo(G, ab, lim, ab === me);
    });
    if (!silent || o.a === me || o.b === me) {
      var desc = function (side) { return side.pl.map(function (id) { var p = G.players[id]; return p.pos + ' ' + p.fn + ' ' + p.ln; }).concat(side.pk.map(function (id) { var k = G.picks.filter(function (z) { return z.id === id; })[0]; return k ? k.yr + ' R' + k.r + ' pick' : 'a pick'; })).join(', '); };
      addNews(G, 'TRADE: The ' + G.teams[o.a].name + ' send ' + desc(o.aGive) + ' to the ' + G.teams[o.b].name + ' for ' + desc(o.bGive) + '.', (o.a === me || o.b === me) ? 'big' : 'deal');
    }
    (G.tradeLog = G.tradeLog || []).unshift({ s: G.season, ph: G.phase, w: G.week, a: o.a, b: o.b, ag: o.aGive, bg: o.bGive });
    if (G.tradeLog.length > 60) G.tradeLog.length = 60;
  }
  E.execTrade = execTrade;
  // build an offer from AI team `ab` for `target` player (owned by `other`), using its own picks / young players
  function buildOffer(G, ab, p) {
    var dir = E.direction(G, ab), want = valueFor(G, ab, p, true, dir) * rf(.9, 1.05), give = { pl: [], pk: [] }, got = 0;
    var assets = E.teamPicks(G, ab).map(function (k) { return { t: 'pk', id: k.id, v: pickValueFor(G, k, dir) }; })
      .concat(teamPlayers(G, ab).filter(function (q) { return q.pos !== p.pos && !E.wouldStart(G, q, ab) && q.ovr >= 55; }).map(function (q) { return { t: 'pl', id: q.id, v: valueFor(G, ab, q, false, dir) }; }));
    assets.sort(function (a, b) { return b.v - a.v; });
    var guard = 0;
    while (got < want * .97 && guard++ < 6) {
      var rem = want - got, pickA = null;
      for (var i = assets.length - 1; i >= 0; i--) if (assets[i].v >= rem * .6 && give[assets[i].t].indexOf(assets[i].id) < 0) { pickA = assets[i]; break; }
      if (!pickA) pickA = assets.filter(function (a) { return give[a.t].indexOf(a.id) < 0; })[0];
      if (!pickA) break;
      give[pickA.t].push(pickA.id); got += pickA.v;
    }
    if (got < want * .85) return null;
    return { a: ab, b: p.tm, aGive: give, bGive: { pl: [p.id], pk: [] } };
  }
  function weeklyTrades(G) {
    if (tradeAllowed(G)) return;
    ensurePicks(G);
    var me = G.user.ab;
    // AI offers for players on your trade block
    G.user.offers = (G.user.offers || []).filter(function (x) { return x.exp >= G.week && !E.validateTrade(G, x.o); });
    var block = teamPlayers(G, me).filter(function (p) { return p.block || p.tradeReq; });
    block.forEach(function (p) {
      if (rnd() > .45) return;
      var teams = G.order.filter(function (ab) { return ab !== me && E.wouldStart(G, p, ab); }); if (!teams.length) return;
      var ab = pick(teams), o = buildOffer(G, ab, p);
      if (o && !E.validateTrade(G, o) && G.user.offers.length < 6) { G.user.offers.push({ id: 'of' + G.season + G.week + p.id + ab, o: o, exp: G.week + 1 }); addNews(G, 'Trade offer: the ' + G.teams[ab].name + ' made an offer for ' + p.pos + ' ' + p.fn + ' ' + p.ln + '. See Trades.', 'deal'); }
    });
    // AI-to-AI trades: contenders buy veterans from rebuilders
    if (rnd() < .3) {
      var dirs = {}; G.order.forEach(function (ab) { if (ab !== me) dirs[ab] = E.direction(G, ab); });
      var buyers = G.order.filter(function (ab) { return dirs[ab] === 'contend'; }), sellers = G.order.filter(function (ab) { return dirs[ab] === 'rebuild'; });
      if (buyers.length && sellers.length) {
        var bu = pick(buyers), se = pick(sellers);
        var tgt = teamPlayers(G, se).filter(function (p) { return p.age >= 27 && p.ovr >= 74 && E.wouldStart(G, p, bu); }).sort(function (a, b) { return b.ovr - a.ovr; })[0];
        if (tgt) { var o2 = buildOffer(G, bu, tgt); if (o2 && !E.validateTrade(G, o2) && E.evalTrade(G, o2).ratio >= .98) execTrade(G, o2, true); }
      }
    }
  }
  E.weeklyTrades = weeklyTrades;
  E.respondOffer = function (G, id, accept) {
    var i = (G.user.offers || []).findIndex(function (x) { return x.id === id; }); if (i < 0) return 'Offer expired.';
    var x = G.user.offers[i]; G.user.offers.splice(i, 1);
    if (!accept) return 'Offer declined.';
    var err = E.validateTrade(G, x.o); if (err) return err;
    execTrade(G, x.o); return 'Trade complete!';
  };
  // personality-driven trade requests
  function tradeRequests(G) {
    var me = G.user.ab;
    teamPlayers(G, me).forEach(function (p) {
      if (p.tradeReq) return;
      var th = p.pers === 'DIVA' || p.pers === 'CANCER' ? 38 : p.pers === 'HOT' || p.pers === 'COMP' ? 30 : 22;
      if (p.pers === 'TEAM' || p.pers === 'PRO') th = 12;
      if (p.mor < th && p.ovr >= 65 && rnd() < .25) { p.tradeReq = 1; addNews(G, 'TRADE REQUEST: ' + p.pos + ' ' + p.fn + ' ' + p.ln + ' (' + (PERS[p.pers] ? PERS[p.pers].n : '') + ') has asked to be traded.', 'loss'); }
    });
  }
  E.tradeRequests = tradeRequests;

  // ---------- Free agency period (offseason, before the draft) ----------
  var FA_DAYS = 5; E.FA_DAYS = FA_DAYS;
  E.startFA = function (G) {
    ensurePicks(G);
    var me = G.user.ab, left = [], kept = 0;
    if (G.capRaised !== G.season) { G.cap = Math.round(G.cap * 1.06 / 100) * 100; G.capRaised = G.season; }
    for (var id in G.players) {
      var p = G.players[id];
      if (p.tm === 'FA' || p.tm === 'DRAFT' || p.fresh || p.yrs > 1) continue;
      if (p.tm !== me && p.ovr >= 66 && rnd() < (p.ovr >= 80 ? .75 : .55) && E.capSpace(G, p.tm) > marketValue(p) + 6000) { p.sal = marketValue(p); p.yrs = ri(1, 4); p.fresh = 1; kept++; continue; }
      p.lastTm = p.tm; if (p.tm === me) left.push(p);
      p.tm = 'FA'; p.sal = 0; p.yrs = 0; p.tradeReq = 0; p.block = 0;
    }
    G.order.forEach(function (ab) { syncDepth(G, ab); });
    if (G.user.plan) G.user.plan.fp = G.user.plan.fp.filter(function (x) { return G.players[x] && G.players[x].tm === me; });
    G.phase = 'freeagency'; G.fa = { day: 1, days: FA_DAYS, offers: {}, mine: {}, results: [] };
    G.user.offers = [];
    addNews(G, 'FREE AGENCY OPENS: ' + faList(G).filter(function (p) { return p.ovr >= 70; }).length + ' players rated 70+ hit the market. The ' + (G.season + 1) + ' salary cap is ' + fmtM(G.cap) + '.', 'big');
    if (left.length) addNews(G, 'Your expiring contracts are now free agents: ' + left.sort(function (a, b) { return b.ovr - a.ovr; }).slice(0, 6).map(function (p) { return p.ln; }).join(', ') + (left.length > 6 ? ' +' + (left.length - 6) : '') + '. They give you a loyalty edge if you bid.');
  };
  function needAt(G, ab, pos) {
    var n = LINEUP[pos] || 1, ps = teamPlayers(G, ab).filter(function (p) { return p.pos === pos; }).sort(function (a, b) { return b.ovr - a.ovr; });
    var weakest = ps.length >= n ? ps[n - 1].ovr : 40;
    return { weakest: weakest, count: ps.length };
  }
  function faUtility(G, p, of) {
    var ask = E.askFor(G, p, of.ab).sal, t = G.teams[of.ab], money = of.sal / Math.max(1, ask), wp = winPct(t);
    var W = { m: 1, w: .35, c: .2, s: .25 };
    if (p.pers === 'DIVA') { W.m = 1.5; W.w = .15; } else if (p.pers === 'COMP' || p.pers === 'LEADER') { W.w = .6; } else if (p.pers === 'TEAM') { W.m = .8; W.w = .5; W.c = .35; } else if (p.pers === 'PRO') { W.c = .4; }
    if (p.age >= 31) W.w += .25;
    var u = money * W.m + wp * W.w + (t.chem / 100) * W.c + (E.wouldStart(G, p, of.ab) ? W.s : 0) + (p.lastTm === of.ab ? .15 : 0) + (of.yrs >= E.askFor(G, p, of.ab).yrs ? .04 : -.03 * Math.abs(of.yrs - E.askFor(G, p, of.ab).yrs));
    return { u: u, money: money };
  }
  E.faUtility = faUtility;
  E.faOffersFor = function (G, pid) { return (G.fa && G.fa.offers[pid]) || []; };
  E.faBid = function (G, p, sal, yrs) {
    var me = G.user.ab, ask = E.askFor(G, p, me);
    if (teamPlayers(G, me).length >= E.rosterLimit(G)) return { ok: false, msg: 'Your roster is full.' };
    var committed = 0; for (var k in G.fa.mine) if (k !== p.id) committed += G.fa.mine[k].sal;
    if (sal > E.capSpace(G, me) - committed) return { ok: false, msg: 'Not enough cap space (counting your other pending offers: ' + fmtM(committed) + ').' };
    if (sal < ask.sal * .8) return { ok: false, msg: p.ln + "'s agent won't even take that to his client.", counter: ask.sal, cyrs: ask.yrs };
    if (sal >= ask.sal * 1.12 && ask.interest >= 45 && G.fa.day >= 2 - (p.ovr < 72 ? 1 : 0)) { delete G.fa.mine[p.id]; sign(G, p, me, sal, yrs); return { ok: true, msg: p.fn + ' ' + p.ln + ' signs on the spot! ' + fmtM(sal) + '/yr for ' + yrs + ' yrs.' }; }
    G.fa.mine[p.id] = { ab: me, sal: sal, yrs: yrs };
    return { ok: false, pending: true, msg: 'Offer submitted: ' + fmtM(sal) + '/yr × ' + yrs + '. He will decide at the end of Day ' + G.fa.day + '. (Pay 12%+ over his ask to sign him on the spot.)' };
  };
  E.advanceFA = function (G) {
    if (G.phase !== 'freeagency') return;
    var F = G.fa, me = G.user.ab, last = F.day >= F.days, fas = faList(G).filter(function (p) { return p.ovr >= 52; }).slice(0, 260);
    var offers = {};
    for (var pid in F.mine) if (G.players[pid] && G.players[pid].tm === 'FA') offers[pid] = [F.mine[pid]];
    // AI bidding by need and cap room (reserve room for rookies)
    G.order.forEach(function (ab) {
      if (ab === me) return;
      var room = E.capSpace(G, ab) - 9000, n = teamPlayers(G, ab).length, made = 0, dir = E.direction(G, ab);
      if (room < 1500 || n >= 86) return;
      var cands = fas.map(function (p) {
        var nd = needAt(G, ab, p.pos), gain = p.ovr - nd.weakest + (nd.count < (ROSTER_MIN[p.pos] || 1) ? 6 : 0);
        if (dir === 'rebuild' && p.age >= 30) gain -= 6; if (dir === 'contend' && p.age >= 27) gain += 2;
        return { p: p, g: gain + gauss() * 2.5 };
      }).filter(function (c) { return c.g > 1; }).sort(function (a, b) { return b.g - a.g; });
      for (var i = 0; i < cands.length && made < 3; i++) {
        var p = cands[i].p, a = E.askFor(G, p, ab), sal = Math.round(a.sal * rf(.9, 1.12) * (1 + Math.min(.1, cands[i].g / 100)) / 50) * 50;
        if (sal > room) continue;
        (offers[p.id] = offers[p.id] || []).push({ ab: ab, sal: sal, yrs: a.yrs }); room -= sal; made++;
      }
    });
    F.offers = offers; F.results = [];
    // decisions
    Object.keys(offers).forEach(function (pid) {
      var p = G.players[pid]; if (!p || p.tm !== 'FA') return;
      var best = null, bu = -1;
      offers[pid].forEach(function (of) { var r = faUtility(G, p, of); if (r.u > bu) { bu = r.u; best = of; best._m = r.money; } });
      var prob = last ? 1 : best._m >= 1 ? .35 + .15 * F.day : .1 * F.day;
      if (offers[pid].length >= 3) prob += .15;
      var mine = F.mine[pid];
      if (rnd() < prob && E.capSpace(G, best.ab) >= best.sal && teamPlayers(G, best.ab).length < E.rosterLimit(G)) {
        sign(G, p, best.ab, best.sal, best.yrs);
        if (mine) { F.results.push({ id: pid, ok: best.ab === me, to: best.ab, sal: best.sal, yrs: best.yrs, n: offers[pid].length }); delete F.mine[pid]; }
      } else if (mine) F.results.push({ id: pid, wait: 1, n: offers[pid].length });
    });
    if (last) { F.mine = {}; addNews(G, 'Free agency winds down. Remaining free agents can still be signed at any time.'); G.fa.done = 1; E.startDraft(G); return; }
    F.day++;
  };
  E.migrateTrades = function (G) {
    ensurePicks(G);
    if (!G.user.offers) G.user.offers = [];
    if (G.phase === 'freeagency' && !G.fa) G.fa = { day: 1, days: FA_DAYS, offers: {}, mine: {}, results: [] };
  };

  // =====================================================================
  // TRAINING CAMP · PRESEASON · CUTDOWN · DAY-BY-DAY PRACTICE
  // =====================================================================
  var DAY_T = {
    pad: { n: 'Padded', ic: '🛡️', g: 1, load: 1, inj: 1, mor: 1, d: 'Full pads and live contact: the most growth, the most fatigue and injury risk.' },
    np: { n: 'Non-padded', ic: '👕', g: .75, load: .55, inj: .45, mor: .6, d: 'Helmets and shells: solid reps with a lighter load.' },
    walk: { n: 'Walkthrough', ic: '🚶', g: .3, load: .15, inj: .1, mor: 0, d: 'Mental reps and installs: almost no load. Good the day before a game.' },
    off: { n: 'Rest', ic: '😴', g: 0, load: 0, inj: 0, mor: 0, d: 'Day off: fatigue drops by half and morale ticks up.' },
    game: { n: 'Preseason game', ic: '🏈' }, cut: { n: 'Cutdown day', ic: '✂️' }
  };
  E.DAY_T = DAY_T;
  // One padded day = 1/3.05 of a weekly session, so the standard in-season week
  // (padded, padded, non-padded, walkthrough) equals exactly one week of the weekly planner.
  var DAY_UNIT = 1 / 3.05, FAT_KEEP = .75, FAT_REST = .5, FAT_C = 3.3;
  var CAMP_OFFSEASON_WEEKS = 4; // camp now supplies the rest of the offseason development (was 10 weeks)
  var PS_DAYS = [14, 21, 28], CUT_DAY = 31, CAMP_MAX = 90;
  E.PS_DAYS = PS_DAYS; E.CUT_DAY = CUT_DAY; E.DAY_UNIT = DAY_UNIT;
  var CAMP_TARGET = { QB: 4, RB: 5, WR: 10, TE: 5, OT: 7, G: 7, C: 3, EDGE: 8, DT: 7, LB: 8, CB: 10, S: 7, K: 2, P: 1, LS: 1 };
  var CAMP_MAXPOS = { K: 2, P: 2, LS: 1, QB: 4 };
  var WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function dailyOpts(T, label, camp) { return { g: DAY_UNIT * T.g, lf: DAY_UNIT * FAT_C * T.load, keep: FAT_KEEP, ik: DAY_UNIT * T.inj, mf: DAY_UNIT * T.mor, label: label, noHist: 1, camp: camp, hrsF: DAY_UNIT * T.g }; }
  E.dayHours = function (plan, t) { var T = DAY_T[t]; if (!T || !T.g) return 0; return Math.round(E.planHours(plan) * DAY_UNIT * T.g * 10) / 10; };
  // Camp opens on the Saturday two weeks before the first preseason game; cutdown is the Tuesday 16 days before the opener (Thursday after Labor Day)
  function campOpen(yr) { var d = new Date(Date.UTC(yr, 8, 1)); while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() + 1); d.setUTCDate(d.getUTCDate() + 3 - 16 - CUT_DAY); return d; }
  function campDate(G, i) { var d = campOpen(G.season); d.setUTCDate(d.getUTCDate() + i); return d; }
  E.campDate = campDate;
  E.dateLabel = function (d, long) { return WD[d.getUTCDay()] + ' ' + MO[d.getUTCMonth()] + ' ' + d.getUTCDate() + (long ? ', ' + d.getUTCFullYear() : ''); };
  E.openerDate = function (G) { var d = campOpen(G.season); d.setUTCDate(d.getUTCDate() + CUT_DAY + 16); return d; };
  function defaultType(i) {
    if (PS_DAYS.indexOf(i) >= 0) return 'game';
    if (i === CUT_DAY) return 'cut';
    if (i <= 1 || i === 30) return 'np';
    if (i === 5 || i === 10 || i === 15 || i === 22 || i === 29) return 'off';
    if (PS_DAYS.indexOf(i + 1) >= 0) return 'walk';
    return 'pad';
  }
  E.defaultDayType = defaultType;
  // rough stadium coordinates for plausible (regional) preseason matchups
  var GEO = { ARI: [33.5, -112.3], ATL: [33.8, -84.4], BAL: [39.3, -76.6], BUF: [42.8, -78.8], CAR: [35.2, -80.9], CHI: [41.9, -87.6], CIN: [39.1, -84.5], CLE: [41.5, -81.7], DAL: [32.7, -97.1], DEN: [39.7, -105.0], DET: [42.3, -83.0], GB: [44.5, -88.1], HOU: [29.7, -95.4], IND: [39.8, -86.2], JAX: [30.3, -81.6], KC: [39.0, -94.5], LV: [36.1, -115.2], LAC: [33.9, -118.3], LAR: [33.95, -118.35], MIA: [25.9, -80.2], MIN: [44.97, -93.26], NE: [42.1, -71.3], NO: [29.95, -90.08], NYG: [40.81, -74.07], NYJ: [40.82, -74.08], PHI: [39.9, -75.2], PIT: [40.4, -80.0], SF: [37.4, -122.0], SEA: [47.6, -122.3], TB: [27.98, -82.5], TEN: [36.17, -86.77], WSH: [38.9, -76.86] };
  function geoD(a, b) { var A = GEO[a] || [38, -90], B = GEO[b] || [38, -90]; var dx = (A[1] - B[1]) * Math.cos((A[0] + B[0]) / 2 * Math.PI / 180), dy = A[0] - B[0]; return Math.sqrt(dx * dx + dy * dy); }
  function preseasonSchedule(G) {
    var met = {}, home = {}, weeks = [];
    G.order.forEach(function (ab) { home[ab] = 0; });
    for (var w = 0; w < 3; w++) {
      var games = null, best = null;
      for (var att = 0; att < 40 && !games; att++) {
        var pairs = [];
        G.order.forEach(function (a, i) { G.order.forEach(function (b, j) { if (j <= i) return; if (G.teams[a].div === G.teams[b].div || met[a + b] || met[b + a]) return; pairs.push([a, b, geoD(a, b) * rf(.6, 1.5) + (G.teams[a].conf === G.teams[b].conf ? 2 : 0) + rf(0, 4 + att)]); }); });
        pairs.sort(function (x, y) { return x[2] - y[2]; });
        var used = {}, gl = [];
        pairs.forEach(function (pr) { if (used[pr[0]] || used[pr[1]]) return; used[pr[0]] = used[pr[1]] = 1; gl.push([pr[0], pr[1]]); });
        if (gl.length * 2 === G.order.length) games = gl; else if (!best || gl.length > best.length) best = gl;
      }
      if (!games) {
        games = best; var used2 = {}; games.forEach(function (g) { used2[g[0]] = used2[g[1]] = 1; });
        var left = G.order.filter(function (ab) { return !used2[ab]; });
        for (var k = 0; k + 1 < left.length; k += 2) games.push([left[k], left[k + 1]]);
      }
      weeks.push(games.map(function (g) {
        met[g[0] + g[1]] = 1;
        var h = home[g[0]] < home[g[1]] ? g[0] : home[g[1]] < home[g[0]] ? g[1] : (rnd() < .5 ? g[0] : g[1]), a = h === g[0] ? g[1] : g[0];
        home[h]++;
        return { h: h, a: a, hs: null, as: null };
      }));
    }
    return weeks;
  }
  E.preseasonSchedule = preseasonSchedule;
  function campMinSal(p) { return p.exp <= 0 ? 900 : p.exp <= 2 ? 1000 : 1150; }
  function genBody(G, pos) {
    G.campSeq = (G.campSeq || 0) + 1;
    var ovr = Math.round(clamp(53 + gauss() * 4.5, 42, 66)), age = ri(22, 25), id = 'c' + G.season + '_' + G.campSeq;
    var p = { id: id, fn: pick(FN), ln: pick(LN), pos: pos, tm: 'FA', age: age, exp: age <= 22 ? 0 : ri(0, 2), num: '', sal: 0, yrs: 0, draft: 'Undrafted', col: pick(COL), ht: ({ QB: 75, RB: 70, WR: 73, TE: 77, OT: 78, G: 76, C: 75, EDGE: 76, DT: 75, LB: 74, CB: 72, S: 72, K: 72, P: 74, LS: 74 })[pos] + ri(-2, 2), wt: (BASE_WT[pos] || 230) + ri(-12, 12), real: 0, mor: ri(62, 78), inj: 0, st: {}, prog: 0, cb: 1, sc: 3 };
    p.a = genAttrs(pos, ovr); p.ovr = calcOvr(p);
    p.pot = Math.max(p.ovr, Math.round(clamp(p.ovr + (age <= 23 ? ri(1, 15) : ri(0, 7)), 40, 88)));
    G.players[id] = p; ensureP(G, p);
    return p;
  }
  E.genBody = genBody;
  function campInit(p) { p.cmp = { f: Math.round(gauss() * 15) / 10, ps: 0, pn: 0, g: [] }; p.pst = {}; }
  function fillCamps(G) {
    var pool = {}, n = {}, cnt = {}, signed = {};
    for (var id in G.players) { var q = G.players[id]; if (q.tm === 'FA' && (q.ovr < 66 || q.age <= 24) && q.ovr >= 45 && q.age <= 31) (pool[q.pos] = pool[q.pos] || []).push(q); }
    for (var pos in pool) pool[pos].sort(function (a, b) { return (b.pot * .55 + b.ovr * .45 - (b.age > 26 ? 4 : 0)) - (a.pot * .55 + a.ovr * .45 - (a.age > 26 ? 4 : 0)); });
    G.order.forEach(function (ab) { cnt[ab] = {}; var ps = teamPlayers(G, ab); n[ab] = ps.length; ps.forEach(function (p) { cnt[ab][p.pos] = (cnt[ab][p.pos] || 0) + 1; }); signed[ab] = 0; });
    var guard = 0, any = true;
    while (any && guard++ < 120) {
      any = false;
      var ord = G.order.slice().sort(function () { return rnd() - .5; });
      ord.forEach(function (ab) {
        if (n[ab] >= CAMP_MAX) return; any = true;
        var c = cnt[ab], best = null, bv = 1e9;
        for (var ps in CAMP_TARGET) { if ((c[ps] || 0) >= (CAMP_MAXPOS[ps] || 99)) continue; var v = (c[ps] || 0) / CAMP_TARGET[ps]; if (v < bv) { bv = v; best = ps; } }
        if (!best) best = pick(['WR', 'CB', 'LB', 'EDGE', 'OT', 'G', 'DT', 'S']);
        var f = (pool[best] || []).shift();
        if (!f || f.tm !== 'FA') f = genBody(G, best);
        f.tm = ab; f.sal = campMinSal(f); f.yrs = 1; f.fresh = 0; f.lastTm = undefined; f.mor = clamp(f.mor + 6, 0, 100);
        c[best] = (c[best] || 0) + 1; n[ab]++; signed[ab]++;
      });
    }
    return signed;
  }
  E.startCamp = function (G) {
    var me = G.user.ab;
    G.phase = 'camp'; G.week = 1;
    var days = []; for (var i = 0; i <= CUT_DAY; i++) days.push({ t: defaultType(i), done: 0 });
    G.camp = { season: G.season, day: 0, days: days, ps: preseasonSchedule(G), sq: 1, cuts: [], last: null, agg: null, res: [], open: E.dateLabel(campDate(G, 0), true) };
    var vets = 0; G.order.forEach(function (ab) { var nb = teamPlayers(G, ab).length; aiFillMin(G, ab); if (ab === me) vets = teamPlayers(G, ab).length - nb; });
    if (vets > 0) addNews(G, 'Front office signed ' + vets + ' veteran free agents to cover thin spots before camp. Review them in Roster / Free Agency.');
    G.order.forEach(function (ab) { G.teams[ab].sharp = 0; });
    var signed = fillCamps(G);
    for (var id in G.players) { var p = G.players[id]; if (p.tm !== 'FA' && p.tm !== 'DRAFT') { ensureP(G, p); campInit(p); } }
    G.order.forEach(function (ab) { autoDepth(G, ab); });
    G.user.pendingEvent = null; G.user.pressPending = null; G.user.prac = null; G.user.wk = null;
    var mine = G.camp.ps.map(function (wk) { var g = wk.filter(function (x) { return x.h === me || x.a === me; })[0]; return g ? (g.h === me ? 'vs ' : '@ ') + g[g.h === me ? 'a' : 'h'] : '—'; });
    addNews(G, 'Training camp opens ' + G.camp.open + '. ' + signed[me] + ' camp invitees and undrafted free agents join the ' + G.teams[me].name + ' (' + teamPlayers(G, me).length + '-man camp roster). Preseason: ' + mine.join(', ') + '. Cutdown to 53: ' + E.dateLabel(campDate(G, CUT_DAY)) + '.', 'big');
    return G.camp;
  };
  function campScore(p, d, h) {
    if (!p.cmp) campInit(p);
    var s = p.cmp.f + ((p.eth == null ? 70 : p.eth) - 70) * .045 + ((p.coa == null ? 70 : p.coa) - 70) * .015 + gauss() * 2.2 - Math.max(0, (p.fat || 0) - 45) * .06 + (h > 0 ? 0 : -.5);
    p.cmp.ps += s; p.cmp.pn++;
  }
  function campBonus(p) {
    var c = p.cmp; if (!c) return 0;
    var pr = c.pn ? clamp(c.ps / c.pn, -4, 4) : 0, gg = c.g.length ? clamp(avg(c.g.map(function (x) { return (x.g - 62) / 7; })), -4, 4) : 0;
    return Math.round((pr * .6 + gg * .8) * 10) / 10;
  }
  E.campBonus = campBonus;
  E.campGrade = function (p) { var b = campBonus(p); if (!p.cmp || (!p.cmp.pn && !p.cmp.g.length)) return '—'; return b >= 2.5 ? 'A' : b >= 1.4 ? 'A-' : b >= .6 ? 'B+' : b >= 0 ? 'B' : b >= -.7 ? 'C+' : b >= -1.5 ? 'C' : 'D'; };
  E.battleScore = function (p) { return wovr(p) + campBonus(p) * .8; };
  // Position battles: the last starting spot(s) where the next man is within 3 points
  E.battles = function (G, ab) {
    var out = [];
    POS_ORDER.forEach(function (pos) {
      var n = LINEUP[pos]; if (!n) return;
      var ps = teamPlayers(G, ab).filter(function (p) { return p.pos === pos && !p.inj; }).sort(function (a, b) { return E.battleScore(b) - E.battleScore(a); });
      if (ps.length <= n) return;
      var inn = ps[n - 1], out1 = ps[n];
      if (E.battleScore(inn) - E.battleScore(out1) <= 3) {
        var depth = G.teams[ab].depth[pos] || [];
        out.push({ pos: pos, spot: pos + (n > 1 ? n : '1'), lead: inn.id, chase: out1.id, gap: Math.round((E.battleScore(inn) - E.battleScore(out1)) * 10) / 10, onDepth: depth.indexOf(inn.id) < n, others: ps.slice(n + 1, n + 3).filter(function (p) { return E.battleScore(inn) - E.battleScore(p) <= 3; }).map(function (p) { return p.id; }) });
      }
    });
    return out;
  };
  E.campDepth = function (G, ab) {
    var t = G.teams[ab];
    POS_ORDER.forEach(function (pos) { t.depth[pos] = teamPlayers(G, ab).filter(function (p) { return p.pos === pos; }).sort(function (a, b) { return E.battleScore(b) - E.battleScore(a); }).map(function (p) { return p.id; }); });
  };
  E.campGame = function (G) {
    var C = G.camp; if (!C || G.phase !== 'camp') return null;
    var k = PS_DAYS.indexOf(C.day); if (k < 0) return null;
    var wk = C.ps[k] || []; for (var i = 0; i < wk.length; i++) if (wk[i].h === G.user.ab || wk[i].a === G.user.ab) return wk[i];
    return null;
  };
  E.campWeek = function (G) { return G.camp ? PS_DAYS.indexOf(G.camp.day) : -1; };
  function aiSq(k) { return k === 0 ? (rnd() < .45 ? 0 : 1) : k === 1 ? (rnd() < .35 ? 1 : 2) : (rnd() < .7 ? 0 : 1); }
  // options for the user's current game (used by the UI for both live and quick-sim games)
  E.gameOpts = function (G, g) {
    if (G.phase === 'camp') { var sq = {}, me = G.user.ab, k = E.campWeek(G); sq[g.h] = g.h === me ? G.camp.sq : aiSq(k); sq[g.a] = g.a === me ? G.camp.sq : aiSq(k); return { pre: true, sq: sq }; }
    return { playoff: G.phase === 'playoffs', neutral: g.neutral };
  };
  function statLine(p, s) {
    var o = [];
    if (s.pa) o.push(s.pc + '/' + s.pa + ', ' + (s.py || 0) + ' yds' + (s.ptd ? ', ' + s.ptd + ' TD' : '') + (s.int ? ', ' + s.int + ' INT' : ''));
    if (s.ra) o.push(s.ra + ' car, ' + (s.ry || 0) + ' yds' + (s.rtd ? ', ' + s.rtd + ' TD' : ''));
    if (s.rec) o.push(s.rec + ' rec, ' + (s.recy || 0) + ' yds' + (s.rectd ? ', ' + s.rectd + ' TD' : ''));
    if (s.tkl || s.sck || s.dint || s.pd) o.push((s.tkl || 0) + ' tkl' + (s.sck ? ', ' + s.sck + ' sk' : '') + (s.dint ? ', ' + s.dint + ' INT' : '') + (s.pd ? ', ' + s.pd + ' PD' : ''));
    if (s.fga) o.push(s.fgm + '/' + s.fga + ' FG');
    return o.join(' · ');
  }
  E.statLine = statLine;
  function preGrades(G, gs, game) {
    var k = E.campWeek(G); if (k < 0) k = (game && game.k) || 0;
    var T = {}; [gs.home, gs.away].forEach(function (ab) { var t = gs.tst[ab], o = other(gs, ab), td = gs.tst[o]; T[ab] = { ypp: t.yds / Math.max(1, t.plays), dypp: td.yds / Math.max(1, td.plays), to: t.to, tk: td.to, pts: gs.sc[ab], opp: gs.sc[o] }; });
    [gs.home, gs.away].forEach(function (ab) { G.teams[ab].sharp = (G.teams[ab].sharp || 0) + (gs.sq[ab] == null ? 1 : gs.sq[ab]); });
    var tops = [];
    for (var pid in gs.played) {
      var p = G.players[pid]; if (!p) continue;
      var s = gs.pg[pid] || {}, t = T[p.tm] || { ypp: 5, dypp: 5, to: 0, tk: 0 }, pts;
      if (OFF[p.pos] && (p.pos === 'OT' || p.pos === 'G' || p.pos === 'C')) pts = (t.ypp - 5.2) * 2.6 - t.to * .8;
      else if (DEF[p.pos] && !(s.tkl || s.sck || s.dint || s.pd)) pts = (5.2 - t.dypp) * 1.8 + t.tk * .6;
      else pts = (s.py || 0) * .04 + (s.ptd || 0) * 4 - (s.int || 0) * 4.5 + (s.pa ? ((s.pc || 0) / s.pa - .62) * 12 : 0) + (s.ry || 0) * .1 + (s.rtd || 0) * 5 - (s.ra ? Math.max(0, 3.6 - (s.ry || 0) / s.ra) * 1.2 : 0) + (s.recy || 0) * .1 + (s.rectd || 0) * 5 + (s.rec || 0) * .5 + (s.tkl || 0) * 1.1 + (s.sck || 0) * 4 + (s.dint || 0) * 6 + (s.pd || 0) * 2 + (s.ff || 0) * 3 + (s.fgm || 0) * 2 - ((s.fga || 0) - (s.fgm || 0)) * 3.5 - (s.pen || 0) * 2.5;
      var g = Math.round(clamp(62 + pts * 1.5 + (p.ovr - 62) * .25 + gauss() * 4, 30, 99));
      if (!p.cmp) campInit(p);
      p.cmp.g.push({ k: k, g: g, s: statLine(p, s), vs: other(gs, p.tm) });
      tops.push({ id: pid, g: g });
    }
    gs.grades = tops;
  }
  function campRecord(G, gs) {
    var g = E.campGame(G); if (!g || g.hs !== null) return;
    var me = G.user.ab, k = E.campWeek(G), opp = other(gs, me);
    E.finalizeGame(G, gs, g);
    var won = gs.sc[me] > gs.sc[opp], lost = gs.sc[me] < gs.sc[opp];
    G.user.lastResult = null; G.user.pressPending = null;
    // morale: playing time and performance (personality flavours it)
    var starters = {}, L0 = lineup(G, me, 0); for (var pos in L0) L0[pos].forEach(function (p) { starters[p.id] = 1; });
    var mine = (gs.grades || []).filter(function (x) { return G.players[x.id] && G.players[x.id].tm === me; }), notes = [];
    mine.forEach(function (x) {
      var p = G.players[x.id], d = 0;
      if (x.g >= 78) d += 2.5; else if (x.g <= 45) d -= 1.5 * (p.pers === 'HOT' || p.pers === 'DIVA' ? 1.5 : 1);
      if (!starters[p.id] && p.age <= 24) d += 1;
      if (starters[p.id] && G.camp.sq >= 3 && p.age >= 29 && p.pers !== 'COMP') d -= 1.5;
      p.mor = clamp(p.mor + d, 0, 100);
    });
    if (G.camp.sq === 0) teamPlayers(G, me).forEach(function (p) { if (starters[p.id] && p.pers === 'COMP') p.mor = clamp(p.mor - .8, 0, 100); });
    mine.sort(function (a, b) { return b.g - a.g; });
    var inj = gs.injuries.filter(function (id) { return G.players[id] && G.players[id].tm === me; });
    G.camp.res[k] = { k: k, opp: opp, home: g.h === me, us: gs.sc[me], them: gs.sc[opp], sq: G.camp.sq, top: mine.slice(0, 6), low: mine.slice(-3).reverse(), inj: inj, tst: gs.tst[me] };
    addNews(G, 'PRESEASON ' + (k + 1) + ': ' + G.teams[me].name + ' ' + gs.sc[me] + ', ' + G.teams[opp].name + ' ' + gs.sc[opp] + '. ' + (mine[0] ? 'Standout: ' + G.players[mine[0].id].pos + ' ' + G.players[mine[0].id].ln + ' (grade ' + mine[0].g + ').' : ''), won ? 'win' : lost ? 'loss' : '');
    // the rest of the league's preseason games
    (G.camp.ps[k] || []).forEach(function (x) { if (x === g || x.hs !== null) return; var sq = {}; sq[x.h] = aiSq(k); sq[x.a] = aiSq(k); var s2 = E.quickSim(G, x.h, x.a, false, false, { pre: true, sq: sq }); E.finalizeGame(G, s2, x); });
    G.order.forEach(function (ab) { if (ab !== me) E.campDepth(G, ab); });
    G.camp.days[G.camp.day].done = 1;
    campAdvanceDay(G);
    return G.camp.res[k];
  }
  function campAdvanceDay(G) {
    var C = G.camp, me = G.user.ab; C.day++;
    if (C.day % 7 === 0) for (var id in G.players) { var p = G.players[id]; if (p.inj > 0 && p.tm !== 'FA') p.inj--; }
    if (C.day % 7 === 0 || C.day === CUT_DAY) teamPlayers(G, me).forEach(function (p) { if (!p.dh) p.dh = []; p.dh.push(Math.round(wovr(p) * 10) / 10); if (p.dh.length > 24) p.dh.shift(); });
  }
  var _aiPlans = { key: '', p: {} };
  function aiPlanCached(G, ab, key) { if (_aiPlans.key !== key) _aiPlans = { key: key, p: {} }; return _aiPlans.p[ab] || (_aiPlans.p[ab] = autoPlan(G, ab)); }
  function dayPlan(G, d) { if (!d.plan) return G.user.plan; fixPlan(G, d.plan); var o = {}; for (var k in d.plan) o[k] = d.plan[k]; o.fp = G.user.plan.fp; return o; }
  function aggRep(acc, rep, label) {
    if (!acc) acc = { season: rep.season, label: label, groups: {}, inj: [], hrs: 0, days: 0 };
    acc.label = label; acc.hrs = Math.round((acc.hrs + rep.hrs) * 10) / 10; acc.days++;
    rep.inj.forEach(function (x) { acc.inj.push(x); });
    for (var gk in rep.groups) {
      var arr = acc.groups[gk] || (acc.groups[gk] = []), idx = {};
      arr.forEach(function (r, i) { idx[r.id] = i; });
      rep.groups[gk].forEach(function (r) {
        var a = idx[r.id] != null ? arr[idx[r.id]] : null;
        if (!a) { a = { id: r.id, d: 0, atm: {}, fat: 0, inj: 0, f: 0 }; arr.push(a); }
        if (!a.atm) { a.atm = {}; (a.at || []).forEach(function (x) { a.atm[x[0]] = x[1]; }); }
        a.d = Math.round((a.d + r.d) * 1000) / 1000; a.fat = r.fat; a.inj = a.inj || r.inj; a.f = r.f;
        r.at.forEach(function (x) { a.atm[x[0]] = (a.atm[x[0]] || 0) + x[1]; });
      });
      arr.forEach(function (a) { var at = []; for (var k in a.atm) at.push([k, Math.round(a.atm[k] * 100) / 100]); at.sort(function (x, y) { return Math.abs(y[1]) - Math.abs(x[1]); }); a.at = at.slice(0, 3); });
      arr.sort(function (a, b) { return b.d - a.d; });
    }
    return acc;
  }
  function restDay(G, ab, isUser, label) {
    var rep = isUser ? { season: G.season, label: label, groups: {}, inj: [], hrs: 0, off: 1 } : null;
    teamPlayers(G, ab).forEach(function (p) { p.fat = (p.fat || 0) * FAT_REST; p.mor = clamp(p.mor + .3, 0, 100); });
    return rep;
  }
  function slimRep(rep) { if (!rep) return rep; for (var gk in rep.groups) rep.groups[gk].forEach(function (a) { delete a.atm; }); return rep; }
  // one camp day for the whole league
  E.campSimDay = function (G, auto) {
    var C = G.camp; if (!C || G.phase !== 'camp') return { stop: 'none' };
    var i = C.day, d = C.days[i]; if (!d) return { stop: 'none' };
    if (d.t === 'cut') return { stop: 'cut' };
    if (d.t === 'game') {
      if (!auto) return { stop: 'game' };
      var g = E.campGame(G);
      if (g) { var gs = E.quickSim(G, g.h, g.a, false, false, E.gameOpts(G, g)); return { game: campRecord(G, gs) }; }
      // bye in the preseason (odd case): just sim the league games
      (C.ps[PS_DAYS.indexOf(i)] || []).forEach(function (x) { if (x.hs !== null) return; var s2 = E.quickSim(G, x.h, x.a, false, false, { pre: true, sq: {} }); E.finalizeGame(G, s2, x); });
      d.done = 1; campAdvanceDay(G); return {};
    }
    var me = G.user.ab, label = 'Camp Day ' + (i + 1) + ' · ' + E.dateLabel(campDate(G, i)) + ' · ' + DAY_T[d.t].n, key = G.season + ':' + Math.floor(i / 7), rep = null;
    G.order.forEach(function (ab) {
      var u = ab === me, t = u ? d.t : defaultType(i);
      if (t === 'game' || t === 'cut') t = 'walk';
      var r;
      if (t === 'off') r = restDay(G, ab, u, label);
      else r = runPractice(G, ab, u ? dayPlan(G, d) : aiPlanCached(G, ab, key), u ? G.user.dev : 50, u, dailyOpts(DAY_T[t], label, 1));
      if (u) rep = r;
    });
    rep.type = d.t; rep.day = i;
    C.last = rep; C.agg = aggRep(C.agg, rep, 'Training camp to date (' + (i + 1) + ' days)');
    G.user.prac = C.agg;
    var all = []; for (var k in C.agg.groups) C.agg.groups[k].forEach(function (r) { if (k !== 'ST') all.push({ id: r.id, d: r.d }); });
    all.sort(function (a, b) { return b.d - a.d; }); G.user.lastReport = all.slice(0, 8);
    if (rep.inj.length) addNews(G, 'Camp injur' + (rep.inj.length > 1 ? 'ies' : 'y') + ' (' + E.dateLabel(campDate(G, i)) + '): ' + rep.inj.map(function (x) { var p = G.players[x.id]; return p.pos + ' ' + p.ln + ' (' + x.w + ' wk)'; }).join(', ') + '.', 'loss');
    d.done = 1; campAdvanceDay(G);
    slimRep(C.agg);
    return { rep: rep };
  };
  // Sim forward: n days, stopping at the next preseason game or cutdown so the coach can decide
  E.campSim = function (G, n, toGame) {
    var c = 0, r = {};
    while (c < (n || 99) && G.phase === 'camp') {
      var d = G.camp.days[G.camp.day]; if (!d || d.t === 'cut' || d.t === 'game') { r.stop = d ? d.t : 'none'; break; }
      E.campSimDay(G); c++;
      if (toGame) { var d2 = G.camp.days[G.camp.day]; if (d2 && (d2.t === 'game' || d2.t === 'cut')) { r.stop = d2.t; break; } }
    }
    r.days = c; return r;
  };
  E.setDayType = function (G, i, t) {
    var C = G.camp; if (!C || !C.days[i] || C.days[i].done || i < C.day) return 'That day is already done.';
    if (C.days[i].t === 'game' || C.days[i].t === 'cut') return 'Preseason games and cutdown day are fixed.';
    if (!DAY_T[t] || t === 'game' || t === 'cut') return 'Unknown session.';
    C.days[i].t = t; return '';
  };
  // ---------- cutdown ----------
  E.cutScore = function (G, p) {
    return wovr(p) + campBonus(p) * .9 + (p.age <= 24 ? Math.max(0, p.pot - p.ovr) * .28 : p.age >= 31 ? -1.5 : 0) - (p.inj >= 4 ? 2.5 : 0) + (p.sal >= 4000 ? 3 : p.sal >= 2000 ? 1.5 : 0) + (p.rookie && /R[1-3] /.test(p.draft || '') ? 4 : 0);
  };
  E.staffCuts = function (G, ab, n) {
    n = n || 53;
    var ps = teamPlayers(G, ab); if (ps.length <= n) return [];
    var sc = {}; ps.forEach(function (p) { sc[p.id] = E.cutScore(G, p); });
    ps.sort(function (a, b) { return sc[b.id] - sc[a.id]; });
    var cnt = {}, keep = {}, kept = 0, cut = [];
    ps.forEach(function (p) { if ((cnt[p.pos] || 0) < (ROSTER_MIN[p.pos] || 0)) { keep[p.id] = 1; kept++; cnt[p.pos] = (cnt[p.pos] || 0) + 1; } });
    ps.forEach(function (p) { if (keep[p.id]) return; var c = cnt[p.pos] || 0, cap = { K: 1, P: 1, LS: 1, QB: 3 }[p.pos]; if (kept < n && !(cap && c >= cap)) { keep[p.id] = 1; kept++; cnt[p.pos] = c + 1; } else cut.push(p.id); });
    return cut;
  };
  E.cutDead = function (G, p) { return (p.sal || 0) > 1500 ? E.deadCap(p) : 0; };
  function cutPlayer(G, p, ab) {
    var dc = E.cutDead(G, p);
    G.teams[ab].dead = (G.teams[ab].dead || 0) + dc;
    p.tm = 'FA'; p.sal = 0; p.yrs = 0; p.block = 0; p.tradeReq = 0; p.lastTm = ab; p.mor = clamp(p.mor - 10, 0, 100);
    return dc;
  }
  E.cutdownCheck = function (G, ids) {
    var me = G.user.ab, set = {}; (ids || []).forEach(function (id) { set[id] = 1; });
    var keep = teamPlayers(G, me).filter(function (p) { return !set[p.id]; }), cnt = {};
    keep.forEach(function (p) { cnt[p.pos] = (cnt[p.pos] || 0) + 1; });
    var short = []; for (var pos in ROSTER_MIN) if ((cnt[pos] || 0) < ROSTER_MIN[pos]) short.push(pos + ' ' + (cnt[pos] || 0) + '/' + ROSTER_MIN[pos]);
    var dead = 0; (ids || []).forEach(function (id) { var p = G.players[id]; if (p) dead += E.cutDead(G, p); });
    return { keep: keep.length, over: Math.max(0, keep.length - 53), short: short, dead: dead, cnt: cnt };
  };
  E.cutdown = function (G, ids) {
    if (G.phase !== 'camp' || !G.camp || G.camp.days[G.camp.day].t !== 'cut') return { ok: false, msg: 'Cutdown day has not arrived yet.' };
    var me = G.user.ab; ids = (ids || []).filter(function (id) { return G.players[id] && G.players[id].tm === me; });
    var chk = E.cutdownCheck(G, ids);
    if (chk.over > 0) return { ok: false, msg: 'You still need to cut ' + chk.over + ' more player' + (chk.over > 1 ? 's' : '') + ' to get to 53.' };
    var mine = ids.map(function (id) { return G.players[id]; }), dead = 0, allCuts = [];
    mine.forEach(function (p) { dead += cutPlayer(G, p, me); allCuts.push(p); });
    G.phase = 'regular'; // from here the full 53-man cap and roster rules apply
    G.order.forEach(function (ab) {
      if (ab === me) return;
      E.staffCuts(G, ab, 53).forEach(function (id) { var p = G.players[id]; cutPlayer(G, p, ab); allCuts.push(p); });
      var c = 0; while (E.capUsed(G, ab) > G.cap && c++ < 10) { var x = teamPlayers(G, ab).filter(function (p) { return p.sal > 2500; }).sort(function (a, b) { return (a.ovr / a.sal) - (b.ovr / b.sal); })[0]; if (!x) break; cutPlayer(G, x, ab); allCuts.push(x); }
    });
    // waiver claims: AI teams grab cuts who beat their worst player at the spot
    var claims = [];
    G.order.slice().sort(function () { return rnd() - .5; }).forEach(function (ab) {
      if (ab === me) return;
      for (var t = 0; t < 2; t++) {
        var best = null, gain = 2.5, drop = null;
        allCuts.forEach(function (p) {
          if (p.tm !== 'FA' || p.lastTm === ab || p.ovr < 62) return;
          var w = teamPlayers(G, ab).filter(function (q) { return q.pos === p.pos; }).sort(function (a, b) { return E.cutScore(G, a) - E.cutScore(G, b); })[0];
          if (!w) return; var gn = E.cutScore(G, p) - E.cutScore(G, w);
          if (gn > gain) { gain = gn; best = p; drop = w; }
        });
        if (!best) break;
        var sal = Math.max(900, Math.round(marketValue(best) * .55 / 50) * 50);
        if (E.capSpace(G, ab) < sal + 800) break;
        cutPlayer(G, drop, ab); allCuts.push(drop);
        best.tm = ab; best.sal = sal; best.yrs = 1; best.lastTm = undefined; claims.push(best.pos + ' ' + best.ln + ' (' + ab + ')');
      }
    });
    // keep the free-agent pool a sensible size: drop camp bodies and long shots
    var fas = faList(G).filter(function (p) { return !(p.lastTm === me && p.ovr >= 52); });
    fas.forEach(function (p, i) { if ((p.cb && p.ovr < 57) || p.ovr < 50 || i >= 420) delete G.players[p.id]; });
    G.order.forEach(function (ab) {
      if (ab === me) { syncDepth(G, ab); return; }
      aiFillMin(G, ab);
      // stay under the cap: swap an overpaid veteran for a minimum-salary player at his spot
      var c2 = 0;
      while (E.capUsed(G, ab) > G.cap && c2++ < 12) {
        var x = teamPlayers(G, ab).filter(function (p) { return p.sal > 1500; }).sort(function (a, b) { return (a.ovr / a.sal) - (b.ovr / b.sal); })[0]; if (!x) break;
        var pos = x.pos; cutPlayer(G, x, ab); allCuts.push(x);
        var rp = faList(G).filter(function (p) { return p.pos === pos; })[0]; if (rp) { rp.tm = ab; rp.sal = 900; rp.yrs = 1; rp.lastTm = undefined; }
      }
      E.campDepth(G, ab);
    });
    if (E.capUsed(G, me) > G.cap) addNews(G, 'Warning: you are ' + fmtM(E.capUsed(G, me) - G.cap) + ' over the salary cap after cutdown. Release or trade salary.', 'loss');
    var notable = allCuts.filter(function (p) { return G.players[p.id] && p.tm === 'FA'; }).sort(function (a, b) { return b.ovr - a.ovr; }).slice(0, 5);
    addNews(G, 'Cutdown day: ' + mine.length + ' players released, the ' + G.teams[me].name + ' are set at ' + teamPlayers(G, me).length + (dead ? ' (' + fmtM(dead) + ' dead cap)' : '') + '. Around the league: ' + allCuts.length + ' cuts. Notable: ' + notable.map(function (p) { return p.pos + ' ' + p.fn + ' ' + p.ln + ' (' + p.ovr + ', ex-' + p.lastTm + ')'; }).join(', ') + '.' + (claims.length ? ' Waiver claims: ' + claims.slice(0, 5).join(', ') + '.' : ''), 'big');
    E.finishCamp(G);
    return { ok: true, cut: mine.length, dead: dead, claims: claims.length, msg: 'Cutdown complete: ' + mine.length + ' released. Roster set at ' + teamPlayers(G, me).length + '.' };
  };
  E.finishCamp = function (G) {
    var C = G.camp, me = G.user.ab;
    G.phase = 'regular'; G.week = 1;
    G.campLast = { season: C.season, res: C.res, open: C.open };
    G.camp = null; _aiPlans = { key: '', p: {} };
    for (var id in G.players) { var p = G.players[id]; if (p.tm === 'FA' || p.tm === 'DRAFT') { delete p.cmp; delete p.pst; } else if (p.cmp) { p.cmp.ps = Math.round(p.cmp.ps * 10) / 10; } }
    G.user.prac = C.agg; G.user.wk = null;
    addNews(G, 'Week 1 is here: the ' + G.season + ' opener is ' + E.dateLabel(E.openerDate(G), true) + '.', 'big');
    E.newWeeklyEvent(G);
  };
  // Hands-off path (tests, and the "Sim camp" fast path): play every day, preseason games with the current playing-time choice, then the staff's cuts
  E.campAuto = function (G) {
    var g = 0;
    while (G.phase === 'camp' && g++ < 80) {
      var d = G.camp.days[G.camp.day];
      if (d.t === 'cut') { var r = E.cutdown(G, E.staffCuts(G, G.user.ab, 53)); if (!r.ok) break; }
      else E.campSimDay(G, true);
    }
    return G.phase;
  };
  // ---------- in-season day-by-day practice ----------
  var WK_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], WK_DEF = ['off', 'off', 'pad', 'pad', 'np', 'walk'];
  E.WK_NAMES = WK_NAMES; E.WK_DEF = WK_DEF;
  function ensureWk(G) { var w = G.user.wk; if (!w || w.s !== G.season || w.w !== G.week) { G.user.wk = w = { s: G.season, w: G.week, d: 0, t: WK_DEF.slice(), plans: {}, agg: null, last: null }; } return w; }
  E.weekDays = ensureWk;
  E.setWeekDayType = function (G, i, t) { var w = ensureWk(G); if (i < w.d) return 'That day is done.'; if (!DAY_T[t] || t === 'game' || t === 'cut') return 'Unknown session.'; w.t[i] = t; return ''; };
  E.simWeekDay = function (G) {
    if (G.phase !== 'regular' || !G.user.daily) return null;
    var w = ensureWk(G); if (w.d >= 6) return null;
    var me = G.user.ab, t = w.t[w.d], label = 'Week ' + G.week + ' · ' + WK_NAMES[w.d] + ' · ' + DAY_T[t].n, rep;
    if (t === 'off') rep = restDay(G, me, true, label);
    else rep = runPractice(G, me, w.plans[w.d] ? dayPlan(G, { plan: w.plans[w.d] }) : G.user.plan, G.user.dev, true, dailyOpts(DAY_T[t], label));
    rep.type = t; rep.day = w.d;
    w.last = rep; w.agg = aggRep(w.agg, rep, 'Week ' + G.week + ' practice (day by day)');
    slimRep(w.agg);
    G.user.prac = w.agg;
    if (rep.inj.length) addNews(G, 'Practice injur' + (rep.inj.length > 1 ? 'ies' : 'y') + ' (' + WK_NAMES[w.d] + '): ' + rep.inj.map(function (x) { var p = G.players[x.id]; return p.pos + ' ' + p.ln + ' (' + x.w + ' wk)'; }).join(', ') + '.', 'loss');
    w.d++;
    if (w.d >= 6) {
      teamPlayers(G, me).forEach(function (p) { if (!p.dh) p.dh = []; p.dh.push(Math.round(wovr(p) * 10) / 10); if (p.dh.length > 24) p.dh.shift(); });
      var all = []; for (var k in w.agg.groups) w.agg.groups[k].forEach(function (r) { if (k !== 'ST') all.push({ id: r.id, d: r.d }); });
      all.sort(function (a, b) { return b.d - a.d; }); G.user.lastReport = all.slice(0, 8);
      G.user.plan.fp = G.user.plan.fp.filter(function (id) { return G.players[id] && G.players[id].tm === me; });
    }
    return rep;
  };
  E.finishWeekDays = function (G) { if (G.phase !== 'regular' || !G.user.daily) return; var g = 0; while (ensureWk(G).d < 6 && g++ < 8) E.simWeekDay(G); };

  return E;
})();
if (typeof module !== 'undefined') module.exports = HC;
