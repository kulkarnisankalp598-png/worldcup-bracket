// ===================== FLAGS =====================
const FLAGS = {
  "Mexico":                 "flags/mx.svg",
  "South Africa":           "flags/za.svg",
  "Korea Republic":         "flags/kr.svg",
  "Czechia":                "flags/cz.svg",
  "Canada":                 "flags/ca.svg",
  "Bosnia and Herzegovina": "flags/ba.svg",
  "Qatar":                  "flags/qa.svg",
  "Switzerland":            "flags/ch.svg",
  "Brazil":                 "flags/br.svg",
  "Morocco":                "flags/ma.svg",
  "Scotland":               "flags/gb-sct.svg",
  "Haiti":                  "flags/ht.svg",
  "USA":                    "flags/us.svg",
  "Australia":              "flags/au.svg",
  "Paraguay":               "flags/py.svg",
  "Türkiye":                "flags/tr.svg",
  "Germany":                "flags/de.svg",
  "Ivory Coast":            "flags/ci.svg",
  "Ecuador":                "flags/ec.svg",
  "Curaçao":                "flags/cw.svg",
  "Japan":                  "flags/jp.svg",
  "Netherlands":            "flags/nl.svg",
  "Sweden":                 "flags/se.svg",
  "Tunisia":                "flags/tn.svg",
  "Belgium":                "flags/be.svg",
  "Egypt":                  "flags/eg.svg",
  "Iran":                   "flags/ir.svg",
  "New Zealand":            "flags/nz.svg",
  "Spain":                  "flags/es.svg",
  "Saudi Arabia":           "flags/sa.svg",
  "Uruguay":                "flags/uy.svg",
  "Cape Verde":             "flags/cv.svg",
  "France":                 "flags/fr.svg",
  "Iraq":                   "flags/iq.svg",
  "Norway":                 "flags/no.svg",
  "Senegal":                "flags/sn.svg",
  "Argentina":              "flags/ar.svg",
  "Algeria":                "flags/dz.svg",
  "Austria":                "flags/at.svg",
  "Jordan":                 "flags/jo.svg",
  "Portugal":               "flags/pt.svg",
  "Colombia":               "flags/co.svg",
  "Congo DR":               "flags/cd.svg",
  "Uzbekistan":             "flags/uz.svg",
  "England":                "flags/gb-eng.svg",
  "Croatia":                "flags/hr.svg",
  "Ghana":                  "flags/gh.svg",
  "Panama":                 "flags/pa.svg",
};

function flagImg(teamName, shape = "rect") {
  const src = FLAGS[teamName];
  if (!src) return `<span class="flag-placeholder">🏳️</span>`;
  return `<img class="flag flag-${shape}" src="${src}" alt="${teamName}">`;
}

// ===================== API NAME MAP =====================
const REVERSE_MAP = {
  "United States": "USA", "United States of America": "USA", "USA": "USA",
  "Mexico": "Mexico", "Canada": "Canada",
  "Korea Republic": "Korea Republic", "South Korea": "Korea Republic", "Republic of Korea": "Korea Republic",
  "Czechia": "Czechia", "Czech Republic": "Czechia",
  "Bosnia and Herzegovina": "Bosnia and Herzegovina", "Bosnia & Herzegovina": "Bosnia and Herzegovina",
  "Bosnia-Herzegovina": "Bosnia and Herzegovina", "Bosnia-Hercegovina": "Bosnia and Herzegovina",
  "Qatar": "Qatar", "Switzerland": "Switzerland", "Brazil": "Brazil", "Morocco": "Morocco",
  "Haiti": "Haiti", "Scotland": "Scotland", "Paraguay": "Paraguay", "Australia": "Australia",
  "Türkiye": "Türkiye", "Turkey": "Türkiye",
  "Germany": "Germany", "Curaçao": "Curaçao", "Curacao": "Curaçao",
  "Ivory Coast": "Ivory Coast", "Côte d'Ivoire": "Ivory Coast", "Cote d'Ivoire": "Ivory Coast",
  "Ecuador": "Ecuador", "Netherlands": "Netherlands", "Holland": "Netherlands",
  "Japan": "Japan", "Sweden": "Sweden", "Tunisia": "Tunisia", "Belgium": "Belgium", "Egypt": "Egypt",
  "Iran": "Iran", "IR Iran": "Iran", "Islamic Republic of Iran": "Iran",
  "New Zealand": "New Zealand", "Spain": "Spain",
  "Cape Verde": "Cape Verde", "Cabo Verde": "Cape Verde", "Cape Verde Islands": "Cape Verde",
  "Saudi Arabia": "Saudi Arabia", "Uruguay": "Uruguay", "France": "France",
  "Senegal": "Senegal", "Iraq": "Iraq", "Norway": "Norway", "Argentina": "Argentina",
  "Algeria": "Algeria", "Austria": "Austria", "Jordan": "Jordan", "Portugal": "Portugal",
  "Congo DR": "Congo DR", "DR Congo": "Congo DR", "Democratic Republic of Congo": "Congo DR",
  "Democratic Republic of the Congo": "Congo DR",
  "Uzbekistan": "Uzbekistan", "Colombia": "Colombia", "England": "England",
  "Croatia": "Croatia", "Ghana": "Ghana", "Panama": "Panama", "South Africa": "South Africa",
};

// ===================== FIREBASE HELPERS =====================
const LB = "leaderboard2026";

function getDB()         { return window._db; }
function fbCollection(db, col) { return window._collection(db, col); }
function fbDoc(db, col, id)    { return window._doc(db, col, id); }
function fbSetDoc(ref, data)   { return window._setDoc(ref, data); }
function fbDeleteDoc(ref)      { return window._deleteDoc(ref); }
function fbOnSnapshot(ref, cb) { return window._onSnapshot(ref, cb); }
function fbGetDocs(ref)        { return window._getDocs(ref); }

function initLeaderboardListener() {
  const db = getDB();
  if (!db) { console.warn("Firebase not ready"); return; }
  fbOnSnapshot(fbCollection(db, LB), snapshot => {
    const entries = [];
    snapshot.forEach(d => entries.push(d.data()));
    renderLeaderboardFromEntries(entries);
    recalcLeaderboardScores(entries);
  });
}

// ===================== POINTS =====================
const POINTS = { group: 1, third_pool: 1, r32: 2, r16: 4, qf: 8, sf: 16, third: 16, final: 32 };

// ===================== STATE =====================
let state = {
  groupPicks: {}, bestThird: [],
  r32Picks: {}, r16Picks: {}, qfPicks: {}, sfPicks: {},
  thirdPick: null, finalPick: null, totalPoints: 0,
  liveResults: {
    groupAdvanced: [], groupEliminated: [],
    r32Winners: [], r16Winners: [], qfWinners: [], sfWinners: [],
    thirdPlace: null, champion: null,
  },
  locked: { group: false, r32: false, r16: false, qf: false, sf: false, final: false },
  correctPicks: { group: 0, third_pool: 0, r32: 0, r16: 0, qf: 0, sf: 0, third: 0, final: 0 },
};

// ===================== UTILS =====================
function showToast(msg, duration = 2800) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), duration);
}

function saveState() { localStorage.setItem("wc2026_state", JSON.stringify(state)); }

function loadState() {
  const saved = localStorage.getItem("wc2026_state");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.groupPicks) {
        Object.keys(parsed.groupPicks).forEach(l => {
          if (Array.isArray(parsed.groupPicks[l])) delete parsed.groupPicks[l];
        });
      }
      if (!parsed.bestThird) parsed.bestThird = [];
      state = { ...state, ...parsed };
    } catch(e) { console.error("loadState error:", e); }
  }
}

// ===================== CONFETTI =====================
function launchConfetti() {
  const canvas = document.getElementById("confettiCanvas");
  const ctx    = canvas.getContext("2d");
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  canvas.style.display = "block";
  const pieces = Array.from({ length: 200 }, () => ({
    x: Math.random()*canvas.width, y: Math.random()*-canvas.height,
    w: Math.random()*14+6, h: Math.random()*7+4,
    color: ["#f5c518","#ffffff","#2ecc71","#e74c3c","#3498db","#9b59b6"][Math.floor(Math.random()*6)],
    speed: Math.random()*5+2, angle: Math.random()*360,
    spin: Math.random()*5-2.5, drift: Math.random()*3-1.5,
  }));
  let frame = 0;
  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    pieces.forEach(p => {
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.angle*Math.PI/180);
      ctx.fillStyle=p.color; ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h); ctx.restore();
      p.y+=p.speed; p.x+=p.drift; p.angle+=p.spin;
    });
    frame++;
    if (frame<240) requestAnimationFrame(draw);
    else { ctx.clearRect(0,0,canvas.width,canvas.height); canvas.style.display="none"; }
  }
  draw();
}

// ===================== TEAM MODAL =====================
function openModal(team, groupLetter) {
  const gp = state.groupPicks[groupLetter] || {};
  const position = gp.first===team.name ? "🥇 1st Place"
    : gp.second===team.name ? "🥈 2nd Place"
    : gp.third===team.name  ? "🥉 3rd Place" : null;
  const isAdv  = state.liveResults.groupAdvanced.includes(team.name);
  const isElim = state.liveResults.groupEliminated.includes(team.name);
  let deepest  = position;
  [
    { label: "Round of 32",   obj: state.r32Picks },
    { label: "Round of 16",   obj: state.r16Picks },
    { label: "Quarterfinals", obj: state.qfPicks  },
    { label: "Semifinals",    obj: state.sfPicks   },
  ].forEach(({ label, obj }) => {
    if (Object.values(obj).includes(team.name)) deepest = label;
  });
  if (state.thirdPick===team.name) deepest = "3rd Place Match 🥉";
  if (state.finalPick===team.name) deepest = "Champion 🏆";

  document.getElementById("modalContent").innerHTML = `
    <div class="modal-flag">${flagImg(team.name,"rect")}</div>
    <h2 class="modal-name">${team.name}</h2>
    <div class="modal-stats">
      <div class="modal-stat"><span class="modal-stat-label">FIFA Rank</span><span class="modal-stat-value">#${team.rank}</span></div>
      <div class="modal-stat"><span class="modal-stat-label">World Cups</span><span class="modal-stat-value">${team.participations}</span></div>
      <div class="modal-stat"><span class="modal-stat-label">Group</span><span class="modal-stat-value">${groupLetter}</span></div>
      ${team.host?`<div class="modal-stat"><span class="modal-stat-label">Status</span><span class="modal-stat-value" style="color:var(--gold)">🏠 Host</span></div>`:""}
    </div>
    <div class="modal-prediction">
      <div class="modal-pred-label">YOUR PREDICTION</div>
      <div class="modal-pred-value ${deepest?"picked":"not-picked"}">${deepest||"✗ Not picked"}</div>
    </div>
    <div class="modal-status">
      ${isAdv  ? '<div class="live-badge advance" style="font-size:0.9rem;padding:8px 16px">✓ OFFICIALLY ADVANCED</div>' : ""}
      ${isElim ? '<div class="live-badge elim"    style="font-size:0.9rem;padding:8px 16px">✗ ELIMINATED</div>'          : ""}
      ${!isAdv&&!isElim ? '<div style="color:var(--gray);font-size:0.85rem;letter-spacing:1px">⏳ Result pending</div>' : ""}
    </div>
  `;
  document.getElementById("teamModal").classList.remove("hidden");
}

function closeModal() { document.getElementById("teamModal").classList.add("hidden"); }
document.getElementById("teamModal").addEventListener("click", e => {
  if (e.target===document.getElementById("teamModal")) closeModal();
});

// ===================== SCORING ENGINE =====================
function calcScore(s, live) {
  let pts = 0;
  Object.values(s.groupPicks||{}).forEach(gp => {
    if (!gp||Array.isArray(gp)) return;
    if (gp.first  && live.groupAdvanced.includes(gp.first))  pts += POINTS.group;
    if (gp.second && live.groupAdvanced.includes(gp.second)) pts += POINTS.group;
  });
  (s.bestThird||[]).forEach(team => {
    if (live.groupAdvanced.includes(team)) pts += POINTS.third_pool;
  });
  [
    { winners: live.r32Winners, pickObj: s.r32Picks||{}, p: POINTS.r32 },
    { winners: live.r16Winners, pickObj: s.r16Picks||{}, p: POINTS.r16 },
    { winners: live.qfWinners,  pickObj: s.qfPicks||{},  p: POINTS.qf  },
    { winners: live.sfWinners,  pickObj: s.sfPicks||{},  p: POINTS.sf  },
  ].forEach(({ winners, pickObj, p }) => {
    Object.values(pickObj).forEach(team => {
      if (team && winners.includes(team)) pts += p;
    });
  });
  if (s.thirdPick && live.thirdPlace===s.thirdPick) pts += POINTS.third;
  if (s.finalPick && live.champion===s.finalPick)   pts += POINTS.final;
  return pts;
}

function recalcPoints() {
  state.totalPoints = calcScore(state, state.liveResults);
  const picks = state.correctPicks;

  picks.group = 0;
  Object.values(state.groupPicks).forEach(gp => {
    if (!gp||Array.isArray(gp)) return;
    if (gp.first  && state.liveResults.groupAdvanced.includes(gp.first))  picks.group++;
    if (gp.second && state.liveResults.groupAdvanced.includes(gp.second)) picks.group++;
  });
  picks.third_pool = 0;
  (state.bestThird||[]).forEach(team => {
    if (state.liveResults.groupAdvanced.includes(team)) picks.third_pool++;
  });
  [
    { key:"r32", winners:state.liveResults.r32Winners, pickObj:state.r32Picks },
    { key:"r16", winners:state.liveResults.r16Winners, pickObj:state.r16Picks },
    { key:"qf",  winners:state.liveResults.qfWinners,  pickObj:state.qfPicks  },
    { key:"sf",  winners:state.liveResults.sfWinners,  pickObj:state.sfPicks  },
  ].forEach(({ key, winners, pickObj }) => {
    picks[key] = 0;
    Object.values(pickObj).forEach(team => {
      if (team && winners.includes(team)) picks[key]++;
    });
  });
  picks.third = (state.thirdPick && state.liveResults.thirdPlace===state.thirdPick) ? 1 : 0;
  picks.final = (state.finalPick && state.liveResults.champion===state.finalPick)   ? 1 : 0;

  document.getElementById("pointsBadge").textContent = state.totalPoints + " pts";
  renderScoreBreakdown();
  updateCompletion();
}

function renderScoreBreakdown() {
  const el = document.getElementById("scoreBreakdown");
  if (!el) return;
  const rows = [
    { label:"Group 1st/2nd",  key:"group",      pts:POINTS.group      },
    { label:"3rd Place Pool", key:"third_pool",  pts:POINTS.third_pool },
    { label:"Round of 32",    key:"r32",         pts:POINTS.r32        },
    { label:"Round of 16",    key:"r16",         pts:POINTS.r16        },
    { label:"Quarterfinals",  key:"qf",          pts:POINTS.qf         },
    { label:"Semifinals",     key:"sf",          pts:POINTS.sf         },
    { label:"3rd Place Match",key:"third",       pts:POINTS.third      },
    { label:"Champion",       key:"final",       pts:POINTS.final      },
  ];
  el.innerHTML = rows.map(r => {
    const earned = state.correctPicks[r.key] * r.pts;
    return `<div class="breakdown-row ${earned>0?"earned":""}">
      <span>${r.label}</span>
      <span class="breakdown-pts">${earned>0?"+"+earned:"—"}</span>
    </div>`;
  }).join("");
}

// ===================== COMPLETION METER =====================
function updateCompletion() {
  const totalGroups = Object.keys(GROUPS).length;
  const groupsDone  = Object.keys(GROUPS).filter(l => {
    const gp = state.groupPicks[l]||{};
    return gp.first && gp.second && gp.third;
  }).length;
  const score = (groupsDone*3) + (state.bestThird||[]).length
    + Object.values(state.r32Picks).filter(Boolean).length
    + Object.values(state.r16Picks).filter(Boolean).length
    + Object.values(state.qfPicks).filter(Boolean).length
    + Object.values(state.sfPicks).filter(Boolean).length
    + (state.thirdPick?1:0) + (state.finalPick?3:0);
  const max = (totalGroups*3)+8+16+8+4+2+1+3;
  const pct = Math.min(100, Math.round((score/max)*100));

  document.getElementById("completionPct").textContent = pct+"%";
  document.getElementById("completionBar").style.width = pct+"%";

  let label = "Start picking your group stage teams!";
  if (pct>0   && pct<30)  label = "Good start — keep picking! 👊";
  if (pct>=30 && pct<60)  label = "You're halfway there 🔥";
  if (pct>=60 && pct<90)  label = "Almost done — finish the bracket! ⚡";
  if (pct>=90 && pct<100) label = "So close! Pick your champion 🏆";
  if (pct===100)           label = "Bracket complete! You're ready 🎉";

  document.getElementById("completionLabel").textContent = label;
  if (pct===100) updateRating();
}

// ===================== BRACKET RATING =====================
function updateRating() {
  document.getElementById("ratingSection").classList.remove("hidden");
  const allPicks = [
    ...Object.values(state.r32Picks),
    ...Object.values(state.r16Picks),
    ...Object.values(state.qfPicks),
    ...Object.values(state.sfPicks),
    state.thirdPick, state.finalPick,
  ].filter(Boolean);
  if (!allPicks.length) return;

  const allTeams  = Object.values(GROUPS).flat();
  const getRank   = name => allTeams.find(t=>t.name===name)?.rank||50;
  const upsets    = allPicks.filter(t=>getRank(t)>20).length;
  const boldest   = allPicks.reduce((a,b)=>getRank(a)>getRank(b)?a:b, allPicks[0]);
  const safest    = allPicks.reduce((a,b)=>getRank(a)<getRank(b)?a:b, allPicks[0]);
  const champRank = getRank(state.finalPick);
  const riskScore = upsets+(champRank>10?3:champRank>5?1:0);

  let risk, grade;
  if      (riskScore<=2)  { risk="🟢 Safe & Steady";  grade="A";  }
  else if (riskScore<=5)  { risk="🟡 Calculated Risk"; grade="B+"; }
  else if (riskScore<=8)  { risk="🟠 Bold Gambler";    grade="B";  }
  else if (riskScore<=12) { risk="🔴 Chaos Agent";     grade="C+"; }
  else                    { risk="💀 Absolute Madman"; grade="C";  }

  if (champRank<=3 && grade!=="A") grade=grade.replace("B","A").replace("C","B");

  document.getElementById("ratingGrade").textContent  = grade;
  document.getElementById("ratingRisk").textContent   = risk;
  document.getElementById("ratingBold").textContent   = `${boldest} (#${getRank(boldest)})`;
  document.getElementById("ratingSafe").textContent   = `${safest} (#${getRank(safest)})`;
  document.getElementById("ratingUpsets").textContent = `${upsets} upset pick${upsets!==1?"s":""}`;
}

// ===================== LEADERBOARD =====================
async function saveBracketEntry() {
  const input = document.getElementById("playerName");
  const name  = input.value.trim();
  if (!name) { showToast("⚠️ Enter your name first!"); return; }

  const allGroupsDone = Object.keys(GROUPS).every(l => {
    const gp = state.groupPicks[l]||{};
    return gp.first && gp.second && gp.third;
  });
  if (!allGroupsDone) { showToast("⚠️ Finish your group picks first!"); return; }

  const db = getDB();
  if (!db) { showToast("⚠️ Database not ready — try again"); return; }

  const btn = document.querySelector(".btn-gold");
  if (btn) { btn.textContent="💾 Saving..."; btn.disabled=true; }

  try {
    const docId = name.toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"");
    await fbSetDoc(fbDoc(db, LB, docId), {
      name,
      points:   state.totalPoints,
      champion: state.finalPick||"TBD",
      savedAt:  new Date().toLocaleDateString(),
      bracket:  btoa(unescape(encodeURIComponent(JSON.stringify(state)))),
    });
    showToast(`🎉 ${name} saved to leaderboard!`);
    input.value = "";
  } catch(e) {
    console.error("Firebase save error:", e);
    showToast("⚠️ Could not save — check connection");
  } finally {
    if (btn) { btn.textContent="💾 Save My Bracket"; btn.disabled=false; }
  }
}

async function deleteEntry(name) {
  if (!confirm(`Remove ${name} from the leaderboard?`)) return;
  const db = getDB();
  if (!db) return;
  try {
    const docId = name.toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"");
    await fbDeleteDoc(fbDoc(db, LB, docId));
    showToast(`🗑️ Removed ${name}`);
  } catch(e) {
    console.error("Firebase delete error:", e);
    showToast("⚠️ Could not remove");
  }
}

function renderLeaderboard() {}

function renderLeaderboardFromEntries(entries) {
  const el = document.getElementById("leaderboard");
  if (!entries.length) {
    el.innerHTML = `<div class="leaderboard-empty">No entries yet — be the first! 👆</div>`;
    return;
  }
  entries.sort((a,b) => b.points-a.points);
  const medals = ["🥇","🥈","🥉"];
  el.innerHTML = entries.map((e,i) => `
    <div class="leaderboard-row ${i===0?"first":""}">
      <span class="lb-rank">${medals[i]||"#"+(i+1)}</span>
      <span class="lb-name">${e.name}</span>
      <span class="lb-champion">
        ${e.champion&&FLAGS[e.champion]
          ? `<img class="flag flag-rect" src="${FLAGS[e.champion]}" style="width:22px;height:15px"> ${e.champion}`
          : e.champion||"TBD"}
      </span>
      <span class="lb-pts">${e.points} pts</span>
      <span class="lb-date">${e.savedAt}</span>
      <button class="lb-delete" onclick="deleteEntry('${e.name}')">✕</button>
    </div>
  `).join("");
}

async function recalcLeaderboardScores(entries) {
  const db = getDB();
  if (!db || !entries.length || !state.liveResults.groupAdvanced.length) return;
  const updates = [];
  entries.forEach(entry => {
    if (!entry.bracket) return;
    try {
      const s   = JSON.parse(decodeURIComponent(escape(atob(entry.bracket))));
      const pts = calcScore(s, state.liveResults);
      if (entry.points !== pts) {
        const docId = entry.name.toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"");
        updates.push(fbSetDoc(fbDoc(db, LB, docId), { ...entry, points: pts }));
      }
    } catch(e) { console.warn("Recalc failed:", entry.name, e); }
  });
  if (updates.length) {
    await Promise.all(updates);
    console.log(`✅ Updated ${updates.length} scores`);
  }
}

// ===================== LIVE STRIP =====================
function renderLiveStrip(matches) {
  const el = document.getElementById("liveMatches");
  if (!matches.length) {
    el.innerHTML = '<span class="live-placeholder">Tournament starts June 11 🗓️</span>';
    return;
  }
  el.innerHTML = matches.map(m => {
    const home   = REVERSE_MAP[m.homeTeam?.name]||m.homeTeam?.name||"?";
    const away   = REVERSE_MAP[m.awayTeam?.name]||m.awayTeam?.name||"?";
    const hScore = m.score?.fullTime?.home??m.score?.halfTime?.home??"-";
    const aScore = m.score?.fullTime?.away??m.score?.halfTime?.away??"-";
    const isLive = ["IN_PLAY","PAUSED"].includes(m.status);
    const isFin  = m.status==="FINISHED";
    const minute = m.minute?`${m.minute}'`:(isFin?"FT":"Soon");
    return `
      <div class="strip-match ${isLive?"live":""} ${isFin?"final":""}">
        <span class="strip-status">${isLive?"🔴":isFin?"✅":"⏰"} ${minute}</span>
        <span class="strip-team">${flagImg(home,"circle")} ${home}</span>
        <span class="strip-score">${hScore} - ${aScore}</span>
        <span class="strip-team">${away} ${flagImg(away,"circle")}</span>
      </div>
    `;
  }).join('<span class="strip-divider">·</span>');
}

// ===================== LIVE SCORES =====================
async function fetchLiveResults() {
  const btn = document.getElementById("refreshBtn");
  if (btn) { btn.textContent="⏳ Checking..."; btn.disabled=true; }

  try {
    const isLocal = ["localhost","127.0.0.1"].includes(window.location.hostname);
    const endpoint = isLocal
      ? "https://api.football-data.org/v4/competitions/WC/matches?season=2026"
      : "/api/scores";
    const headers = isLocal && typeof CONFIG!=="undefined"
      ? { "X-Auth-Token": CONFIG.FOOTBALL_API_KEY }
      : {};

    const res     = await fetch(endpoint, { headers });
    const data    = await res.json();
    const matches = data.matches||[];

    console.log("📡 Stages:", [...new Set(matches.map(m=>m.stage))]);
    console.log("📡 Teams:", [...new Set(matches.flatMap(m=>[m.homeTeam?.name,m.awayTeam?.name]))].filter(Boolean));

    const live     = matches.filter(m=>["IN_PLAY","PAUSED"].includes(m.status));
    const finished = matches.filter(m=>m.status==="FINISHED").slice(-6);
    const upcoming = matches.filter(m=>m.status==="SCHEDULED").slice(0,3);
    renderLiveStrip([...live,...finished,...upcoming].slice(0,10));

    const done = matches.filter(m=>m.status==="FINISHED");
    state.liveResults = {
      groupAdvanced:[], groupEliminated:[],
      r32Winners:[], r16Winners:[], qfWinners:[], sfWinners:[],
      thirdPlace:null, champion:null,
    };

    const standings = {};
    done.forEach(m => {
      const home   = REVERSE_MAP[m.homeTeam?.name]||m.homeTeam?.name;
      const away   = REVERSE_MAP[m.awayTeam?.name]||m.awayTeam?.name;
      const hs     = m.score?.fullTime?.home??0;
      const as_    = m.score?.fullTime?.away??0;
      const winner = hs>as_?home:as_>hs?away:null;
      const stage  = m.stage;

      if (stage==="ROUND_OF_32" && winner && !state.liveResults.r32Winners.includes(winner)) state.liveResults.r32Winners.push(winner);
      if (stage==="ROUND_OF_16" && winner && !state.liveResults.r16Winners.includes(winner)) state.liveResults.r16Winners.push(winner);
      if ((stage==="QUARTER_FINALS"||stage==="QUARTER_FINAL") && winner && !state.liveResults.qfWinners.includes(winner)) state.liveResults.qfWinners.push(winner);
      if ((stage==="SEMI_FINALS"||stage==="SEMI_FINAL") && winner && !state.liveResults.sfWinners.includes(winner)) state.liveResults.sfWinners.push(winner);
      if ((stage==="THIRD_PLACE"||stage==="THIRD_PLACE_MATCH"||stage==="PLAY_OFF_ROUND") && winner) state.liveResults.thirdPlace=winner;
      if (stage==="FINAL" && winner) state.liveResults.champion=winner;

      if (stage==="GROUP_STAGE") {
        let gl = null;
        Object.entries(GROUPS).forEach(([l,teams])=>{
          if (teams.find(t=>t.name===home)||teams.find(t=>t.name===away)) gl=l;
        });
        if (!gl) { console.warn("⚠️ No group for:",home,"vs",away); return; }
        if (!standings[gl]) standings[gl]={};
        [home,away].forEach(t=>{
          if (!standings[gl][t]) standings[gl][t]={pts:0,gd:0,gf:0,played:0};
        });
        const s=standings[gl];
        s[home].played++; s[away].played++;
        s[home].gf+=hs; s[away].gf+=as_;
        s[home].gd+=(hs-as_); s[away].gd+=(as_-hs);
        if (hs>as_)      { s[home].pts+=3; }
        else if (as_>hs) { s[away].pts+=3; }
        else             { s[home].pts+=1; s[away].pts+=1; }
      }
    });

    const thirds = [];
    Object.entries(standings).forEach(([,teams])=>{
      const sorted = Object.entries(teams).sort(([,a],[,b])=>b.pts-a.pts||b.gd-a.gd||b.gf-a.gf);
      const allPlayed = sorted.every(([,s])=>s.played===3);
      if (allPlayed) {
        if (sorted[0]) state.liveResults.groupAdvanced.push(sorted[0][0]);
        if (sorted[1]) state.liveResults.groupAdvanced.push(sorted[1][0]);
        if (sorted[2]) thirds.push({name:sorted[2][0],...sorted[2][1]});
        if (sorted[3]) state.liveResults.groupEliminated.push(sorted[3][0]);
        if (sorted[2]) state.liveResults.groupEliminated.push(sorted[2][0]);
      } else {
        sorted.forEach(([name,s],i)=>{
          if (i<2&&s.played>0&&!state.liveResults.groupAdvanced.includes(name))
            state.liveResults.groupAdvanced.push(name);
        });
      }
    });

    if (thirds.length) {
      thirds.sort((a,b)=>b.pts-a.pts||b.gd-a.gd||b.gf-a.gf).slice(0,8).forEach(t=>{
        state.liveResults.groupAdvanced.push(t.name);
        state.liveResults.groupEliminated=state.liveResults.groupEliminated.filter(n=>n!==t.name);
      });
    }

    const r32c=done.filter(m=>m.stage==="ROUND_OF_32").length;
    const r16c=done.filter(m=>m.stage==="ROUND_OF_16").length;
    const qfc =done.filter(m=>m.stage==="QUARTER_FINALS"||m.stage==="QUARTER_FINAL").length;
    const sfc =done.filter(m=>m.stage==="SEMI_FINALS"   ||m.stage==="SEMI_FINAL").length;
    const allGDone = Object.keys(standings).length===12 &&
      Object.values(standings).every(g=>Object.values(g).every(s=>s.played===3));

    if (allGDone)               state.locked.group=true;
    if (r32c>=16)               state.locked.r32=true;
    if (r16c>=8)                state.locked.r16=true;
    if (qfc>=4)                 state.locked.qf=true;
    if (sfc>=2)                 state.locked.sf=true;
    if (state.liveResults.champion) state.locked.final=true;

    saveState();
    recalcPoints();
    renderGroups();
    const ko=document.getElementById("knockoutSection");
    if (ko&&!ko.classList.contains("hidden")) renderKnockout();
    if (state.thirdPick) renderThirdPlace();
    if (state.finalPick) renderChampion(state.finalPick);

    showToast(live.length>0
      ? `📡 ${live.length} match${live.length>1?"es":""} live!`
      : done.length>0 ? `✅ ${done.length} matches played` : "⏳ Tournament starts June 11!");

  } catch(e) {
    console.error("❌ Scores fetch error:", e);
    showToast("⚠️ Could not fetch scores — try again");
  } finally {
    if (btn) { btn.textContent="🔄 Refresh Scores"; btn.disabled=false; }
  }
}

// ===================== GROUP STAGE =====================
function renderGroups() {
  const grid=document.getElementById("groupsGrid");
  grid.innerHTML="";
  const isLocked=state.locked.group;

  Object.entries(GROUPS).forEach(([letter,teams])=>{
    const gp=state.groupPicks[letter]||{};
    const card=document.createElement("div");
    card.className="group-card";
    card.innerHTML=`
      <div class="group-header">
        <span class="group-label">GROUP ${letter}</span>
        <span class="group-pick-count">
          ${isLocked?"🔒 LOCKED"
            :gp.first&&gp.second&&gp.third?"✅ Complete"
            :`${[gp.first,gp.second,gp.third].filter(Boolean).length}/3 ranked`}
        </span>
      </div>
    `;

    teams.forEach(team=>{
      const pos=gp.first===team.name?1:gp.second===team.name?2:gp.third===team.name?3:0;
      const isAdv=state.liveResults.groupAdvanced.includes(team.name);
      const isElim=state.liveResults.groupEliminated.includes(team.name);
      const isCorrect=(pos===1||pos===2)&&isAdv;
      const posLabel=pos===1?"🥇":pos===2?"🥈":pos===3?"🥉":"";
      const posClass=pos===1?"pos-first":pos===2?"pos-second":pos===3?"pos-third":"";

      const row=document.createElement("div");
      row.className=`team-row ${posClass} ${isElim?"eliminated":""} ${isCorrect?"correct":""}`;
      row.innerHTML=`
        ${flagImg(team.name,"rect")}
        <span class="team-name">${team.name}</span>
        ${team.host?'<span class="host-badge">HOST</span>':""}
        <span class="team-rank">#${team.rank}</span>
        ${posLabel?`<span class="pos-badge">${posLabel}</span>`:""}
        ${isAdv?'<span class="live-badge advance">✓ ADV</span>':""}
        ${isElim?'<span class="live-badge elim">✗ OUT</span>':""}
        ${isCorrect?'<span class="live-badge correct">+1</span>':""}
      `;

      const infoBtn=document.createElement("button");
      infoBtn.className="info-btn"; infoBtn.textContent="ℹ";
      infoBtn.addEventListener("click",e=>{e.stopPropagation();openModal(team,letter);});
      row.appendChild(infoBtn);
      if (!isLocked) row.addEventListener("click",()=>cycleGroupPick(letter,team.name));
      card.appendChild(row);
    });
    grid.appendChild(card);
  });
  checkGroupsComplete();
}

function cycleGroupPick(letter, teamName) {
  if (!state.groupPicks[letter]) state.groupPicks[letter]={};
  const gp=state.groupPicks[letter];
  const pos=gp.first===teamName?1:gp.second===teamName?2:gp.third===teamName?3:0;

  if (pos===1)      { gp.first=null;  showToast(`❌ Removed ${teamName}`); }
  else if (pos===2) { gp.second=null; showToast(`❌ Removed ${teamName}`); }
  else if (pos===3) { gp.third=null;  showToast(`❌ Removed ${teamName}`); }
  else {
    if (!gp.first)       { gp.first=teamName;  showToast(`🥇 ${teamName} — 1st!`); }
    else if (!gp.second) { gp.second=teamName; showToast(`🥈 ${teamName} — 2nd!`); }
    else if (!gp.third)  { gp.third=teamName;  showToast(`🥉 ${teamName} — 3rd!`); }
    else { showToast("⚠️ All 3 positions filled — click a team to remove"); return; }
  }
  saveState(); recalcPoints(); renderGroups();
}

function checkGroupsComplete() {
  const allDone=Object.keys(GROUPS).every(l=>{
    const gp=state.groupPicks[l]||{};
    return gp.first&&gp.second&&gp.third;
  });
  if (allDone) {
    document.getElementById("thirdPlacePool").classList.remove("hidden");
    renderThirdPlacePool();
  }
}

// ===================== BEST 3RD PLACE POOL =====================
function renderThirdPlacePool() {
  const grid=document.getElementById("thirdPlacePoolGrid");
  grid.innerHTML="";
  const thirdTeams=Object.entries(state.groupPicks)
    .filter(([,gp])=>gp.third)
    .map(([letter,gp])=>({name:gp.third,group:letter}));

  document.getElementById("thirdPoolCount").textContent=(state.bestThird||[]).length;

  thirdTeams.forEach(({name,group})=>{
    const isSel=(state.bestThird||[]).includes(name);
    const isAdv=state.liveResults.groupAdvanced.includes(name);
    const card=document.createElement("div");
    card.className=`third-pool-card ${isSel?"selected":""}`;
    card.innerHTML=`
      ${flagImg(name,"rect")}
      <span class="third-pool-name">${name}</span>
      <span class="third-pool-group">Group ${group}</span>
      ${isSel?'<span class="pos-badge">✓</span>':""}
      ${isSel&&isAdv?'<span class="live-badge correct" style="margin-left:4px">+1</span>':""}
    `;
    card.addEventListener("click",()=>toggleBestThird(name));
    grid.appendChild(card);
  });

  if ((state.bestThird||[]).length===8) {
    document.getElementById("knockoutSection").classList.remove("hidden");
    renderKnockout();
  }
}

function toggleBestThird(teamName) {
  if (!state.bestThird) state.bestThird=[];
  const idx=state.bestThird.indexOf(teamName);
  if (idx!==-1) {
    state.bestThird.splice(idx,1);
    showToast(`❌ Removed ${teamName} from pool`);
  } else {
    if (state.bestThird.length>=8) { showToast("⚠️ Already picked 8 — remove one first!"); return; }
    state.bestThird.push(teamName);
    showToast(`✅ ${teamName} in the top 8!`);
  }
  saveState(); recalcPoints(); renderThirdPlacePool();
}

// ===================== KNOCKOUT =====================
function buildR32Matchups() {
  const gp=state.groupPicks;
  const g=l=>gp[l]||{};
  return [
    {team1:g("A").first, team2:g("B").second},
    {team1:g("C").first, team2:g("D").second},
    {team1:g("E").first, team2:g("F").second},
    {team1:g("G").first, team2:g("H").second},
    {team1:g("I").first, team2:g("J").second},
    {team1:g("K").first, team2:g("L").second},
    {team1:g("B").first, team2:g("A").second},
    {team1:g("D").first, team2:g("C").second},
    {team1:g("F").first, team2:g("E").second},
    {team1:g("H").first, team2:g("G").second},
    {team1:g("J").first, team2:g("I").second},
    {team1:g("L").first, team2:g("K").second},
    {team1:(state.bestThird||[])[0]||null, team2:(state.bestThird||[])[1]||null},
    {team1:(state.bestThird||[])[2]||null, team2:(state.bestThird||[])[3]||null},
    {team1:(state.bestThird||[])[4]||null, team2:(state.bestThird||[])[5]||null},
    {team1:(state.bestThird||[])[6]||null, team2:(state.bestThird||[])[7]||null},
  ];
}

function renderTeamSlot(teamName, key, matchIdx, winners, isLocked, pts) {
  const isTBD=(teamName===null||teamName===undefined);
  const currentPick=(state[key]||{})[matchIdx];
  const isSelected=teamName&&currentPick===teamName;
  const isWinner=teamName&&winners.includes(teamName);
  const isCorrect=isSelected&&isWinner;
  const isWrong=isSelected&&isLocked&&!isWinner&&winners.length>0;

  const div=document.createElement("div");
  div.className="match-team"
    +(isSelected?" selected":"")
    +(isTBD?" tbd":"")
    +(isCorrect?" correct":"")
    +(isWrong?" wrong":"");

  div.innerHTML=`
    ${isTBD?'<span class="flag-placeholder">⏳</span>':flagImg(teamName,"circle")}
    <span class="team-name">${teamName||"TBD"}</span>
    ${isCorrect?`<span class="live-badge correct" style="margin-left:auto">+${pts}</span>`:""}
    ${isWrong?'<span class="live-badge elim" style="margin-left:auto">✗</span>':""}
    ${isSelected&&!isLocked&&!isCorrect&&!isWrong?'<span class="check-icon" style="margin-left:auto">✓</span>':""}
  `;

  if (!isTBD&&!isLocked) {
    div.addEventListener("click",()=>{
      if (!state[key]) state[key]={};
      state[key][matchIdx]=teamName;
      showToast(`⚡ ${teamName} advances!`);
      saveState(); recalcPoints(); renderKnockout();
    });
  }
  return div;
}

function renderKnockout() {
  const bracket=document.getElementById("knockoutBracket");
  bracket.innerHTML="";

  const r32=buildR32Matchups();
  const r16=[]; for(let i=0;i<16;i+=2) r16.push({team1:state.r32Picks[i]||null,team2:state.r32Picks[i+1]||null});
  const qf=[];  for(let i=0;i<8; i+=2) qf.push ({team1:state.r16Picks[i]||null,team2:state.r16Picks[i+1]||null});
  const sf=[];  for(let i=0;i<4; i+=2) sf.push ({team1:state.qfPicks[i]||null, team2:state.qfPicks[i+1]||null});

  const rounds=[
    {key:"r32Picks",lockKey:"r32",label:"ROUND OF 32 — 16 MATCHES",  winners:state.liveResults.r32Winners,matchups:r32,pts:POINTS.r32},
    {key:"r16Picks",lockKey:"r16",label:"ROUND OF 16 — 8 MATCHES",   winners:state.liveResults.r16Winners,matchups:r16,pts:POINTS.r16},
    {key:"qfPicks", lockKey:"qf", label:"QUARTERFINALS — 4 MATCHES", winners:state.liveResults.qfWinners, matchups:qf, pts:POINTS.qf },
    {key:"sfPicks", lockKey:"sf", label:"SEMIFINALS — 2 MATCHES",    winners:state.liveResults.sfWinners, matchups:sf, pts:POINTS.sf },
  ];

  rounds.forEach(({key,lockKey,label,matchups,winners,pts})=>{
    if (!matchups.some(m=>m.team1||m.team2)) return;
    const isLocked=state.locked[lockKey];
    const roundDiv=document.createElement("div");
    roundDiv.innerHTML=`
      <div class="round-label">
        ${label}
        ${isLocked?'<span class="lock-tag">🔒 LOCKED</span>':""}
        <span class="pts-tag">+${pts} pts/correct</span>
      </div>
    `;
    const row=document.createElement("div");
    row.className="matches-row";
    matchups.forEach((match,matchIdx)=>{
      if (!match.team1&&!match.team2) return;
      const card=document.createElement("div");
      card.className="match-card";
      card.appendChild(renderTeamSlot(match.team1,key,matchIdx,winners,isLocked,pts));
      card.appendChild(renderTeamSlot(match.team2,key,matchIdx,winners,isLocked,pts));
      row.appendChild(card);
    });
    roundDiv.appendChild(row);
    bracket.appendChild(roundDiv);
  });

  const sfPicks=Object.values(state.sfPicks).filter(Boolean);
  if (sfPicks.length>=2) {
    document.getElementById("thirdPlaceSection").classList.remove("hidden");
    document.getElementById("finalSection").classList.remove("hidden");
    renderThirdPlace();
    renderFinal();
  }
}

// ===================== 3RD PLACE =====================
function renderThirdPlace() {
  const el=document.getElementById("thirdPlaceDisplay");
  const sfWinners=Object.values(state.sfPicks).filter(Boolean);
  const qfPicked=Object.values(state.qfPicks).filter(Boolean);
  const sfLosers=qfPicked.filter(t=>!sfWinners.includes(t)).slice(0,2);

  if (sfLosers.length<2) {
    el.innerHTML=`<p class="section-hint">Finish both semifinal picks to unlock 3rd place.</p>`;
    return;
  }
  const isLocked=state.locked.sf;
  const realThird=state.liveResults.thirdPlace;
  el.innerHTML=`
    <p class="section-hint" style="margin-bottom:16px">Pick the 3rd place winner — +16 pts!</p>
    <div class="matches-row" style="justify-content:center">
      <div class="match-card" style="max-width:320px;width:100%">
        ${sfLosers.map(teamName=>{
          const isSel=state.thirdPick===teamName;
          const isWin=realThird===teamName;
          const correct=isSel&&isWin;
          const wrong=isSel&&isLocked&&!isWin&&realThird;
          return `
            <div class="match-team ${isSel?"selected":""} ${correct?"correct":""} ${wrong?"wrong":""}"
                 style="cursor:${isLocked?"default":"pointer"}"
                 onclick="${!isLocked?`pickThird('${teamName}')`:""} ">
              ${flagImg(teamName,"circle")}
              <span class="team-name">${teamName}</span>
              ${correct?'<span class="live-badge correct" style="margin-left:auto">+16</span>':""}
              ${wrong?'<span class="live-badge elim" style="margin-left:auto">✗</span>':""}
              ${isSel&&!isLocked&&!correct?'<span class="check-icon" style="margin-left:auto">✓</span>':""}
            </div>`;
        }).join("")}
      </div>
    </div>
    ${realThird?`<p style="text-align:center;margin-top:12px;color:var(--green-adv);font-size:0.85rem">🥉 Actual 3rd: ${realThird}</p>`:""}
  `;
}

function pickThird(teamName) {
  state.thirdPick=teamName;
  showToast(`🥉 ${teamName} — 3rd place!`);
  saveState(); recalcPoints(); renderThirdPlace();
}

// ===================== FINAL =====================
function renderFinal() {
  const el=document.getElementById("finalDisplay");
  const sfWinners=Object.values(state.sfPicks).filter(Boolean).slice(0,2);
  if (sfWinners.length<2) {
    el.innerHTML=`<p class="section-hint">Finish both semifinal picks to unlock the final.</p>`;
    return;
  }
  const isLocked=state.locked.final;
  const realChamp=state.liveResults.champion;
  el.innerHTML=`
    <p class="section-hint" style="margin-bottom:16px">Pick the World Cup Champion — +32 pts!</p>
    <div class="matches-row" style="justify-content:center">
      <div class="match-card" style="max-width:320px;width:100%">
        ${sfWinners.map(teamName=>{
          const isSel=state.finalPick===teamName;
          const isWin=realChamp===teamName;
          const correct=isSel&&isWin;
          const wrong=isSel&&isLocked&&!isWin&&realChamp;
          return `
            <div class="match-team ${isSel?"selected":""} ${correct?"correct":""} ${wrong?"wrong":""}"
                 style="cursor:${isLocked?"default":"pointer"}"
                 onclick="${!isLocked?`pickChampion('${teamName}')`:""} ">
              ${flagImg(teamName,"circle")}
              <span class="team-name">${teamName}</span>
              ${correct?'<span class="live-badge correct" style="margin-left:auto">+32</span>':""}
              ${wrong?'<span class="live-badge elim" style="margin-left:auto">✗</span>':""}
              ${isSel&&!isLocked&&!correct?'<span class="check-icon" style="margin-left:auto">✓</span>':""}
            </div>`;
        }).join("")}
      </div>
    </div>
  `;
}

function pickChampion(teamName) {
  state.finalPick=teamName;
  document.getElementById("championSection").classList.remove("hidden");
  renderChampion(teamName);
  launchConfetti();
  showToast(`🏆 ${teamName} is your CHAMPION!`,4000);
  saveState(); recalcPoints(); renderFinal();
}

// ===================== CHAMPION =====================
function renderChampion(teamName) {
  const isCorrect=state.liveResults.champion===teamName;
  document.getElementById("championDisplay").innerHTML=`
    <div class="champion-flag">${flagImg(teamName,"rect")}</div>
    <div class="champion-name">${teamName}</div>
    <div class="champion-sub">Your 2026 World Cup Champion</div>
    ${isCorrect?'<div class="champion-sub" style="color:var(--gold);font-size:1rem">🎉 CORRECT! +32 pts</div>':""}
    <div class="champion-sub" style="color:var(--gold);margin-top:8px">Total Points: ${state.totalPoints}</div>
  `;
}

// ===================== RESET =====================
function resetBracket() {
  if (!confirm("Reset your entire bracket? This cannot be undone.")) return;
  localStorage.removeItem("wc2026_state");
  state={
    groupPicks:{},bestThird:[],
    r32Picks:{},r16Picks:{},qfPicks:{},sfPicks:{},
    thirdPick:null,finalPick:null,totalPoints:0,
    liveResults:{groupAdvanced:[],groupEliminated:[],r32Winners:[],r16Winners:[],qfWinners:[],sfWinners:[],thirdPlace:null,champion:null},
    locked:{group:false,r32:false,r16:false,qf:false,sf:false,final:false},
    correctPicks:{group:0,third_pool:0,r32:0,r16:0,qf:0,sf:0,third:0,final:0},
  };
  ["thirdPlacePool","knockoutSection","thirdPlaceSection","finalSection","championSection","ratingSection"]
    .forEach(id=>document.getElementById(id).classList.add("hidden"));
  recalcPoints(); renderGroups();
  showToast("🗑️ Bracket reset!");
}

// ===================== SHARE =====================
document.getElementById("shareBtn").addEventListener("click",()=>{
  const encoded=btoa(unescape(encodeURIComponent(JSON.stringify(state))));
  const url=`${location.origin}${location.pathname}?bracket=${encoded}`;
  navigator.clipboard.writeText(url).then(()=>{
    showToast("📤 Link copied! Send to your friends!");
  }).catch(()=>prompt("Copy this link:",url));
});

function loadFromURL() {
  const b=new URLSearchParams(location.search).get("bracket");
  if (b) {
    try {
      const parsed=JSON.parse(decodeURIComponent(escape(atob(b))));
      if (parsed.groupPicks) Object.keys(parsed.groupPicks).forEach(l=>{
        if (Array.isArray(parsed.groupPicks[l])) delete parsed.groupPicks[l];
      });
      if (!parsed.bestThird) parsed.bestThird=[];
      state={...state,...parsed};
      showToast("👀 Viewing a shared bracket!");
    } catch(e) { console.error("loadFromURL error:",e); }
  }
}

// ===================== INIT =====================
loadFromURL();
loadState();
recalcPoints();
updateCompletion();
renderGroups();

const allGroupsDone=Object.keys(GROUPS).every(l=>{
  const gp=state.groupPicks[l]||{};
  if (Array.isArray(gp)) return false;
  return gp.first&&gp.second&&gp.third;
});
if (allGroupsDone) {
  document.getElementById("thirdPlacePool").classList.remove("hidden");
  renderThirdPlacePool();
}
if ((state.bestThird||[]).length===8) {
  document.getElementById("knockoutSection").classList.remove("hidden");
  renderKnockout();
}
if (state.finalPick) {
  document.getElementById("championSection").classList.remove("hidden");
  renderChampion(state.finalPick);
}

// Init Firebase listener when ready
window.addEventListener("firebaseReady", () => {
  console.log("✅ Firebase ready!");
  initLeaderboardListener();
});
if (window._db) initLeaderboardListener();

fetchLiveResults();
setInterval(fetchLiveResults, 60000);