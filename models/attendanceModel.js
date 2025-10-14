// import mongoose from "mongoose";

// const attendanceSchema = new mongoose.Schema({
//   rollNumber: {
//     type: String,
//     required: true
//   },
//   name: {
//     type: String,
//     required: true
//   },
//   branch: {
//     type: String,
//     required: true
//   },
//   date: {
//     type: Date,
//     default: Date.now
//   },
//   inTime: {
//     type: Date
//   },
//   outTime: {
//     type: Date
//   },
//   duration: {
//     type: String
//   }
// });

// const Attendance = mongoose.model("Attendance", attendanceSchema);
// export default Attendance;


// import mongoose from "mongoose";

// const attendanceSchema = new mongoose.Schema({
//   rollNumber: { type: String, required: true },
//   name: { type: String, required: true },
//   branch: { type: String },
//   date: { type: String, required: true }, // ✅ Store only date as "YYYY-MM-DD"
//   inTime: { type: Date },
//   outTime: { type: Date },
//   duration: { type: String },
// });

// const Attendance = mongoose.model("Attendance", attendanceSchema);
// export default Attendance;


import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  rollNumber: { type: String, required: true },
  cardId: { type: String, required: true },
  name: { type: String, required: true },
  branch: { type: String, required: true },
  inTime: { type: Date },
  outTime: { type: Date },
  duration: { type: String },
  date: { type: String },
});

export default mongoose.model("Attendance", attendanceSchema);
