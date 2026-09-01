import { createSlice } from "@reduxjs/toolkit";

const authSlice = createSlice({
  name: "auth",
  initialState: {
    token:      localStorage.getItem("token")      || null,
    userRole:   localStorage.getItem("userRole")   || null,
    studentName:localStorage.getItem("studentName")|| null,
    studentId:  localStorage.getItem("studentId")  || null,
    studentDept:localStorage.getItem("studentDept")|| null,
    adminDept:  localStorage.getItem("adminDepartment") || null,
  },
  reducers: {
    loginSuccess: (state, action) => {
      const { token, role, user } = action.payload;
      state.token    = token;
      state.userRole = role;
      localStorage.setItem("token",    token);
      localStorage.setItem("userRole", role);

      if (role === "student") {
        state.studentName = user.fullName;
        state.studentId   = user.studentId;
        state.studentDept = user.department;
        localStorage.setItem("studentName", user.fullName);
        localStorage.setItem("studentId",   user.studentId);
        localStorage.setItem("studentDept", user.department);
      }
      if (role === "admin") {
        state.adminDept = user.department;
        localStorage.setItem("adminDepartment", user.department);
      }
    },
    logout: (state) => {
      state.token       = null;
      state.userRole    = null;
      state.studentName = null;
      state.studentId   = null;
      state.studentDept = null;
      state.adminDept   = null;
      localStorage.clear();
    },
  },
});

export const { loginSuccess, logout } = authSlice.actions;
export default authSlice.reducer;