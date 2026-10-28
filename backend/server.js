
require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const path = require("path");

const app = express();

app.use(helmet());
app.use(express.json());

// Serve the frontend folder
app.use(express.static(path.join(__dirname, "../frontend")));

// Test backend
app.get("/api/health", (req, res) => {
  res.json({
    status: "success",
    message: "Student Attendance API is running"
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});