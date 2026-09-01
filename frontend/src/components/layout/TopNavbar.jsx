import React from "react";
import { FaUserCircle } from "react-icons/fa";

const TopNavbar = () => {
  return (
    <div className="top-navbar">
      <div className="navbar-left">
        <h2>Welcome, Admin</h2>
      </div>
      <div className="navbar-right">
        <div className="admin-profile">
          <FaUserCircle size={32} />
          <span>Admin</span>
        </div>
      </div>
    </div>
  );
};

export default TopNavbar;