
const express = require("express");
const supabase = require("../supabase");

const router = express.Router();

// Get all active students
router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

// Add a student
router.post("/", async (req, res) => {
  const { student_id, name, class_name, email } = req.body;

  if (
    typeof student_id !== "string" || !student_id.trim() ||
    typeof name !== "string" || !name.trim() ||
    typeof class_name !== "string" || !class_name.trim()
  ) {
    return res.status(400).json({
      message: "Student ID, name, and class are required"
    });
  }

  const { data, error } = await supabase
    .from("students")
    .insert({
      student_id: student_id.trim(),
      name: name.trim(),
      class_name: class_name.trim(),
      email: email?.trim() || null,
      is_active: true
    })
    .select()
    .single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.status(201).json(data);
});

// Update a student
router.put("/:id", async (req, res) => {
  const { name, class_name, email } = req.body;
  const updates = {};

  if (name !== undefined) updates.name = name;
  if (class_name !== undefined) updates.class_name = class_name;
  if (email !== undefined) updates.email = email || null;

  if (!Object.keys(updates).length) {
    return res.status(400).json({ message: "No fields to update" });
  }

  const { data, error } = await supabase
    .from("students")
    .update(updates)
    .eq("student_id", req.params.id)
    .eq("is_active", true)
    .select()
    .maybeSingle();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  if (!data) {
    return res.status(404).json({ message: "Student not found" });
  }

  res.json(data);
});

// Deactivate a student without deleting attendance history
router.delete("/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("students")
    .update({ is_active: false })
    .eq("student_id", req.params.id)
    .eq("is_active", true)
    .select()
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (!data) {
    return res.status(404).json({ message: "Student not found" });
  }

  res.json({ message: "Student deactivated successfully" });
});

module.exports = router;
