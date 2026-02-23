const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const connectDB = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

const locationSchema = new mongoose.Schema(
  {
    user: { type: String, required: true, index: true },
    longitude: { type: Number, required: true },
    latitude: { type: Number, required: true },
  },
  { timestamps: true }
);

const Location = mongoose.models.Location || mongoose.model("Location", locationSchema);

app.use(express.json());
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/users-page", (req, res) => {
  res.sendFile(path.join(__dirname, "users.html"));
});

app.post("/location", async (req, res) => {
  try {
    await connectDB();
    const { user, longitude, latitude } = req.body || {};

    if (!user || typeof user !== "string") {
      return res.status(400).json({ error: "user (string) is required" });
    }

    if (typeof longitude !== "number" || typeof latitude !== "number") {
      return res
        .status(400)
        .json({ error: "longitude and latitude must be numbers" });
    }

    const saved = await Location.create({
      user,
      longitude,
      latitude,
    });

    const newEntry = {
      user: saved.user,
      longitude: saved.longitude,
      latitude: saved.latitude,
      timestamp: saved.createdAt,
    };

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
    await connectDB();
    const username = req.params.username;
    const docs = await Location.find({ user: username }).sort({ createdAt: 1 }).lean();
    const userLocations = docs.map((doc) => ({
      user: doc.user,
      longitude: doc.longitude,
      latitude: doc.latitude,
      timestamp: doc.createdAt,
    }));

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
    await connectDB();
    const users = await Location.aggregate([
      { $sort: { createdAt: -1 } },
      { $group: { _id: "$user", latest: { $first: "$$ROOT" } } },
      {
        $project: {
          _id: 0,
          user: "$latest.user",
          latitude: "$latest.latitude",
          longitude: "$latest.longitude",
          timestamp: "$latest.createdAt",
        },
      },
      { $sort: { user: 1 } },
    ]);

    return res.json({ count: users.length, users });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch users" });
  }
});

if (require.main === module) {
  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
      });
    })
    .catch((error) => {
      console.error("Failed to connect to MongoDB", error);
      process.exit(1);
    });
}

// app.listen(PORT, () => {
//   console.log(`Server is running on http://localhost:${PORT}`);
// });

module.exports = app;
