// 1
// import connectDB from "./db.js";
// connectDB();
// 2
// import express from "express";
// import connectDB from "./db.js";

// const app = express();
// connectDB();

// app.get("/", (req, res) => {
//   res.send("Library Attendance System Backend Running 🚀");
// });

// app.listen(5000, () => console.log("Server running on port 5000"));
import express from "express";
import connectDB from "./db.js";
import studentRoutes from "./routes/studentRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";

const app = express();
app.use(express.json());
connectDB();

app.get("/", (req, res) => res.send("📚 Library Attendance System Backend Running"));
app.use("/api/students", studentRoutes);
app.use("/api/attendance", attendanceRoutes);

app.listen(5000, () => console.log("✅ Server running on port 5000"));
