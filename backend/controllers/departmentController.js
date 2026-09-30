import Department from "../models/department.model.js";

// GET active departments
export const getDepartments = async (req, res) => {
  try {
    const departments = await Department.find({ active: true })
      .select("_id name code")
      .sort({ name: 1 });

    res.status(200).json(departments);
  } catch (error) {
    console.error("getDepartments:", error);

    res.status(500).json({
      message: "Server error.",
    });
  }
};

// CREATE department
export const createDepartment = async (req, res) => {
  try {
    const { name, code } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        message: "Department name is required.",
      });
    }

    const existing = await Department.findOne({
      name: { $regex: `^${name.trim()}$`, $options: "i" },
    });

    if (existing) {
      return res.status(409).json({
        message: "Department already exists.",
      });
    }

    const department = await Department.create({
      name: name.trim(),
      code: code?.trim().toUpperCase(),
    });

    res.status(201).json({
      message: "Department created successfully.",
      department,
    });
  } catch (error) {
    console.error("createDepartment:", error);

    res.status(500).json({
      message: "Server error.",
    });
  }
};