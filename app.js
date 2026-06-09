const PLAYERS = ["Veizon", "trp_zero", "JelloBeanMan"];

const API_BASE = "/api/hiscore?player=";

const SKILL_ICONS = {
  Overall: "Stats_icon",
  Attack: "Attack_icon",
  Defence: "Defence_icon",
  Strength: "Strength_icon",
  Hitpoints: "Hitpoints_icon",
  Ranged: "Ranged_icon",
  Prayer: "Prayer_icon",
  Magic: "Magic_icon",
  Cooking: "Cooking_icon",
  Woodcutting: "Woodcutting_icon",
  Fletching: "Fletching_icon",
  Fishing: "Fishing_icon",
  Firemaking: "Firemaking_icon",
  Crafting: "Crafting_icon",
  Smithing: "Smithing_icon",
  Mining: "Mining_icon",
  Herblore: "Herblore_icon",
  Agility: "Agility_icon",
  Thieving: "Thieving_icon",
  Slayer: "Slayer_icon",
  Farming: "Farming_icon",
  Runecraft: "Runecraft_icon",
  Hunter: "Hunter_icon",
  Construction: "Construction_icon",
  Sailing: "Sailing",
};

const summaryEl = document.getElementById("player-summary");
const tableEl = document.getElementById("stats-table");
const refreshBtn = document.getElementById("refresh-btn");

function formatNumber(value) {
  return value.toLocaleString("en-US");
}

function formatRank(rank) {
  return rank > 0 ? formatNumber(rank) : "—";
}

function skillIconUrl(skillName) {
  const file = SKILL_ICONS[skillName] || "Stats_icon";
  return `https://oldschool.runescape.wiki/images/${file}.png`;
}

async function fetchPlayerStats(player) {
  const response = await fetch(API_BASE + encodeURIComponent(player));

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
    throw new Error(`Failed to load stats for ${player}: ${message}`);
  }

  const data = await response.json();

  if (!data.skills || !Array.isArray(data.skills)) {
    throw new Error(`Failed to load stats for ${player}: invalid response`);
  }

  return data;
}

function getOverallSkill(skills) {
  return skills.find((skill) => skill.name === "Overall");
}

function renderSummary(playersData) {
  const overalls = playersData.map((data) =>
    getOverallSkill(data.skills)
  );
  const maxLevel = Math.max(...overalls.map((s) => s.level));
  const maxXp = Math.max(...overalls.map((s) => s.xp));

  summaryEl.innerHTML = playersData
    .map((data, index) => {
      const overall = overalls[index];
      const isWinner =
        overall.level === maxLevel || overall.xp === maxXp;

      return `
        <article class="player-card${isWinner ? " winner-overall" : ""}">
          <h2 class="player-name">${data.name}</h2>
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

function renderTable(playersData) {
  const skills = playersData[0].skills.filter(
    (skill) => skill.name !== "Overall"
  );

  const headerCells = playersData
    .map((data) => `<th>${data.name}</th>`)
    .join("");

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
        <tr>
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

function showError(message) {
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

  try {
    const playersData = await Promise.all(
      PLAYERS.map((player) => fetchPlayerStats(player))
    );

    renderSummary(playersData);
    renderTable(playersData);
    refreshBtn.disabled = false;
  } catch (error) {
    showError(error.message);
    refreshBtn.disabled = false;
  }
}

refreshBtn.addEventListener("click", loadStats);
loadStats();
