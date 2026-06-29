import https from "node:https";
import { URL } from "node:url";

const JAGEX_JSON =
  "https://secure.runescape.com/m=hiscore_oldschool/index_lite.json?player=";
const JAGEX_CSV =
  "https://secure.runescape.com/m=hiscore_oldschool/index_lite.ws?player=";

const SKILL_NAMES = [
  "Overall",
  "Attack",
  "Defence",
  "Strength",
  "Hitpoints",
  "Ranged",
  "Prayer",
  "Magic",
  "Cooking",
  "Woodcutting",
  "Fletching",
  "Fishing",
  "Firemaking",
  "Crafting",
  "Smithing",
  "Mining",
  "Herblore",
  "Agility",
  "Thieving",
  "Slayer",
  "Farming",
  "Runecraft",
  "Hunter",
  "Construction",
  "Sailing",
];

const ACTIVITY_NAMES = [
  "Grid Points",
  "League Points",
  "Deadman Points",
  "Bounty Hunter - Hunter",
  "Bounty Hunter - Rogue",
  "Bounty Hunter (Legacy) - Hunter",
  "Bounty Hunter (Legacy) - Rogue",
  "Clue Scrolls (all)",
  "Clue Scrolls (beginner)",
  "Clue Scrolls (easy)",
  "Clue Scrolls (medium)",
  "Clue Scrolls (hard)",
  "Clue Scrolls (elite)",
  "Clue Scrolls (master)",
  "LMS - Rank",
  "PvP Arena - Rank",
  "Soul Wars Zeal",
  "Rifts closed",
  "Colosseum Glory",
  "Collections Logged",
  "Abyssal Sire",
  "Alchemical Hydra",
  "Amoxliatl",
  "Araxxor",
  "Artio",
  "Barrows Chests",
  "Brutus",
  "Bryophyta",
  "Callisto",
  "Cal'varion",
  "Cerberus",
  "Chambers of Xeric",
  "Chambers of Xeric: Challenge Mode",
  "Chaos Elemental",
  "Chaos Fanatic",
  "Commander Zilyana",
  "Corporeal Beast",
  "Crazy Archaeologist",
  "Dagannoth Prime",
  "Dagannoth Rex",
  "Dagannoth Supreme",
  "Deranged Archaeologist",
  "Doom of Mokhaiotl",
  "Duke Sucellus",
  "General Graardor",
  "Giant Mole",
  "Grotesque Guardians",
  "Hespori",
  "Kalphite Queen",
  "King Black Dragon",
  "Kraken",
  "Kree'Arra",
  "K'ril Tsutsaroth",
  "Lunar Chests",
  "Mimic",
  "Nex",
  "Nightmare",
  "Phosani's Nightmare",
  "Obor",
  "Phantom Muspah",
  "Sarachnis",
  "Scorpia",
  "Scurrius",
  "Shellbane Gryphon",
  "Skotizo",
  "Sol Heredit",
  "Spindel",
  "Tempoross",
  "The Gauntlet",
  "The Corrupted Gauntlet",
  "The Hueycoatl",
  "The Leviathan",
  "The Royal Titans",
  "The Whisperer",
  "Theatre of Blood",
  "Theatre of Blood: Hard Mode",
  "Thermonuclear Smoke Devil",
  "Tombs of Amascut",
  "Tombs of Amascut: Expert Mode",
  "TzKal-Zuk",
  "TzTok-Jad",
  "Vardorvis",
  "Venenatis",
  "Vet'ion",
  "Vorkath",
  "Wintertodt",
  "Yama",
  "Zalcano",
  "Zulrah",
];

const FETCH_HEADERS = {
  Accept: "application/json,text/plain,*/*",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Referer: "https://oldschool.runescape.com/",
};

function httpsGetText(urlString, timeoutMs = 6000, redirects = 0) {
  if (redirects > 3) {
    return Promise.reject(new Error("Too many redirects from Jagex API"));
  }

  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const req = https.request(
      {
        hostname: url.hostname,
        path: `${url.pathname}${url.search}`,
        method: "GET",
        headers: FETCH_HEADERS,
        family: 4,
        timeout: timeoutMs,
      },
      (res) => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          res.resume();
          httpsGetText(
            new URL(res.headers.location, urlString).toString(),
            timeoutMs,
            redirects + 1
          )
            .then(resolve)
            .catch(reject);
          return;
        }

        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`Jagex API returned ${res.statusCode}`));
            return;
          }
          resolve(body);
        });
      }
    );

    req.on("timeout", () => {
      req.destroy();
      reject(
        Object.assign(
          new Error("Jagex hiscores timed out — try again in a moment"),
          { name: "AbortError" }
        )
      );
    });
    req.on("error", reject);
    req.end();
  });
}

function parseCsvHiscore(player, csvText) {
  const lines = csvText.trim().split("\n");

  if (lines.length < SKILL_NAMES.length) {
    throw new Error("CSV response too short");
  }

  const skills = SKILL_NAMES.map((name, index) => {
    const [rank, level, xp] = lines[index].split(",").map(Number);
    return { id: index, name, rank, level, xp };
  });

  const activities = ACTIVITY_NAMES.map((name, index) => {
    const line = lines[SKILL_NAMES.length + index];
    if (!line) {
      return { id: index, name, rank: -1, score: 0 };
    }
    const [rank, level, score] = line.split(",").map(Number);
    return { id: index, name, rank, level, score };
  });

  return { name: player, skills, activities };
}

async function fetchJsonHiscore(player) {
  const body = await httpsGetText(JAGEX_JSON + encodeURIComponent(player));
  const data = JSON.parse(body);

  if (!data.skills || !Array.isArray(data.skills)) {
    throw new Error("Invalid JSON response from Jagex API");
  }

  return data;
}

async function fetchCsvHiscore(player) {
  const csvText = await httpsGetText(JAGEX_CSV + encodeURIComponent(player));

  if (csvText.includes("<html") || csvText.includes("<!DOCTYPE")) {
    throw new Error("Jagex CSV API returned HTML instead of data");
  }

  return parseCsvHiscore(player, csvText);
}

export async function fetchPlayerHiscore(player) {
  const attempts = [() => fetchJsonHiscore(player), () => fetchCsvHiscore(player)];
  let lastError;

  for (const attempt of attempts) {
    try {
      return await attempt();
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    lastError?.name === "AbortError"
      ? "Jagex hiscores timed out — try again in a moment"
      : lastError?.message || "Failed to fetch hiscores"
  );
}
