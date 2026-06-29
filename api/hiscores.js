import { fetchPlayerHiscore } from "../lib/hiscore.js";

export const config = {
  maxDuration: 30,
};

export default async function handler(req, res) {
  const rawPlayers = req.query.players;

  if (!rawPlayers || typeof rawPlayers !== "string") {
    return res.status(400).json({ error: "players query param is required" });
  }

  const players = [...new Set(rawPlayers.split(",").map((name) => name.trim()))]
    .filter(Boolean)
    .slice(0, 10);

  if (players.length === 0) {
    return res.status(400).json({ error: "No valid player names provided" });
  }

  try {
    const results = await Promise.all(
      players.map(async (player) => {
        try {
          const data = await fetchPlayerHiscore(player);
          return { player, ok: true, data };
        } catch (error) {
          return {
            player,
            ok: false,
            error: error.message || "Failed to fetch hiscores",
          };
        }
      })
    );

    const failed = results.filter((result) => !result.ok);

    if (failed.length === results.length) {
      const isTimeout = failed.every((result) =>
        result.error.includes("timed out")
      );
      return res.status(isTimeout ? 504 : 502).json({
        error: failed[0].error,
        results,
      });
    }

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=120, stale-while-revalidate=300"
    );
    return res.status(200).json({ results });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Failed to fetch hiscores",
    });
  }
}
