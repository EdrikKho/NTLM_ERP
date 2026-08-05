import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../client';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/Logo.png';
import {
  FiHome,
  FiUsers,
  FiUser,
  FiTruck,
  FiBox,
  FiClipboard,
  FiShoppingCart,
  FiFileText,
  FiLogOut,
  FiUserPlus, 
  FiRepeat,      
  FiCreditCard,
  FiPackage,
} from 'react-icons/fi';
import './Sidebar.css';

const Sidebar = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const role = user?.user_metadata?.role || '';
  const firstName = user?.user_metadata?.first_name || '';
  const lastName = user?.user_metadata?.last_name || '';

  async function handleLogout() {
    try {
      const email = user?.email;

      if (email) {
        await supabase
          .from("USER")
          .update({
            is_logged_in: false,
            last_seen: null
          })
          .eq("email", email);
      }

      await supabase.auth.signOut();
      navigate("/");
    } catch (error) {
      console.error(error);
    }
  }

  const displayName =
    firstName || lastName
      ? `${firstName} ${lastName}`.trim()
      : '';

  const initial = firstName?.charAt(0).toUpperCase() || '?';

  const getLinkClass = ({ isActive }) =>
    isActive ? 'sidebar-link active' : 'sidebar-link';

  return (
    <div className="sidebar">

      <NavLink to="/dashboard" className="logoContainer">
        <img src={logo} alt="Logo" width="50" />
        <h3 className="logoText">New Trader's Lucky Mart</h3>
      </NavLink>
      <nav className="nav">
        <p className="sidebar-section-title">Main</p>
        <NavLink to="/dashboard" className={getLinkClass}>
          <FiHome className="icon" /> Dashboard
        </NavLink>
        
        <p className="sidebar-section-title">Management</p>
        {(role === 'admin' || role === 'employee') && (
          <NavLink to="/customers" className={getLinkClass}>
            <FiUsers className="icon" /> Customers
          </NavLink>
        )}

        {(role === 'admin' || role === 'employee') && (
          <NavLink to="/suppliers" className={getLinkClass}>
            <FiTruck className="icon" /> Suppliers
          </NavLink>
        )}

        <NavLink to="/inventory" className={getLinkClass}>
          <FiPackage className="icon" /> Inventory
        </NavLink>
        
        <p className="sidebar-section-title">Transactions</p>
        {(role === 'admin' || role === 'employee') && (
          <NavLink to="/salesorders" className={getLinkClass}>
            <FiShoppingCart className="icon" /> Sales Orders
          </NavLink>
        )}

        {(role === 'admin' || role === 'employee') && (
          <NavLink to="/purchaseorders" className={getLinkClass}>
            <FiClipboard className="icon" /> Purchase Orders
          </NavLink>
        )}
        
        <NavLink to="/inventorytransfer" className={getLinkClass}>
          <FiRepeat className="icon" /> Inventory Transfer
        </NavLink> 

        {( role === 'admin') && (
          <NavLink to="/payments" className={getLinkClass}>
            <FiCreditCard className="icon" /> Payments
          </NavLink>
        )}

        {( role === 'admin') && (
          <p className="sidebar-section-title">Reports</p>
        )}
        {( role === 'admin') && (
          <NavLink to="/reports" className={getLinkClass}>
            <FiFileText className="icon" /> Reports
          </NavLink>
        )}

        {role === 'admin' && (
          <p className="sidebar-section-title">Account Management</p>
        )}
        {role === 'admin' && (
          <NavLink to="/createaccount" className={getLinkClass}>
            <FiUserPlus className="icon" /> Create Account
          </NavLink>
        )}


        
        

      </nav>

      <div className="bottomSection">
        <div className="userCard">
          <div className="avatar">{initial}</div>
          <div>
            <div className="userName">{displayName}</div>
            <div className="userRole">{role}</div>
          </div>
        </div>

        <button onClick={handleLogout} className="logoutBtn">
          <FiLogOut className="icon" /> Logout
        </button>
      </div>

    </div>
  );
};

export default Sidebar;