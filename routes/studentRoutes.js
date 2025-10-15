// import express from "express";
// import Student from "../models/studentModel.js";
// const router = express.Router();

// // ➕ Add new student
// router.post("/add", async (req, res) => {
//   try {
//     const student = new Student(req.body);
//     await student.save();
//     res.status(201).json({ message: "Student added successfully", student });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // 📋 Get all students
// router.get("/", async (req, res) => {
//   const students = await Student.find();
//   res.json(students);
// });

// // ➕ Add multiple students
// router.post("/addMany", async (req, res) => {
//   try {
//     const students = req.body.map(student => ({
//       ...student,
//       mobile: student.mobile || Math.floor(6000000000 + Math.random() * 4000000000).toString()
//     }));

//     const result = await Student.insertMany(students);
//     res.status(201).json({ message: "✅ Multiple students added successfully", count: result.length });
//   } catch (error) {
//     console.error("❌ Bulk Insert Error:", error);
//     res.status(500).json({ error: error.message });
//   }
// });

// export default router;


import express from "express";
import Student from "../models/studentModel.js";

const router = express.Router();


// ✅ Add a new student
router.post("/add", async (req, res) => {
  try {
    const { rollNumber, cardId, name, branch, mobile, email } = req.body;

    // check if cardId or rollNumber already exists
    const existing = await Student.findOne({
      $or: [{ rollNumber }, { cardId }],
    });

    if (existing) {
      return res.status(400).json({
        message: "⚠️ Student with this roll number or card ID already exists",
      });
    }

    const student = new Student({
      rollNumber,
      cardId,
      name,
      branch,
      mobile,
      email,
    });

    await student.save();
    res.status(201).json({
      message: "✅ Student added successfully",
      student,
    });
  } catch (error) {
    console.error("Error adding student:", error);
    res.status(500).json({ error: error.message });
  }
});


// 📋 Get all students
router.get("/", async (req, res) => {
  try {
    const students = await Student.find().sort({ rollNumber: 1 });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// 🔍 Get student by cardId
router.get("/card/:cardId", async (req, res) => {
  try {
    const student = await Student.findOne({ cardId: req.params.cardId });
    if (!student)
      return res.status(404).json({ message: "❌ Student not found" });
    res.json(student);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ➕ Add multiple students (bulk insert)
router.post("/addMany", async (req, res) => {
  try {
    const students = req.body.map((student) => ({
      ...student,
      mobile:
        student.mobile ||
        Math.floor(6000000000 + Math.random() * 4000000000).toString(),
    }));

    const result = await Student.insertMany(students, { ordered: false });
    res.status(201).json({
      message: "✅ Multiple students added successfully",
      count: result.length,
    });
  } catch (error) {
    console.error("❌ Bulk Insert Error:", error);
    res.status(500).json({ error: error.message });
  }
});


// 🗑️ Delete all students (useful when resetting DB)
router.delete("/deleteAll", async (req, res) => {
  try {
    const result = await Student.deleteMany({});
    res.json({
      message: "🧹 All student records deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// PUT (Update) a student by ID
router.put("/:id", async (req, res) => {
  try {
    const updatedStudent = await Student.findByIdAndUpdate(
      req.params.id, // The ID of the student to update
      req.body,      // The new data for the student
      { new: true }  // Option to return the updated document
    );

    if (!updatedStudent) {
      // If no student was found with that ID, send a 404 error
      return res.status(404).json({ message: "Student not found" });
    }

    res.json(updatedStudent); // Send back the updated student data
  } catch (error) {
    console.error("Error updating student:", error);
    res.status(500).json({ message: "Server error while updating" });
  }
});

// DELETE a student by ID
router.delete("/:id", async (req, res) => {
  try {
    const deletedStudent = await Student.findByIdAndDelete(req.params.id);

    if (!deletedStudent) {
      // If no student was found with that ID, send a 404 error
      return res.status(404).json({ message: "Student not found" });
    }

    res.json({ message: "Student deleted successfully" });
  } catch (error) {
    console.error("Error deleting student:", error);
    res.status(500).json({ message: "Server error while deleting" });
  }
});

export default router;
