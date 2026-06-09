const JAGEX_API =
  "https://secure.runescape.com/m=hiscore_oldschool/index_lite.json?player=";

export default async function handler(req, res) {
  const player = req.query.player;

  if (!player || typeof player !== "string") {
    return res.status(400).json({ error: "Player name is required" });
  }

  try {
    const response = await fetch(JAGEX_API + encodeURIComponent(player));

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: `Jagex API returned ${response.status}` });
    }

    const data = await response.json();

    if (!data.skills || !Array.isArray(data.skills)) {
      return res.status(502).json({ error: "Invalid response from Jagex API" });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Failed to fetch hiscores",
    });
  }
}
