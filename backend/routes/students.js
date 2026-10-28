

require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const path = require("path");

const app = express();

const studentsRouter = require("./routes/students");
const attendanceRouter = require("./routes/attendance");

app.use(helmet());
app.use(express.json());

// Display the frontend
app.use(express.static(path.join(__dirname, "../frontend")));

// Test the backend
app.get("/api/health", (req, res) => {
  res.json({
    status: "success",
    message: "Student Attendance API is running"
  });
});

// Connect API routes
app.use("/api/students", studentsRouter);
app.use("/api/attendance", attendanceRouter);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
