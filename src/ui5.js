  // ---------- GAME DAY ----------
  var FW = 1440, FH = 640, PPY = 12; // canvas px per yard
  var fieldBg = null, raf = null, dots = null, ballS = null, anim = null, trail = [];
  function X(abs) { return (abs + 10) * PPY; }
  function Y(y) { return y * PPY; }
  function startGame() {
    var g = HC.userGame(G); if (!g || g.hs !== null) return;
    if (G.phase === 'regular' && G.user.daily) HC.finishWeekDays(G);
    S.gs = HC.newGame(G, g.h, g.a, HC.gameOpts(G, g));
    S.st0 = {};
    [g.h, g.a].forEach(function (ab) { HC.teamPlayers(G, ab).forEach(function (p) { S.st0[p.id] = JSON.parse(JSON.stringify(p.st || {})); }); });
    S.pbpSeen = 0; S.busy = false; S.gameTab = 'pbp'; S.lastCall = null;
    fieldBg = null; dots = null;
    go('game');
  }
  function vGame() {
    var gs = S.gs, H = G.teams[gs.home], A_ = G.teams[gs.away];
    var label = G.phase === 'playoffs' ? HC.roundName(G.playoffs.round) : G.phase === 'camp' ? 'Preseason Week ' + (HC.campWeek(G) + 1) + ' · starters: ' + ['sit', 'Q1', 'first half', 'three quarters', 'whole game'][G.camp.sq] : 'Week ' + G.week;
    return '<div class="gd"><div class="row" style="margin-bottom:10px"><span class="pill">🏈 ' + label + ' · ' + G.season + '</span><span class="pill">' + (gs.playoff && G.playoffs.round === 3 ? 'Neutral site' : esc(H.city)) + '</span><span class="sp"></span><span class="mut" style="font-size:12px">Animation</span><div class="chips">' + [[1, 'Normal'], [2, 'Fast'], [0, 'Off']].map(function (s) { return '<span class="chip' + (S.speed === s[0] ? ' on' : '') + '" data-act="speed" data-arg="' + s[0] + '">' + s[1] + '</span>'; }).join('') + '</div></div>' +
      '<div class="sbug" id="sbug"></div><div class="ddbar" id="ddbar"></div>' +
      '<div class="gdgrid"><div><div class="fieldwrap"><canvas id="field" width="' + FW + '" height="' + FH + '"></canvas><div class="flash" id="flash"></div><div id="finalOv"></div></div>' +
      '<div class="card"><div class="callres" id="callres"></div><div id="calls"></div><div class="row" style="margin-top:14px;flex-wrap:wrap"><button class="btn" data-act="gauto">🎧 Let coordinators call it</button><button class="btn" data-act="gdrive">⏩ Sim this drive</button><button class="btn" data-act="gend">⏭ Sim to end</button><span class="sp"></span><span class="mut" style="font-size:12px" id="hint"></span></div></div></div>' +
      '<div class="card"><div class="tabs">' + [['pbp', 'Play-by-Play'], ['box', 'Box Score'], ['drives', 'Drives']].map(function (t) { return '<a class="' + (S.gameTab === t[0] ? 'on' : '') + '" data-act="gtab" data-arg="' + t[0] + '">' + t[1] + '</a>'; }).join('') + '</div><div id="gside"></div></div></div></div>';
  }
  function mountGame() {
    var cv = $('#field'); S.ctx = cv.getContext('2d');
    buildFieldBg();
    setFormation(false);
    updateGame();
    loop();
  }
  function stopField() { if (raf) cancelAnimationFrame(raf); raf = null; }
  function buildFieldBg() {
    var gs = S.gs, c = document.createElement('canvas'); c.width = FW; c.height = FH; var x = c.getContext('2d');
    for (var i = 0; i < 20; i++) { x.fillStyle = i % 2 ? '#2a7a38' : '#2f8540'; x.fillRect(X(i * 5), 0, 5 * PPY + 1, FH); }
    var gr = x.createRadialGradient(FW / 2, FH / 2, 100, FW / 2, FH / 2, FW * .7); gr.addColorStop(0, 'rgba(255,255,255,.05)'); gr.addColorStop(1, 'rgba(0,0,0,.28)'); x.fillStyle = gr; x.fillRect(0, 0, FW, FH);
    [[gs.home, -10], [gs.away, 100]].forEach(function (e) {
      var t = G.teams[e[0]]; x.fillStyle = t.c1; x.fillRect(X(e[1]), 0, 10 * PPY, FH);
      x.save(); x.globalAlpha = .12; x.strokeStyle = '#fff'; x.lineWidth = 6; for (var k = -FH; k < 10 * PPY + FH; k += 26) { x.beginPath(); x.moveTo(X(e[1]) + k, 0); x.lineTo(X(e[1]) + k - FH, FH); x.stroke(); } x.restore();
      x.save(); x.translate(X(e[1] + 5), FH / 2); x.rotate(e[1] < 0 ? -Math.PI / 2 : Math.PI / 2); x.fillStyle = lum(t.c1) > .6 ? t.c2 : '#fff'; x.font = '900 72px ' + 'Impact, "Arial Narrow", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.globalAlpha = .92; x.fillText(t.name.toUpperCase(), 0, 0); x.restore();
    });
    x.strokeStyle = 'rgba(255,255,255,.9)';
    for (var yd = 0; yd <= 100; yd += 5) { x.lineWidth = yd % 100 === 0 ? 5 : 2.2; x.beginPath(); x.moveTo(X(yd), 0); x.lineTo(X(yd), FH); x.stroke(); }
    x.lineWidth = 2; for (yd = 1; yd < 100; yd++) { if (yd % 5 === 0) continue; [[0.6, 1.6], [22.9, 23.9], [29.4, 30.4], [51.7, 52.7]].forEach(function (hh) { x.beginPath(); x.moveTo(X(yd), Y(hh[0])); x.lineTo(X(yd), Y(hh[1])); x.stroke(); }); }
    x.fillStyle = 'rgba(255,255,255,.88)'; x.font = '700 38px "Arial Narrow", Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    for (yd = 10; yd <= 90; yd += 10) { var n = String(yd <= 50 ? yd : 100 - yd); x.fillText(n, X(yd), Y(44.3)); x.save(); x.translate(X(yd), Y(9)); x.rotate(Math.PI); x.fillText(n, 0, 0); x.restore(); }
    var ht = G.teams[gs.home]; x.save(); x.globalAlpha = .55; x.beginPath(); x.arc(X(50), FH / 2, 64, 0, Math.PI * 2); x.fillStyle = ht.c1; x.fill(); x.lineWidth = 7; x.strokeStyle = ht.c2; x.stroke(); x.globalAlpha = .9; x.fillStyle = fg(ht.c1); x.font = '900 46px Impact, "Arial Narrow", sans-serif'; x.fillText(gs.home, X(50), FH / 2 + 2); x.restore();
    x.lineWidth = 6; x.strokeStyle = '#fde047'; [[-10, 1], [110, -1]].forEach(function (g) { x.beginPath(); x.moveTo(X(g[0]) + g[1] * 4, Y(23.4)); x.lineTo(X(g[0]) + g[1] * 4, Y(29.9)); x.stroke(); });
    fieldBg = c;
  }
  var OFFF = [[-0.6, 26.65], [-0.8, 24.6], [-0.8, 28.7], [-1.1, 22.6], [-1.1, 30.7], [-1.2, 32.9], [-5, 26.65], [-6.5, 24.3], [-1, 5], [-1, 48.3], [-1.6, 12]];
  var DEFF = [[1, 25.2], [1, 28.1], [1.2, 21.4], [1.2, 31.9], [5, 23.5], [5, 30], [6.5, 5], [6.5, 48.3], [5, 12.5], [13, 18], [13, 35.5]];
  function snap() { var gs = S.gs, dir = gs.pos === gs.home ? 1 : -1; return { dir: dir, los: dir > 0 ? gs.ball : 100 - gs.ball, off: gs.pos, def: HC.other(gs, gs.pos), togo: gs.togo, ball: gs.ball, down: gs.down }; }
  function formationPos(sn, kind) {
    var o = OFFF.map(function (p) { return { x: sn.los + sn.dir * p[0], y: p[1] }; }), d = DEFF.map(function (p) { return { x: sn.los + sn.dir * p[0], y: p[1] }; });
    if (kind === 'punt') { o[6].x = sn.los - sn.dir * 14; o[7].x = sn.los - sn.dir * 6; o[7].y = 26.65; d[9].x = sn.los + sn.dir * 40; d[9].y = 26.65; }
    if (kind === 'fg') { o[6].x = sn.los - sn.dir * 7; o[6].y = 26.65; o[7].x = sn.los - sn.dir * 9; o[7].y = 24.5; }
    return { o: o, d: d };
  }
  function setFormation(animate) {
    var gs = S.gs, sn = snap(), f = formationPos(sn), cols = teamCols(sn);
    var target = f.o.map(function (p, i) { return { x: p.x, y: p.y, c: cols.o, s: cols.os, off: 1, i: i }; }).concat(f.d.map(function (p, i) { return { x: p.x, y: p.y, c: cols.d, s: cols.ds, i: i } }));
    var bTarget = { x: f.o[0].x, y: f.o[0].y, z: 0 };
    if (!animate || !dots || S.speed === 0) { dots = target; ballS = bTarget; anim = null; return; }
    var from = dots.map(function (d) { return { x: d.x, y: d.y }; }), bf = { x: ballS.x, y: ballS.y };
    dots = target.map(function (t, i) { return { x: from[i] ? from[i].x : t.x, y: from[i] ? from[i].y : t.y, c: t.c, s: t.s, off: t.off, i: t.i }; });
    anim = { t0: performance.now(), dur: 420, tracks: target.map(function (t, i) { return [[0, dots[i].x, dots[i].y], [1, t.x, t.y]]; }), ball: [[0, bf.x, bf.y, 0], [1, bTarget.x, bTarget.y, 0]], ease: true };
  }
  function teamCols(sn) { var gs = S.gs, o = G.teams[sn.off], d = G.teams[sn.def]; function jersey(t, home) { var c = t.c1; if (lum(c) < .05) c = lum(t.c2) > .05 ? t.c2 : '#333'; return home ? { f: c, s: lum(c) > .6 ? '#111' : '#fff' } : { f: '#f4f6fa', s: c }; } var jo = jersey(o, sn.off === gs.home), jd = jersey(d, sn.def === gs.home); return { o: jo.f, os: jo.s, d: jd.f, ds: jd.s }; }
  function lerpTrack(tr, t) {
    if (t <= tr[0][0]) return tr[0];
    for (var i = 1; i < tr.length; i++) { if (t <= tr[i][0]) { var a = tr[i - 1], b = tr[i], u = (t - a[0]) / Math.max(1e-6, b[0] - a[0]); u = u * u * (3 - 2 * u); var o = [t]; for (var k = 1; k < a.length; k++) o.push(a[k] + (b[k] - a[k]) * u); return o; } }
    return tr[tr.length - 1];
  }
  function loop() {
    raf = requestAnimationFrame(loop);
    var x = S.ctx; if (!x || !fieldBg) return;
    if (anim) {
      var t = Math.min(1, (performance.now() - anim.t0) / anim.dur);
      anim.tracks.forEach(function (tr, i) { if (!tr || !dots[i]) return; var p = lerpTrack(tr, t); dots[i].x = p[1]; dots[i].y = p[2]; });
      if (anim.ball) { var b = lerpTrack(anim.ball, t); ballS = { x: b[1], y: b[2], z: b[3] || 0 }; if (anim.trail) { trail.push({ x: ballS.x, y: ballS.y, z: ballS.z }); if (trail.length > 26) trail.shift(); } }
      if (t >= 1) { var cb = anim.done; anim = null; if (cb) cb(); }
    } else if (trail.length) trail.shift();
    x.drawImage(fieldBg, 0, 0);
    var gs = S.gs, sn = S.snapNow || snap();
    if (!gs.over && gs.drive) { var st = gs.drive.team === gs.home ? gs.drive.start : 100 - gs.drive.start; x.fillStyle = 'rgba(255,255,255,.07)'; x.fillRect(X(Math.min(st, sn.los)), 0, Math.abs(sn.los - st) * PPY, FH); }
    if (!gs.over) {
      x.lineWidth = 4; x.strokeStyle = 'rgba(59,130,246,.95)'; x.beginPath(); x.moveTo(X(sn.los), 0); x.lineTo(X(sn.los), FH); x.stroke();
      if (sn.ball + sn.togo < 100) { var fd = sn.los + sn.dir * sn.togo; x.strokeStyle = 'rgba(250,204,21,.95)'; x.beginPath(); x.moveTo(X(fd), 0); x.lineTo(X(fd), FH); x.stroke(); }
    }
    if (dots) dots.forEach(function (d) {
      var px = X(d.x), py = Y(d.y);
      x.beginPath(); x.ellipse(px + 3, py + 4, 11, 9, 0, 0, Math.PI * 2); x.fillStyle = 'rgba(0,0,0,.28)'; x.fill();
      x.beginPath(); x.arc(px, py, 10.5, 0, Math.PI * 2); x.fillStyle = d.c; x.fill(); x.lineWidth = 3; x.strokeStyle = d.s; x.stroke();
      if (d.off && d.i === 6) { x.beginPath(); x.arc(px, py, 4, 0, Math.PI * 2); x.fillStyle = d.s; x.fill(); }
    });
    trail.forEach(function (p, i) { x.beginPath(); x.arc(X(p.x), Y(p.y) - p.z * 6, 2 + i / 9, 0, Math.PI * 2); x.fillStyle = 'rgba(255,255,255,' + (i / trail.length * .35) + ')'; x.fill(); });
    if (ballS) { var bx = X(ballS.x), by = Y(ballS.y), z = ballS.z || 0; x.beginPath(); x.ellipse(bx + 2, by + 3, 7, 4.5, 0, 0, Math.PI * 2); x.fillStyle = 'rgba(0,0,0,.35)'; x.fill(); var s = 1 + z * .06; x.beginPath(); x.ellipse(bx, by - z * 6, 8 * s, 5 * s, -.3, 0, Math.PI * 2); x.fillStyle = '#8b4513'; x.fill(); x.lineWidth = 1.5; x.strokeStyle = '#f5deb3'; x.stroke(); }
  }
  function buildAnim(e, sn) {
    var a = e.anim || {}, dir = sn.dir, L = sn.los, yards = e.yards || 0, f = formationPos(sn, a.kind === 'punt' ? 'punt' : a.kind === 'fg' ? 'fg' : null);
    var tracks = [], i;
    var o = f.o, d = f.d, P = function (dx, y) { return [L + dir * dx, y]; };
    for (i = 0; i < 11; i++) tracks[i] = [[0, o[i].x, o[i].y]];
    for (i = 0; i < 11; i++) tracks[11 + i] = [[0, d[i].x, d[i].y]];
    function add(idx, t, p) { tracks[idx].push([t, p[0], p[1]]); }
    var ball = [[0, o[0].x, o[0].y, 0]], end, rnd = Math.random;
    var cy = function (y) { return Math.max(1.5, Math.min(51.8, y)); };
    if (a.kind === 'run' || a.kind === 'kneel') {
      var ci = a.qbRun || a.kind === 'kneel' ? 6 : 7, outside = a.out, side = rnd() < .5 ? -1 : 1;
      var ey = a.kind === 'kneel' ? 26.65 : outside ? (side < 0 ? 10 + rnd() * 5 : 39 + rnd() * 5) : 26.65 + (rnd() - .5) * 8;
      end = P(yards, cy(ey));
      add(6, .12, P(-5, 26.65)); ball.push([.12, o[6].x, o[6].y, 0]);
      if (ci === 7) { add(7, .2, P(-4.5, 25.8)); ball.push([.2, L - dir * 4.5, 25.8, 0]); add(7, .45, P(outside ? -2 : -.3, outside ? cy(ey + (side < 0 ? 6 : -6)) : 26.65)); ball.push([.45, L + dir * (outside ? -2 : -.3), outside ? cy(ey + (side < 0 ? 6 : -6)) : 26.65, 0]); }
      add(ci, 1, end); ball.push([1, end[0], end[1], 0]);
      for (i = 0; i < 6; i++) add(i, 1, P(OFFF[i][0] + 1.6 + rnd(), OFFF[i][1] + (rnd() - .5) * 2));
      [8, 9, 10].forEach(function (k) { add(k, 1, P(4 + rnd() * 5, OFFF[k][1] + (rnd() - .5) * 4)); });
      for (i = 0; i < 11; i++) { var dd = d[i]; var tx = end[0] + dir * (.8 + rnd() * 2.5) * (i < 4 ? .6 : 1), ty = end[1] + (rnd() - .5) * 5; if (i < 4) { add(11 + i, .5, [dd.x - dir * .3, dd.y]); } add(11 + i, 1, [tx, cy(ty)]); }
    } else if (a.kind === 'pass' || a.kind === 'int' || a.kind === 'sack') {
      add(6, .3, P(-7.5, 26.65)); ball.push([.08, L - dir * 5, 26.65, 0]); ball.push([.3, L - dir * 7.5, 26.65, 0]);
      add(7, .35, P(-5.5, 23)); add(7, 1, P(2 + rnd() * 4, 20));
      for (i = 0; i < 5; i++) add(i, 1, P(OFFF[i][0] - 1.5, OFFF[i][1] + (rnd() - .5)));
      var tgtIdx = a.tpos === 'TE' ? 5 : a.tpos === 'RB' ? 7 : [8, 9, 10][Math.floor(rnd() * 3)];
      var air = a.air != null ? a.air : 8;
      [5, 8, 9, 10].forEach(function (k) { if (k === tgtIdx) return; add(k, .65, P(5 + rnd() * 14, cy(OFFF[k][1] + (rnd() - .5) * 12))); add(k, 1, P(7 + rnd() * 16, cy(OFFF[k][1] + (rnd() - .5) * 14))); });
      for (i = 0; i < 4; i++) add(11 + i, .6, P(-3.5 - rnd() * 3, 26.65 + (i - 1.5) * 2.2));
      add(15, .6, P(4 + rnd() * 3, 22)); add(16, .6, P(4 + rnd() * 3, 31));
      if (a.kind === 'sack') {
        end = P(yards, 26.65 + (rnd() - .5) * 3);
        add(6, .8, end); ball.push([.8, end[0], end[1], 0]); ball.push([1, end[0], end[1], 0]);
        add(13, .8, [end[0] + dir * .8, end[1] - .6]); add(11, .8, [end[0] + dir * 1.1, end[1] + .8]);
        [6, 7, 8, 9, 10].forEach(function (k) { add(11 + k, 1, P(DEFF[k][0] + 2, DEFF[k][1])); });
      } else {
        var sy = OFFF[tgtIdx][1], ty2 = air > 18 ? sy + (sy < 26 ? 3 : -3) : sy + (sy < 26 ? 7 : -7) * Math.min(1, air / 10);
        if (tgtIdx === 7) ty2 = 15; if (tgtIdx === 5) ty2 = 30 + rnd() * 6;
        var catchP = P(air, cy(ty2));
        add(tgtIdx, .62, catchP);
        ball.push([.34, L - dir * 7.5, 26.65, 1]);
        var h = Math.min(14, 2 + Math.abs(air) * .35);
        ball.push([.48, (ball[ball.length - 1][1] + catchP[0]) / 2, (26.65 + catchP[1]) / 2, h]);
        ball.push([.62, catchP[0], catchP[1], 1]);
        var cov = { 8: 17, 9: 18, 10: 19, 5: 20, 7: 15 }[tgtIdx] || 17;
        [17, 18, 19].forEach(function (k) { var rec = { 17: 8, 18: 9, 19: 10 }[k]; if (rec === tgtIdx) return; add(k, .65, P(6 + rnd() * 10, cy(OFFF[rec][1] + (rnd() - .5) * 6))); });
        add(20, .62, P(Math.max(10, air + 4), 18)); add(21, .62, P(Math.max(10, air + 4), 35.5));
        if (a.kind === 'int') {
          add(cov, .62, [catchP[0] + dir * .6, catchP[1] + .6]);
          var back = (e.intRet || 0) * -1; end = [catchP[0] + dir * back - dir * .6 * 0, cy(catchP[1] + (rnd() - .5) * 6)];
          add(cov, 1, end); ball.push([1, end[0], end[1], 0]); add(tgtIdx, 1, [end[0] - dir * 1.2, end[1] + 1]);
        } else if (a.comp) {
          add(cov, .66, [catchP[0] + dir * 1.5, catchP[1] + (rnd() - .5) * 2]);
          end = P(yards, cy(catchP[1] + (rnd() - .5) * 6));
          add(tgtIdx, 1, end); ball.push([1, end[0], end[1], 0]);
          add(cov, 1, [end[0] + dir * .9, end[1] + .7]); add(20, 1, [end[0] + dir * 1.4, end[1] - 1.2]);
        } else {
          add(cov, .62, [catchP[0] + dir * .4, catchP[1] + .8]);
          var drop = [catchP[0] + dir * 2.5, cy(catchP[1] + (rnd() - .5) * 4)];
          ball.push([.78, drop[0], drop[1], 0]); ball.push([1, drop[0] + dir * .5, drop[1], 0]);
          add(tgtIdx, 1, [catchP[0] + dir * 1, catchP[1]]);
        }
      }
    } else if (a.kind === 'punt') {
      var land = sn.dir > 0 ? a.land : 100 - a.land; land = sn.dir > 0 ? L + (a.land - sn.ball) : L - (a.land - sn.ball);
      ball.push([.15, o[6].x, o[6].y, 0]); ball.push([.5, (o[6].x + land) / 2, 26.65, 18]); ball.push([.8, land, 26.65, 1]);
      add(20, .8, [land, 26.65]); var re = land - dir * (a.ret || 0); add(20, 1, [re, 26.65]); ball.push([1, re, 26.65, 0]);
      for (i = 0; i < 11; i++) if (i !== 6) add(i, 1, [o[i].x + dir * (14 + rnd() * 14), cy(o[i].y + (rnd() - .5) * 10)]);
      for (i = 0; i < 11; i++) if (i !== 9) add(11 + i, 1, [d[i].x + dir * (6 + rnd() * 10), cy(d[i].y + (rnd() - .5) * 8)]);
    } else if (a.kind === 'fg') {
      var gx = dir > 0 ? 110 : -10, gy = a.good ? 26.65 + (rnd() - .5) * 3 : 26.65 + (rnd() < .5 ? -1 : 1) * (4 + rnd() * 3);
      ball.push([.18, o[6].x, o[6].y, 0]); ball.push([.28, o[6].x, o[6].y, 0]); add(7, .28, [o[6].x - dir * .5, o[6].y - .8]);
      ball.push([.65, (o[6].x + gx) / 2, (26.65 + gy) / 2, 14]); ball.push([1, gx, gy, 6]);
      for (i = 0; i < 4; i++) add(11 + i, .5, [d[i].x - dir * 1.2, d[i].y]);
    } else return null;
    return { tracks: tracks, ball: ball };
  }
  function flash(txt, color) { var f = $('#flash'); if (!f) return; f.textContent = txt; f.style.color = color || '#fff'; f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }
  function doPlay(userCall) {
    var gs = S.gs; if (S.busy || gs.over) return;
    var me = G.user.ab, userOff = gs.pos === me, oc, dc;
    if (userCall === 'AUTO') { oc = HC.aiOffCall(G, gs); dc = HC.aiDefCall(G, gs); }
    else if (userOff) { oc = userCall; dc = HC.aiDefCall(G, gs); } else { dc = userCall; oc = HC.aiOffCall(G, gs); }
    var sn = snap(), n0 = gs.log.length;
    HC.runPlay(G, gs, oc, dc);
    var e = null; for (var i = n0; i < gs.log.length; i++) if (gs.log[i].oc) { e = gs.log[i]; break; }
    S.lastCall = { oc: oc, dc: dc, userOff: userOff, e: e };
    var spec = e && S.speed !== 0 ? buildAnim(e, sn) : null;
    if (!spec) { afterPlay(e); return; }
    S.busy = true; S.snapNow = sn; renderCalls(); trail = [];
    var from = dots.map(function (d) { return [d.x, d.y]; });
    spec.tracks.forEach(function (tr, k) { tr[0] = [0, tr[0][1], tr[0][2]]; });
    // ensure dots start at formation (snap formation instantly)
    var base = formationPos(sn, e.anim.kind === 'punt' ? 'punt' : e.anim.kind === 'fg' ? 'fg' : null);
    base.o.concat(base.d).forEach(function (p, k) { dots[k].x = p.x; dots[k].y = p.y; });
    var dur = { run: 1500, pass: 1900, int: 2000, sack: 1500, punt: 2300, fg: 1900, kneel: 700 }[e.anim.kind] || 1500;
    anim = { t0: performance.now(), dur: dur / (S.speed === 2 ? 2.2 : 1), tracks: spec.tracks, ball: spec.ball, trail: true, done: function () { setTimeout(function () { S.busy = false; S.snapNow = null; afterPlay(e); }, S.speed === 2 ? 120 : 380); } };
  }
  function afterPlay(e) {
    var gs = S.gs, me = G.user.ab;
    if (e) {
      var tm = e.team, T = G.teams[tm], col = accent(T);
      var newLog = gs.log.slice(e.n);
      if (e.td) flash('Touchdown!', col);
      else if (/RETURNED FOR A TOUCHDOWN|RETURN TOUCHDOWN/.test(e.t)) flash('Touchdown!', accent(G.teams[e.def]));
      else if (e.anim && e.anim.kind === 'int') flash('Intercepted!', accent(G.teams[e.def]));
      else if (/FUMBLE/.test(e.t) && e.to) flash('Fumble!', accent(G.teams[e.def]));
      else if (e.anim && e.anim.kind === 'fg') flash(e.anim.good ? "It's Good!" : 'No Good!', e.anim.good ? '#86efac' : '#fca5a5');
      else if (/SAFETY/.test(e.t)) flash('Safety!', accent(G.teams[e.def]));
      else if (e.anim && e.anim.kind === 'sack') flash('Sack!', accent(G.teams[e.def]));
      else if (/Turnover on downs/.test(e.t)) flash('Turnover on Downs', '#fde68a');
      else if (e.yards >= 20) flash('Big Play!', col);
    }
    setFormation(true);
    updateGame(true);
  }
  function scoreBlock(ab, right) {
    var t = G.teams[ab], gs = S.gs;
    return '<div class="sbt' + (right ? ' rt' : '') + '" style="--c:' + t.c1 + '">' + badge(ab, 50) + '<div><div class="ab" style="color:' + fg(t.c1) + '">' + ab + '</div><div class="rc" style="color:' + fg(t.c1) + '">' + esc(t.name) + ' · ' + HC.rec(t) + '</div></div>' + (gs.pos === ab && !gs.over ? '<span class="poss" title="Possession"></span>' : '') + '<div class="sc" id="sc_' + ab + '" style="color:#fff">' + gs.sc[ab] + '</div></div>';
  }
  function clockStr(s) { var m = Math.floor(s / 60), x = s % 60; return m + ':' + (x < 10 ? '0' : '') + x; }
  function updateGame(fromPlay) {
    var gs = S.gs, me = G.user.ab;
    var prev = S.prevSc || {};
    $('#sbug').innerHTML = scoreBlock(gs.away, false) + '<div class="sbm"><div class="qq">' + (gs.over ? 'FINAL' + (gs.ot ? '/OT' : '') : gs.q <= 4 ? ['1ST', '2ND', '3RD', '4TH'][gs.q - 1] : 'OT') + '</div><div class="clk">' + (gs.over ? '0:00' : clockStr(gs.clock)) + '</div><div class="qq" style="font-size:10px">' + (gs.playoff ? 'PLAYOFFS' : 'WEEK ' + G.week) + '</div></div>' + scoreBlock(gs.home, true);
    [gs.home, gs.away].forEach(function (ab) { if (prev[ab] != null && prev[ab] !== gs.sc[ab]) { var el = $('#sc_' + ab); if (el) el.classList.add('bump'); } });
    S.prevSc = { }; S.prevSc[gs.home] = gs.sc[gs.home]; S.prevSc[gs.away] = gs.sc[gs.away];
    $('#ddbar').innerHTML = gs.over ? '<div>Game Over</div>' : '<div style="background:' + G.teams[gs.pos].c1 + ';color:' + fg(G.teams[gs.pos].c1) + '">🏈 ' + esc(G.teams[gs.pos].name.toUpperCase()) + ' BALL</div><div class="dd">' + HC.ddText(gs).toUpperCase() + '</div><div>' + HC.teamYd(G, gs) + '</div><div class="mut">' + (gs.drive ? 'Drive: ' + gs.drive.plays + ' plays, ' + gs.drive.yds + ' yds' : '') + '</div>';
    renderCalls();
    renderSide();
    if (gs.over) showFinal();
  }
  var ICON = {
    RUN_IN: 'M50 40 L50 12', RUN_OUT: 'M50 40 Q50 24 80 18 L92 8', SCREEN: 'M50 30 L22 32 L14 16', PASS_S: 'M20 34 L20 22 L40 14 M80 34 L80 24 L64 16', PASS_M: 'M20 34 L20 12 L48 12 M80 34 L80 12 L56 12', PASS_D: 'M20 34 L20 4 M80 34 L80 4 M50 34 L60 6',
    PA: 'M50 34 L42 26 M80 34 L80 18 L56 6', PUNT: 'M50 40 Q50 -6 50 6', FG: 'M50 40 L50 4 M38 6 L62 6', KNEEL: 'M50 34 L50 30',
    BASE: 'M20 20 h60 M30 30 h40', BLITZ: 'M30 6 L44 30 M70 6 L56 30 M50 6 L50 30', C2: 'M10 6 h30 M60 6 h30 M20 22 h60', C3: 'M6 6 h26 M37 6 h26 M68 6 h26', MAN: 'M20 10 L20 28 M80 10 L80 28 M50 10 L50 28', PREVENT: 'M6 4 h88 M6 12 h88 M20 22 h60'
  };
  function icon(k, def) { return '<svg viewBox="0 0 100 44" preserveAspectRatio="none"><path d="' + ICON[k] + '" stroke="' + (def ? '#fca5a5' : '#fde68a') + '" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="50" cy="38" r="3" fill="#fff"/></svg>'; }
  function renderCalls() {
    var gs = S.gs, me = G.user.ab, el = $('#calls'); if (!el) return;
    if (gs.over) { el.innerHTML = '<div class="empty">Game over.</div>'; $('#callres').innerHTML = ''; return; }
    var userOff = gs.pos === me, h = '';
    var key = gs.plays + ':' + gs.pos + ':' + gs.ball;
    if (S.sugKey !== key) { S.sugKey = key; S.sug = userOff ? HC.aiOffCall(G, gs) : HC.aiDefCall(G, gs); }
    var dis = S.busy ? ' disabled' : '';
    if (userOff) {
      var plays = ['RUN_IN', 'RUN_OUT', 'SCREEN', 'PASS_S', 'PASS_M', 'PASS_D', 'PA'];
      var fgd = 100 - gs.ball + 17, K = gs.U[me].k;
      h += '<div class="row" style="margin-bottom:10px"><h3>📋 Offensive Playbook</h3><span class="sp"></span><span class="mut" style="font-size:12px">' + HC.ddText(gs) + ' · ' + HC.teamYd(G, gs) + '</span></div><div class="plays">';
      plays.forEach(function (k) { var P = HC.OFF_PLAYS[k]; h += '<button class="play' + (S.sug === k ? ' sug' : '') + '" data-act="call" data-arg="' + k + '"' + dis + '>' + icon(k) + '<b>' + P.n + '</b><span>' + P.d + '</span></button>'; });
      h += '<button class="play st' + (S.sug === 'PUNT' ? ' sug' : '') + '" data-act="call" data-arg="PUNT"' + dis + '>' + icon('PUNT') + '<b>Punt</b><span>' + esc(HC.pname(gs.U[me].p)) + '</span></button>';
      h += '</div><div class="plays" style="margin-top:10px;grid-template-columns:repeat(4,1fr)">';
      h += '<button class="play st' + (S.sug === 'FG' ? ' sug' : '') + '" data-act="call" data-arg="FG"' + (fgd > 66 ? ' disabled' : dis) + '>' + icon('FG') + '<b>Field Goal · ' + fgd + ' yds</b><span>' + esc(HC.pname(K)) + ' (' + K.ovr + ' OVR)</span></button>';
      h += '<button class="play st' + (S.sug === 'KNEEL' ? ' sug' : '') + '" data-act="call" data-arg="KNEEL"' + dis + '>' + icon('KNEEL') + '<b>Kneel</b><span>Burn ~40 seconds</span></button>';
      h += '<div style="grid-column:span 2" class="mut"><div style="font-size:12px;line-height:1.5;padding:6px 4px">Down & distance matter: on <b>4th down</b>, any play is a go-for-it attempt. <span class="gold">OC PICK</span> marks your offensive coordinator\'s suggestion.</div></div></div>';
      $('#hint').textContent = 'You have the ball';
    } else {
      h += '<div class="row" style="margin-bottom:10px"><h3>🛡️ Defensive Calls</h3><span class="sp"></span><span class="mut" style="font-size:12px">' + G.teams[gs.pos].name + ' ball · ' + HC.ddText(gs) + ' · ' + HC.teamYd(G, gs) + '</span></div><div class="plays" style="grid-template-columns:repeat(3,1fr)">';
      Object.keys(HC.DEF_PLAYS).forEach(function (k) { var P = HC.DEF_PLAYS[k]; h += '<button class="play' + (S.sug === k ? ' sug' : '') + '" data-act="call" data-arg="' + k + '"' + dis + '>' + icon(k, true) + '<b>' + P.n + '</b><span>' + P.d + '</span></button>'; });
      h += '</div>';
      $('#hint').textContent = 'You are on defense';
    }
    el.innerHTML = h;
    var lc = S.lastCall, cr = $('#callres');
    if (lc && lc.e) cr.innerHTML = '<span>Last play:</span><span class="tag">' + G.teams[lc.e.off].ab + ' ' + HC.OFF_PLAYS[lc.oc].n + '</span><span>vs</span><span class="tag" style="background:#3a1720;color:#fecaca">' + G.teams[lc.e.def].ab + ' ' + HC.DEF_PLAYS[lc.dc].n + '</span><b style="color:#fff">' + (lc.e.oc === 'PUNT' || lc.e.oc === 'FG' ? '' : (lc.e.yards > 0 ? '+' : '') + lc.e.yards + ' yds') + '</b>';
    else cr.innerHTML = '<span>Pick a play. Your coordinator\'s suggestion is marked.</span>';
  }
  function renderSide() {
    var gs = S.gs, el = $('#gside'); if (!el) return;
    if (S.gameTab === 'pbp') {
      el.innerHTML = '<div class="pbp">' + gs.log.slice().reverse().slice(0, 80).map(function (l) { var t = l.team && G.teams[l.team]; return '<div class="e' + (l.big ? ' big' : '') + (l.sys ? ' sys' : '') + '" style="--c:' + (t ? accent(t) : '#475569') + '"><div class="m">' + (l.q <= 4 ? 'Q' + l.q : 'OT') + ' ' + clockStr(l.clock) + ' · ' + gs.away + ' ' + l.sc[gs.away] + ' - ' + gs.home + ' ' + l.sc[gs.home] + '</div>' + esc(l.t) + '</div>'; }).join('') + '</div>';
    } else if (S.gameTab === 'box') {
      var a = gs.tst[gs.away], b = gs.tst[gs.home];
      var rows = [['Total Yards', 'yds'], ['Passing', 'pass'], ['Rushing', 'rush'], ['First Downs', 'fd'], ['Turnovers', 'to'], ['Sacks (by)', 'sacks'], ['Plays', 'plays']];
      var h = '<table class="t boxs"><tr><th></th><th class="r">' + gs.away + '</th><th class="r">' + gs.home + '</th></tr>' + rows.map(function (r) { return '<tr><td class="mut">' + r[0] + '</td><td>' + a[r[1]] + '</td><td>' + b[r[1]] + '</td></tr>'; }).join('') + '<tr><td class="mut">Time of Poss.</td><td>' + clockStr(a.top) + '</td><td>' + clockStr(b.top) + '</td></tr></table>';
      h += '<h3 style="margin:14px 0 8px">Top Performers</h3>' + performers().map(function (x) { return '<div class="row" style="padding:4px 0;font-size:13px">' + badge(x.p.tm, 20) + '<b>' + esc(x.p.fn.charAt(0) + '. ' + x.p.ln) + '</b><span class="mut">' + x.s + '</span></div>'; }).join('');
      el.innerHTML = h;
    } else {
      el.innerHTML = '<table class="t"><tr><th>Team</th><th>Q</th><th>Start</th><th>Plays</th><th>Yds</th><th>Result</th></tr>' + gs.drives.slice().reverse().map(function (d) { return '<tr><td>' + badge(d.team, 20) + '</td><td>' + (d.q <= 4 ? d.q : 'OT') + '</td><td>' + (d.start < 50 ? 'Own ' + d.start : d.start === 50 ? '50' : 'Opp ' + (100 - d.start)) + '</td><td>' + d.plays + '</td><td>' + d.yds + '</td><td class="' + (d.result === 'Touchdown' || d.result === 'FG' ? 'good' : /Interception|Fumble|Downs/.test(d.result) ? 'bad' : 'mut') + '">' + d.result + '</td></tr>'; }).join('') + '</table>';
    }
  }
  function gdiff(p, k) { var a = (p.st || {})[k] || 0, b = ((S.st0 || {})[p.id] || {})[k] || 0; return a - b; }
  function performers() {
    var gs = S.gs, out = [];
    [gs.away, gs.home].forEach(function (ab) {
      var ps = HC.teamPlayers(G, ab);
      var qb = ps.slice().sort(function (a, b) { return gdiff(b, 'pa') - gdiff(a, 'pa'); })[0];
      if (qb && gdiff(qb, 'pa')) out.push({ p: qb, s: gdiff(qb, 'pc') + '/' + gdiff(qb, 'pa') + ', ' + gdiff(qb, 'py') + ' yds, ' + gdiff(qb, 'ptd') + ' TD, ' + gdiff(qb, 'int') + ' INT' });
      var rb = ps.slice().sort(function (a, b) { return gdiff(b, 'ry') - gdiff(a, 'ry'); })[0];
      if (rb && gdiff(rb, 'ra')) out.push({ p: rb, s: gdiff(rb, 'ra') + ' car, ' + gdiff(rb, 'ry') + ' yds' + (gdiff(rb, 'rtd') ? ', ' + gdiff(rb, 'rtd') + ' TD' : '') });
      var wr = ps.slice().sort(function (a, b) { return gdiff(b, 'recy') - gdiff(a, 'recy'); })[0];
      if (wr && gdiff(wr, 'rec')) out.push({ p: wr, s: gdiff(wr, 'rec') + ' rec, ' + gdiff(wr, 'recy') + ' yds' + (gdiff(wr, 'rectd') ? ', ' + gdiff(wr, 'rectd') + ' TD' : '') });
      var de = ps.slice().sort(function (a, b) { return (gdiff(b, 'sck') * 3 + gdiff(b, 'dint') * 4 + gdiff(b, 'tkl') * .3) - (gdiff(a, 'sck') * 3 + gdiff(a, 'dint') * 4 + gdiff(a, 'tkl') * .3); })[0];
      if (de && gdiff(de, 'tkl')) out.push({ p: de, s: gdiff(de, 'tkl') + ' tkl' + (gdiff(de, 'sck') ? ', ' + gdiff(de, 'sck') + ' sack' : '') + (gdiff(de, 'dint') ? ', ' + gdiff(de, 'dint') + ' INT' : '') });
    });
    return out;
  }
  function showFinal() {
    var gs = S.gs, me = G.user.ab, opp = HC.other(gs, me), w = gs.sc[me] > gs.sc[opp], l = gs.sc[me] < gs.sc[opp];
    var el = $('#finalOv'); if (!el || el.innerHTML) return;
    el.innerHTML = '<div class="final"><div class="tagline" style="margin:0">Final' + (gs.ot ? ' · Overtime' : '') + '</div><div class="fs">' + badge(gs.away, 80) + '<span>' + gs.sc[gs.away] + '</span><span class="dim">–</span><span>' + gs.sc[gs.home] + '</span>' + badge(gs.home, 80) + '</div><h2 style="font-size:34px;color:' + (w ? '#86efac' : l ? '#fca5a5' : '#fde68a') + '">' + (w ? 'Victory' : l ? 'Defeat' : 'Tie') + '</h2><button class="btn pri big" data-act="gfinish">Continue →</button></div>';
  }
  function finishGame() {
    var gs = S.gs; if (!gs) return;
    HC.recordUserGame(G, gs);
    S.gs = null; stopField();
    postGameFlow();
  }
  function postGameFlow() {
    var press = G.user.pressPending;
    var after = function () {
      if (G.phase === 'camp') { S.campTab = 'pre'; S.campSel = G.camp.day; }
      else if (G.phase === 'regular') { HC.advanceWeek(G); }
      else if (G.phase === 'playoffs') { HC.advancePlayoffs(G); }
      save(true); go('dash');
    };
    if (press) { go('dash'); openEvent(press, true, after); }
    else after();
  }
