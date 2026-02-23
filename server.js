const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const connectDB = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

const locationSchema = new mongoose.Schema(
  {
    user: { type: String, required: true, unique: true, index: true },
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
    const normalizedUser = typeof user === "string" ? user.trim() : "";

    if (!normalizedUser) {
      return res.status(400).json({ error: "user (string) is required" });
    }

    if (typeof longitude !== "number" || typeof latitude !== "number") {
      return res
        .status(400)
        .json({ error: "longitude and latitude must be numbers" });
    }

    const saved = await Location.findOneAndUpdate(
      { user: normalizedUser },
      {
        user: normalizedUser,
        longitude,
        latitude,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    const newEntry = {
      user: saved.user,
      longitude,
      latitude,
      timestamp: saved.updatedAt,
    };

    return res.status(200).json({
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
    const doc = await Location.findOne({ user: username }).lean();
    if (!doc) {
      return res.status(404).json({ error: "User location not found" });
    }

    const latest = {
      user: doc.user,
      longitude: doc.longitude,
      latitude: doc.latitude,
      timestamp: doc.updatedAt,
    };

    return res.json({
      user: username,
      latest,
      history: [latest],
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch user location" });
  }
});

app.get("/users", async (req, res) => {
  try {
    await connectDB();
    const docs = await Location.find({}).sort({ user: 1 }).lean();
    const users = docs.map((doc) => ({
      user: doc.user,
      latitude: doc.latitude,
      longitude: doc.longitude,
      timestamp: doc.updatedAt,
    }));

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
