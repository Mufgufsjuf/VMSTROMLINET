const DEFAULT_AVATAR =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
    <rect width="120" height="120" rx="60" fill="#172145"/>
    <circle cx="60" cy="45" r="22" fill="#5dd4ff" opacity="0.9"/>
    <path d="M24 100c6-18 21-28 36-28s30 10 36 28" fill="#5dd4ff" opacity="0.9"/>
  </svg>
`);

const SESSION_KEY = "vmstromlinet_session_v2";

const BONUS_RULES = [
  {
    key: "profile_image",
    title: "Ansigt på spilleren",
    description: "Upload et profilbillede.",
    points: 1
  },
  {
     key: "complete_group",
  title: "Gruppeklar",
  description: "Udfyld alle kampe i Runde 1.",
  points: 1
  },
  {
    key: "complete_quiz",
    title: "13'er-mester",
    description: "Udfyld hele tip en 13'er.",
    points: 1
  },
  {
    key: "underdog_win",
    title: "Tror du selv på den?!?",
    description: "Du satte dine sparekroner på en vaskeægte underdog – og fik ret! Ét af disse hold vinder en kamp: Haiti, Jordan eller Curaçao.",
    points: 1
  },
  {
    key: "big_score",
    title: "Jubeloptimist",
    description: "Du gik all-in på målshow – og fik ret. Ét hold scorer 6+ mål i en kamp.",
    points: 1
  },
  {
    key: "unique_exact_score",
    title: "Du ved bedst",
    description: "Du stod alene på toppen – eneste spiller med korrekt score i en kamp.",
    points: 1
  },
  {
    key: "exact_scores_5",
    title: "Er du synsk?",
    description: "5 præcise scoreforudsigelser – begynder det at ligne noget?",
    points: 1
  },
  {
    key: "exact_scores_10",
    title: "Nu bass'er du lige ned makker",
    description: "10 korrekte scores. Nu begynder folk at blive mistænksomme…",
    points: 2
  },
  {
    key: "exact_scores_15",
    title: "Fodboldorakel",
    description: "15 præcise scores. Har du en insider? Eller bare for god?",
    points: 3
  },
  {
    key: "exact_scores_20",
    title: "VAR, men bedre",
    description: "20 korrekte scores. Du ser ting, selv VAR ikke kan finde.",
    points: 4
  },
  {
    key: "correct_results_5",
    title: "Har du oddset før?",
    description: "5 rigtige resultater. Du er måske ikke ny i det her spil…",
    points: 1
  },
  {
    key: "correct_results_10",
    title: "Du oddser meget",
    description: "10 rigtige resultater. Det begynder at ligne en vane.",
    points: 2
  },
  {
    key: "correct_results_15",
    title: "Det der er ikke held…",
    description: "15 rigtige resultater. Nu begynder det at blive suspekt.",
    points: 3
  },
  {
    key: "correct_results_20",
    title: "Ring til ROFUS",
    description: "20 rigtige resultater. Vi er bekymrede for dig. Men også imponerede.",
    points: 4
  }
];

function getBonus(user) {
  if (!user) {
    return {
      points: 0,
      unlocked: [],
      items: []
    };
  }

  const unlocked = [];
  const items = [];

  const hasProfileImage = !!user.avatar && user.avatar !== DEFAULT_AVATAR;

  const groupPredictions = state.predictions.group[user.id] || {};

const round1Matches = state.groupMatches
  .slice()
  .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff))
  .slice(0, 22);

const hasCompletedGroup =
  round1Matches.length === 22 &&
  round1Matches.every((match) => {
    const pred = groupPredictions[match.id];

    return (
      pred &&
      pred.home !== "" &&
      pred.home != null &&
      pred.away !== "" &&
      pred.away != null
    );
  });


  const quizPredictions = state.predictions.quiz[user.id] || {};
  const hasCompletedQuiz =
    state.quizQuestions.length > 0 &&
    state.quizQuestions.every((q) => {
      const answer = quizPredictions[q.id];
      return answer !== "" && answer != null;
    });

  let correctResults = 0;
  let correctScores = 0;
  let hasUnderdogWin = false;
  let hasBigScore = false;
  let hasUniqueExactScore = false;

  state.groupMatches.forEach((match) => {
    const pred = groupPredictions[match.id];
    const res = state.results.group[match.id];

    if (!pred || res?.home === "" || res?.away === "" || res?.home == null || res?.away == null) {
      return;
    }

    const predHome = Number(pred.home);
    const predAway = Number(pred.away);
    const resHome = Number(res.home);
    const resAway = Number(res.away);

    const predOutcome = getOutcome(predHome, predAway);
    const actualOutcome = getOutcome(resHome, resAway);

    if (predOutcome === actualOutcome) {
      correctResults += 1;
    }

    if (predHome === resHome && predAway === resAway) {
      correctScores += 1;

      const exactGuessers = state.users
        .filter((u) => u.role === "user")
        .filter((u) => {
          const otherPred = state.predictions.group[u.id]?.[match.id];
          if (!otherPred) return false;

          return Number(otherPred.home) === resHome && Number(otherPred.away) === resAway;
        });

      if (exactGuessers.length === 1 && String(exactGuessers[0].id) === String(user.id)) {
        hasUniqueExactScore = true;
      }
    }

    const underdogTeams = ["Haiti", "Jordan", "Curaçao", "Curacao"];
    const homeIsUnderdog = underdogTeams.includes(match.homeTeam);
    const awayIsUnderdog = underdogTeams.includes(match.awayTeam);

    if (predHome === resHome && predAway === resAway) {
      if (homeIsUnderdog && resHome > resAway) hasUnderdogWin = true;
      if (awayIsUnderdog && resAway > resHome) hasUnderdogWin = true;
    }

    if (predHome > 5 || predAway > 5) {
      hasBigScore = true;
    }
  });

  BONUS_RULES.forEach((rule) => {
    let unlockedNow = false;

    if (rule.key === "profile_image") unlockedNow = hasProfileImage;
    if (rule.key === "complete_group") unlockedNow = hasCompletedGroup;
    if (rule.key === "complete_quiz") unlockedNow = hasCompletedQuiz;

    if (rule.key === "underdog_win") unlockedNow = hasUnderdogWin;
    if (rule.key === "big_score") unlockedNow = hasBigScore;
    if (rule.key === "unique_exact_score") unlockedNow = hasUniqueExactScore;

    if (rule.key === "exact_scores_5") unlockedNow = correctScores >= 5;
    if (rule.key === "exact_scores_10") unlockedNow = correctScores >= 10;
    if (rule.key === "exact_scores_15") unlockedNow = correctScores >= 15;
    if (rule.key === "exact_scores_20") unlockedNow = correctScores >= 20;

    if (rule.key === "correct_results_5") unlockedNow = correctResults >= 5;
    if (rule.key === "correct_results_10") unlockedNow = correctResults >= 10;
    if (rule.key === "correct_results_15") unlockedNow = correctResults >= 15;
    if (rule.key === "correct_results_20") unlockedNow = correctResults >= 20;

    if (unlockedNow) unlocked.push(rule.key);

    items.push({
      key: rule.key,
      title: rule.title,
      description: rule.description,
      points: rule.points,
      unlocked: unlockedNow
    });
  });

  const points = items
    .filter((item) => item.unlocked)
    .reduce((sum, item) => sum + item.points, 0);

  return { points, unlocked, items };
}

const app = document.getElementById("app");
const topnav = document.getElementById("topnav");
const sessionInfo = document.getElementById("sessionInfo");
const toastContainer = document.getElementById("toastContainer");

let state = null;
let currentPage = "home";
let countdownTimers = [];

init();

async function init() {
  bindGlobalHashRouting();
  await refreshState();
  renderNav();
  renderCurrentPage();

  setInterval(async () => {
    const livePages = ["home", "groups", "live"];
    if (!livePages.includes(currentPage)) return;

    try {
      await refreshState(false);
      renderCurrentPage();
    } catch (error) {
      console.error(error);
    }
  }, 30000);
}

async function api(path, options = {}) {
  const session = getSession();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (session?.user?.id) {
    headers["x-user-id"] = session.user.id;
  }

  const response = await fetch(path, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Der opstod en fejl");
  }

  return data;
}

async function refreshState(renderAfter = true) {
  state = await api("/api/bootstrap", { method: "GET" });
  const session = getSession();

  if (session?.user?.id) {
    const freshUser = state.users.find((u) => u.id === session.user.id);
    if (freshUser) {
      setSession(freshUser);
    } else {
      clearSession();
    }
  }

  if (renderAfter) {
    renderNav();
    renderCurrentPage();
  }
}

function getSession() {
  return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
}

function setSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ user }));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function currentUser() {
  return getSession()?.user || null;
}

function bindGlobalHashRouting() {
  window.addEventListener("hashchange", () => {
    currentPage = window.location.hash.replace("#", "") || "home";
    renderNav();
    renderCurrentPage();
  });
  currentPage = window.location.hash.replace("#", "") || "home";
}

function renderNav() {
  const user = currentUser();

  const overviewItems = [
    ["home", "🏠", "Forside"],
    ["leaderboard", "🏆", "Rangliste"],
    ["groups", "📋", "Grupper"],
    ["live", "🔥", "Hvis det sluttede nu"],
    ["bonus", "🎁", "Bonuspoint"]
  ];

  const playItems = [
    ["group", "⚽", "Mine Bud"],
    ["knockout", "🥇", "Knockout"],
    ["quiz", "🧠", "Tip en 13'er"]
  ];

  let profileItems = [];

  if (!user) {
    profileItems = [["auth", "🔐", "Login / Opret bruger"]];
  } else if (user.role === "admin") {
    profileItems = [
      ["admin", "🛠️", "Admin"],
      ["profile", "👤", "Min profil"]
    ];
  } else {
    profileItems = [["profile", "👤", "Min profil"]];
  }

  topnav.innerHTML = `
    <div class="nav-group">
      <div class="nav-group-label">Overblik</div>
      <div class="nav-group-items">
        ${overviewItems.map(([key, icon, label]) => `
          <button class="nav-btn ${currentPage === key ? "active" : ""}" data-page="${key}">
            <span class="nav-icon">${icon}</span>
            <span class="nav-label">${label}</span>
          </button>
        `).join("")}
      </div>
    </div>

    ${user && user.role !== "admin" ? `
      <div class="nav-group">
        <div class="nav-group-label">Mit spil</div>
        <div class="nav-group-items">
          ${playItems.map(([key, icon, label]) => `
            <button class="nav-btn ${currentPage === key ? "active" : ""}" data-page="${key}">
              <span class="nav-icon">${icon}</span>
              <span class="nav-label">${label}</span>
            </button>
          `).join("")}
        </div>
      </div>
    ` : ""}
  `;

  topnav.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      location.hash = btn.dataset.page;
    });
  });

  if (user) {
    sessionInfo.innerHTML = `
      <div class="session-card">
        <div class="session-user">
          Logget ind som <strong>${escapeHtml(user.name)}</strong>
        </div>

        <button class="btn ghost" id="logoutBtn">Log ud</button>

        <div class="session-subnav">
          <div class="nav-group-label">Profil</div>
          <div class="session-subnav-items">
            ${profileItems.map(([key, icon, label]) => `
              <button class="nav-btn ${currentPage === key ? "active" : ""}" data-page="${key}">
                <span class="nav-icon">${icon}</span>
                <span class="nav-label">${label}</span>
              </button>
            `).join("")}
          </div>
        </div>
      </div>
    `;
    document.getElementById("logoutBtn")?.addEventListener("click", logout);
  } else {
    sessionInfo.innerHTML = `
      <div class="session-card">
        <div class="session-user">Ikke logget ind</div>

        <div class="session-subnav">
          <div class="nav-group-label">Profil</div>
          <div class="session-subnav-items">
            ${profileItems.map(([key, icon, label]) => `
              <button class="nav-btn ${currentPage === key ? "active" : ""}" data-page="${key}">
                <span class="nav-icon">${icon}</span>
                <span class="nav-label">${label}</span>
              </button>
            `).join("")}
          </div>
        </div>
      </div>
    `;
  }

  sessionInfo.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      location.hash = btn.dataset.page;
    });
  });
}

function renderCurrentPage() {
  clearCountdown();
  const user = currentUser();

  if (["group", "knockout", "quiz", "profile"].includes(currentPage) && !user) {
    location.hash = "auth";
    return;
  }

  if (currentPage === "admin" && user?.role !== "admin") {
    location.hash = "home";
    return;
  }

  switch (currentPage) {
    case "home": renderHome(); break;
    case "auth": renderAuth(); break;
    case "profile": renderProfile(); break;
    case "group": renderGroupPredictions(); break;
    case "knockout": renderKnockout(); break;
    case "quiz": renderQuiz(); break;
    case "leaderboard": renderLeaderboard(); break;
    case "bonus": renderBonusPage(); break;
    case "admin": renderAdmin(); break;
    case "groups": renderGroups(); break;
    case "live": renderLiveQualification(); break;
    default: location.hash = "home";
  }
}

function renderHome() {
  app.innerHTML = document.getElementById("homeTemplate").innerHTML;

  const deadlineCard = document.getElementById("countdown")?.closest(".card");
  if (deadlineCard) {
    deadlineCard.insertAdjacentHTML("beforeend", `
      <div class="home-rounds-wrap">
        <div class="section-head">
          <div>
            <p class="eyebrow">Mine Bud</p>
            <h2>Næste åbninger</h2>
          </div>
        </div>

        <div class="simple-list home-round-list">
          <div class="simple-item home-round-item">
            <div class="home-round-label">Runde 2 åbner</div>
            <div class="home-round-time" id="homeRound2Countdown">--</div>
          </div>

          <div class="simple-item home-round-item">
            <div class="home-round-label">Runde 3 åbner</div>
            <div class="home-round-time" id="homeRound3Countdown">--</div>
          </div>
        </div>
      </div>
    `);
  }

  function updateHomeRoundCountdowns() {
    const roundLocks = getRoundStartTimes();

    const round2El = document.getElementById("homeRound2Countdown");
    const round3El = document.getElementById("homeRound3Countdown");

    if (round2El) {
      round2El.textContent = getCountdownText(roundLocks.round2OpenAt) || "Åben";
    }

    if (round3El) {
      round3El.textContent = getCountdownText(roundLocks.round3OpenAt) || "Åben";
    }
  }

  startCountdown();
  updateHomeRoundCountdowns();
  countdownTimers.push(setInterval(updateHomeRoundCountdowns, 1000));
}

function renderAuth() {
  app.innerHTML = document.getElementById("authTemplate").innerHTML;
  populateDepartmentSelect(document.getElementById("registerDepartmentSelect"), "");

  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData(e.target);
      const data = await api("/api/login", {
        method: "POST",
        body: JSON.stringify({
          identifier: String(fd.get("identifier")).trim(),
          password: String(fd.get("password"))
        })
      });
      setSession(data.user);
      await refreshState();
      toast(`Velkommen ${data.user.name}`);
      location.hash = data.user.role === "admin" ? "admin" : "home";
    } catch (error) {
      toast(error.message, "error");
    }
  });

  document.getElementById("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData(e.target);
      const data = await api("/api/register", {
        method: "POST",
        body: JSON.stringify({
          name: String(fd.get("name")).trim(),
          email: String(fd.get("email")).trim(),
          password: String(fd.get("password")),
          departmentId: String(fd.get("departmentId"))
        })
      });
      setSession(data.user);
      await refreshState();
      toast("Bruger oprettet.");
      location.hash = "group";
    } catch (error) {
      toast(error.message, "error");
    }
  });
}

function renderProfile() {
  const user = currentUser();
  app.innerHTML = document.getElementById("profileTemplate").innerHTML;

  const form = document.getElementById("profileForm");
  form.name.value = user.name;
  form.email.value = user.email;
  populateDepartmentSelect(document.getElementById("profileDepartmentSelect"), user.departmentId);
  document.getElementById("profilePreview").src = user.avatar || DEFAULT_AVATAR;

  document.getElementById("profileImageInput").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    document.getElementById("profilePreview").src = base64;
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData(form);
      const data = await api("/api/profile", {
        method: "PUT",
        body: JSON.stringify({
          name: String(fd.get("name")).trim(),
          email: String(fd.get("email")).trim(),
          departmentId: String(fd.get("departmentId")),
          password: String(fd.get("password")),
          avatar: document.getElementById("profilePreview").src
        })
      });
      setSession(data.user);
      await refreshState();
      toast("Profil gemt.");
    } catch (error) {
      toast(error.message, "error");
    }
  });
}

function renderGroupPredictions() {
  const user = currentUser();
  app.innerHTML = document.getElementById("groupTemplate").innerHTML;
  const container = document.getElementById("groupMatchesContainer");

  const saved = state.predictions.group[user.id] || {};
  const roundLocks = getRoundStartTimes();

  function getRound(kickoff) {
    const d = new Date(kickoff);
    if (d < new Date("2026-06-18T00:00:00")) return "Runde 1";
    if (d < new Date("2026-06-24T00:00:00")) return "Runde 2";
    return "Runde 3";
  }

  function isRoundOpen(round) {
    const now = new Date();

    if (round === "Runde 1") {
      return true;
    }

    if (round === "Runde 2") {
      return roundLocks.round2OpenAt ? now >= new Date(roundLocks.round2OpenAt) : false;
    }

    if (round === "Runde 3") {
      return roundLocks.round3OpenAt ? now >= new Date(roundLocks.round3OpenAt) : false;
    }

    return false;
  }

  function getRoundCountdown(round) {
    const now = new Date();

    if (round === "Runde 2" && roundLocks.round2OpenAt) {
      const diff = new Date(roundLocks.round2OpenAt) - now;
      return diff > 0 ? getCountdownText(roundLocks.round2OpenAt) : "";
    }

    if (round === "Runde 3" && roundLocks.round3OpenAt) {
      const diff = new Date(roundLocks.round3OpenAt) - now;
      return diff > 0 ? getCountdownText(roundLocks.round3OpenAt) : "";
    }

    return "";
  }

  const rounds = {
    "Runde 1": [],
    "Runde 2": [],
    "Runde 3": []
  };

  state.groupMatches.forEach((match) => {
    const r = getRound(match.kickoff);
    rounds[r].push(match);
  });

  container.innerHTML = Object.entries(rounds).map(([roundName, matches]) => {
  const open = isRoundOpen(roundName);
  const countdown = getRoundCountdown(roundName);

  return `
    <div class="round-section-card">
      <div class="round-header">
        <h2 class="round-title">${roundName}</h2>

        <div class="round-header-meta">
          <span class="round-status ${open ? "open" : "locked"}">
            ${open ? "Åben" : "Låst"}
          </span>
          ${countdown ? `<span class="round-timer" data-round-timer="${roundName}">${countdown}</span>` : ""}
        </div>
      </div>

      ${matches.map((match) => {
        const p = saved[match.id] || {};

        return `
          <div class="match-card">
            <div class="match-card-top">
              <span class="match-group-badge">${escapeHtml(match.stage || "")}</span>
            </div>

            <div class="match-card-teams">
              <strong>${escapeHtml(match.homeTeam)}</strong>
              <span class="match-card-vs">vs.</span>
              <strong>${escapeHtml(match.awayTeam)}</strong>
            </div>

            <div class="match-card-inputs">
              <input type="number" min="0" placeholder="H" data-id="${match.id}" data-side="home" value="${p.home ?? ""}" ${!open ? "disabled" : ""}>
              <input type="number" min="0" placeholder="U" data-id="${match.id}" data-side="away" value="${p.away ?? ""}" ${!open ? "disabled" : ""}>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}).join("");

  function updateRoundTimers() {
  document.querySelectorAll("[data-round-timer]").forEach((el) => {
    const roundName = el.dataset.roundTimer;
    el.textContent = getRoundCountdown(roundName);
  });
}

  updateRoundTimers();
  countdownTimers.push(setInterval(updateRoundTimers, 1000));

  document.getElementById("groupPredictionsForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const result = structuredClone(saved);

    container.querySelectorAll("input").forEach((input) => {
      if (input.disabled) return;

      const id = input.dataset.id;
      const side = input.dataset.side;

      result[id] ||= {};
      result[id][side] = Math.max(0, Number(input.value));
    });

try {
  await api("/api/predictions/group", {
    method: "POST",
    body: JSON.stringify(result)
  });
  await refreshState();
  toast("Gemt!");
} catch (error) {
      toast(error.message, "error");
    }
  });
}

function renderKnockout() {
  const user = currentUser();
  app.innerHTML = document.getElementById("knockoutTemplate").innerHTML;
  const container = document.getElementById("knockoutContainer");
  const locked = isKnockoutLocked();
  const enabled = state.settings.knockoutEnabled;
  document.getElementById("knockoutLockStatus").textContent = !enabled ? "Ikke åbnet endnu" : locked ? "Låst" : "Åben";

  if (!enabled) {
    container.innerHTML = `<div class="simple-item">Knockoutspillet bliver åbnet af admin, når gruppespillet er afsluttet.</div>`;
    return;
  }

  if (!state.knockoutMatches.length) {
    container.innerHTML = `<div class="simple-item">Admin har ikke oprettet knockoutkampe endnu.</div>`;
    return;
  }

  const saved = state.predictions.knockout[user.id] || {};
  container.innerHTML = state.knockoutMatches.map((match) => {
    const val = saved[match.id] || "";
    return `
      <div class="bracket-card">
        <div class="match-card-head">
          <strong>${escapeHtml(match.round)}</strong>
          <span class="match-meta">${escapeHtml(match.slot)}</span>
        </div>
        <label>
          Hvem går videre fra ${escapeHtml(match.labelA)} vs. ${escapeHtml(match.labelB)}?
          <input type="text" data-knockout-id="${match.id}" value="${escapeHtml(val)}" placeholder="Skriv holdnavn" ${locked ? "disabled" : ""} />
        </label>
      </div>
    `;
  }).join("") + `
    <div class="bracket-card">
      <div class="match-card-head">
        <strong>VM-vinder</strong>
        <span class="match-meta">Bonus +5 point</span>
      </div>
      <label>
        Hvem vinder VM?
        <input type="text" id="winnerInput" value="${escapeHtml(saved.__winner || "")}" placeholder="Skriv holdnavn" ${locked ? "disabled" : ""} />
      </label>
    </div>
  `;

  document.getElementById("knockoutForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!enabled || locked) return toast("Knockoutspillet er ikke åbent.", "error");
    const result = {};
    container.querySelectorAll("input[data-knockout-id]").forEach((input) => {
      result[input.dataset.knockoutId] = input.value.trim();
    });
    result.__winner = document.getElementById("winnerInput").value.trim();
    try {
      await api("/api/predictions/knockout", {
        method: "POST",
        body: JSON.stringify(result)
      });
      await refreshState(false);
      toast("Knockout-bud gemt.");
    } catch (error) {
      toast(error.message, "error");
    }
  });
}

function renderQuiz() {
  const user = currentUser();
  app.innerHTML = document.getElementById("quizTemplate").innerHTML;
  const container = document.getElementById("quizContainer");
  const locked = isGroupLocked();
  document.getElementById("quizLockStatus").textContent = locked ? "Låst" : "Åben";

  if (!state.quizQuestions.length) {
    container.innerHTML = `<div class="simple-item">Admin har ikke oprettet spørgsmål endnu.</div>`;
    return;
  }

  const saved = state.predictions.quiz[user.id] || {};
  container.innerHTML = state.quizQuestions.map((q, index) => `
    <div class="match-card">
      <div class="match-card-head">
        <strong>Spørgsmål ${index + 1}</strong>
      </div>
      <div class="muted">${escapeHtml(q.question)}</div>
      <label>
        Dit svar
        <select data-quiz-id="${q.id}" ${locked ? "disabled" : ""}>
          <option value="">Vælg svar</option>
          ${q.options.map((opt) => `<option value="${escapeHtml(opt)}" ${saved[q.id] === opt ? "selected" : ""}>${escapeHtml(opt)}</option>`).join("")}
        </select>
      </label>
    </div>
  `).join("");

  document.getElementById("quizForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (locked) return toast("13’eren er låst.", "error");
    const result = {};
    container.querySelectorAll("select[data-quiz-id]").forEach((select) => {
      result[select.dataset.quizId] = select.value;
    });
    try {
      await api("/api/predictions/quiz", {
        method: "POST",
        body: JSON.stringify(result)
      });
      await refreshState(false);
      toast("13’er gemt.");
    } catch (error) {
      toast(error.message, "error");
    }
  });
}

function renderBonusPage() {
  const user = currentUser();

  app.innerHTML = `
    <section class="page card">
      <div class="section-head">
        <div>
          <p class="eyebrow">Bonuspoint</p>
          <h2>Hemmelige bonusser</h2>
        </div>
      </div>
      <div id="bonusOverview" class="simple-list"></div>
    </section>
  `;

  const container = document.getElementById("bonusOverview");

  if (!user || user.role === "admin") {
    container.innerHTML = `<div class="simple-item">Log ind som almindelig bruger for at se dine bonusser.</div>`;
    return;
  }

  const bonus = getBonus(user);
  const percent = BONUS_RULES.length ? Math.round((bonus.unlocked.length / BONUS_RULES.length) * 100) : 0;

  container.innerHTML = `
    <div class="simple-item bonus-progress-wrap">
      <div>
        <strong>Din status</strong><br>
        <span class="muted">
          Du har låst ${bonus.unlocked.length} ud af ${BONUS_RULES.length} bonusser op
          og har samlet ${bonus.points} bonuspoint.
        </span>
      </div>
      <div class="bonus-progress-bar">
        <div class="bonus-progress-fill" style="width:${percent}%"></div>
      </div>
      <div class="muted">${percent}% gennemført</div>
    </div>

    ${BONUS_RULES.map((rule) => {
      const unlocked = bonus.unlocked.includes(rule.key);
      return `
        <div class="simple-item bonus-item">
          <div class="bonus-head">
            <div class="bonus-title">
              <span class="bonus-icon ${unlocked ? "unlocked" : "locked"}">
                ${unlocked ? "🏆" : "🔒"}
              </span>
              <strong>${escapeHtml(rule.title)}</strong>
            </div>
            <span class="bonus-badge ${unlocked ? "unlocked" : "locked"}">
              ${unlocked ? "Låst op" : "Hemmelig"} · +${rule.points}
            </span>
          </div>
          <div class="muted">${unlocked ? escapeHtml(rule.description) : "???"}</div>
        </div>
      `;
    }).join("")}
  `;
}

function renderLeaderboard() {
  app.innerHTML = document.getElementById("leaderboardTemplate").innerHTML + `
    <div id="leaderboardPlayerModal"></div>
  `;

  const leaderboardBody = document.querySelector("#leaderboardTable tbody");
  const departmentBody = document.querySelector("#departmentTable tbody");

  const rows = calculateLeaderboard();
  leaderboardBody.innerHTML = rows.length
    ? rows.map((row, index) => `
      <tr 
  class="leaderboard-player-row ${currentUser()?.id === row.userId ? "current-user-row" : ""}" 
  onclick="openLeaderboardPlayerModal('${row.userId}')"
>
        <td><span class="rank-number">${index + 1}</span></td>
        <td><img class="avatar" src="${row.avatar || DEFAULT_AVATAR}" alt="${escapeHtml(row.name)}" /></td>
        <td>${escapeHtml(row.name)}</td>
        <td>${escapeHtml(row.departmentName)}</td>
        <td>${row.correctResults}</td>
        <td>${row.correctScores}</td>
        <td>${row.bonusPoints}</td>
        <td><strong>${row.points}</strong></td>
      </tr>
    `).join("")
    : `<tr><td colspan="8">Ingen brugere med indsendt skema endnu.</td></tr>`;

  const deptRows = calculateDepartmentLeaderboard(rows);
  departmentBody.innerHTML = deptRows.length
    ? deptRows.map((row, index) => `
      <tr>
        <td><span class="rank-number">${index + 1}</span></td>
        <td>${escapeHtml(row.name)}</td>
        <td>${row.players}</td>
        <td><strong>${row.averagePoints.toFixed(2)}</strong></td>
      </tr>
    `).join("")
    : `<tr><td colspan="4">Ingen afdelingsdata endnu.</td></tr>`;
}

function renderAdmin() {
  app.innerHTML = document.getElementById("adminTemplate").innerHTML;
  bindAdminSettings();
  bindAdminDepartments();
  bindAdminMatches();
  bindAdminResults();
  bindAdminKnockout();
  bindAdminQuiz();
  bindAdminUsers();
}

function bindAdminSettings() {
  const form = document.getElementById("settingsForm");
  form.groupDeadline.value = state.settings.groupDeadline || "";
  form.knockoutDeadline.value = state.settings.knockoutDeadline || "";
  form.knockoutEnabled.checked = !!state.settings.knockoutEnabled;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api("/api/admin/settings", {
        method: "POST",
        body: JSON.stringify({
          groupDeadline: form.groupDeadline.value,
          knockoutDeadline: form.knockoutDeadline.value,
          knockoutEnabled: form.knockoutEnabled.checked
        })
      });
      await refreshState();
      toast("Indstillinger gemt.");
    } catch (error) {
      toast(error.message, "error");
    }
  });
}

function bindAdminDepartments() {
  const list = document.getElementById("departmentList");
  const form = document.getElementById("departmentForm");

  function render() {
    list.innerHTML = state.departments.map((d) => `
      <div class="simple-item department-row">
        <strong>${escapeHtml(d.name)}</strong>
        <button class="btn danger" data-delete-dept="${d.id}">Slet</button>
      </div>
    `).join("");

    list.querySelectorAll("[data-delete-dept]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await api(`/api/admin/departments/${btn.dataset.deleteDept}`, { method: "DELETE" });
          await refreshState();
        } catch (error) {
          toast(error.message, "error");
        }
      });
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const name = new FormData(form).get("name").toString().trim();
      await api("/api/admin/departments", {
        method: "POST",
        body: JSON.stringify({ name })
      });
      form.reset();
      await refreshState();
    } catch (error) {
      toast(error.message, "error");
    }
  });

  render();
}

function bindAdminMatches() {
  const form = document.getElementById("matchForm");
  const list = document.getElementById("adminMatchList");

  function render() {
    list.innerHTML = state.groupMatches.length
      ? state.groupMatches
          .slice()
          .sort((a, b) => a.kickoff.localeCompare(b.kickoff))
          .map((m) => `
            <div class="simple-item match-row">
              <strong>${escapeHtml(m.homeTeam)} - ${escapeHtml(m.awayTeam)}</strong>
              <span class="muted">${formatDateTime(m.kickoff)} · ${escapeHtml(m.stage)}</span>
              <button class="btn danger" data-delete-match="${m.id}">Slet</button>
            </div>
          `).join("")
      : `<div class="simple-item">Ingen kampe oprettet endnu.</div>`;

    list.querySelectorAll("[data-delete-match]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await api(`/api/admin/group-matches/${btn.dataset.deleteMatch}`, { method: "DELETE" });
          await refreshState();
        } catch (error) {
          toast(error.message, "error");
        }
      });
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData(form);
      await api("/api/admin/group-matches", {
        method: "POST",
        body: JSON.stringify({
          homeTeam: String(fd.get("homeTeam")).trim(),
          awayTeam: String(fd.get("awayTeam")).trim(),
          kickoff: String(fd.get("kickoff")),
          stage: String(fd.get("stage")).trim()
        })
      });
      form.reset();
      await refreshState();
    } catch (error) {
      toast(error.message, "error");
    }
  });

  render();
}

function bindAdminResults() {
  const list = document.getElementById("resultsList");
  list.innerHTML = state.groupMatches.length
    ? state.groupMatches
        .slice()
        .sort((a, b) => a.kickoff.localeCompare(b.kickoff))
        .map((m) => {
          const res = state.results.group[m.id] || {};
          return `
            <div class="simple-item">
              <div class="simple-item-head">
                <strong>${escapeHtml(m.homeTeam)} - ${escapeHtml(m.awayTeam)}</strong>
                <span class="match-meta">${formatDateTime(m.kickoff)}</span>
              </div>
              <div class="inline-row">
                <input type="number" min="0" id="res-home-${m.id}" value="${res.home ?? ""}" placeholder="Hjemme" />
                <input type="number" min="0" id="res-away-${m.id}" value="${res.away ?? ""}" placeholder="Ude" />
                <button class="btn success" data-save-result="${m.id}">Gem resultat</button>
              </div>
            </div>
          `;
        }).join("")
    : `<div class="simple-item">Ingen kampe.</div>`;

  list.querySelectorAll("[data-save-result]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.saveResult;
      try {
        await api(`/api/admin/group-results/${id}`, {
          method: "POST",
          body: JSON.stringify({
            home: numberOrBlank(document.getElementById(`res-home-${id}`).value),
            away: numberOrBlank(document.getElementById(`res-away-${id}`).value)
          })
        });
        await refreshState(false);
        toast("Resultat gemt.");
      } catch (error) {
        toast(error.message, "error");
      }
    });
  });
}

function bindAdminKnockout() {
  const form = document.getElementById("knockoutMatchForm");
  const list = document.getElementById("adminKnockoutList");
  const resultList = document.getElementById("knockoutResultsList");

  function renderMatches() {
    list.innerHTML = state.knockoutMatches.length
      ? state.knockoutMatches.map((m) => `
          <div class="simple-item match-row">
            <strong>${escapeHtml(m.slot)} · ${escapeHtml(m.round)}</strong>
            <span class="muted">${escapeHtml(m.labelA)} vs. ${escapeHtml(m.labelB)}</span>
            <button class="btn danger" data-delete-ko="${m.id}">Slet</button>
          </div>
        `).join("")
      : `<div class="simple-item">Ingen knockoutkampe endnu.</div>`;

    list.querySelectorAll("[data-delete-ko]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await api(`/api/admin/knockout-matches/${btn.dataset.deleteKo}`, { method: "DELETE" });
          await refreshState();
        } catch (error) {
          toast(error.message, "error");
        }
      });
    });
  }

  function renderResults() {
    resultList.innerHTML = state.knockoutMatches.length
      ? state.knockoutMatches.map((m) => `
          <div class="simple-item">
            <div class="simple-item-head">
              <strong>${escapeHtml(m.slot)} · ${escapeHtml(m.round)}</strong>
            </div>
            <div class="inline-row">
              <input type="text" id="ko-res-${m.id}" value="${escapeHtml(state.results.knockout[m.id] || "")}" placeholder="Rigtigt viderehold" />
              <button class="btn success" data-save-ko-result="${m.id}">Gem viderehold</button>
            </div>
          </div>
        `).join("") + `
          <div class="simple-item">
            <div class="simple-item-head">
              <strong>VM-vinder</strong>
            </div>
            <div class="inline-row">
              <input type="text" id="vm-winner" value="${escapeHtml(state.results.knockout.__winner || "")}" placeholder="Rigtig VM-vinder" />
              <button class="btn success" id="saveWinnerBtn">Gem VM-vinder</button>
            </div>
          </div>
        `
      : `<div class="simple-item">Ingen knockoutkampe.</div>`;

    resultList.querySelectorAll("[data-save-ko-result]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.saveKoResult;
        try {
          await api(`/api/admin/knockout-results/${id}`, {
            method: "POST",
            body: JSON.stringify({ winner: document.getElementById(`ko-res-${id}`).value.trim() })
          });
          await refreshState(false);
          toast("Knockout-resultat gemt.");
        } catch (error) {
          toast(error.message, "error");
        }
      });
    });

    document.getElementById("saveWinnerBtn")?.addEventListener("click", async () => {
      try {
        await api("/api/admin/knockout-winner", {
          method: "POST",
          body: JSON.stringify({ winner: document.getElementById("vm-winner").value.trim() })
        });
        await refreshState(false);
        toast("VM-vinder gemt.");
      } catch (error) {
        toast(error.message, "error");
      }
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData(form);
      await api("/api/admin/knockout-matches", {
        method: "POST",
        body: JSON.stringify({
          slot: String(fd.get("slot")).trim(),
          round: String(fd.get("round")).trim(),
          labelA: String(fd.get("labelA")).trim(),
          labelB: String(fd.get("labelB")).trim()
        })
      });
      form.reset();
      await refreshState();
    } catch (error) {
      toast(error.message, "error");
    }
  });

  renderMatches();
  renderResults();
}

function bindAdminQuiz() {
  const form = document.getElementById("quizQuestionForm");
  const list = document.getElementById("quizAdminList");
  const optionsBuilder = document.getElementById("quizOptionsBuilder");
  const addOptionBtn = document.getElementById("addQuizOptionBtn");

  function renderOptionInputs(values = ["", "", ""]) {
    optionsBuilder.innerHTML = values.map((value, index) => `
      <div class="inline-row quiz-option-row">
        <input
          type="text"
          name="quizOption"
          value="${escapeHtml(value)}"
          placeholder="Svarmulighed ${index + 1}"
          required
        />
        <button
          class="btn danger"
          type="button"
          data-remove-option="${index}"
          ${values.length <= 2 ? "disabled" : ""}
        >
          Fjern
        </button>
      </div>
    `).join("");

    optionsBuilder.querySelectorAll("[data-remove-option]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const inputs = [...optionsBuilder.querySelectorAll('input[name="quizOption"]')].map((input) => input.value);
        inputs.splice(Number(btn.dataset.removeOption), 1);
        renderOptionInputs(inputs);
      });
    });
  }

  function render() {
    list.innerHTML = state.quizQuestions.length
      ? state.quizQuestions.map((q, index) => `
          <div class="simple-item">
            <div class="simple-item-head">
              <strong>Spørgsmål ${index + 1}</strong>
              <button class="btn danger" data-delete-question="${q.id}">Slet</button>
            </div>
            <div class="muted">${escapeHtml(q.question)}</div>
            <div class="inline-row">
              ${q.options.map((opt) => `<span class="chip">${escapeHtml(opt)}</span>`).join("")}
            </div>
            <div class="inline-row">
              <select id="correct-${q.id}">
                <option value="">Vælg rigtigt svar</option>
                ${q.options.map((opt) => `<option value="${escapeHtml(opt)}" ${state.results.quiz[q.id] === opt ? "selected" : ""}>${escapeHtml(opt)}</option>`).join("")}
              </select>
              <button class="btn success" data-save-quiz-result="${q.id}">Gem rigtigt svar</button>
            </div>
          </div>
        `).join("")
      : `<div class="simple-item">Ingen spørgsmål endnu.</div>`;

    list.querySelectorAll("[data-delete-question]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await api(`/api/admin/quiz-questions/${btn.dataset.deleteQuestion}`, { method: "DELETE" });
          await refreshState();
        } catch (error) {
          toast(error.message, "error");
        }
      });
    });

    list.querySelectorAll("[data-save-quiz-result]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.saveQuizResult;
        try {
          await api(`/api/admin/quiz-results/${id}`, {
            method: "POST",
            body: JSON.stringify({ answer: document.getElementById(`correct-${id}`).value })
          });
          await refreshState(false);
          toast("Rigtigt svar gemt.");
        } catch (error) {
          toast(error.message, "error");
        }
      });
    });
  }

  renderOptionInputs();

  addOptionBtn.addEventListener("click", () => {
    const inputs = [...optionsBuilder.querySelectorAll('input[name="quizOption"]')].map((input) => input.value);
    inputs.push("");
    renderOptionInputs(inputs);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData(form);
      const options = [...optionsBuilder.querySelectorAll('input[name="quizOption"]')]
        .map((input) => input.value.trim())
        .filter(Boolean);

      if (options.length < 2) {
        return toast("Et spørgsmål skal have mindst 2 svarmuligheder.", "error");
      }

      await api("/api/admin/quiz-questions", {
        method: "POST",
        body: JSON.stringify({
          question: String(fd.get("question")).trim(),
          options
        })
      });

      form.reset();
      renderOptionInputs();
      await refreshState();
    } catch (error) {
      toast(error.message, "error");
    }
  });

  render();
}

function bindAdminUsers() {
  const list = document.getElementById("userAdminList");
  const users = state.users.filter((u) => u.role !== "admin");

  list.innerHTML = users.length
    ? users.map((u) => `
        <div class="simple-item user-row">
          <img class="avatar" src="${u.avatar || DEFAULT_AVATAR}" alt="${escapeHtml(u.name)}" />
          <div>
            <strong>${escapeHtml(u.name)}</strong><br>
            <span class="muted">${escapeHtml(u.email)} · ${escapeHtml(getDepartmentName(u.departmentId))}</span>
          </div>
          <button class="btn" data-reset-user="${u.id}">Reset kodeord</button>
          <button class="btn danger" data-delete-user="${u.id}">Slet bruger</button>
        </div>
      `).join("")
    : `<div class="simple-item">Ingen brugere endnu.</div>`;

  list.querySelectorAll("[data-reset-user]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const password = prompt("Skriv nyt kodeord for brugeren:");
      if (!password) return;
      try {
        await api(`/api/admin/users/${btn.dataset.resetUser}/reset-password`, {
          method: "POST",
          body: JSON.stringify({ password })
        });
        toast("Kodeord nulstillet.");
      } catch (error) {
        toast(error.message, "error");
      }
    });
  });

  list.querySelectorAll("[data-delete-user]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await api(`/api/admin/users/${btn.dataset.deleteUser}`, { method: "DELETE" });
        await refreshState();
        toast("Bruger slettet.");
      } catch (error) {
        toast(error.message, "error");
      }
    });
  });
}

function calculateLeaderboard() {
  const rows = [];
  const participants = state.users.filter((u) => u.role === "user");

  participants.forEach((user) => {
    let correctResults = 0;
    let correctScores = 0;
    let points = 0;

    const groupPreds = state.predictions.group[user.id] || {};

    state.groupMatches.forEach((match) => {
      const pred = groupPreds[match.id];
      const res = state.results.group[match.id];

      if (!pred || res?.home === "" || res?.away === "" || res?.home == null || res?.away == null) return;

      const predOutcome = getOutcome(pred.home, pred.away);
      const actualOutcome = getOutcome(res.home, res.away);

      if (predOutcome === actualOutcome) {
        correctResults += 1;
        points += 3;
      }

      if (Number(pred.home) === Number(res.home) && Number(pred.away) === Number(res.away)) {
        correctScores += 1;
        points += 2;
      }
    });

    const koPreds = state.predictions.knockout[user.id] || {};

    state.knockoutMatches.forEach((match) => {
      if (!koPreds[match.id] || !state.results.knockout[match.id]) return;

      if (normalize(koPreds[match.id]) === normalize(state.results.knockout[match.id])) {
        points += 2;
      }
    });

    if (
      koPreds.__winner &&
      state.results.knockout.__winner &&
      normalize(koPreds.__winner) === normalize(state.results.knockout.__winner)
    ) {
      points += 5;
    }

    const quizPreds = state.predictions.quiz[user.id] || {};

    state.quizQuestions.forEach((q) => {
      if (
        quizPreds[q.id] &&
        state.results.quiz[q.id] &&
        normalize(quizPreds[q.id]) === normalize(state.results.quiz[q.id])
      ) {
        points += 1;
      }
    });

    const bonus = getBonus(user);
    points += bonus.points;

    rows.push({
      userId: user.id,
      name: user.name,
      avatar: user.avatar,
      departmentName: getDepartmentName(user.departmentId),
      correctResults,
      correctScores,
      bonusPoints: bonus.points,
      points
    });
  });

  return rows.sort((a, b) =>
    b.points - a.points ||
    b.correctResults - a.correctResults ||
    b.correctScores - a.correctScores ||
    a.name.localeCompare(b.name, "da")
  );
}

function getLeaderboardPlayerStats(userId) {
  const user = state.users.find((u) => String(u.id) === String(userId) && u.role === "user");
  if (!user) return null;

  let correctResults = 0;
  let correctScores = 0;
  let groupPoints = 0;
  let knockoutPoints = 0;
  let quizPoints = 0;

  const groupPreds = state.predictions.group[user.id] || {};

  state.groupMatches.forEach((match) => {
    const pred = groupPreds[match.id];
    const res = state.results.group[match.id];

    if (!pred || res?.home === "" || res?.away === "" || res?.home == null || res?.away == null) return;

    const predOutcome = getOutcome(pred.home, pred.away);
    const actualOutcome = getOutcome(res.home, res.away);

    if (predOutcome === actualOutcome) {
      correctResults += 1;
      groupPoints += 3;
    }

    if (Number(pred.home) === Number(res.home) && Number(pred.away) === Number(res.away)) {
      correctScores += 1;
      groupPoints += 2;
    }
  });

  const koPreds = state.predictions.knockout[user.id] || {};
  let correctKnockout = 0;

  state.knockoutMatches.forEach((match) => {
    if (!koPreds[match.id] || !state.results.knockout[match.id]) return;

    if (normalize(koPreds[match.id]) === normalize(state.results.knockout[match.id])) {
      correctKnockout += 1;
      knockoutPoints += 2;
    }
  });

  let correctWinner = false;

  if (
    koPreds.__winner &&
    state.results.knockout.__winner &&
    normalize(koPreds.__winner) === normalize(state.results.knockout.__winner)
  ) {
    correctWinner = true;
    knockoutPoints += 5;
  }

  const quizPreds = state.predictions.quiz[user.id] || {};
  let correctQuizAnswers = 0;

  state.quizQuestions.forEach((q) => {
    if (
      quizPreds[q.id] &&
      state.results.quiz[q.id] &&
      normalize(quizPreds[q.id]) === normalize(state.results.quiz[q.id])
    ) {
      correctQuizAnswers += 1;
      quizPoints += 1;
    }
  });

  const bonus = getBonus(user);

  const bonusItems = BONUS_RULES.map((rule) => {
    const unlocked = bonus.unlocked.includes(rule.key);

    return {
      key: rule.key,
      title: rule.title,
      description: unlocked ? rule.description : "???",
      points: rule.points,
      unlocked
    };
  });

  return {
    user,
    departmentName: getDepartmentName(user.departmentId),
    totalPoints: groupPoints + knockoutPoints + quizPoints + bonus.points,
    groupPoints,
    knockoutPoints,
    quizPoints,
    bonusPoints: bonus.points,
    correctResults,
    correctScores,
    correctKnockout,
    correctWinner,
    correctQuizAnswers,
    bonusItems
  };
}

function openLeaderboardPlayerModal(userId) {
  const stats = getLeaderboardPlayerStats(userId);
  if (!stats) return;

  const modalRoot = document.getElementById("leaderboardPlayerModal");
  if (!modalRoot) return;

  modalRoot.innerHTML = `
  <div class="player-modal-backdrop" id="playerModalBackdrop">
    <div class="player-modal">
      <button class="player-modal-close" id="playerModalClose" aria-label="Luk">✕</button>

      <div class="player-modal-head">
        <img class="avatar player-modal-avatar" src="${stats.user.avatar || DEFAULT_AVATAR}" alt="${escapeHtml(stats.user.name)}" />
        <div>
          <h3>${escapeHtml(stats.user.name)}</h3>
          <div class="muted">${escapeHtml(stats.departmentName)}</div>
        </div>
      </div>

      <div class="player-modal-tabs">
        <button class="player-tab active" data-player-tab="stats">Stats</button>
        <button class="player-tab" data-player-tab="bonus">Bonusser</button>
        <button class="player-tab" data-player-tab="predictions">Bud</button>
      </div>

      <div class="player-tab-panel active" data-player-panel="stats">
        <div class="player-stats-grid">
          <div class="player-stat-box"><span>Total</span><strong>${stats.totalPoints}</strong></div>
          <div class="player-stat-box"><span>Gruppespil</span><strong>${stats.groupPoints}</strong></div>
          <div class="player-stat-box"><span>Knockout</span><strong>${stats.knockoutPoints}</strong></div>
          <div class="player-stat-box"><span>Quiz</span><strong>${stats.quizPoints}</strong></div>
          <div class="player-stat-box"><span>Bonus</span><strong>${stats.bonusPoints}</strong></div>
        </div>

        <div class="simple-list" style="margin-top:16px;">
          <div class="simple-item">
            <strong>Gruppespil</strong><br>
            <span class="muted">
              Rigtige resultater: ${stats.correctResults} ·
              Rigtige scores: ${stats.correctScores}
            </span>
          </div>

          <div class="simple-item">
            <strong>Knockout</strong><br>
            <span class="muted">
              Rigtige viderehold: ${stats.correctKnockout} ·
              VM-vinder: ${stats.correctWinner ? "Ja" : "Nej"}
            </span>
          </div>

          <div class="simple-item">
            <strong>Quiz</strong><br>
            <span class="muted">
              Korrekte svar: ${stats.correctQuizAnswers}
            </span>
          </div>
        </div>
      </div>

      <div class="player-tab-panel" data-player-panel="bonus">
        <div class="simple-list">
          ${stats.bonusItems.map((bonus) => `
            <div class="simple-item bonus-item">
              <div class="bonus-head">
                <div class="bonus-title">
                  <span class="bonus-icon ${bonus.unlocked ? "unlocked" : "locked"}">
                    ${bonus.unlocked ? "🏆" : "🔒"}
                  </span>
                  <strong>${escapeHtml(bonus.title)}</strong>
                </div>
                <span class="bonus-badge ${bonus.unlocked ? "unlocked" : "locked"}">
                  ${bonus.unlocked ? "Låst op" : "Ikke låst op"} · +${bonus.points}
                </span>
              </div>
              <div class="muted">${bonus.unlocked ? escapeHtml(bonus.description) : "Krav skjult"}</div>
            </div>
          `).join("")}
        </div>
      </div>

      <div class="player-tab-panel" data-player-panel="predictions">
        ${renderPlayerGroupPredictions(stats.user.id)}
      </div>
    </div>
  </div>
`;

modalRoot.querySelectorAll("[data-player-tab]").forEach((tab) => {
  tab.addEventListener("click", () => {
    const selected = tab.dataset.playerTab;

    modalRoot.querySelectorAll("[data-player-tab]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.playerTab === selected);
    });

    modalRoot.querySelectorAll("[data-player-panel]").forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.playerPanel === selected);
    });
  });
});

  document.getElementById("playerModalClose")?.addEventListener("click", closeLeaderboardPlayerModal);
  document.getElementById("playerModalBackdrop")?.addEventListener("click", (e) => {
    if (e.target.id === "playerModalBackdrop") closeLeaderboardPlayerModal();
  });
}

function closeLeaderboardPlayerModal() {
  const modalRoot = document.getElementById("leaderboardPlayerModal");
  if (modalRoot) modalRoot.innerHTML = "";
}

window.openLeaderboardPlayerModal = openLeaderboardPlayerModal;
window.closeLeaderboardPlayerModal = closeLeaderboardPlayerModal;

function canViewPredictionsForRound(roundName) {
  const now = new Date();
  const roundLocks = getRoundStartTimes();

  if (roundName === "Runde 1") {
    return roundLocks.round2OpenAt ? now >= new Date(roundLocks.round2OpenAt) : false;
  }

  if (roundName === "Runde 2") {
    return roundLocks.round3OpenAt ? now >= new Date(roundLocks.round3OpenAt) : false;
  }

  if (roundName === "Runde 3") {
    return isGroupLocked();
  }

  return false;
}

function renderPlayerGroupPredictions(userId) {
  const predictions = state.predictions.group[userId] || {};

  const rounds = {
    "Runde 1": [],
    "Runde 2": [],
    "Runde 3": []
  };

  state.groupMatches
    .slice()
    .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff))
    .forEach((match) => {
      const roundName = getGroupRoundNameFromKickoff(match.kickoff);
      rounds[roundName].push(match);
    });

  return `
    <div style="margin-top:20px;">
      <h4>Spillerens bud</h4>
      <div class="simple-list">
        ${Object.entries(rounds).map(([roundName, matches]) => {
          const visible = canViewPredictionsForRound(roundName);

          return `
            <div class="simple-item">
              <strong>${roundName}</strong><br>
              ${
                visible
                  ? matches.map((match) => {
                      const pred = predictions[match.id];

                      return `
                        <div class="prediction-row">
                          <span>${escapeHtml(match.homeTeam)} - ${escapeHtml(match.awayTeam)}</span>
                          <strong>${pred?.home ?? "-"} - ${pred?.away ?? "-"}</strong>
                        </div>
                      `;
                    }).join("")
                  : `<span class="muted">Bud skjult indtil runden låser.</span>`
              }
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function calculateDepartmentLeaderboard(playerRows) {
  const map = new Map();

  playerRows.forEach((row) => {
    const key = row.departmentName || "Ukendt";

    if (!map.has(key)) {
      map.set(key, {
        name: key,
        players: 0,
        totalPoints: 0,
        averagePoints: 0
      });
    }

    const item = map.get(key);
    item.players += 1;
    item.totalPoints += row.points;
  });

  const result = [...map.values()].map((item) => ({
    ...item,
    averagePoints: item.players > 0 ? item.totalPoints / item.players : 0
  }));

  return result.sort(
    (a, b) =>
      b.averagePoints - a.averagePoints ||
      b.players - a.players ||
      a.name.localeCompare(b.name, "da")
  );
}

function populateDepartmentSelect(select, selectedId) {
  select.innerHTML = state.departments.length
    ? state.departments.map((d) => `<option value="${d.id}" ${selectedId === d.id ? "selected" : ""}>${escapeHtml(d.name)}</option>`).join("")
    : `<option value="">Ingen afdelinger endnu</option>`;
}

function hasSubmittedAny(userId) {
  const hasGroup = state.predictions.group[userId] && Object.keys(state.predictions.group[userId]).length > 0;
  const hasKO = state.predictions.knockout[userId] && Object.keys(state.predictions.knockout[userId]).length > 0;
  const hasQuiz = state.predictions.quiz[userId] && Object.keys(state.predictions.quiz[userId]).length > 0;
  return hasGroup || hasKO || hasQuiz;
}



function renderGroups() {
  app.innerHTML = `
    <section class="page card">
      <div class="section-head">
        <div>
          <p class="eyebrow">Gruppestillinger</p>
          <h2>Følg stillingen i alle grupper</h2>
        </div>
      </div>
      <div id="groupsContainer" class="groups-grid"></div>
    </section>
  `;

  const container = document.getElementById("groupsContainer");
  const groups = buildGroupTables();
  const groupNames = Object.keys(groups).sort((a, b) => a.localeCompare(b, "da"));

  if (!groupNames.length) {
    container.innerHTML = `<div class="simple-item">Ingen gruppedata endnu.</div>`;
    return;
  }

  container.innerHTML = groupNames.map((groupName) => {
    const sortedTeams = groups[groupName];

    return `
      <article class="group-card">
        <div class="group-card-head">
          <h3>${escapeHtml(groupName)}</h3>
        </div>

        <div class="table-wrap">
          <table class="data-table groups-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Hold</th>
                <th>K</th>
                <th>V</th>
                <th>U</th>
                <th>T</th>
                <th>Mål</th>
                <th>+/-</th>
                <th>Point</th>
              </tr>
            </thead>
            <tbody>
              ${sortedTeams.map((team, index) => `
                <tr 
  class="${index < 2 ? "qualified-row" : index === 2 ? "third-place-row" : "eliminated-row"}"
  data-tooltip="${index < 2 ? "Går videre" : index === 2 ? "Mulig videre som en af de bedste 3'ere" : "Ude af turneringen"}"
>
                  <td>${index + 1}</td>
                  <td><strong>${escapeHtml(team.team)}</strong></td>
                  <td>${team.played}</td>
                  <td>${team.win}</td>
                  <td>${team.draw}</td>
                  <td>${team.loss}</td>
                  <td>${team.goalsFor}-${team.goalsAgainst}</td>
                  <td>${team.goalDiff > 0 ? "+" : ""}${team.goalDiff}</td>
                  <td><strong>${team.points}</strong></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </article>
    `;
  }).join("");
}

function buildGroupTables() {
  const groups = {};

  state.groupMatches.forEach((match) => {
    const groupName = String(match.stage || "").trim();
    if (!groupName.startsWith("Gruppe")) return;

    if (!groups[groupName]) groups[groupName] = {};

    [match.homeTeam, match.awayTeam].forEach((team) => {
      if (!groups[groupName][team]) {
        groups[groupName][team] = {
          team,
          group: groupName,
          played: 0,
          win: 0,
          draw: 0,
          loss: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDiff: 0,
          points: 0
        };
      }
    });

    const result = state.results.group[match.id];
    if (!result || result.home === "" || result.away === "" || result.home == null || result.away == null) return;

    const homeGoals = Number(result.home);
    const awayGoals = Number(result.away);

    const home = groups[groupName][match.homeTeam];
    const away = groups[groupName][match.awayTeam];

    home.played += 1;
    away.played += 1;

    home.goalsFor += homeGoals;
    home.goalsAgainst += awayGoals;
    away.goalsFor += awayGoals;
    away.goalsAgainst += homeGoals;

    if (homeGoals > awayGoals) {
      home.win += 1;
      away.loss += 1;
      home.points += 3;
    } else if (homeGoals < awayGoals) {
      away.win += 1;
      home.loss += 1;
      away.points += 3;
    } else {
      home.draw += 1;
      away.draw += 1;
      home.points += 1;
      away.points += 1;
    }

    home.goalDiff = home.goalsFor - home.goalsAgainst;
    away.goalDiff = away.goalsFor - away.goalsAgainst;
  });

  const sortedGroups = {};
  Object.keys(groups).forEach((groupName) => {
    sortedGroups[groupName] = Object.values(groups[groupName]).sort((a, b) =>
      b.points - a.points ||
      b.goalDiff - a.goalDiff ||
      b.goalsFor - a.goalsFor ||
      a.team.localeCompare(b.team, "da")
    );
  });

  return sortedGroups;
}

function getLiveQualificationData() {
  const groupTables = buildGroupTables();
  const groupNames = Object.keys(groupTables).sort((a, b) => a.localeCompare(b, "da"));

  const winners = [];
  const runnersUp = [];
  const thirdPlaced = [];

  groupNames.forEach((groupName) => {
    const table = groupTables[groupName];
    if (table[0]) winners.push(table[0]);
    if (table[1]) runnersUp.push(table[1]);
    if (table[2]) thirdPlaced.push(table[2]);
  });

  const sortedThirdPlaced = [...thirdPlaced].sort((a, b) =>
    b.points - a.points ||
    b.goalDiff - a.goalDiff ||
    b.goalsFor - a.goalsFor ||
    a.group.localeCompare(b.group, "da")
  );

  return {
    groupTables,
    winners,
    runnersUp,
    bestThirds: sortedThirdPlaced.slice(0, 8),
    eliminatedThirds: sortedThirdPlaced.slice(8)
  };
}

function getBestThirdGroupsKey(bestThirds) {
  return bestThirds
    .map((team) => team.group.replace("Gruppe ", "").trim())
    .sort((a, b) => a.localeCompare(b, "da"))
    .join("");
}

const THIRD_PLACE_MAPPING = {};

function getThirdPlaceMapping(bestThirds) {
  const key = getBestThirdGroupsKey(bestThirds);
  return {
    key,
    mapping: THIRD_PLACE_MAPPING[key] || null
  };
}

function getTeamByGroupPosition(groupTables, groupLetter, position) {
  const key = `Gruppe ${groupLetter}`;
  return groupTables[key]?.[position - 1] || null;
}

function renderLiveQualification() {
  const data = getLiveQualificationData();
  const groupTables = data.groupTables;
  const mappingInfo = getThirdPlaceMapping(data.bestThirds);

  const fixedMatches = [
    ["A2 vs B2", getTeamByGroupPosition(groupTables, "A", 2), getTeamByGroupPosition(groupTables, "B", 2)],
    ["F1 vs C2", getTeamByGroupPosition(groupTables, "F", 1), getTeamByGroupPosition(groupTables, "C", 2)],
    ["C1 vs F2", getTeamByGroupPosition(groupTables, "C", 1), getTeamByGroupPosition(groupTables, "F", 2)],
    ["E2 vs I2", getTeamByGroupPosition(groupTables, "E", 2), getTeamByGroupPosition(groupTables, "I", 2)],
    ["K2 vs L2", getTeamByGroupPosition(groupTables, "K", 2), getTeamByGroupPosition(groupTables, "L", 2)],
    ["H1 vs J2", getTeamByGroupPosition(groupTables, "H", 1), getTeamByGroupPosition(groupTables, "J", 2)],
    ["J1 vs H2", getTeamByGroupPosition(groupTables, "J", 1), getTeamByGroupPosition(groupTables, "H", 2)],
    ["D2 vs G2", getTeamByGroupPosition(groupTables, "D", 2), getTeamByGroupPosition(groupTables, "G", 2)]
  ];

  const wildcardSlots = [
    { slot: "E1", allowed: ["A", "B", "C", "D", "F"] },
    { slot: "I1", allowed: ["C", "D", "F", "G", "H"] },
    { slot: "A1", allowed: ["C", "E", "F", "H", "I"] },
    { slot: "L1", allowed: ["E", "H", "I", "J", "K"] },
    { slot: "D1", allowed: ["B", "E", "F", "I", "J"] },
    { slot: "G1", allowed: ["A", "E", "F", "G", "I", "J"] },
    { slot: "B1", allowed: ["E", "F", "G", "I", "J"] },
    { slot: "K1", allowed: ["D", "E", "I", "J", "L"] }
  ];

  app.innerHTML = `
    <section class="page card">
      <div class="section-head">
        <div>
          <p class="eyebrow">Live preview</p>
          <h2>Hvis turneringen sluttede nu</h2>
        </div>
      </div>

      <div class="two-col-grid">
        <article class="card">
          <h3>Bedste 3'ere lige nu</h3>
          <div class="table-wrap">
            <table class="data-table live-third-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Hold</th>
                  <th>Gruppe</th>
                  <th>Point</th>
                  <th>+/-</th>
                  <th>Mål</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${[...data.bestThirds, ...data.eliminatedThirds].map((team, index) => `
                  <tr class="${index < 8 ? "qualified-row" : "eliminated-row"}">
                    <td>${index + 1}</td>
                    <td><strong>${escapeHtml(team.team)}</strong></td>
                    <td>${escapeHtml(team.group)}</td>
                    <td>${team.points}</td>
                    <td>${team.goalDiff > 0 ? "+" : ""}${team.goalDiff}</td>
                    <td>${team.goalsFor}</td>
                    <td>${index < 8 ? "Videre" : "Ude"}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </article>

        <article class="card">
          <h3>Systemstatus</h3>
          <div class="simple-list">
            <div class="simple-item"><strong>Nøgle for bedste 3'ere:</strong> ${mappingInfo.key || "-"}</div>
            <div class="simple-item"><strong>FIFA-mapping fundet:</strong> ${mappingInfo.mapping ? "Ja" : "Ikke endnu"}</div>
            <div class="simple-item"><strong>Gruppevindere videre:</strong> ${data.winners.length}</div>
            <div class="simple-item"><strong>2'ere videre:</strong> ${data.runnersUp.length}</div>
            <div class="simple-item"><strong>Bedste 3'ere videre:</strong> ${data.bestThirds.length}</div>
            <div class="simple-item"><strong>3'ere ude:</strong> ${data.eliminatedThirds.length}</div>
          </div>
        </article>
      </div>
    </section>

    <section class="page card">
      <div class="section-head">
        <div>
          <p class="eyebrow">Knockout preview</p>
          <h2>1/16-finaler hvis det sluttede nu</h2>
        </div>
      </div>

      <div class="live-bracket-grid">
        ${fixedMatches.map(([label, home, away]) => `
          <article class="bracket-card">
            <div class="match-card-head">
              <strong>${escapeHtml(label)}</strong>
            </div>
            <div><strong>${escapeHtml(home?.team || "Ukendt")}</strong> vs. <strong>${escapeHtml(away?.team || "Ukendt")}</strong></div>
            <div class="small muted" style="margin-top:8px">Fast matchup</div>
          </article>
        `).join("")}

        ${wildcardSlots.map(({ slot, allowed }) => {
          const winner = getTeamByGroupPosition(groupTables, slot.replace("1", ""), 1);

          return `
            <article class="bracket-card">
              <div class="match-card-head">
                <strong>${escapeHtml(slot)} vs 3'er</strong>
              </div>
              <div><strong>${escapeHtml(winner?.team || "Ukendt")}</strong> vs. <strong>3'er fra ${allowed.join("/")}</strong></div>
              <div class="small muted" style="margin-top:8px">
                Klar til step 2 med officiel FIFA-mapping
              </div>
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function logout() {
  clearSession();
  renderNav();
  location.hash = "home";
  toast("Du er logget ud.");
}

function isGroupLocked() {
  if (!state.settings.groupDeadline) return false;
  return new Date() >= new Date(state.settings.groupDeadline);
}

function isKnockoutLocked() {
  if (!state.settings.knockoutEnabled) return true;
  if (!state.settings.knockoutDeadline) return false;
  return new Date() >= new Date(state.settings.knockoutDeadline);
}

function startCountdown() {
  const deadlineLabel = document.getElementById("deadlineLabel");
  const countdown = document.getElementById("countdown");
  if (!deadlineLabel || !countdown) return;

  function update() {
    const next = getNextDeadline();
    if (!next) {
      deadlineLabel.textContent = "Ingen deadline sat endnu";
      countdown.textContent = "-- : -- : -- : --";
      return;
    }

    deadlineLabel.textContent = `${next.label}: ${formatDateTime(next.value)}`;
    const diff = new Date(next.value) - new Date();

    if (diff <= 0) {
      countdown.textContent = "Låst";
      return;
    }

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    countdown.textContent = `${pad(days)} : ${pad(hours)} : ${pad(minutes)} : ${pad(seconds)}`;
  }

  update();
  const timer = setInterval(update, 1000);
  countdownTimers.push(timer);
}

function clearCountdown() {
  countdownTimers.forEach((timer) => clearInterval(timer));
  countdownTimers = [];
}

function getGroupRoundNameFromKickoff(kickoff) {
  const d = new Date(kickoff);

  if (d < new Date("2026-06-18T00:00:00")) return "Runde 1";
  if (d < new Date("2026-06-24T00:00:00")) return "Runde 2";
  return "Runde 3";
}

function getRoundStartTimes() {
  let firstRound1Kickoff = null;
  let firstRound2Kickoff = null;

  state.groupMatches.forEach((match) => {
    if (!match.kickoff) return;

    const round = getGroupRoundNameFromKickoff(match.kickoff);
    const kickoff = match.kickoff;

    if (round === "Runde 1") {
      if (!firstRound1Kickoff || new Date(kickoff) < new Date(firstRound1Kickoff)) {
        firstRound1Kickoff = kickoff;
      }
    }

    if (round === "Runde 2") {
      if (!firstRound2Kickoff || new Date(kickoff) < new Date(firstRound2Kickoff)) {
        firstRound2Kickoff = kickoff;
      }
    }
  });

  return {
    round2OpenAt: firstRound1Kickoff,
    round3OpenAt: firstRound2Kickoff
  };
}

function getCountdownText(targetDate) {
  if (!targetDate) return "";

  const diff = new Date(targetDate) - new Date();
  if (diff <= 0) return "";

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${pad(days)}d ${pad(hours)}t ${pad(minutes)}m ${pad(seconds)}s`;
}

function renderRoundCountdownCards(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const roundStarts = getRoundStartTimes();
  const rounds = [
    { key: "Runde 1", value: roundStarts["Runde 1"] },
    { key: "Runde 2", value: roundStarts["Runde 2"] },
    { key: "Runde 3", value: roundStarts["Runde 3"] }
  ];

  container.innerHTML = rounds.map((round, index) => `
    <div class="simple-item round-countdown-item">
      <div class="round-countdown-head">
        <strong>${round.key}</strong>
        <span class="muted">${round.value ? formatDateTime(round.value) : "Ikke oprettet endnu"}</span>
      </div>
      <div class="round-countdown-time" id="roundCountdown_${containerId}_${index}">
        -- : -- : -- : --
      </div>
    </div>
  `).join("");

  function update() {
    const now = new Date();

    rounds.forEach((round, index) => {
      const el = document.getElementById(`roundCountdown_${containerId}_${index}`);
      if (!el) return;

      if (!round.value) {
        el.textContent = "Ingen kamp oprettet";
        return;
      }

      const diff = new Date(round.value) - now;

      if (diff <= 0) {
        el.textContent = "Startet";
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      el.textContent = `${pad(days)} : ${pad(hours)} : ${pad(minutes)} : ${pad(seconds)}`;
    });
  }

  update();
  const timer = setInterval(update, 1000);
  countdownTimers.push(timer);
}



function getNextDeadline() {
  const now = new Date();
  const candidates = [];
  if (state.settings.groupDeadline && new Date(state.settings.groupDeadline) > now) {
    candidates.push({ label: "Deadline gruppespil / 13’er", value: state.settings.groupDeadline });
  }
  if (state.settings.knockoutEnabled && state.settings.knockoutDeadline && new Date(state.settings.knockoutDeadline) > now) {
    candidates.push({ label: "Deadline knockout", value: state.settings.knockoutDeadline });
  }
  candidates.sort((a, b) => new Date(a.value) - new Date(b.value));
  return candidates[0] || null;
}

function getOutcome(home, away) {
  if (Number(home) > Number(away)) return "1";
  if (Number(home) < Number(away)) return "2";
  return "X";
}

function getDepartmentName(id) {
  return state.departments.find((d) => d.id === id)?.name || "Ukendt";
}

function numberOrBlank(value) {
  return value === "" ? "" : Number(value);
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("da-DK", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function pad(num) {
  return String(num).padStart(2, "0");
}

function toast(message, type = "info") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  toastContainer.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}