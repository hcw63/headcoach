/* Head Coach 26 — UI layer */
var UI = (function () {
  'use strict';
  var G = null, S = { screen: 'title', rosterFilter: 'ALL', sort: { k: 'ovr', d: -1 }, faFilter: 'ALL', draftFilter: 'ALL', sel: null, coach: '', gameTab: 'pbp', speed: 1 };
  var SAVE_KEY = 'headcoach26_save_v1';
  var app;
  function $(s) { return document.querySelector(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function lum(hex) { var c = hex.replace('#', ''); if (c.length < 6) return .5; var r = parseInt(c.substr(0, 2), 16) / 255, g = parseInt(c.substr(2, 2), 16) / 255, b = parseInt(c.substr(4, 2), 16) / 255; return .2126 * r + .7152 * g + .0722 * b; }
  function accent(t) { var a = t.c1, b = t.c2; if (lum(a) < .09 && lum(b) > .09) return b; return a; }
  function fg(hex) { return lum(hex) > .55 ? '#0b0f17' : '#fff'; }
  function badge(ab, size) {
    var t = G ? G.teams[ab] : TEAMS0[ab]; size = size || 36; if (!t) return '';
    var c = t.c1, b = t.c2;
    return '<span class="badge" style="width:' + size + 'px;height:' + size + 'px;font-size:' + Math.round(size * .36) + 'px;background:radial-gradient(circle at 30% 25%,' + shade(c, 25) + ',' + c + ' 60%,' + shade(c, -25) + ');color:' + fg(c) + ';border:' + Math.max(2, Math.round(size / 14)) + 'px solid ' + b + '">' + ab + '</span>';
  }
  function shade(hex, p) { var c = hex.replace('#', ''); var n = parseInt(c, 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; var f = function (x) { return Math.max(0, Math.min(255, Math.round(x + (p > 0 ? (255 - x) * p / 100 : x * p / 100)))); }; return '#' + ((1 << 24) + (f(r) << 16) + (f(g) << 8) + f(b)).toString(16).slice(1); }
  function ovrCls(o) { return o >= 90 ? 'o90' : o >= 80 ? 'o80' : o >= 70 ? 'o70' : o >= 60 ? 'o60' : 'o0'; }
  function ovr(o) { return '<span class="ovr ' + ovrCls(o) + '">' + o + '</span>'; }
  function morBar(m) { var c = m >= 70 ? '#22c55e' : m >= 50 ? '#eab308' : '#ef4444'; return '<span class="mor" title="Morale ' + Math.round(m) + '"><i style="width:' + Math.round(m) + '%;background:' + c + '"></i></span>'; }
  function bar(v, c, max) { return '<div class="bar"><i style="width:' + Math.max(0, Math.min(100, v / (max || 100) * 100)) + '%;background:' + (c || 'var(--acc)') + '"></i></div>'; }
  function fmtM(k) { return HC.fmtM(k); }
  function ht(i) { return Math.floor(i / 12) + "'" + (i % 12) + '"'; }
  function nm(p) { return esc(p.fn + ' ' + p.ln); }
  function toast(msg, ms) { document.querySelectorAll('.toast').forEach(function (t) { t.remove(); }); var d = document.createElement('div'); d.className = 'toast'; d.innerHTML = msg; document.body.appendChild(d); setTimeout(function () { d.remove(); }, ms || 2600); }
  var TEAMS0 = {};
  HC_DATA.teams.forEach(function (t) { TEAMS0[t[0]] = { ab: t[0], city: t[1], name: t[2], c1: t[3], c2: t[4], div: t[5], realHC: t[6] }; });
  function setTheme(ab) {
    var t = G ? G.teams[ab] : TEAMS0[ab]; if (!t) return;
    var r = document.documentElement.style, a = accent(t);
    r.setProperty('--tc1', t.c1); r.setProperty('--tc2', t.c2); r.setProperty('--acc', lum(a) > .7 ? shade(a, -35) : a);
  }
  // ---------- persistence ----------
  function save(silent) {
    if (!G) return;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); if (!silent) toast('💾 Career saved'); }
    catch (e) { toast('Save failed: ' + e.message); }
  }
  function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
  function load() { try { var s = localStorage.getItem(SAVE_KEY); if (!s) return false; G = JSON.parse(s); if (G.teams && G.teams.WSH && G.teams.WSH.name === 'Commanders') { G.teams.WSH.name = 'Redskins'; G.teams.WSH.c1 = '#773141'; } setTheme(G.user.ab); return true; } catch (e) { toast('Could not load save: ' + e.message); return false; } }
  function exportSave() { var b = new Blob([JSON.stringify(G)], { type: 'application/json' }); var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'headcoach26-' + G.user.ab + '-' + G.season + '.json'; a.click(); }
  function importSave(file) { var r = new FileReader(); r.onload = function () { try { G = JSON.parse(r.result); setTheme(G.user.ab); save(true); go('dash'); toast('Save imported'); } catch (e) { toast('Bad save file'); } }; r.readAsText(file); }

  // ---------- routing ----------
  function go(s, arg) { S.screen = s; if (arg !== undefined) S.arg = arg; render(); window.scrollTo(0, 0); }
  function render() {
    stopField();
    var s = S.screen, html;
    if (s === 'title') html = vTitle();
    else if (s === 'select') html = vSelect();
    else if (s === 'game') { app.innerHTML = vGame(); mountGame(); return; }
    else html = shell(VIEWS[s] ? VIEWS[s]() : '<div class="empty">Unknown screen</div>');
    app.innerHTML = html;
    if (s === 'dash' && G && G.phase === 'regular' && G.user.pendingEvent && !S.eventShownWeek) { S.eventShownWeek = G.season + '-' + G.week; }
    if (POST[s]) POST[s]();
  }
  var VIEWS = {}, POST = {};

  // ---------- title ----------
  function vTitle() {
    return '<div class="title"><div class="turf"></div><div class="vign"></div><div class="box">' +
      '<div class="tagline" style="margin:0 0 14px">The 2026 NFL Season</div>' +
      '<div class="logo">Head<br>Coach <em>26</em></div>' +
      '<div class="tagline">Draft · Develop · Build a Culture · Call the Plays</div>' +
      '<div class="row" style="justify-content:center;gap:14px">' +
      '<button class="btn pri big" data-act="newc">New Career</button>' +
      (hasSave() ? '<button class="btn big" data-act="cont">Continue Career</button>' : '') +
      '<button class="btn big ghost" data-act="about0">About</button></div>' +
      '<div class="dim" style="margin-top:40px;font-size:12px">Real 2026 rosters & schedule · Ratings are the game\'s own estimates · Unofficial fan project</div>' +
      '</div></div>';
  }
  // ---------- team select ----------
  var tmpG = null;
  function vSelect() {
    if (!tmpG) tmpG = HC.newLeague(HC_DATA, 'KC', 'x');
    var gg = G; G = tmpG;
    var divs = ['AFC East', 'AFC North', 'AFC South', 'AFC West', 'NFC East', 'NFC North', 'NFC South', 'NFC West'];
    var h = '<div class="tsel"><div><div class="row" style="margin-bottom:18px"><button class="btn sm ghost" data-act="home">← Back</button><h2>Choose Your Team</h2><span class="sp"></span><span class="mut">Real 2026 rosters · ' + Object.keys(G.players).length + ' players</span></div><div class="divs">';
    divs.forEach(function (d) {
      h += '<div class="dv"><h3 class="mut">' + d + '</h3>';
      G.order.filter(function (ab) { return G.teams[ab].div === d; }).forEach(function (ab) {
        var t = G.teams[ab], o = HC.teamOvr(G, ab);
        h += '<div class="tc' + (S.sel === ab ? ' on' : '') + '" style="--c:' + accent(t) + '" data-act="pickteam" data-arg="' + ab + '">' + badge(ab, 38) + '<div><div class="nm">' + esc(t.city) + ' ' + esc(t.name) + '</div><div class="sm">OVR ' + o.ovr + ' · OFF ' + o.off + ' · DEF ' + o.def + '</div></div></div>';
      });
      h += '</div>';
    });
    h += '</div></div><div class="tdet">' + (S.sel ? selDetail(S.sel) : '<div class="card"><h2>Pick a franchise</h2><p class="mut">Every team uses its real 2026 roster and schedule. Contenders give you a shot at a ring now; rebuilders let you shape a roster through the draft and player development.</p></div>') + '</div></div>';
    G = gg;
    return h;
  }
  function selDetail(ab) {
    var t = G.teams[ab], o = HC.teamOvr(G, ab), ps = HC.teamPlayers(G, ab).sort(function (a, b) { return b.ovr - a.ovr; });
    var qb = G.players[t.depth.QB[0]], space = HC.capSpace(G, ab);
    var young = ps.filter(function (p) { return p.age <= 24; }).sort(function (a, b) { return b.pot - a.pot; }).slice(0, 3);
    var h = '<div class="hero" style="--c1:' + t.c1 + ';--c2:' + t.c2 + '"><div class="row">' + badge(ab, 64) + '<div><div class="mut" style="color:rgba(255,255,255,.75);font-weight:600">' + esc(t.city) + '</div><div style="font-family:var(--cond);font-size:34px;font-weight:900;text-transform:uppercase;line-height:1">' + esc(t.name) + '</div><div style="font-size:12px;opacity:.8">' + t.div + (t.realHC ? ' · Current HC: ' + esc(t.realHC) : '') + '</div></div></div></div>';
    h += '<div class="card" style="margin-top:14px"><div class="kv"><div><span>Overall</span><b>' + o.ovr + '</b></div><div><span>Offense</span><b>' + o.off + '</b></div><div><span>Defense</span><b>' + o.def + '</b></div><div><span>Cap Space</span><b>' + fmtM(space) + '</b></div></div>';
    h += '<h3 style="margin:16px 0 8px">Franchise QB</h3><div class="row">' + ovr(qb.ovr) + '<b>' + nm(qb) + '</b><span class="mut">Age ' + qb.age + ' · ' + fmtM(qb.sal) + '</span></div>';
    h += '<h3 style="margin:16px 0 8px">Top Players</h3>' + ps.slice(0, 5).map(function (p) { return '<div class="row" style="margin-bottom:6px">' + ovr(p.ovr) + '<span class="tag">' + p.pos + '</span><span>' + nm(p) + '</span></div>'; }).join('');
    h += '<h3 style="margin:16px 0 8px">Young Talent</h3>' + young.map(function (p) { return '<div class="row" style="margin-bottom:6px">' + ovr(p.ovr) + '<span class="tag">' + p.pos + '</span><span>' + nm(p) + '</span><span class="mut">POT ' + HC.potGrade(p.pot) + '</span></div>'; }).join('');
    h += '<h3 style="margin:18px 0 8px">Your Name, Coach</h3><input class="inp" id="coachName" placeholder="e.g. Howard Wentworth" value="' + esc(S.coach) + '" maxlength="30">';
    h += '<button class="btn pri big" style="width:100%;margin-top:14px" data-act="start" data-arg="' + ab + '">Take the ' + esc(t.name) + ' Job →</button></div>';
    return h;
  }
  // ---------- shell ----------
  var NAV = [
    ['sec', 'Week'], ['dash', '🏟️', 'Dashboard'], ['practice', '🏋️', 'Practice'], ['locker', '🤝', 'Locker Room'],
    ['sec', 'Team'], ['roster', '📋', 'Roster'], ['depth', '🧩', 'Depth Chart'], ['cap', '💰', 'Contracts & Cap'], ['fa', '✍️', 'Free Agency'],
    ['sec', 'Front Office'], ['draft', '🎯', 'Scouting & Draft'],
    ['sec', 'League'], ['sched', '📅', 'Schedule'], ['stand', '🏆', 'Standings'], ['leaders', '📈', 'League Leaders'],
    ['sec', 'Career'], ['saves', '💾', 'Save / Load'], ['about', 'ℹ️', 'About']
  ];
  function phaseLabel() {
    if (G.phase === 'regular') return G.season + ' Regular Season · Week ' + G.week;
    if (G.phase === 'playoffs') return G.season + ' Playoffs · ' + HC.roundName(G.playoffs.round);
    if (G.phase === 'draft') return G.draft.year + ' NFL Draft · Round ' + G.draft.order[Math.min(G.draft.cur, G.draft.order.length - 1)].r;
    return G.season + ' Offseason';
  }
  function shell(content) {
    var t = G.teams[G.user.ab], me = G.user.ab;
    var h = '<div class="shell"><div class="top">' + badge(me, 46) + '<div><div class="tname">' + esc(t.city) + ' ' + esc(t.name) + '</div><div class="sub">Head Coach ' + esc(G.user.coach) + ' · ' + phaseLabel() + '</div></div><span class="sp"></span>' +
      '<div class="stat"><b>' + HC.rec(t) + '</b><span>Record</span></div>' +
      '<div class="stat"><b style="color:' + (t.chem >= 65 ? '#86efac' : t.chem >= 45 ? '#fde68a' : '#fca5a5') + '">' + Math.round(t.chem) + '</b><span>Chemistry</span></div>' +
      '<div class="stat"><b>' + fmtM(HC.capSpace(G, me)) + '</b><span>Cap Space</span></div>' +
      '<div class="stat"><b>' + HC.teamPlayers(G, me).length + '</b><span>Roster</span></div>' +
      '<button class="btn sm" data-act="save">💾 Save</button></div><nav class="nav">';
    NAV.forEach(function (n) {
      if (n[0] === 'sec') { h += '<div class="sec">' + n[1] + '</div>'; return; }
      var dot = (n[0] === 'dash' && G.user.pendingEvent) || (n[0] === 'draft' && G.phase === 'draft');
      var label = n[0] === 'dash' && G.phase === 'playoffs' ? 'Playoffs' : n[0] === 'dash' && G.phase === 'draft' ? 'Draft Room' : n[0] === 'dash' && G.phase === 'offseason' ? 'Offseason' : n[2];
      h += '<a class="' + (S.screen === n[0] ? 'on' : '') + '" data-act="nav" data-arg="' + n[0] + '"><span class="ic">' + n[1] + '</span>' + label + (dot ? '<span class="dot"></span>' : '') + '</a>';
    });
    h += '</nav><main class="main">' + content + '</main></div>';
    return h;
  }
