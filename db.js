import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect("mongodb+srv://admin:Library123@cluster0.s1k0ro0.mongodb.net/libraryDB?retryWrites=true&w=majority&appName=Cluster0");
    console.log("✅ MongoDB Connected Successfully");
  } catch (error) {
    console.error("❌ MongoDB Connection Failed:", error.message);
  }
};

export default connectDB;
