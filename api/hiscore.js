import { fetchPlayerHiscore } from "../lib/hiscore.js";

export const config = {
  maxDuration: 30,
};

export default async function handler(req, res) {
  const player = req.query.player;

  if (!player || typeof player !== "string") {
    return res.status(400).json({ error: "Player name is required" });
  }

  try {
    const data = await fetchPlayerHiscore(player);
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=120, stale-while-revalidate=300"
    );
    return res.status(200).json(data);
  } catch (error) {
    const isTimeout =
      error.message?.includes("timed out") || error.name === "AbortError";
    return res.status(isTimeout ? 504 : 502).json({
      error: error.message || "Failed to fetch hiscores",
    });
  }
}
