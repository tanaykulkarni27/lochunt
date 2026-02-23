const express = require("express");
const fs = require("fs/promises");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "locations.json");

app.use(express.json());
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/users-page", (req, res) => {
  res.sendFile(path.join(__dirname, "users.html"));
});

async function ensureDataFile() {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, "[]", "utf8");
  }
}

async function readLocations() {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, "utf8");
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeLocations(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

app.post("/location", async (req, res) => {
  try {
    const { user, longitude, latitude } = req.body || {};

    if (!user || typeof user !== "string") {
      return res.status(400).json({ error: "user (string) is required" });
    }

    if (typeof longitude !== "number" || typeof latitude !== "number") {
      return res
        .status(400)
        .json({ error: "longitude and latitude must be numbers" });
    }

    const locations = await readLocations();
    const newEntry = {
      user,
      longitude,
      latitude,
      timestamp: new Date().toISOString(),
    };

    locations.push(newEntry);
    await writeLocations(locations);

    return res.status(201).json({
      message: "Location saved",
      data: newEntry,
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to save location" });
  }
});

app.get("/user/:username", async (req, res) => {
  try {
    const username = req.params.username;
    const locations = await readLocations();
    const userLocations = locations.filter((item) => item.user === username);

    if (userLocations.length === 0) {
      return res.status(404).json({ error: "User location not found" });
    }

    return res.json({
      user: username,
      latest: userLocations[userLocations.length - 1],
      history: userLocations,
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch user location" });
  }
});

app.get("/users", async (req, res) => {
  try {
    const locations = await readLocations();
    const latestByUser = new Map();

    for (const item of locations) {
      latestByUser.set(item.user, item);
    }

    const users = Array.from(latestByUser.values()).map((item) => ({
      user: item.user,
      latitude: item.latitude,
      longitude: item.longitude,
      timestamp: item.timestamp,
    }));

    return res.json({ count: users.length, users });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch users" });
  }
});

// app.listen(PORT, () => {
//   console.log(`Server is running on http://localhost:${PORT}`);
// });

module.exports = app;