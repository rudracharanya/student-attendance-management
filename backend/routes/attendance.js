
const express = require("express");
const supabase = require("../supabase");

const router = express.Router();

function validDate(value) {
  if (typeof value !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
}

// Get attendance records
router.get("/", async (req, res) => {
  let query = supabase
    .from("attendance")
    .select("*")
    .order("attendance_date", { ascending: false });

  const { date, studentId } = req.query;

  if (date) {
    if (!validDate(date)) {
      return res.status(400).json({ message: "Invalid date" });
    }
    query = query.eq("attendance_date", date);
  }

  if (studentId) {
    query = query.eq("student_id", studentId);
  }

  const { data, error } = await query;

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

// Mark or update attendance
router.post("/", async (req, res) => {
  const { student_id, attendance_date, status } = req.body;

  if (!student_id || !validDate(attendance_date)) {
    return res.status(400).json({
      message: "Valid student ID and attendance date are required"
    });
  }

  if (attendance_date > new Date().toISOString().slice(0, 10)) {
    return res.status(400).json({
      message: "Future attendance is not allowed"
    });
  }

  if (!["Present", "Absent"].includes(status)) {
    return res.status(400).json({
      message: "Status must be Present or Absent"
    });
  }

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("student_id")
    .eq("student_id", student_id)
    .eq("is_active", true)
    .maybeSingle();

  if (studentError) {
    return res.status(500).json({ error: studentError.message });
  }

  if (!student) {
    return res.status(404).json({ message: "Active student not found" });
  }

  const { data, error } = await supabase
    .from("attendance")
    .upsert(
      { student_id, attendance_date, status },
      { onConflict: "student_id,attendance_date" }
    )
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({
    message: "Attendance saved successfully",
    data
  });
});

// Daily attendance summary
router.get("/reports/summary", async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);

  if (!validDate(date) ||
      date > new Date().toISOString().slice(0, 10)) {
    return res.status(400).json({ message: "Invalid attendance date" });
  }

  const { data: students, error: studentError } = await supabase
    .from("students")
    .select("student_id")
    .eq("is_active", true);

  if (studentError) {
    return res.status(500).json({ error: studentError.message });
  }

  const { data: records, error: attendanceError } = await supabase
    .from("attendance")
    .select("student_id, status")
    .eq("attendance_date", date);

  if (attendanceError) {
    return res.status(500).json({ error: attendanceError.message });
  }

  const activeIds = new Set(students.map(s => s.student_id));
  const activeRecords = records.filter(r => activeIds.has(r.student_id));

  const present = activeRecords.filter(r => r.status === "Present").length;
  const absent = activeRecords.filter(r => r.status === "Absent").length;
  const total = students.length;
  const marked = present + absent;

  res.json({
    date,
    totalStudents: total,
    present,
    absent,
    unmarked: total - marked,
    attendancePercentage: marked
      ? Number(((present / marked) * 100).toFixed(2))
      : 0
  });
});

module.exports = router;
