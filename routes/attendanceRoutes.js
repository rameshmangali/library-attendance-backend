
import express from "express";
import Attendance from "../models/attendanceModel.js";
import Student from "../models/studentModel.js";

const router = express.Router();

/** 🕒 Convert to IST (+5:30) */
const getISTTime = () => {
  const now = new Date();
  const ISTOffset = 5.5 * 60 * 60 * 1000;
  return new Date(now.getTime() + ISTOffset);
};

/** 🗓️ Return IST date as "YYYY-MM-DD" string */
const getISTDateOnly = () => {
  const ist = getISTTime();
  return ist.toISOString().split("T")[0]; // ✅ Only date string
};

// 🟢 Log In-Time
router.post("/in", async (req, res) => {
  try {
    const { rollNumber } = req.body;
    const student = await Student.findOne({ rollNumber });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const record = new Attendance({
      rollNumber: student.rollNumber,
      name: student.name,
      branch: student.branch,
      inTime: getISTTime(),
      date: getISTDateOnly()
    });

    await record.save();
    res.status(201).json({ message: "In-time recorded", record });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🔴 Log Out-Time
router.put("/out/:id", async (req, res) => {
  try {
    const record = await Attendance.findById(req.params.id);
    if (!record) return res.status(404).json({ message: "Record not found" });

    record.outTime = getISTTime();
    const diffMs = record.outTime - record.inTime;
    record.duration = Math.floor(diffMs / 60000) + " mins";
    await record.save();

    res.json({ message: "Out-time updated", record });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 🟢 Unified Attendance Scan API
 * POST http://localhost:5000/api/attendance/scan?rollNumber=22AT1A0489
 */


router.post("/scan", async (req, res) => {
  try {
    const rollNumber = req.query.rollNumber || req.body.rollNumber;
    if (!rollNumber) return res.status(400).send("Roll number is required");

    const student = await Student.findOne({ rollNumber });
    if (!student) return res.status(404).send("Student not found in database");

    const activeRecord = await Attendance.findOne({
      rollNumber,
      outTime: { $exists: false },
    });

    if (!activeRecord) {
      // 🟢 IN SCAN
      const newRecord = new Attendance({
        rollNumber: student.rollNumber,
        name: student.name,
        branch: student.branch,
        inTime: getISTTime(),
        date: getISTDateOnly()
      });

      await newRecord.save();
      return res.status(201).send(`IN Scan recorded for ${student.name}`);
    } else {
      // 🔴 OUT SCAN
      activeRecord.outTime = getISTTime();
      const durationMs = activeRecord.outTime - activeRecord.inTime;
      const durationMins = Math.floor(durationMs / 60000);
      activeRecord.duration = `${durationMins} mins`;
      await activeRecord.save();

      return res.status(200).send(`OUT Scan recorded for ${student.name} | Duration: ${durationMins} mins`);
    }
  } catch (error) {
    res.status(500).send(error.message);
  }
});




// router.post("/scan", async (req, res) => {
//   try {
//     const rollNumber = req.query.rollNumber || req.body.rollNumber;
//     if (!rollNumber) {
//       return res.status(400).json({ message: "Roll number is required" });
//     }

//     const student = await Student.findOne({ rollNumber });
//     if (!student) {
//       return res.status(404).json({ message: "Student not found in database" });
//     }

//     const activeRecord = await Attendance.findOne({
//       rollNumber,
//       outTime: { $exists: false },
//     });

//     if (!activeRecord) {
//       // 🟢 IN SCAN
//       const newRecord = new Attendance({
//         rollNumber: student.rollNumber,
//         name: student.name,
//         branch: student.branch,
//         inTime: getISTTime(),
//         date: getISTDateOnly()
//       });

//       await newRecord.save();
//       return res.status(201).json({
//         message: `IN Scan recorded for ${student.name}`,
//         record: newRecord,
//       });
//     } else {
//       // 🔴 OUT SCAN
//       activeRecord.outTime = getISTTime();
//       const durationMs = activeRecord.outTime - activeRecord.inTime;
//       const durationMins = Math.floor(durationMs / 60000);

//       activeRecord.duration = `${durationMins} mins`;
//       await activeRecord.save();

//       return res.status(200).json({
//         message: `OUT Scan recorded for ${student.name}`,
//         record: activeRecord,
//       });
//     }
//   } catch (error) {
//     console.error("Error in scan API:", error);
//     res.status(500).json({ error: error.message });
//   }
// });

// 🟢 Get currently IN (not yet OUT) students
//GET http://localhost:5000/api/attendance/active
router.get("/active", async (req, res) => {
  try {
    const activeRecords = await Attendance.find({
      inTime: { $exists: true },
      outTime: { $exists: false },
    }).sort({ inTime: -1 });

    if (activeRecords.length === 0) {
      return res.status(200).json({ message: "No active students in library", activeRecords: [] });
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

// 🔴 Force OUT for all active records
//PUT http://localhost:5000/api/attendance/force-out
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

// 📅 Get attendance for a specific date
// GET /api/attendance/date/2025-10-10
router.get("/date/:date", async (req, res) => {
  try {
    const { date } = req.params; // Example: "2025-10-10"
    const records = await Attendance.find({ date });

    if (records.length === 0) {
      return res.status(404).json({ message: `No records found for ${date}` });
    }

    res.status(200).json({ date, count: records.length, records });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


/**
 * 📅 Get all attendance records
 * GET http://localhost:5000/api/students/
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



// all string response and date time in IST
// import express from "express";
// import Attendance from "../models/attendanceModel.js";
// import Student from "../models/studentModel.js";

// const router = express.Router();

// /** 🕒 Convert to IST (+5:30) */
// const getISTTime = () => {
//   const now = new Date();
//   const ISTOffset = 5.5 * 60 * 60 * 1000;
//   return new Date(now.getTime() + ISTOffset);
// };

// /** 🗓️ Return IST date as "YYYY-MM-DD" string */
// const getISTDateOnly = () => {
//   const ist = getISTTime();
//   return ist.toISOString().split("T")[0]; // ✅ Only date string
// };

// // 🟢 Log In-Time
// router.post("/in", async (req, res) => {
//   try {
//     const { rollNumber } = req.body;
//     const student = await Student.findOne({ rollNumber });
//     if (!student) return res.status(404).send("Student not found");

//     const record = new Attendance({
//       rollNumber: student.rollNumber,
//       name: student.name,
//       branch: student.branch,
//       inTime: getISTTime(),
//       date: getISTDateOnly()
//     });

//     await record.save();
//     res.status(201).send(`IN time recorded for ${student.name}`);
//   } catch (error) {
//     res.status(500).send(error.message);
//   }
// });

// // 🔴 Log Out-Time
// router.put("/out/:id", async (req, res) => {
//   try {
//     const record = await Attendance.findById(req.params.id);
//     if (!record) return res.status(404).send("Record not found");

//     record.outTime = getISTTime();
//     const diffMs = record.outTime - record.inTime;
//     record.duration = Math.floor(diffMs / 60000) + " mins";
//     await record.save();

//     res.send(`Out time updated for ${record.name}`);
//   } catch (error) {
//     res.status(500).send(error.message);
//   }
// });

// /**
//  * 🟢 Unified Attendance Scan API
//  * POST http://localhost:5000/api/attendance/scan?rollNumber=22AT1A0489
//  */
// router.post("/scan", async (req, res) => {
//   try {
//     const rollNumber = req.query.rollNumber || req.body.rollNumber;
//     if (!rollNumber) return res.status(400).send("Roll number is required");

//     const student = await Student.findOne({ rollNumber });
//     if (!student) return res.status(404).send("Student not found in database");

//     const activeRecord = await Attendance.findOne({
//       rollNumber,
//       outTime: { $exists: false },
//     });

//     if (!activeRecord) {
//       // 🟢 IN SCAN
//       const newRecord = new Attendance({
//         rollNumber: student.rollNumber,
//         name: student.name,
//         branch: student.branch,
//         inTime: getISTTime(),
//         date: getISTDateOnly()
//       });

//       await newRecord.save();
//       return res.status(201).send(`IN Scan recorded for ${student.name}`);
//     } else {
//       // 🔴 OUT SCAN
//       activeRecord.outTime = getISTTime();
//       const durationMs = activeRecord.outTime - activeRecord.inTime;
//       const durationMins = Math.floor(durationMs / 60000);
//       activeRecord.duration = `${durationMins} mins`;
//       await activeRecord.save();

//       return res.status(200).send(`OUT Scan recorded for ${student.name} | Duration: ${durationMins} mins`);
//     }
//   } catch (error) {
//     res.status(500).send(error.message);
//   }
// });

// // 🟢 Get currently IN (not yet OUT) students
// router.get("/active", async (req, res) => {
//   try {
//     const activeRecords = await Attendance.find({
//       inTime: { $exists: true },
//       outTime: { $exists: false },
//     }).sort({ inTime: -1 });

//     if (activeRecords.length === 0)
//       return res.send("No active students in library");

//     const names = activeRecords.map((r) => r.name).join(", ");
//     res.send(`Active students in library (${activeRecords.length}): ${names}`);
//   } catch (error) {
//     res.status(500).send(error.message);
//   }
// });

// // 🔴 Force OUT for all active records
// router.put("/force-out", async (req, res) => {
//   try {
//     const activeRecords = await Attendance.find({
//       inTime: { $exists: true },
//       outTime: { $exists: false },
//     });

//     if (activeRecords.length === 0)
//       return res.send("No active students to update");

//     const now = getISTTime();
//     for (const record of activeRecords) {
//       record.outTime = now;
//       const diffMs = record.outTime - record.inTime;
//       record.duration = Math.floor(diffMs / 60000) + " mins";
//       await record.save();
//     }

//     res.send(`${activeRecords.length} students marked OUT successfully`);
//   } catch (error) {
//     res.status(500).send(error.message);
//   }
// });

// // 📅 Get attendance for a specific date
// router.get("/date/:date", async (req, res) => {
//   try {
//     const { date } = req.params;
//     const records = await Attendance.find({ date });

//     if (records.length === 0)
//       return res.status(404).send(`No records found for ${date}`);

//     const names = records.map((r) => r.name).join(", ");
//     res.send(`Attendance for ${date} (${records.length}): ${names}`);
//   } catch (error) {
//     res.status(500).send(error.message);
//   }
// });

// // 📅 Get all attendance records
// router.get("/", async (req, res) => {
//   try {
//     const count = await Attendance.countDocuments();
//     res.send(`Total attendance records: ${count}`);
//   } catch (error) {
//     res.status(500).send(error.message);
//   }
// });

// export default router;


//Second time code with IST time handling all date and time in IST

// import express from "express";
// import Attendance from "../models/attendanceModel.js";
// import Student from "../models/studentModel.js";

// const router = express.Router();

// // 🕒 Helper: Convert current UTC time → IST
// const getISTTime = () => {
//   const now = new Date();
//   const istOffset = 5.5 * 60 * 60 * 1000; // +5 hours 30 mins
//   return new Date(now.getTime() + istOffset);
// };


// /** 
//  * 🗓️ Utility: Get IST Date Only (YYYY-MM-DD)
//  */
// const getISTDateOnly = () => {
//   const ist = getISTTime();
//   return new Date(ist.getFullYear(), ist.getMonth(), ist.getDate());
// };

// // 🟢 Log In-Time
// router.post("/in", async (req, res) => {
//   try {
//     const { rollNumber } = req.body;
//     const student = await Student.findOne({ rollNumber });
//     if (!student) return res.status(404).json({ message: "Student not found" });

//     const record = new Attendance({
//       rollNumber: student.rollNumber,
//       name: student.name,
//       branch: student.branch,
//       inTime: getISTTime(),
//       date: getISTTime(),
//     });

//     await record.save();
//     res.status(201).json({ message: "In-time recorded", record });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // 🔴 Log Out-Time
// router.put("/out/:id", async (req, res) => {
//   try {
//     const record = await Attendance.findById(req.params.id);
//     if (!record) return res.status(404).json({ message: "Record not found" });

//     record.outTime = getISTTime();
//     const diffMs = record.outTime - record.inTime;
//     record.duration = Math.floor(diffMs / 60000) + " mins";
//     await record.save();

//     res.json({ message: "Out-time updated", record });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// /**
//  * 🟢 Unified Attendance Scan API
//  * Works for both IN and OUT scans using the same API call.
//  * Accepts rollNumber via query or body.
//  */
// router.post("/scan", async (req, res) => {
//   try {
//     const rollNumber = req.query.rollNumber || req.body.rollNumber;
//     if (!rollNumber) {
//       return res.status(400).json({ message: "Roll number is required" });
//     }

//     // ✅ 1. Check if student exists
//     const student = await Student.findOne({ rollNumber });
//     if (!student) {
//       return res.status(404).json({ message: "Student not found in database" });
//     }

//     // ✅ 2. Check for active attendance record (IN but not OUT)
//     const activeRecord = await Attendance.findOne({
//       rollNumber,
//       outTime: { $exists: false },
//     });

//     if (!activeRecord) {
//       // 🟢 IN SCAN — create a new record
//       const newRecord = new Attendance({
//         rollNumber: student.rollNumber,
//         name: student.name,
//         branch: student.branch,
//         inTime: getISTTime(),
//         date: getISTTime(),
//       });

//       await newRecord.save();
//       return res.status(201).json({
//         message: `IN Scan recorded for ${student.name}`,
//         record: newRecord,
//       });
//     } else {
//       // 🔴 OUT SCAN — update existing record
//       activeRecord.outTime = getISTTime();
//       const durationMs = activeRecord.outTime - activeRecord.inTime;
//       const durationMins = Math.floor(durationMs / 60000);

//       activeRecord.duration = `${durationMins} mins`;
//       await activeRecord.save();

//       return res.status(200).json({
//         message: `OUT Scan recorded for ${student.name}`,
//         record: activeRecord,
//       });
//     }
//   } catch (error) {
//     console.error("Error in scan API:", error);
//     res.status(500).json({ error: error.message });
//   }
// });

// // 🟢 Get currently IN (not yet OUT) students
// router.get("/active", async (req, res) => {
//   try {
//     // Find records with inTime present but outTime missing
//     const activeRecords = await Attendance.find({
//       inTime: { $exists: true },
//       outTime: { $exists: false },
//     }).sort({ inTime: -1 });

//     if (activeRecords.length === 0) {
//       return res
//         .status(200)
//         .json({ message: "No active students in library", activeRecords: [] });
//     }

//     res.status(200).json({
//       message: "Students currently in library",
//       count: activeRecords.length,
//       activeRecords,
//     });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // 🔴 Mark all active (IN but not OUT) students as OUT
// router.put("/force-out", async (req, res) => {
//   try {
//     // Find all active records
//     const activeRecords = await Attendance.find({
//       inTime: { $exists: true },
//       outTime: { $exists: false },
//     });

//     if (activeRecords.length === 0) {
//       return res.status(200).json({ message: "No active students to update" });
//     }

//     const nowIST = getISTTime();
//     const updatedRecords = [];

//     for (const record of activeRecords) {
//       record.outTime = nowIST;
//       const diffMs = record.outTime - record.inTime;
//       record.duration = Math.floor(diffMs / 60000) + " mins";
//       await record.save();
//       updatedRecords.push(record);
//     }

//     res.status(200).json({
//       message: `${updatedRecords.length} students marked OUT successfully`,
//       updatedRecords,
//     });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// /**
//  * 📅 Get all attendance records
//  */
// router.get("/", async (req, res) => {
//   try {
//     const records = await Attendance.find().sort({ date: -1 });
//     res.json(records);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// export default router;

//First time code

// import express from "express";
// import Attendance from "../models/attendanceModel.js";
// import Student from "../models/studentModel.js";

// const router = express.Router();

// // 🟢 Log In-Time
// router.post("/in", async (req, res) => {
//   try {
//     const { rollNumber } = req.body;
//     const student = await Student.findOne({ rollNumber });
//     if (!student) return res.status(404).json({ message: "Student not found" });

//     const record = new Attendance({
//       rollNumber: student.rollNumber,
//       name: student.name,
//       branch: student.branch,
//       inTime: new Date()
//     });

//     await record.save();
//     res.status(201).json({ message: "In-time recorded", record });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // 🔴 Log Out-Time
// router.put("/out/:id", async (req, res) => {
//   try {
//     const record = await Attendance.findById(req.params.id);
//     if (!record) return res.status(404).json({ message: "Record not found" });

//     record.outTime = new Date();
//     const diffMs = record.outTime - record.inTime;
//     record.duration = Math.floor(diffMs / 60000) + " mins";
//     await record.save();

//     res.json({ message: "Out-time updated", record });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// /**
//  * 🟢 Unified Attendance Scan API
//  * Works for both IN and OUT scans using the same API call.
//  * Accepts rollNumber via query or body.
//  */
// router.post("/scan", async (req, res) => {
//   try {
//     const rollNumber = req.query.rollNumber || req.body.rollNumber;
//     if (!rollNumber) {
//       return res.status(400).json({ message: "Roll number is required" });
//     }

//     // ✅ 1. Check if student exists
//     const student = await Student.findOne({ rollNumber });
//     if (!student) {
//       return res.status(404).json({ message: "Student not found in database" });
//     }

//     // ✅ 2. Check for active attendance record (IN but not OUT)
//     const activeRecord = await Attendance.findOne({
//       rollNumber,
//       outTime: { $exists: false },
//     });

//     if (!activeRecord) {
//       // 🟢 IN SCAN — create a new record
//       const newRecord = new Attendance({
//         rollNumber: student.rollNumber,
//         name: student.name,
//         branch: student.branch,
//         inTime: new Date(),
//       });

//       await newRecord.save();
//       return res.status(201).json({
//         message: `IN Scan recorded for ${student.name}`,
//         record: newRecord,
//       });
//     } else {
//       // 🔴 OUT SCAN — update existing record
//       activeRecord.outTime = new Date();
//       const durationMs = activeRecord.outTime - activeRecord.inTime;
//       const durationMins = Math.floor(durationMs / 60000);

//       activeRecord.duration = `${durationMins} mins`;
//       await activeRecord.save();

//       return res.status(200).json({
//         message: `OUT Scan recorded for ${student.name}`,
//         record: activeRecord,
//       });
//     }
//   } catch (error) {
//     console.error("Error in scan API:", error);
//     res.status(500).json({ error: error.message });
//   }
// });

// // 🟢 Get currently IN (not yet OUT) students
// router.get("/active", async (req, res) => {
//   try {
//     // Find records with inTime present but outTime missing
//     const activeRecords = await Attendance.find({
//       inTime: { $exists: true },
//       outTime: { $exists: false },
//     }).sort({ inTime: -1 });

//     if (activeRecords.length === 0) {
//       return res.status(200).json({ message: "No active students in library", activeRecords: [] });
//     }

//     res.status(200).json({
//       message: "Students currently in library",
//       count: activeRecords.length,
//       activeRecords,
//     });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // 🔴 Mark all active (IN but not OUT) students as OUT
// router.put("/force-out", async (req, res) => {
//   try {
//     // Find all active records
//     const activeRecords = await Attendance.find({
//       inTime: { $exists: true },
//       outTime: { $exists: false },
//     });

//     if (activeRecords.length === 0) {
//       return res.status(200).json({ message: "No active students to update" });
//     }

//     const now = new Date();
//     const updatedRecords = [];

//     for (const record of activeRecords) {
//       record.outTime = now;
//       const diffMs = record.outTime - record.inTime;
//       record.duration = Math.floor(diffMs / 60000) + " mins";
//       await record.save();
//       updatedRecords.push(record);
//     }

//     res.status(200).json({
//       message: `${updatedRecords.length} students marked OUT successfully`,
//       updatedRecords,
//     });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });


// /**
//  * 📅 Get all attendance records
//  */
// router.get("/", async (req, res) => {
//   try {
//     const records = await Attendance.find().sort({ date: -1 });
//     res.json(records);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // // 📅 Get all attendance records
// // router.get("/", async (req, res) => {
// //   const records = await Attendance.find().sort({ date: -1 });
// //   res.json(records);
// // });

// export default router;
