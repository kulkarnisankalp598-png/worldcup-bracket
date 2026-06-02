// ===================== TOURNAMENT LOCK DATE =====================
const TOURNAMENT_STARTED = new Date() >= new Date("2026-06-11T13:00:00-06:00");

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

function bvFlagImg(teamName) {
  const src = FLAGS[teamName];
  if (!src) return `<div class="bv-flag-placeholder"></div>`;
  return `<img class="bv-flag" src="${src}" alt="${teamName}">`;
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

function getDB()               { return window._db; }
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

// ===================== VISUAL BRACKET RENDERER =====================
function buildBracketVisual(s, liveResults, isReadOnly, container) {
  // Build match arrays from state
  const gp = s.groupPicks || {};
  const g  = l => gp[l] || {};
  const bt = s.bestThird || [];

  const r32Matchups = [
    [g("A").first, g("B").second], [g("C").first, g("D").second],
    [g("E").first, g("F").second], [g("G").first, g("H").second],
    [g("I").first, g("J").second], [g("K").first, g("L").second],
    [g("B").first, g("A").second], [g("D").first, g("C").second],
    [g("F").first, g("E").second], [g("H").first, g("G").second],
    [g("J").first, g("I").second], [g("L").first, g("K").second],
    [bt[0]||null, bt[1]||null], [bt[2]||null, bt[3]||null],
    [bt[4]||null, bt[5]||null], [bt[6]||null, bt[7]||null],
  ];

  const r16Matchups = [];
  for (let i=0;i<16;i+=2) r16Matchups.push([(s.r32Picks||{})[i]||null,(s.r32Picks||{})[i+1]||null]);

  const qfMatchups = [];
  for (let i=0;i<8;i+=2)  qfMatchups.push([(s.r16Picks||{})[i]||null,(s.r16Picks||{})[i+1]||null]);

  const sfMatchups = [];
  for (let i=0;i<4;i+=2)  sfMatchups.push([(s.qfPicks||{})[i]||null,(s.qfPicks||{})[i+1]||null]);

  const finMatchup = [(s.sfPicks||{})[0]||null, (s.sfPicks||{})[1]||null];
  const champion   = s.finalPick || null;

  const live = liveResults || { r32Winners:[], r16Winners:[], qfWinners:[], sfWinners:[], champion:null };

  // Match height = 62px (2x 31px slots)
  // Spacing between matches in each round:
  const MATCH_H = 62;
  const spacings = [4, 4+MATCH_H, 4+MATCH_H*3, 4+MATCH_H*7];

  const rounds = [
    { label:"R32  +2pts",  matchups: r32Matchups, picks: s.r32Picks||{}, winners: live.r32Winners, pickKey:"r32Picks", pts:POINTS.r32, spacing: spacings[0] },
    { label:"R16  +4pts",  matchups: r16Matchups, picks: s.r16Picks||{}, winners: live.r16Winners, pickKey:"r16Picks", pts:POINTS.r16, spacing: spacings[1] },
    { label:"QF   +8pts",  matchups: qfMatchups,  picks: s.qfPicks||{},  winners: live.qfWinners,  pickKey:"qfPicks",  pts:POINTS.qf,  spacing: spacings[2] },
    { label:"SF  +16pts",  matchups: sfMatchups,  picks: s.sfPicks||{},  winners: live.sfWinners,  pickKey:"sfPicks",  pts:POINTS.sf,  spacing: spacings[3] },
  ];

  const wrap = document.createElement("div");
  wrap.className = "bracket-scroll-wrap";
  const visual = document.createElement("div");
  visual.className = "bracket-visual";
  wrap.appendChild(visual);

  rounds.forEach((round, roundIdx) => {
    const roundDiv = document.createElement("div");
    roundDiv.className = "bv-round";

    const header = document.createElement("div");
    header.className = "bv-round-header";
    header.textContent = round.label;
    roundDiv.appendChild(header);

    const matchesDiv = document.createElement("div");
    matchesDiv.className = "bv-matches";

    round.matchups.forEach(([t1, t2], matchIdx) => {
      const matchGroup = document.createElement("div");
      matchGroup.className = "bv-match-group";
      if (matchIdx > 0) matchGroup.style.marginTop = round.spacing + "px";

      const matchDiv = document.createElement("div");
      matchDiv.className = "bv-match";

      [t1, t2].forEach((teamName, slotIdx) => {
        const currentPick = round.picks[matchIdx];
        const isSelected  = teamName && currentPick === teamName;
        const isWinner    = teamName && round.winners.includes(teamName);
        const isCorrect   = isSelected && isWinner;
        const isLocked    = TOURNAMENT_STARTED || (state.locked && state.locked[round.pickKey?.replace("Picks","")]);
        const isWrong     = isSelected && isLocked && !isWinner && round.winners.length > 0;
        const isTBD       = !teamName;

        const teamDiv = document.createElement("div");
        teamDiv.className = "bv-team"
          + (isTBD ? " tbd" : "")
          + (isSelected && !isCorrect && !isWrong ? " selected" : "")
          + (isCorrect ? " correct" : "")
          + (isWrong   ? " wrong"   : "")
          + (isLocked || isReadOnly ? " locked" : "");

        teamDiv.innerHTML = `
          ${isTBD ? '<div class="bv-flag-placeholder"></div>' : bvFlagImg(teamName)}
          <span class="bv-name ${isTBD?"tbd-name":""}">${teamName || "TBD"}</span>
          ${isCorrect ? `<span class="bv-badge correct">+${round.pts}</span>` : ""}
          ${isWrong   ? `<span class="bv-badge wrong">✗</span>` : ""}
        `;

        // Info button (only for real teams)
        if (teamName && !isReadOnly) {
          const infoBtn = document.createElement("button");
          infoBtn.className = "bv-info-btn";
          infoBtn.textContent = "ℹ";
          infoBtn.title = `Info: ${teamName}`;
          infoBtn.addEventListener("click", e => {
            e.stopPropagation();
            // Find team in GROUPS
            let foundTeam = null, foundGroup = null;
            Object.entries(GROUPS).forEach(([letter, teams]) => {
              const t = teams.find(t => t.name === teamName);
              if (t) { foundTeam = t; foundGroup = letter; }
            });
            if (foundTeam) openModal(foundTeam, foundGroup);
          });
          teamDiv.appendChild(infoBtn);
        }

        // Click to pick (only if not read-only and not locked)
        if (teamName && !isTBD && !isLocked && !isReadOnly) {
          teamDiv.style.cursor = "pointer";
          teamDiv.addEventListener("click", () => {
            if (!state[round.pickKey]) state[round.pickKey] = {};
            state[round.pickKey][matchIdx] = teamName;
            showToast(`⚡ ${teamName} advances!`);
            saveState(); recalcPoints(); renderKnockout();
          });
        }

        matchDiv.appendChild(teamDiv);
      });

      matchGroup.appendChild(matchDiv);

      // Connector to next round (right side bracket lines)
      if (roundIdx < rounds.length) {
        const connHeight = MATCH_H + round.spacing;
        const isEven = matchIdx % 2 === 0;
        const conn = document.createElement("div");
        conn.className = "bv-connector";
        conn.style.height = connHeight + "px";
        const top = document.createElement("div");
        top.className = "bv-connector-top";
        const bot = document.createElement("div");
        bot.className = "bv-connector-bottom";
        conn.appendChild(top);
        conn.appendChild(bot);
        matchGroup.appendChild(conn);
      }

      matchesDiv.appendChild(matchGroup);
    });

    roundDiv.appendChild(matchesDiv);
    visual.appendChild(roundDiv);
  });

  // Final round
  const finalDiv = document.createElement("div");
  finalDiv.className = "bv-round";

  const finalHeader = document.createElement("div");
  finalHeader.className = "bv-round-header";
  finalHeader.textContent = "Final +32pts";
  finalDiv.appendChild(finalHeader);

  const finalMatchDiv = document.createElement("div");
  finalMatchDiv.className = "bv-match";
  finalMatchDiv.style.marginTop = spacings[3]*3.5+"px";

  [finMatchup[0], finMatchup[1]].forEach(teamName => {
    const isSelected = teamName && champion === teamName;
    const isWinner   = teamName && live.champion === teamName;
    const isCorrect  = isSelected && isWinner;
    const isLocked   = TOURNAMENT_STARTED || state.locked?.final;
    const isWrong    = isSelected && isLocked && !isWinner && live.champion;
    const isTBD      = !teamName;

    const teamDiv = document.createElement("div");
    teamDiv.className = "bv-team"
      + (isTBD ? " tbd" : "")
      + (isSelected && !isCorrect && !isWrong ? " selected" : "")
      + (isCorrect ? " correct" : "")
      + (isWrong   ? " wrong"   : "")
      + (isLocked || isReadOnly ? " locked" : "");

    teamDiv.innerHTML = `
      ${isTBD ? '<div class="bv-flag-placeholder"></div>' : bvFlagImg(teamName)}
      <span class="bv-name ${isTBD?"tbd-name":""}">${teamName || "TBD"}</span>
      ${isCorrect ? `<span class="bv-badge correct">+32</span>` : ""}
      ${isWrong   ? `<span class="bv-badge wrong">✗</span>` : ""}
    `;

    if (teamName && !isTBD && !isLocked && !isReadOnly) {
      teamDiv.style.cursor = "pointer";
      teamDiv.addEventListener("click", () => {
        state.finalPick = teamName;
        document.getElementById("championSection").classList.remove("hidden");
        renderChampion(teamName);
        launchConfetti();
        showToast(`🏆 ${teamName} is your CHAMPION!`, 4000);
        saveState(); recalcPoints(); renderKnockout();
      });
    }

    finalMatchDiv.appendChild(teamDiv);
  });

  finalDiv.appendChild(finalMatchDiv);

  // Connector from SF to Final
  const finalConn = document.createElement("div");
  finalConn.style.cssText = `width:20px;flex-shrink:0;border-top:1px solid rgba(245,197,24,0.35);margin-top:${spacings[3]*3.5 + MATCH_H/2 - 0.5}px;`;
  visual.appendChild(finalConn);
  visual.appendChild(finalDiv);

  // Champion display
  const champConn = document.createElement("div");
  champConn.style.cssText = `width:20px;flex-shrink:0;border-top:1px solid var(--gold);margin-top:${spacings[3]*3.5 + MATCH_H/2 - 0.5}px;`;
  visual.appendChild(champConn);

  const champDiv = document.createElement("div");
  champDiv.className = "bv-round";
  champDiv.style.marginTop = spacings[3]*3.5 + "px";

  if (champion) {
    champDiv.innerHTML = `
      <div class="bv-champion">
        <div class="bv-champion-trophy">🏆</div>
        <img class="bv-champion-flag" src="${FLAGS[champion]||''}" alt="${champion}">
        <div class="bv-champion-name">${champion}</div>
        <div class="bv-champion-label">Champion</div>
      </div>
    `;
  } else {
    champDiv.innerHTML = `
      <div class="bv-champion" style="opacity:0.4">
        <div class="bv-champion-trophy">🏆</div>
        <div class="bv-flag-placeholder" style="width:44px;height:44px;border-radius:50%;"></div>
        <div class="bv-champion-name" style="font-size:0.7rem;color:var(--gray)">TBD</div>
        <div class="bv-champion-label">Champion</div>
      </div>
    `;
  }

  visual.appendChild(champDiv);
  container.appendChild(wrap);
}

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
  if (TOURNAMENT_STARTED) { showToast("🔒 Tournament has started — brackets are locked!"); return; }

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
    localStorage.setItem("wc2026_myname", name);
    input.value = "";
  } catch(e) {
    console.error("Firebase save error:", e);
    showToast("⚠️ Could not save — check connection");
  } finally {
    if (btn) { btn.textContent="💾 Save My Bracket"; btn.disabled=false; }
  }
}

async function deleteEntry(name) {
  if (TOURNAMENT_STARTED) { showToast("🔒 Tournament has started — brackets are locked!"); return; }
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
  entries.sort((a, b) => b.points - a.points);
  const medals = ["🥇","🥈","🥉"];
  const myName = localStorage.getItem("wc2026_myname") || "";

  el.innerHTML = entries.map((e, i) => `
    <div class="leaderboard-row ${i===0?"first":""}">
      <span class="lb-rank">${medals[i]||"#"+(i+1)}</span>
      <span class="lb-name-clickable" onclick='viewBracket(${JSON.stringify(e).replace(/</g,"&lt;").replace(/>/g,"&gt;")})'>${e.name} 👁</span>
      <span class="lb-champion">
        ${e.champion&&FLAGS[e.champion]
          ? `<img class="flag flag-circle" src="${FLAGS[e.champion]}" style="width:22px;height:22px"> ${e.champion}`
          : e.champion||"TBD"}
      </span>
      <span class="lb-pts">${e.points} pts</span>
      <span class="lb-date">${e.savedAt}</span>
      ${!TOURNAMENT_STARTED && myName.toLowerCase()===e.name.toLowerCase()
        ? `<button class="lb-delete" onclick="deleteEntry('${e.name}')">✕</button>`
        : '<span style="width:24px"></span>'}
    </div>
  `).join("");
}

async function recalcLeaderboardScores(entries) {
  const db = getDB();
  if (!db||!entries.length||!state.liveResults.groupAdvanced.length) return;
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

// ===================== BRACKET VIEWER =====================
function viewBracket(entryJson) {
  const entry = typeof entryJson === "string" ? JSON.parse(entryJson) : entryJson;
  if (!entry.bracket) { showToast("⚠️ No bracket data saved"); return; }

  let s;
  try {
    s = JSON.parse(decodeURIComponent(escape(atob(entry.bracket))));
  } catch(e) { showToast("⚠️ Could not load bracket"); return; }

  const existing = document.getElementById("bracketViewerModal");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.className = "bracket-modal-overlay";
  overlay.id = "bracketViewerModal";

  const card = document.createElement("div");
  card.className = "bracket-modal-card";

  card.innerHTML = `
    <button class="modal-close" onclick="document.getElementById('bracketViewerModal').remove()">✕</button>
    <div class="bracket-viewer-header">
      <div class="bracket-viewer-name">${entry.name}'s Bracket</div>
      <div class="bracket-viewer-pts">${entry.points} pts</div>
    </div>
    <p style="color:var(--gray);font-size:0.75rem;letter-spacing:1px;margin-bottom:12px">Scroll right to see full bracket →</p>
  `;

  // Build visual bracket in read-only mode
  buildBracketVisual(s, state.liveResults, true, card);

  // Also show group picks summary below
  const groupSummary = document.createElement("div");
  groupSummary.style.marginTop = "24px";
  groupSummary.innerHTML = `
    <div style="font-family:var(--font-display);font-size:1rem;letter-spacing:3px;color:var(--gold);margin-bottom:12px;padding-top:16px;border-top:1px solid var(--card-border)">GROUP PICKS</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px">
      ${Object.entries(s.groupPicks||{}).map(([letter, gp]) => {
        if (!gp || Array.isArray(gp)) return "";
        return `
          <div style="background:var(--card-bg);border:1px solid var(--card-border);border-radius:8px;padding:8px 10px">
            <div style="font-size:0.65rem;color:var(--gold);letter-spacing:2px;font-family:var(--font-display);margin-bottom:6px">GROUP ${letter}</div>
            ${gp.first  ? `<div style="display:flex;align-items:center;gap:6px;font-size:0.72rem;margin-bottom:3px">${bvFlagImg(gp.first)} 🥇 ${gp.first}</div>`  : ""}
            ${gp.second ? `<div style="display:flex;align-items:center;gap:6px;font-size:0.72rem;margin-bottom:3px">${bvFlagImg(gp.second)} 🥈 ${gp.second}</div>` : ""}
            ${gp.third  ? `<div style="display:flex;align-items:center;gap:6px;font-size:0.72rem">${bvFlagImg(gp.third)} 🥉 ${gp.third}</div>`                   : ""}
          </div>
        `;
      }).join("")}
    </div>
  `;
  card.appendChild(groupSummary);

  overlay.appendChild(card);
  overlay.addEventListener("click", e => { if (e.target===overlay) overlay.remove(); });
  document.body.appendChild(overlay);
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
  const isLocked=state.locked.group||TOURNAMENT_STARTED;

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
  if (state.locked.group||TOURNAMENT_STARTED) return;
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
    if (!TOURNAMENT_STARTED) card.addEventListener("click",()=>toggleBestThird(name));
    grid.appendChild(card);
  });

  if ((state.bestThird||[]).length===8) {
    document.getElementById("knockoutSection").classList.remove("hidden");
    renderKnockout();
  }
}

function toggleBestThird(teamName) {
  if (TOURNAMENT_STARTED) { showToast("🔒 Tournament has started — brackets are locked!"); return; }
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

// ===================== KNOCKOUT — VISUAL BRACKET =====================
function renderKnockout() {
  const container = document.getElementById("knockoutBracket");
  container.innerHTML = "";
  buildBracketVisual(state, state.liveResults, false, container);

  // Show 3rd place and final sections below
  const sfPicks = Object.values(state.sfPicks).filter(Boolean);
  if (sfPicks.length >= 2) {
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
  const isLocked=state.locked.sf||TOURNAMENT_STARTED;
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
  if (TOURNAMENT_STARTED) { showToast("🔒 Tournament has started — brackets are locked!"); return; }
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
  const isLocked=state.locked.final||TOURNAMENT_STARTED;
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
  if (TOURNAMENT_STARTED) { showToast("🔒 Tournament has started — brackets are locked!"); return; }
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
  if (TOURNAMENT_STARTED) { showToast("🔒 Tournament has started — brackets are locked!"); return; }
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

window.addEventListener("firebaseReady",()=>{
  console.log("✅ Firebase ready!");
  initLeaderboardListener();
});
if (window._db) initLeaderboardListener();

fetchLiveResults();
setInterval(fetchLiveResults, 60000);