// import mongoose from "mongoose";

// const studentSchema = new mongoose.Schema({
//   rollNumber: {
//     type: String,
//     required: true,
//     unique: true
//   },
//   name: {
//     type: String,
//     required: true
//   },
//   branch: {
//     type: String,
//     required: true
//   },
//   mobile: {
//     type: String,
//     required: true
//   },
//   email: {
//     type: String,
//     required: true
//   }
// });

// const Student = mongoose.model("Student", studentSchema);
// export default Student;


import mongoose from "mongoose";

const studentSchema = new mongoose.Schema({
  rollNumber: {
    type: String,
    required: true,
    unique: true,
  },
  cardId: {
    type: String,
    required: true,
    unique: true, // ✅ each RFID card must be unique
  },
  name: {
    type: String,
    required: true,
  },
  branch: {
    type: String,
    required: true,
  },
  mobile: {
    type: String,
  },
  email: {
    type: String,
  },
});

export default mongoose.model("Student", studentSchema);
