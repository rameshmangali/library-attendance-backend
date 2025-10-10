import express from "express";
import Student from "../models/studentModel.js";
const router = express.Router();

// ➕ Add new student
router.post("/add", async (req, res) => {
  try {
    const student = new Student(req.body);
    await student.save();
    res.status(201).json({ message: "Student added successfully", student });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 📋 Get all students
router.get("/", async (req, res) => {
  const students = await Student.find();
  res.json(students);
});

// ➕ Add multiple students
router.post("/addMany", async (req, res) => {
  try {
    const students = req.body.map(student => ({
      ...student,
      mobile: student.mobile || Math.floor(6000000000 + Math.random() * 4000000000).toString()
    }));

    const result = await Student.insertMany(students);
    res.status(201).json({ message: "✅ Multiple students added successfully", count: result.length });
  } catch (error) {
    console.error("❌ Bulk Insert Error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
