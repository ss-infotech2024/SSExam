import { configureStore } from "@reduxjs/toolkit";
import authReducer  from "./slices/authSlice";
import examReducer  from "./slices/examSlices";
import adminReducer from "./slices/adminSlices";

export const store = configureStore({
  reducer: {
    auth:  authReducer,
    exams: examReducer,
    admins: adminReducer,
  },
});