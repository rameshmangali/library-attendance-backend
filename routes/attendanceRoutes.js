import express from "express";
import Attendance from "../models/attendanceModel.js";
import Student from "../models/studentModel.js";

const router = express.Router();

/** 🕒 Convert current UTC time to IST (+5:30) */
const getISTTime = () => {
  const now = new Date();
  const ISTOffset = 5.5 * 60 * 60 * 1000;
  return new Date(now.getTime() + ISTOffset);
};

/** 🗓️ Get only date part in IST (YYYY-MM-DD) */
const getISTDateOnly = () => {
  const ist = getISTTime();
  return ist.toISOString().split("T")[0];
};

/**
 * 🟢 Unified Attendance Scan API
 * Works for both IN and OUT scans
 * Example:
 *   POST https://library-attendance-backend.onrender.com/api/attendance/scan?cardId=F7CA3502
 */
router.post("/scan", async (req, res) => {
  try {
    const cardId = req.query.cardId || req.body.cardId;
    if (!cardId) return res.status(400).send("Card ID is required");

    // ✅ Find student by card ID
    const student = await Student.findOne({ cardId });
    if (!student) return res.status(404).send("Card not registered in database");

    // ✅ Check if already IN but not OUT
    const activeRecord = await Attendance.findOne({
      cardId,
      outTime: { $exists: false },
    });

    if (!activeRecord) {
      // 🟢 IN SCAN
      const newRecord = new Attendance({
        rollNumber: student.rollNumber,
        cardId: student.cardId,
        name: student.name,
        branch: student.branch,
        inTime: getISTTime(),
        date: getISTDateOnly(),
      });

      await newRecord.save();
      return res
        .status(201)
        .send(`IN Scan recorded for ${student.name}`);
    } else {
      // 🔴 OUT SCAN
      activeRecord.outTime = getISTTime();
      const durationMs = activeRecord.outTime - activeRecord.inTime;
      const durationMins = Math.floor(durationMs / 60000);
      activeRecord.duration = `${durationMins} mins`;
      await activeRecord.save();

      return res
        .status(200)
        .send(`OUT Scan recorded for ${student.name} | Duration: ${durationMins} mins`);
    }
  } catch (error) {
    console.error("Error in scan API:", error);
    res.status(500).send(error.message);
  }
});

/**
 * 🟢 Get all students currently IN (not OUT)
 * GET https://library-attendance-backend.onrender.com/api/attendance/active
 */
router.get("/active", async (req, res) => {
  try {
    const activeRecords = await Attendance.find({
      inTime: { $exists: true },
      outTime: { $exists: false },
    }).sort({ inTime: -1 });

    if (activeRecords.length === 0) {
      return res
        .status(200)
        .json({ message: "No active students in library", activeRecords: [] });
    }

    res.status(200).json({
      message: "Students currently in library",
      count: activeRecords.length,
      activeRecords,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 🔴 Force OUT all students currently IN
 * PUT https://library-attendance-backend.onrender.com/api/attendance/force-out
 */
router.put("/force-out", async (req, res) => {
  try {
    const activeRecords = await Attendance.find({
      inTime: { $exists: true },
      outTime: { $exists: false },
    });

    if (activeRecords.length === 0) {
      return res.status(200).json({ message: "No active students to update" });
    }

    const now = getISTTime();
    const updatedRecords = [];

    for (const record of activeRecords) {
      record.outTime = now;
      const diffMs = record.outTime - record.inTime;
      record.duration = Math.floor(diffMs / 60000) + " mins";
      await record.save();
      updatedRecords.push(record);
    }

    res.status(200).json({
      message: `${updatedRecords.length} students marked OUT successfully`,
      updatedRecords,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 📅 Get attendance for a specific date
 * GET https://library-attendance-backend.onrender.com/api/attendance/date/2025-10-13
 */
router.get("/date/:date", async (req, res) => {
  try {
    // 1. Get the date string from the request parameters (e.g., "2025-10-14")
    const date = new Date(req.params.date);

    // 2. Create the start and end of that day in UTC for a reliable query
    const startOfDay = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0);
    const endOfDay = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999);

    // 3. Use a range query to find all records within that day
    const attendanceRecords = await Attendance.find({
      inTime: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    }).sort({ inTime: -1 }); // Sort by most recent first

    if (!attendanceRecords || attendanceRecords.length === 0) {
      // It's crucial to send back an empty array if nothing is found
      return res.json([]); 
    }

    res.json(attendanceRecords);
  } catch (error) {
    console.error("Error fetching attendance by date:", error);
    res.status(500).json({ message: "Server error" });
  }
});


// --- NEW ROUTE FOR MANUAL CLOCK-OUT ---
// This provides a dedicated endpoint for the librarian's action.
router.put("/:id/clock-out", async (req, res) => {
  try {
    const record = await Attendance.findById(req.params.id);

    if (!record) {
      return res.status(404).json({ message: "Attendance record not found" });
    }
    if (record.outTime) {
      return res.status(400).json({ message: "Student has already clocked out" });
    }

    // Set outTime to now and calculate duration, same as a card scan
    record.outTime = getISTTime();
    const durationMs = record.outTime - record.inTime;
    const durationMins = Math.floor(durationMs / 60000);
    record.duration = `${durationMins} mins`;

    await record.save();
    res.json(record);
  } catch (error) {
    console.error("Error in manual clock-out:", error);
    res.status(500).json({ message: "Server error during clock-out" });
  }
});

/**
 * 📋 Get all attendance records
 * GET https://library-attendance-backend.onrender.com/api/attendance
 */
router.get("/", async (req, res) => {
  try {
    const records = await Attendance.find().sort({ date: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
