const PLAYERS = ["Veizon", "trp_zero", "JelloBeanMan"];

const API_BATCH = "/api/hiscores?players=";

const HEADER_EMOTES = [
  { file: "Dance.gif", label: "Dance emote" },
  { file: "Jig.gif", label: "Jig emote" },
  { file: "Crazy_dance.gif", label: "Crazy dance emote" },
  { file: "Smooth_dance.gif", label: "Smooth dance emote" },
  { file: "Crab_dance.gif", label: "Crab dance emote" },
];

const SKILL_ICONS = {
  Overall: "overall",
  Attack: "attack",
  Defence: "defence",
  Strength: "strength",
  Hitpoints: "hitpoints",
  Ranged: "ranged",
  Prayer: "prayer",
  Magic: "magic",
  Cooking: "cooking",
  Woodcutting: "woodcutting",
  Fletching: "fletching",
  Fishing: "fishing",
  Firemaking: "firemaking",
  Crafting: "crafting",
  Smithing: "smithing",
  Mining: "mining",
  Herblore: "herblore",
  Agility: "agility",
  Thieving: "thieving",
  Slayer: "slayer",
  Farming: "farming",
  Runecraft: "runecraft",
  Hunter: "hunter",
  Construction: "construction",
  Sailing: "sailing",
};

const summaryEl = document.getElementById("player-summary");
const tableEl = document.getElementById("stats-table");
const refreshBtn = document.getElementById("refresh-btn");
const mainViewEl = document.getElementById("main-view");
const playerDetailViewEl = document.getElementById("player-detail-view");
const playerDetailTitleEl = document.getElementById("player-detail-title");
const playerDetailSummaryEl = document.getElementById("player-detail-summary");
const playerDetailTableEl = document.getElementById("player-detail-table");
const backBtn = document.getElementById("back-btn");
const gapHighlightEl = document.getElementById("gap-highlight");
const skillTabsEl = document.getElementById("skill-tabs");

const XP_FOR_LEVEL_99 = 13034431;

const PARTY_HAT_URL = "public/icons/partyhat.png";
const COMBAT_ICON_URL = "public/icons/combat.png";

const SKILL_CATEGORIES = {
  all: {
    label: "All",
    skills: null,
  },
  combat: {
    label: "Combat",
    skills: [
      "Attack",
      "Strength",
      "Defence",
      "Ranged",
      "Prayer",
      "Magic",
      "Hitpoints",
    ],
  },
  gathering: {
    label: "Gathering",
    skills: [
      "Woodcutting",
      "Fishing",
      "Mining",
      "Farming",
      "Hunter",
      "Sailing",
    ],
  },
  artisan: {
    label: "Artisan",
    skills: [
      "Cooking",
      "Smithing",
      "Crafting",
      "Firemaking",
      "Fletching",
      "Herblore",
      "Runecraft",
      "Construction",
    ],
  },
  support: {
    label: "Support",
    skills: ["Agility", "Thieving", "Slayer"],
  },
};

let cachedPlayersData = null;
let activeSkillCategory = "all";

function pickRandomEmote() {
  return HEADER_EMOTES[Math.floor(Math.random() * HEADER_EMOTES.length)];
}

function initHeaderEmotes() {
  const leftEl = document.getElementById("header-emote-left");
  const rightEl = document.getElementById("header-emote-right");

  if (!leftEl || !rightEl) {
    return;
  }

  const leftEmote = pickRandomEmote();
  const rightEmote = pickRandomEmote();

  leftEl.src = `public/emotes/${leftEmote.file}`;
  leftEl.alt = leftEmote.label;
  rightEl.src = `public/emotes/${rightEmote.file}`;
  rightEl.alt = rightEmote.label;
}

function formatNumber(value) {
  return value.toLocaleString("en-US");
}

function formatRank(rank) {
  return rank > 0 ? formatNumber(rank) : "—";
}

function xpForLevel(level) {
  if (level <= 1) {
    return 0;
  }

  let points = 0;
  for (let lvl = 1; lvl < level; lvl++) {
    points += Math.floor(lvl + 300 * Math.pow(2, lvl / 7));
  }
  return Math.floor(points / 4);
}

function xpToNextLevel(xp, level) {
  return Math.max(0, xpForLevel(level + 1) - xp);
}

function xpTo99(xp) {
  return Math.max(0, XP_FOR_LEVEL_99 - xp);
}

function formatXpRemaining(xp, maxedLabel = "—") {
  if (xp <= 0) {
    return maxedLabel;
  }
  return formatNumber(xp);
}

function playerLink(name, isLeader = false) {
  const hat = isLeader
    ? `<img class="party-hat-icon" src="${PARTY_HAT_URL}" alt="" width="18" height="16">`
    : "";

  return `<button type="button" class="player-link${isLeader ? " player-link--leader" : ""}" data-player="${name}">${hat}<span>${name}</span></button>`;
}

function getCombatLeader(playersData) {
  const combatLevels = playersData.map((data) => ({
    name: data.name,
    level: calculateCombatLevel(data.skills),
  }));
  const maxCombat = Math.max(...combatLevels.map((entry) => entry.level));
  const leaders = combatLevels.filter((entry) => entry.level === maxCombat);

  return leaders.length === 1 ? leaders[0].name : null;
}

function playCardOpenAnimation(card, onComplete) {
  if (card.classList.contains("card-opening")) {
    return;
  }

  card.classList.add("card-opening");

  const burst = document.createElement("div");
  burst.className = "level-up-burst";
  burst.innerHTML = '<span class="level-up-text">Stats!</span>';

  for (let i = 0; i < 8; i++) {
    const spark = document.createElement("span");
    spark.className = "level-up-spark";
    spark.style.setProperty("--a", `${i * 45}deg`);
    burst.appendChild(spark);
  }

  card.appendChild(burst);

  window.setTimeout(() => {
    burst.remove();
    card.classList.remove("card-opening");
    onComplete();
  }, 550);
}

function skillIconUrl(skillName) {
  const file = SKILL_ICONS[skillName] || "overall";
  return `public/icons/${file}.png`;
}

async function fetchAllPlayerStats() {
  const response = await fetch(
    API_BATCH + encodeURIComponent(PLAYERS.join(","))
  );

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const error = await response.json();
      if (error.error) {
        message = error.error;
      }
    } catch {
      // ignore JSON parse errors on error responses
    }
    throw new Error(message);
  }

  const body = await response.json();

  if (!body.results || !Array.isArray(body.results)) {
    throw new Error("Invalid response from hiscores API");
  }

  const dataByPlayer = new Map(
    body.results
      .filter((result) => result.ok && result.data)
      .map((result) => [result.player, result.data])
  );

  return PLAYERS.map((player) => {
    const data = dataByPlayer.get(player);
    if (!data?.skills || !Array.isArray(data.skills)) {
      const failed = body.results.find((result) => result.player === player);
      const reason = failed?.error || "player data missing";
      throw new Error(`Failed to load stats for ${player}: ${reason}`);
    }
    return data;
  });
}

function getOverallSkill(skills) {
  return skills.find((skill) => skill.name === "Overall");
}

function getSkillLevel(skills, name) {
  return skills.find((skill) => skill.name === name)?.level ?? 1;
}

function calculateCombatLevel(skills) {
  const attack = getSkillLevel(skills, "Attack");
  const strength = getSkillLevel(skills, "Strength");
  const defence = getSkillLevel(skills, "Defence");
  const hitpoints = getSkillLevel(skills, "Hitpoints");
  const prayer = getSkillLevel(skills, "Prayer");
  const ranged = getSkillLevel(skills, "Ranged");
  const magic = getSkillLevel(skills, "Magic");

  const base = Math.floor(
    0.25 * (defence + hitpoints + Math.floor(prayer / 2))
  );
  const melee = Math.floor(0.325 * (attack + strength));
  const range = Math.floor(0.325 * (Math.floor(ranged / 2) + ranged));
  const mage = Math.floor(0.325 * (Math.floor(magic / 2) + magic));

  return base + Math.max(melee, range, mage) + 1;
}

function sortPlayersByCombat(playersData) {
  return [...playersData].sort((a, b) => {
    const combatDiff =
      calculateCombatLevel(b.skills) - calculateCombatLevel(a.skills);
    if (combatDiff !== 0) {
      return combatDiff;
    }
    return a.name.localeCompare(b.name);
  });
}

function renderSummary(playersData) {
  const overalls = playersData.map((data) =>
    getOverallSkill(data.skills)
  );
  const combatLevels = playersData.map((data) =>
    calculateCombatLevel(data.skills)
  );
  const maxCombat = Math.max(...combatLevels);
  const tiedCombatWinners = combatLevels.filter(
    (level) => level === maxCombat
  ).length;
  const combatLeader = getCombatLeader(playersData);

  summaryEl.innerHTML = playersData
    .map((data, index) => {
      const overall = overalls[index];
      const combatLevel = combatLevels[index];
      const isCombatWinner =
        combatLevel === maxCombat && tiedCombatWinners === 1;

      return `
        <article class="player-card${isCombatWinner ? " winner-combat" : ""}" data-player="${data.name}">
          <h2 class="player-name">${playerLink(data.name, data.name === combatLeader)}</h2>
          <div class="combat-level${isCombatWinner ? " winner" : ""}">
            <img
              class="combat-icon"
              src="${COMBAT_ICON_URL}"
              alt="Combat"
              width="28"
              height="28"
            >
            <span class="combat-level-value">${combatLevel}</span>
            <span class="combat-level-label">Combat Level</span>
          </div>
          <div class="player-stat">
            <span class="label">Total Level</span>
            <span class="value">${formatNumber(overall.level)}</span>
          </div>
          <div class="player-stat">
            <span class="label">Total XP</span>
            <span class="value">${formatNumber(overall.xp)}</span>
          </div>
          <div class="player-stat">
            <span class="label">Overall Rank</span>
            <span class="value">${formatRank(overall.rank)}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function getComparableSkills(playersData) {
  return playersData[0].skills.filter((skill) => skill.name !== "Overall");
}

function filterSkillsByCategory(skills, category) {
  const categorySkills = SKILL_CATEGORIES[category]?.skills;
  if (!categorySkills) {
    return skills;
  }

  const allowed = new Set(categorySkills);
  return skills.filter((skill) => allowed.has(skill.name));
}

function findBiggestGap(playersData) {
  const skills = getComparableSkills(playersData);
  let best = null;

  for (const skill of skills) {
    const levels = playersData
      .map((data) => ({
        name: data.name,
        level: data.skills.find((s) => s.name === skill.name)?.level ?? 1,
      }))
      .sort((a, b) => b.level - a.level);

    const gap = levels[0].level - levels[1].level;
    if (gap <= 0) {
      continue;
    }

    if (!best || gap > best.gap) {
      best = {
        skill: skill.name,
        leader: levels[0].name,
        gap,
      };
    }
  }

  return best;
}

function renderGapHighlight(playersData) {
  const biggestGap = findBiggestGap(playersData);
  const combatLeader = getCombatLeader(playersData);

  if (!biggestGap) {
    gapHighlightEl.hidden = true;
    gapHighlightEl.innerHTML = "";
    return;
  }

  gapHighlightEl.hidden = false;
  gapHighlightEl.innerHTML = `
    <img
      class="gap-highlight-icon"
      src="${skillIconUrl(biggestGap.skill)}"
      alt=""
      width="20"
      height="20"
    >
    <div class="gap-highlight-body">
      <span class="gap-highlight-label">Largest Level Lead</span>
      <p class="gap-highlight-text">
        ${playerLink(biggestGap.leader, biggestGap.leader === combatLeader)} leads
        <strong>${biggestGap.skill}</strong> by
        <strong>${biggestGap.gap}</strong>
        ${biggestGap.gap === 1 ? "level" : "levels"}
      </p>
    </div>
  `;
}

function renderSkillTabs() {
  skillTabsEl.hidden = false;
  skillTabsEl.innerHTML = Object.entries(SKILL_CATEGORIES)
    .map(([id, category]) => {
      const isActive = id === activeSkillCategory;
      return `
        <button
          type="button"
          class="skill-tab${isActive ? " active" : ""}"
          data-category="${id}"
          aria-pressed="${isActive}"
        >${category.label}</button>
      `;
    })
    .join("");
}

function renderTable(playersData, category = activeSkillCategory) {
  const skills = filterSkillsByCategory(
    getComparableSkills(playersData),
    category
  );
  const biggestGap = findBiggestGap(playersData);
  const combatLeader = getCombatLeader(playersData);

  const headerCells = playersData
    .map((data) =>
      `<th>${playerLink(data.name, data.name === combatLeader)}</th>`
    )
    .join("");

  if (skills.length === 0) {
    tableEl.innerHTML = `<p class="placeholder-text">No skills in this category.</p>`;
    return;
  }

  const rows = skills
    .map((skill) => {
      const playerStats = playersData.map((data) =>
        data.skills.find((s) => s.name === skill.name)
      );

      const maxLevel = Math.max(...playerStats.map((s) => s.level));
      const tiedWinners = playerStats.filter(
        (s) => s.level === maxLevel
      ).length;

      const cells = playerStats
        .map((stat) => {
          const isWinner = stat.level === maxLevel && tiedWinners === 1;
          return `
            <td>
              <span class="stat-value${isWinner ? " winner" : ""}">${stat.level}</span>
              <span class="stat-xp">${formatNumber(stat.xp)} xp</span>
              <span class="stat-rank">Rank: ${formatRank(stat.rank)}</span>
            </td>
          `;
        })
        .join("");

      return `
        <tr${biggestGap?.skill === skill.name ? ' class="biggest-gap-row"' : ""}>
          <td>
            <div class="skill-cell">
              <img src="${skillIconUrl(skill.name)}" alt="${skill.name}" width="20" height="20">
              <span class="skill-name">${skill.name}</span>
            </div>
          </td>
          ${cells}
        </tr>
      `;
    })
    .join("");

  tableEl.innerHTML = `
    <table class="stats-table">
      <thead>
        <tr>
          <th>Skill</th>
          ${headerCells}
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function findPlayerData(playerName) {
  return cachedPlayersData?.find((data) => data.name === playerName) ?? null;
}

function renderPlayerDetail(playerData) {
  const overall = getOverallSkill(playerData.skills);
  const combatLevel = calculateCombatLevel(playerData.skills);
  const skills = playerData.skills.filter((skill) => skill.name !== "Overall");
  const combatLeader = cachedPlayersData
    ? getCombatLeader(cachedPlayersData)
    : null;
  const isLeader = playerData.name === combatLeader;

  playerDetailTitleEl.innerHTML = isLeader
    ? `<img class="party-hat-icon" src="${PARTY_HAT_URL}" alt="" width="18" height="16"><span>${playerData.name}</span>`
    : `<span>${playerData.name}</span>`;

  playerDetailSummaryEl.innerHTML = `
    <div class="detail-stat-grid">
      <div class="detail-stat">
        <span class="label">Combat Level</span>
        <span class="value">${combatLevel}</span>
      </div>
      <div class="detail-stat">
        <span class="label">Total Level</span>
        <span class="value">${formatNumber(overall.level)}</span>
      </div>
      <div class="detail-stat">
        <span class="label">Total XP</span>
        <span class="value">${formatNumber(overall.xp)}</span>
      </div>
      <div class="detail-stat">
        <span class="label">Overall Rank</span>
        <span class="value">${formatRank(overall.rank)}</span>
      </div>
    </div>
  `;

  const rows = skills
    .map((skill) => {
      const toNext = xpToNextLevel(skill.xp, skill.level);
      const to99 = xpTo99(skill.xp);

      return `
        <tr>
          <td>
            <div class="skill-cell">
              <img src="${skillIconUrl(skill.name)}" alt="${skill.name}" width="20" height="20">
              <span class="skill-name">${skill.name}</span>
            </div>
          </td>
          <td><span class="stat-value">${skill.level}</span></td>
          <td>${formatNumber(skill.xp)}</td>
          <td>${formatRank(skill.rank)}</td>
          <td>${formatXpRemaining(toNext)}</td>
          <td>${formatXpRemaining(to99, "Maxed")}</td>
        </tr>
      `;
    })
    .join("");

  playerDetailTableEl.innerHTML = `
    <table class="stats-table detail-table">
      <thead>
        <tr>
          <th>Skill</th>
          <th>Level</th>
          <th>XP</th>
          <th>Rank</th>
          <th>To Next Lvl</th>
          <th>To 99</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function showMainView(updateHash = true) {
  mainViewEl.hidden = false;
  playerDetailViewEl.hidden = true;
  document.title = "OSRS Player Stats Comparison";

  if (updateHash && location.hash.startsWith("#/player/")) {
    history.replaceState(null, "", location.pathname + location.search);
  }
}

function showPlayerDetail(playerName, updateHash = true) {
  const playerData = findPlayerData(playerName);
  if (!playerData) {
    return;
  }

  mainViewEl.hidden = true;
  playerDetailViewEl.hidden = false;
  document.title = `${playerName} — Potato Scores`;
  renderPlayerDetail(playerData);

  if (updateHash) {
    const hash = `#/player/${encodeURIComponent(playerName)}`;
    if (location.hash !== hash) {
      location.hash = hash;
    }
  }
}

function handleRoute() {
  const match = location.hash.match(/^#\/player\/([^/?#]+)/);
  if (match && cachedPlayersData) {
    showPlayerDetail(decodeURIComponent(match[1]), false);
  } else if (!match) {
    showMainView(false);
  }
}

function openPlayerDetail(playerName) {
  if (!findPlayerData(playerName)) {
    return;
  }
  showPlayerDetail(playerName);
}

function openPlayerDetailFromCard(playerName, card) {
  if (!findPlayerData(playerName)) {
    return;
  }

  playCardOpenAnimation(card, () => showPlayerDetail(playerName));
}

function showError(message) {
  gapHighlightEl.hidden = true;
  gapHighlightEl.innerHTML = "";
  skillTabsEl.hidden = true;
  skillTabsEl.innerHTML = "";
  summaryEl.innerHTML = `
    <div class="error-panel">
      <p>${message}</p>
      <p class="hint">Try refreshing, or open this page through a local web server.</p>
    </div>
  `;
  tableEl.innerHTML = `<p class="placeholder-text">Unable to load comparison data.</p>`;
}

async function loadStats() {
  refreshBtn.disabled = true;
  summaryEl.innerHTML = `
    <div class="loading-panel">
      <div class="loading-spinner"></div>
      <p>Loading hiscores from Lumbridge...</p>
    </div>
  `;
  tableEl.innerHTML = `<p class="placeholder-text">Fetching player data...</p>`;
  gapHighlightEl.hidden = true;
  skillTabsEl.hidden = true;

  try {
    const playersData = sortPlayersByCombat(await fetchAllPlayerStats());
    cachedPlayersData = playersData;

    renderSummary(playersData);
    renderGapHighlight(playersData);
    renderSkillTabs();
    renderTable(playersData);
    refreshBtn.disabled = false;
    handleRoute();
  } catch (error) {
    showError(error.message);
    refreshBtn.disabled = false;
  }
}

refreshBtn.addEventListener("click", loadStats);
backBtn.addEventListener("click", () => showMainView());
window.addEventListener("hashchange", handleRoute);

summaryEl.addEventListener("click", (event) => {
  const card = event.target.closest(".player-card");
  const link = event.target.closest("[data-player]");
  const playerName = link?.dataset.player ?? card?.dataset.player;

  if (!playerName) {
    return;
  }

  if (card) {
    openPlayerDetailFromCard(playerName, card);
    return;
  }

  openPlayerDetail(playerName);
});

tableEl.addEventListener("click", (event) => {
  const link = event.target.closest("[data-player]");
  if (link) {
    openPlayerDetail(link.dataset.player);
  }
});

gapHighlightEl.addEventListener("click", (event) => {
  const link = event.target.closest("[data-player]");
  if (link) {
    openPlayerDetail(link.dataset.player);
  }
});

skillTabsEl.addEventListener("click", (event) => {
  const tab = event.target.closest("[data-category]");
  if (!tab || !cachedPlayersData) {
    return;
  }

  activeSkillCategory = tab.dataset.category;
  renderSkillTabs();
  renderTable(cachedPlayersData);
});

initHeaderEmotes();
loadStats();
