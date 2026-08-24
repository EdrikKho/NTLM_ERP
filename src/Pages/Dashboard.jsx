import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../client';
import { FaChartLine, FaMoneyCheck, FaExclamationTriangle, FaShoppingCart, FaClipboard, FaRepeat } from 'react-icons/fa';
import { FiShoppingCart, FiClipboard, FiRepeat } from 'react-icons/fi';
import './Dashboard.css';
import { FaRepeat } from 'react-icons/fa6';

const Dashboard = () => {
  const { user } = useAuth();

  const [dashboardData, setDashboardData] = useState({
    todaySales: { totalOrders: 0, totalSales: 0 },
    pendingReceivables: { totalReceivables: 0, totalAmount: 0 },
    overdueReceivables: { totalReceivables: 0, totalAmount: 0 },
    pendingSalesOrders: 0,
    pendingPurchaseOrders: 0,
    pendingTransfers: 0,
    loading: false
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;

      // 1. Today's Sales (from SALES_TRANS with today's date and status = 'Completed')
      const { data: todaySales, error: todayError } = await supabase
        .from('SALES_TRANS')
        .select('salestrans_no, total_amt')
        .eq('date', todayStr)
        .eq('status', 'Completed');

      if (todayError) throw todayError;

      const totalOrders = todaySales?.length || 0;
      const totalSales = todaySales?.reduce((sum, sale) => sum + (sale.total_amt || 0), 0) || 0;

      // 2. Pending Receivables (status = 'Completed' AND p_status = 'Pending')
      const { data: pendingReceivables, error: pendingError } = await supabase
        .from('SALES_TRANS')
        .select('salestrans_no, total_amt')
        .eq('status', 'Completed')
        .eq('p_status', 'Pending');

      if (pendingError) throw pendingError;

      const pendingReceivablesCount = pendingReceivables?.length || 0;
      const pendingReceivablesAmount = pendingReceivables?.reduce((sum, sale) => sum + (sale.total_amt || 0), 0) || 0;

      // 3. Overdue Receivables (date < today AND status = 'Completed' AND p_status = 'Pending')
      const { data: overdueReceivables, error: overdueError } = await supabase
        .from('SALES_TRANS')
        .select('salestrans_no, total_amt, due_date')
        .lt('due_date', todayStr)
        .eq('status', 'Completed')
        .eq('p_status', 'Pending');

      if (overdueError) throw overdueError;

      const overdueReceivablesCount = overdueReceivables?.length || 0;
      const overdueReceivablesAmount = overdueReceivables?.reduce((sum, sale) => sum + (sale.total_amt || 0), 0) || 0;

      // 4. Pending Sales Orders (status = 'Pending' from SALES_TRANS)
      const { count: pendingSalesCount, error: salesPendingError } = await supabase
        .from('SALES_TRANS')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Pending');

      if (salesPendingError) throw salesPendingError;

      // 5. Pending Purchase Orders (status = 'Pending' from PURCHASE_TRANS)
      const { count: pendingPurchaseCount, error: purchasePendingError } = await supabase
        .from('PURCHASE_TRANS')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Pending');

      if (purchasePendingError) throw purchasePendingError;

      // 6. Pending Transfers (status = 'Pending' from TRANSFER_TRANS)
      const { count: pendingTransferCount, error: transferPendingError } = await supabase
        .from('TRANSFER_TRANS')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Pending');

      if (transferPendingError) throw transferPendingError;

      setDashboardData({
        todaySales: { totalOrders, totalSales },
        pendingReceivables: { 
          totalReceivables: pendingReceivablesCount, 
          totalAmount: pendingReceivablesAmount 
        },
        overdueReceivables: { 
          totalReceivables: overdueReceivablesCount, 
          totalAmount: overdueReceivablesAmount 
        },
        pendingSalesOrders: pendingSalesCount || 0,
        pendingPurchaseOrders: pendingPurchaseCount || 0,
        pendingTransfers: pendingTransferCount || 0,
        loading: false
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setDashboardData(prev => ({ ...prev, loading: false }));
    }
  };

  const role = user?.user_metadata?.role || '';
  const firstName = user?.user_metadata?.first_name || '';
  const lastName = user?.user_metadata?.last_name || '';

  return (
    <div className="dashboard-container">
      <Sidebar />

      <div className="dashboard-main-content">
        <Outlet />

        {/* Dashboard Content */}
        <div className="dashboard-content-wrapper">
          <h1 className="dashboard-title">Dashboard</h1>

              {/* Scorecards Grid - First Row */}
              <div className="dashboard-scorecards-row">
                {/* Today's Sales */}
                <div className="dashboard-scorecardfirst">
                  <div className="dashboard-scorecard-header">
                    <FaChartLine className="dashboard-icon" />
                    <h3 className="dashboard-scorecard-title">Today's Sales</h3>
                  </div>
                  <div className="dashboard-scorecard-content">
                    <div className="dashboard-scorecard-item">
                      <p className="dashboard-scorecard-label">Total Orders</p>
                      <p className="dashboard-scorecard-value">
                        {dashboardData.todaySales.totalOrders}
                      </p>
                    </div>
                    <div className="dashboard-scorecard-item">
                      <p className="dashboard-scorecard-label">Total Sales</p>
                      <p className="dashboard-scorecard-value dashboard-scorecard-value-green">
                        ₱{dashboardData.todaySales.totalSales.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Pending Receivables */}
                <div className="dashboard-scorecardfirst">
                  <div className="dashboard-scorecard-header">
                    <FaMoneyCheck className="dashboard-icon" />
                    <h3 className="dashboard-scorecard-title">Pending Receivables</h3>
                  </div>
                  <div className="dashboard-scorecard-content">
                    <div className="dashboard-scorecard-item">
                      <p className="dashboard-scorecard-label">Total Receivables</p>
                      <p className="dashboard-scorecard-value">
                        {dashboardData.pendingReceivables.totalReceivables}
                      </p>
                    </div>
                    <div className="dashboard-scorecard-item">
                      <p className="dashboard-scorecard-label">Total Amount</p>
                      <p className="dashboard-scorecard-value dashboard-scorecard-value-yellow">
                        ₱{dashboardData.pendingReceivables.totalAmount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
                {/* Overdue Receivables */}
                <div className="dashboard-scorecardfirst">
                  <div className="dashboard-scorecard-header">
                    <FaExclamationTriangle className="dashboard-icon" style={{color:'red'}}/>
                    <h3 className="dashboard-scorecard-title">Overdue Receivables</h3>
                  </div>
                  <div className="dashboard-scorecard-content">
                    <div className="dashboard-scorecard-item">
                      <p className="dashboard-scorecard-label">Total Receivables</p>
                      <p className="dashboard-scorecard-value">
                        {dashboardData.overdueReceivables.totalReceivables}
                      </p>
                    </div>
                    <div className="dashboard-scorecard-item">
                      <p className="dashboard-scorecard-label">Total Amount</p>
                      <p className="dashboard-scorecard-value dashboard-scorecard-value-red">
                        ₱{dashboardData.overdueReceivables.totalAmount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scorecards Grid - Second Row (Pending Counts) */}
              <div className="dashboard-scorecards-row">
                {/* Pending Sales Orders */}
                <div className="dashboard-scorecard dashboard-scorecard-single">
                  <div className="dashboard-scorecard-header">
                    <FiShoppingCart className="dashboard-icon"/>
                    <h3 className="dashboard-scorecard-title">Pending Sales Orders</h3>
                  </div>
                  <p className="dashboard-scorecard-number dashboard-scorecard-number-blue">
                    {dashboardData.pendingSalesOrders}
                  </p>
                </div>

                {/* Pending Purchase Orders */}
                <div className="dashboard-scorecard dashboard-scorecard-single">
                  <div className="dashboard-scorecard-header">
                    <FiClipboard className="dashboard-icon"/>
                    <h3 className="dashboard-scorecard-title">Pending Purchase Orders</h3>
                  </div>
                  <p className="dashboard-scorecard-number dashboard-scorecard-number-purple">
                    {dashboardData.pendingPurchaseOrders}
                  </p>
                </div>

                {/* Pending Transfers */}
                <div className="dashboard-scorecard dashboard-scorecard-single">
                  <div className="dashboard-scorecard-header">
                    <FiRepeat className="dashboard-icon"/>
                    <h3 className="dashboard-scorecard-title">Pending Transfers</h3>
                  </div>
                  <p className="dashboard-scorecard-number dashboard-scorecard-number-cyan">
                    {dashboardData.pendingTransfers}
                  </p>
                </div>
              </div>

              {/* Sales Trend Section */}
              <div className="dashboard-section">
                <h3 className="dashboard-section-title">Sales Trend</h3>
                <div className="dashboard-chart-placeholder">
                  📊 Sales Trend Chart
                </div>
              </div>

              {/* Low Stock Items Table */}
              <div className="dashboard-section">
                <h3 className="dashboard-section-title">Low Stock Items</h3>
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Brand</th>
                      <th>Name</th>
                      <th>Size</th>
                      <th>Location</th>
                      <th>Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan="5" className="dashboard-table-empty">
                        No low stock items
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;