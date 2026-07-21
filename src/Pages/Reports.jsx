import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();

  const role = user?.user_metadata?.role || '';
  const firstName = user?.user_metadata?.first_name || '';
  const lastName = user?.user_metadata?.last_name || '';

  return (
    <div style={{ display: 'flex' }}>

      <Sidebar />
      {(role === 'superuser' || role === 'admin') && (
        <div style={{ marginLeft: '300px', width: '100%' }}>
          <Outlet />

          <h1>Reports Page</h1>

          <p>
            Welcome {firstName} {lastName} 
          </p>
        </div>
      )}

    </div>
  );
};

export default Dashboard;