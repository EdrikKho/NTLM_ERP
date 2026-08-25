import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../client';
import { FaChartLine, FaMoneyCheck, FaExclamationTriangle } from 'react-icons/fa';
import { FiShoppingCart, FiClipboard, FiRepeat } from 'react-icons/fi';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();

  const role = user?.user_metadata?.role || '';

  const [dashboardData, setDashboardData] = useState({
    todaySales: { totalOrders: 0, totalSales: 0 },
    pendingReceivables: { totalReceivables: 0, totalAmount: 0 },
    overdueReceivables: { totalReceivables: 0, totalAmount: 0 },
    pendingSalesOrders: 0,
    pendingPurchaseOrders: 0,
    pendingTransfers: 0,
    releasedTransfers: 0,  
    loading: false
  });

  // State for table data and which scorecard is active
  const [activeTable, setActiveTable] = useState(() => {
    if (role === 'employee') return 'pendingSalesOrders';
    if (role === 'dispatcher') return 'pendingTransfers';
    return 'todaySales';
  });
  const [tableData, setTableData] = useState([]);

  const [lowStockItems, setLowStockItems] = useState([]);
  // Fetch table data when activeTable changes
  useEffect(() => {
    if (activeTable) {
      fetchTableData(activeTable);
    }
  }, [activeTable]);

  useEffect(() => {
    if (role === 'employee') {
      setActiveTable('pendingSalesOrders');
    } else if (role === 'dispatcher') {
      setActiveTable('pendingTransfers');  
    }
  }, [role]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    fetchLowStockItems();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;

      // Fetch all data in parallel
      const [
        todaySalesPromise,
        pendingReceivablesPromise,
        overdueReceivablesPromise,
        pendingSalesPromise,
        pendingPurchasePromise,
        pendingTransferPromise,
        releasedTransferPromise
      ] = await Promise.all([
        // 1. Today's Sales
        supabase
          .from('SALES_TRANS')
          .select('salestrans_no, total_amt')
          .eq('date', todayStr)
          .eq('status', 'Completed'),
        
        // 2. Pending Receivables
        supabase
          .from('SALES_TRANS')
          .select('salestrans_no, total_amt')
          .eq('status', 'Completed')
          .eq('p_status', 'Pending'),
        
        // 3. Overdue Receivables
        supabase
          .from('SALES_TRANS')
          .select('salestrans_no, total_amt, due_date')
          .lt('due_date', todayStr)
          .eq('status', 'Completed')
          .eq('p_status', 'Pending'),
        
        // 4. Pending Sales Orders
        supabase
          .from('SALES_TRANS')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'Pending'),
        
        // 5. Pending Purchase Orders
        supabase
          .from('PURCHASE_TRANS')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'Pending'),
        
        // 6. Pending Transfers
        supabase
          .from('TRANSFER_TRANS')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'Pending'),
        
        // 7. Released Transfers
        supabase
          .from('TRANSFER_TRANS')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'Released')
      ]);

      // Check for errors
      const [
        todaySales,
        pendingReceivables,
        overdueReceivables,
        pendingSalesCount,
        pendingPurchaseCount,
        pendingTransferCount,
        releasedTransferCount
      ] = [
        todaySalesPromise,
        pendingReceivablesPromise,
        overdueReceivablesPromise,
        pendingSalesPromise,
        pendingPurchasePromise,
        pendingTransferPromise,
        releasedTransferPromise
      ];

      if (todaySales.error) throw todaySales.error;
      if (pendingReceivables.error) throw pendingReceivables.error;
      if (overdueReceivables.error) throw overdueReceivables.error;
      if (pendingSalesCount.error) throw pendingSalesCount.error;
      if (pendingPurchaseCount.error) throw pendingPurchaseCount.error;
      if (pendingTransferCount.error) throw pendingTransferCount.error;
      if (releasedTransferCount.error) throw releasedTransferCount.error;

      const totalOrders = todaySales.data?.length || 0;
      const totalSales = todaySales.data?.reduce((sum, sale) => sum + (sale.total_amt || 0), 0) || 0;

      const pendingReceivablesCount = pendingReceivables.data?.length || 0;
      const pendingReceivablesAmount = pendingReceivables.data?.reduce((sum, sale) => sum + (sale.total_amt || 0), 0) || 0;

      const overdueReceivablesCount = overdueReceivables.data?.length || 0;
      const overdueReceivablesAmount = overdueReceivables.data?.reduce((sum, sale) => sum + (sale.total_amt || 0), 0) || 0;

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
        pendingSalesOrders: pendingSalesCount.count || 0,
        pendingPurchaseOrders: pendingPurchaseCount.count || 0,
        pendingTransfers: pendingTransferCount.count || 0,
        releasedTransfers: releasedTransferCount.count || 0,
        loading: false
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setDashboardData(prev => ({ ...prev, loading: false }));
    }
  };

  const fetchTableData = async (tableType) => {
    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;

      let data = [];

      switch (tableType) {
        case 'todaySales':
          const { data: salesData, error: salesError } = await supabase
            .from('SALES_TRANS')
            .select(`
              salestrans_no,
              date,
              status,
              total_amt,
              cust_no,
              CUSTOMER!inner (
                name
              )
            `)
            .eq('date', todayStr)
            .eq('status', 'Completed');

          if (salesError) throw salesError;
          data = salesData || [];
          break;

        case 'pendingReceivables':
          const { data: pendingData, error: pendingError } = await supabase
            .from('SALES_TRANS')
            .select(`
              salestrans_no,
              date,
              status,
              total_amt,
              due_date,
              cust_no,
              CUSTOMER!inner (
                name
              )
            `)
            .eq('status', 'Completed')
            .eq('p_status', 'Pending');

          if (pendingError) throw pendingError;
          data = pendingData || [];
          break;

        case 'overdueReceivables':
          const { data: overdueData, error: overdueError } = await supabase
            .from('SALES_TRANS')
            .select(`
              salestrans_no,
              date,
              status,
              total_amt,
              due_date,
              cust_no,
              CUSTOMER!inner (
                name
              )
            `)
            .lt('due_date', todayStr)
            .eq('status', 'Completed')
            .eq('p_status', 'Pending');

          if (overdueError) throw overdueError;
          data = overdueData || [];
          break;

        case 'pendingSalesOrders':
          const { data: salesPendingData, error: salesPendingError } = await supabase
            .from('SALES_TRANS')
            .select(`
              salestrans_no,
              date,
              status,
              total_amt,
              cust_no,
              CUSTOMER!inner (
                name
              )
            `)
            .eq('status', 'Pending');

          if (salesPendingError) throw salesPendingError;
          data = salesPendingData || [];
          break;

        case 'pendingPurchaseOrders':
          const { data: purchaseData, error: purchaseError } = await supabase
            .from('PURCHASE_TRANS')
            .select(`
              purtrans_no,
              date,
              status,
              sup_no,
              SUPPLIER!inner (
                com_name
              )
            `)
            .eq('status', 'Pending');

          if (purchaseError) throw purchaseError;
          data = purchaseData || [];
          break;

        case 'pendingTransfers':
        const { data: transferData, error: transferError } = await supabase
          .from('TRANSFER_TRANS')
          .select(`
            transfertrans_no,
            date,
            status,
            requester_id,
            USER!requester_id (
              f_name
            )
          `)
          .eq('status', 'Pending');

        if (transferError) throw transferError;
        data = transferData || [];
        break;

        case 'releasedTransfers':
        const { data: releasedData, error: releasedError } = await supabase
          .from('TRANSFER_TRANS')
          .select(`
            transfertrans_no,
            date,
            status,
            dispatcher_id,
            USER!dispatcher_id (
              f_name
            )
          `)
          .eq('status', 'Released');

        if (releasedError) throw releasedError;
        data = releasedData || [];
        break;

        default:
          data = [];
      }

      setTableData(data);
    } catch (error) {
      console.error('Error fetching table data:', error);
      setTableData([]);
    }
  };

  // Handle scorecard click
  const handleScorecardClick = (tableType) => {
    setActiveTable(tableType);
  };

  // Get table title based on active table
  const getTableTitle = () => {
    switch (activeTable) {
      case 'todaySales':
        return "Today's Sales Orders";
      case 'pendingReceivables':
        return 'Pending Receivables';
      case 'overdueReceivables':
        return 'Overdue Receivables';
      case 'pendingSalesOrders':
        return 'Pending Sales Orders';
      case 'pendingPurchaseOrders':
        return 'Pending Purchase Orders';
      case 'pendingTransfers':
        return 'Pending Transfers';
      case 'releasedTransfers':  
        return 'Released Transfers';
      default:
        return '';
    }
  };

  // Format currency with 2 decimal places
  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return '0.00';
    }
    return amount.toFixed(2).toLocaleString();
  };

  const fetchLowStockItems = async () => {
    try {
      const { data, error } = await supabase
        .from('PRODUCT')
        .select('prod_no, brand, name, size_amt, u_size, loc_name, stock')
        .lte('stock', 5);

      if (error) throw error;
      setLowStockItems(data || []);
    } catch (error) {
      console.error('Error fetching low stock items:', error);
      setLowStockItems([]);
    }
  };
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
                {role === 'admin' && (
                <div className="dashboard-scorecards-row">
                  {/* Today's Sales */}
                  <div 
                    className="dashboard-scorecardfirst dashboard-clickable"
                    onClick={() => handleScorecardClick('todaySales')}
                  >
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
                          ₱{dashboardData.todaySales.totalSales.toFixed(2).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Pending Receivables */}
                  <div 
                    className="dashboard-scorecardfirst dashboard-clickable"
                    onClick={() => handleScorecardClick('pendingReceivables')}
                  >
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
                          ₱{dashboardData.pendingReceivables.totalAmount.toFixed(2).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* Overdue Receivables */}
                  <div 
                    className="dashboard-scorecardfirst dashboard-clickable"
                    onClick={() => handleScorecardClick('overdueReceivables')}
                  >
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
                          ₱{dashboardData.overdueReceivables.totalAmount.toFixed(2).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              
              {/* Scorecards Grid - Second Row (Pending Counts) */}
              {(role === 'admin' || role === 'employee') && (
                <div className="dashboard-scorecards-row">
                  {/* Pending Sales Orders */}
                  <div 
                    className="dashboard-scorecard dashboard-scorecard-single dashboard-clickable"
                    onClick={() => handleScorecardClick('pendingSalesOrders')}
                  >
                    <div className="dashboard-scorecard-header">
                      <FiShoppingCart className="dashboard-icon"/>
                      <h3 className="dashboard-scorecard-title">Pending Sales Orders</h3>
                    </div>
                    <p className="dashboard-scorecard-number dashboard-scorecard-number-blue">
                      {dashboardData.pendingSalesOrders}
                    </p>
                  </div>

                  {/* Pending Purchase Orders */}
                  <div 
                    className="dashboard-scorecard dashboard-scorecard-single dashboard-clickable"
                    onClick={() => handleScorecardClick('pendingPurchaseOrders')}
                  >
                    <div className="dashboard-scorecard-header">
                      <FiClipboard className="dashboard-icon"/>
                      <h3 className="dashboard-scorecard-title">Pending Purchase Orders</h3>
                    </div>
                    <p className="dashboard-scorecard-number dashboard-scorecard-number-purple">
                      {dashboardData.pendingPurchaseOrders}
                    </p>
                  </div>

                  {/* Pending Transfers */}
                  <div 
                    className="dashboard-scorecard dashboard-scorecard-single dashboard-clickable"
                    onClick={() => handleScorecardClick('pendingTransfers')}
                  >
                    <div className="dashboard-scorecard-header">
                      <FiRepeat className="dashboard-icon"/>
                      <h3 className="dashboard-scorecard-title">Pending Transfers</h3>
                    </div>
                    <p className="dashboard-scorecard-number dashboard-scorecard-number-cyan">
                      {dashboardData.pendingTransfers}
                    </p>
                  </div>
                </div>
              )}

              {/* Scorecards Grid - Dispatcher Row */}
              {role === 'dispatcher' && (
                <div className="dashboard-scorecards-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  {/* Pending Transfers */}
                  <div 
                    className="dashboard-scorecard dashboard-scorecard-single dashboard-clickable"
                    style={{ flex: '0 0 49.3%', maxWidth: '49.3%' }}
                    onClick={() => handleScorecardClick('pendingTransfers')}
                  >
                    <div className="dashboard-scorecard-header">
                      <FiRepeat className="dashboard-icon"/>
                      <h3 className="dashboard-scorecard-title">Pending Transfers</h3>
                    </div>
                    <p className="dashboard-scorecard-number dashboard-scorecard-number-cyan">
                      {dashboardData.pendingTransfers}
                    </p>
                  </div>

                  {/* Released Transfers */}
                  <div 
                    className="dashboard-scorecard dashboard-scorecard-single dashboard-clickable"
                    style={{ flex: '0 0 49.3%', maxWidth: '49.3%' }}
                    onClick={() => handleScorecardClick('releasedTransfers')}
                  >
                    <div className="dashboard-scorecard-header">
                      <FiRepeat className="dashboard-icon" style={{color: 'green'}}/>
                      <h3 className="dashboard-scorecard-title">Released Transfers</h3>
                    </div>
                    <p className="dashboard-scorecard-number dashboard-scorecard-number-green">
                      {dashboardData.releasedTransfers}
                    </p>
                  </div>
                </div>
              )}

              {/* Table Section */}
                <div className="dashboard-section">
                  <h3 className="dashboard-section-title">{getTableTitle()}</h3>
                  
                    {tableData.length === 0 ? (
                      <div className="dashboard-table-empty">No records found</div>
                    ) : (
                      <table className="dashboard-table">
                        <thead>
                          <tr>
                            {activeTable === 'pendingPurchaseOrders' && (
                              <>
                                <th>Date</th>
                                <th>Supplier</th>
                                <th>Status</th>
                              </>
                            )}
                            {activeTable === 'pendingTransfers' && (
                              <>
                                <th>Date</th>
                                <th>Requester</th>
                                <th>Status</th>
                              </>
                            )}
                            {activeTable === 'releasedTransfers' && (  // ADD THIS BLOCK
                              <>
                                <th>Date</th>
                                <th>Dispatcher</th>
                                <th>Status</th>
                              </>
                            )}
                            {(activeTable === 'todaySales' || 
                              activeTable === 'pendingSalesOrders') && (
                              <>
                                <th>Date</th>
                                <th>Customer</th>
                                <th>Total Amount</th>
                                <th>Status</th>
                              </>
                            )}

                            {activeTable === 'pendingReceivables' && (
                              <>
                                <th>Date</th>
                                <th>Customer</th>
                                <th>Due Date</th>
                                <th>Total Amount</th>
                                <th>Status</th>
                              </>
                            )}

                            {activeTable === 'overdueReceivables' && (
                              <>
                                <th>Date</th>
                                <th>Customer</th>
                                <th>Due Date</th>
                                <th>Total Amount</th>
                                <th>Status</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {activeTable === 'pendingPurchaseOrders' && 
                            tableData.map((item) => (
                              <tr key={item.purchasetrans_no}>
                                <td style={{ textAlign: 'left' }}>
                                  {new Date(item.date).toLocaleDateString()}
                                </td>
                                <td style={{ textAlign: 'left' }}>{item.SUPPLIER?.com_name}</td>
                                <td style={{ textAlign: 'left' }}>
                                  <span className="status-badge status-pending">{item.status}</span>
                                </td>
                              </tr>
                            ))
                          }
                          {activeTable === 'pendingTransfers' && 
                            tableData.map((item) => (
                              <tr key={item.transfertrans_no}>
                                <td style={{ textAlign: 'left' }}>
                                  {new Date(item.date).toLocaleDateString()}
                                </td>
                                <td style={{ textAlign: 'left' }}>{item.USER?.f_name}</td>
                                <td style={{ textAlign: 'left' }}>
                                  <span className="status-badge status-pending">{item.status}</span>
                                </td>
                              </tr>
                            ))
                          }
                          {activeTable === 'releasedTransfers' &&   // ADD THIS BLOCK
                            tableData.map((item) => (
                              <tr key={item.transfertrans_no}>
                                <td style={{ textAlign: 'left' }}>
                                  {new Date(item.date).toLocaleDateString()}
                                </td>
                                <td style={{ textAlign: 'left' }}>{item.USER?.f_name}</td>
                                <td style={{ textAlign: 'left' }}>
                                  <span className="status-badge status-completed">{item.status}</span>
                                </td>
                              </tr>
                            ))
                          }
                          {activeTable === 'todaySales' && 
                            tableData.map((item) => (
                              <tr key={item.salestrans_no}>
                                <td style={{ textAlign: 'left' }}>
                                  {new Date(item.date).toLocaleDateString()}
                                </td>
                                <td style={{ textAlign: 'left' }}>{item.CUSTOMER?.name}</td>
                                <td style={{ textAlign: 'right' }}>
                                  ₱{formatCurrency(item.total_amt)}
                                </td>
                                <td style={{ textAlign: 'left' }}>
                                  <span className={`status-badge ${
                                    item.status === 'Completed' ? 'status-completed' : 
                                    item.status === 'Pending' ? 'status-pending' : ''
                                  }`}>
                                    {item.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          }

                          {activeTable === 'pendingSalesOrders' && 
                            tableData.map((item) => (
                              <tr key={item.salestrans_no}>
                                <td style={{ textAlign: 'left' }}>
                                  {new Date(item.date).toLocaleDateString()}
                                </td>
                                <td style={{ textAlign: 'left' }}>{item.CUSTOMER?.name}</td>
                                <td style={{ textAlign: 'right' }}>
                                  ₱{formatCurrency(item.total_amt)}
                                </td>
                                <td style={{ textAlign: 'left' }}>
                                  <span className={`status-badge ${
                                    item.status === 'Completed' ? 'status-completed' : 
                                    item.status === 'Pending' ? 'status-pending' : ''
                                  }`}>
                                    {item.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          }

                          {activeTable === 'pendingReceivables' && 
                            tableData.map((item) => (
                              <tr key={item.salestrans_no}>
                                <td style={{ textAlign: 'left' }}>
                                  {new Date(item.date).toLocaleDateString()}
                                </td>
                                <td style={{ textAlign: 'left' }}>{item.CUSTOMER?.name}</td>
                                <td style={{ textAlign: 'left' }}>
                                  {new Date(item.due_date).toLocaleDateString()}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  ₱{formatCurrency(item.total_amt)}
                                </td>
                                <td style={{ textAlign: 'left' }}>
                                  <span className={`status-badge ${
                                    item.status === 'Completed' ? 'status-completed' : 
                                    item.status === 'Pending' ? 'status-pending' : ''
                                  }`}>
                                    {item.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          }

                          {activeTable === 'overdueReceivables' && 
                            tableData.map((item) => (
                              <tr key={item.salestrans_no}>
                                <td style={{ textAlign: 'left' }}>
                                  {new Date(item.date).toLocaleDateString()}
                                </td>
                                <td style={{ textAlign: 'left' }}>{item.CUSTOMER?.name}</td>
                                <td style={{ textAlign: 'left' }}>
                                  {new Date(item.due_date).toLocaleDateString()}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  ₱{formatCurrency(item.total_amt)}
                                </td>
                                <td style={{ textAlign: 'left' }}>
                                  <span className={`status-badge ${
                                    item.status === 'Completed' ? 'status-completed' : 
                                    item.status === 'Pending' ? 'status-pending' : ''
                                  }`}>
                                    {item.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          }
                        </tbody>
                      </table>
                    )}
                </div>

              {/* Low Stock Items Table */}
              <h3 className="dashboard-section-title">Low Stock Items</h3>
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Brand</th>
                    <th>Name</th>
                    <th>Size</th>
                    <th>Location</th>
                    <th>Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockItems.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="dashboard-table-empty">
                        No low stock items
                      </td>
                    </tr>
                  ) : (
                    lowStockItems.map((item) => (
                      <tr key={item.prod_no}>
                        <td style={{ textAlign: 'left' }}>{item.brand}</td>
                        <td style={{ textAlign: 'left' }}>{item.name}</td>
                        <td style={{ textAlign: 'left' }}>
                          {item.size_amt} {item.u_size}
                        </td>
                        <td style={{ textAlign: 'left' }}>{item.loc_name}</td>
                        <td style={{ textAlign: 'left' }}>
                          <span className={item.stock <= 5 ? 'status-badge status-pending' : ''}>
                            {item.stock}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;