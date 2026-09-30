import mongoose from "mongoose";
import dotenv from "dotenv";
import Department from "./models/department.model.js";

dotenv.config();

const departments = [
  { name: "MCA", code: "MCA" },
  { name: "IT", code: "IT" },
  { name: "CS", code: "CS" },
  { name: "CE", code: "CE" },
  { name: "ECE", code: "ECE" },
];

const seedDepartments = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);

    for (const department of departments) {
      await Department.updateOne(
        { name: department.name },
        { $setOnInsert: department },
        { upsert: true }
      );
    }

    console.log("Departments seeded successfully.");

    await mongoose.disconnect();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

seedDepartments();