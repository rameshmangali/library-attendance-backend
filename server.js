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

//last worked code until backend deployment
// import express from "express";
// import connectDB from "./db.js";
// import studentRoutes from "./routes/studentRoutes.js";
// import attendanceRoutes from "./routes/attendanceRoutes.js";

// const app = express();
// app.use(express.json());
// connectDB();

// app.get("/", (req, res) => res.send("📚 Library Attendance System Backend Running"));
// app.use("/api/students", studentRoutes);
// app.use("/api/attendance", attendanceRoutes);

// // app.listen(5000, () => console.log("✅ Server running on port 5000"));
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));


import express from "express";
import cors from "cors"; // 1. Import the cors package
import connectDB from "./db.js";
import studentRoutes from "./routes/studentRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";

const app = express();

// 2. Use the cors middleware
// This will add the necessary headers to your API responses
// to allow requests from different origins (like your React app).
app.use(cors());

app.use(express.json());
connectDB();

app.get("/", (req, res) => res.send("📚 Library Attendance System Backend Running"));
app.use("/api/students", studentRoutes);
app.use("/api/attendance", attendanceRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
