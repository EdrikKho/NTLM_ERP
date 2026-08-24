// Reports.jsx - Simplified version matching your other pages
import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../client';
import { toast, ToastContainer } from 'react-toastify';
import './Reports.css';

const Reports = () => {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState('');
  const [salesData, setSalesData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');

  const [selectedReport, setSelectedReport] = useState('sales'); 
  const [arData, setArData] = useState([]); 

  const role = user?.user_metadata?.role || '';

  useEffect(() => {
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    setSelectedMonth(currentMonth);
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (selectedMonth && (role === 'admin' || role === 'superuser')) {
      if (selectedReport === 'sales') {
        fetchSalesData();
        fetchTopProducts();
      } else if (selectedReport === 'ar') {
        fetchAccountsReceivable();
      }
    }
  }, [selectedMonth, role, selectedReport, selectedCustomer]);

  const fetchSalesData = async () => {
    if (!selectedMonth) return;
    
    setLoading(true);
    try {
      const [year, monthNum] = selectedMonth.split('-');
      const startDate = `${year}-${monthNum}-01`;
      const endDate = new Date(year, parseInt(monthNum), 0).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('SALES_TRANS')
        .select('date, total_amt')
        .eq('status', 'Completed')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (error) throw error;

      const dailyTotals = {};
      let totalSum = 0;

      data?.forEach(order => {
        const date = order.date;
        const total = parseFloat(order.total_amt) || 0;
        if (!dailyTotals[date]) dailyTotals[date] = 0;
        dailyTotals[date] += total;
        totalSum += total;
      });

      const formattedData = Object.entries(dailyTotals).map(([date, total]) => ({
        date,
        total
      }));

      setSalesData(formattedData);
      setMonthlyTotal(totalSum);
    } catch (error) {
      console.error('Error fetching sales data:', error);
      toast.error('Failed to fetch sales data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTopProducts = async () => {
    if (!selectedMonth) return;
    
    try {
      const [year, monthNum] = selectedMonth.split('-');
      const startDate = `${year}-${monthNum}-01`;
      const endDate = new Date(year, parseInt(monthNum), 0).toISOString().split('T')[0];

      // FIX: Select 'salestrans_no' (not 'sales_trans_no')
      const { data: salesData, error: salesError } = await supabase
        .from('SALES_TRANS')
        .select('salestrans_no')  // Changed from 'sales_trans_no' to 'salestrans_no'
        .eq('status', 'Completed')
        .gte('date', startDate)
        .lte('date', endDate);

      if (salesError) throw salesError;

      if (!salesData || salesData.length === 0) {
        setTopProducts([]);
        return;
      }

      // FIX: Map 'salestrans_no' (not 'sales_trans_no')
      const salesTransNos = salesData.map(s => s.salestrans_no);  // Changed from s.sales_trans_no

      // This part is correct - using LINE_ITEM with salestrans_no
      const { data: salesItems, error: itemsError } = await supabase
        .from('LINE_ITEM') 
        .select('prod_no, qty')
        .in('salestrans_no', salesTransNos); 

      if (itemsError) throw itemsError;

      if (!salesItems || salesItems.length === 0) {
        setTopProducts([]);
        return;
      }

      const prodNos = [...new Set(salesItems.map(item => item.prod_no))];
      
      const { data: products, error: productsError } = await supabase
        .from('PRODUCT')
        .select('prod_no, brand, name, size_amt, u_size, price_piece')
        .in('prod_no', prodNos);

      if (productsError) throw productsError;

      const productSales = {};
      
      salesItems.forEach(item => {
        const product = products.find(p => p.prod_no === item.prod_no);
        if (product) {
          const key = `${product.brand}|${product.name}|${product.size_amt}|${product.u_size}`;
          const salesAmount = item.qty * product.price_piece;
          
          if (productSales[key]) {
            productSales[key].totalSales += salesAmount;
          } else {
            productSales[key] = {
              brand: product.brand,
              name: product.name,
              size: `${product.size_amt} ${product.u_size}`,
              totalSales: salesAmount
            };
          }
        }
      });

      const sortedProducts = Object.values(productSales)
        .sort((a, b) => b.totalSales - a.totalSales)
        .slice(0, 10);

      setTopProducts(sortedProducts);
    } catch (error) {
      console.error('Error fetching top products:', error);
      toast.error('Failed to fetch top products');
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('CUSTOMER')
        .select('cust_no, name')
        .order('name', { ascending: true });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchAccountsReceivable = async () => {
    if (!selectedMonth) return;
    
    setLoading(true);
    try {
      const [year, monthNum] = selectedMonth.split('-');
      const startDate = `${year}-${monthNum}-01`;
      const endDate = new Date(year, parseInt(monthNum), 0).toISOString().split('T')[0];

      let query = supabase
        .from('SALES_TRANS')
        .select(`
          date,
          total_amt,
          p_status,
          due_date,
          cust_no,
          CUSTOMER: cust_no (name)
        `)
        .eq('status', 'Completed')
        .eq('p_status', 'Pending')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('due_date', { ascending: true });

      if (selectedCustomer) {
        query = query.eq('cust_no', selectedCustomer);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedData = data?.map(transaction => ({
        date: transaction.date,
        total_amt: transaction.total_amt,
        p_status: transaction.p_status,
        due_date: transaction.due_date,
        customer_name: transaction.CUSTOMER?.name || 'Unknown Customer',
        cust_no: transaction.cust_no
      })) || [];

      setArData(formattedData);
    } catch (error) {
      console.error('Error fetching accounts receivable:', error);
      toast.error('Failed to fetch accounts receivable data');
    } finally {
      setLoading(false);
    }
  };

  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
  };

  const handleCustomerChange = (e) => {
    setSelectedCustomer(e.target.value);
  };

  // If user doesn't have access
  if (role !== 'admin' && role !== 'superuser') {
    return (
      <div className="reportspage">
        <Sidebar />
        <div style={{ marginLeft: '270px', padding: '20px' }}>
          <h1>Access Denied</h1>
          <p>You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reportspage">
      <Sidebar />
      
      <ToastContainer 
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />

      <div className="reports-header-row">
        <h1>Reports</h1>
      </div>

      {/* Report toggle buttons */}
      <div className="reports-toggle-container">
        <button
          className={`reports-toggle-btn ${selectedReport === 'sales' ? 'active' : ''}`}
          onClick={() => setSelectedReport('sales')}
        >
          Sales
        </button>
        <button
          className={`reports-toggle-btn ${selectedReport === 'ar' ? 'active' : ''}`}
          onClick={() => setSelectedReport('ar')}
        >
          Accounts Receivable
        </button>
      </div>

      {/* Sales Report Section - Only show when selectedReport is 'sales' */}
      {selectedReport === 'sales' && (
        <>
          <h2 className="reports-table-title">Sales Report</h2>
          <div className="reports-section">
            <div className="reports-search-card">
              <div className="reports-filters-container">
                <div className="reports-search-container">
                  <input
                    type="month"
                    id="month"
                    value={selectedMonth}
                    onChange={handleMonthChange}
                    className="reports-month-input"
                  />
                </div>
              </div>
            </div>

            <div className="reports-table-container">
                <table className="reports-styled-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Total Sales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesData.length > 0 ? (
                      salesData.map((sale, index) => (
                        <tr key={index}>
                          <td style={{ textAlign: 'left' }}>
                            {new Date(sale.date).toLocaleDateString()}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            ₱ {sale.total.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="2" style={{ textAlign: 'center' }}>
                          No sales data for this month
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="reports-total-row">
                      <td style={{ textAlign: 'left' }}>
                        <strong>Total Sales for {selectedMonth}</strong>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <strong>₱ {monthlyTotal.toFixed(2)}</strong>
                      </td>
                    </tr>
                  </tfoot>
                </table>
            </div>
          </div>

          <h2 className="reports-table-title">Top Performing Products</h2>
          <div className="reports-section">
            <div className="reports-table-container">
              <table className="reports-styled-table">
                <thead>
                  <tr>
                    <th>Brand</th>
                    <th>Name</th>
                    <th>Size</th>
                    <th>Sales Generated</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.length > 0 ? (
                    topProducts.map((product, index) => (
                      <tr key={index}>
                        <td style={{ textAlign: 'left' }}>{product.brand}</td>
                        <td style={{ textAlign: 'left' }}>{product.name}</td>
                        <td style={{ textAlign: 'left' }}>{product.size}</td>
                        <td style={{ textAlign: 'right' }}>₱ {product.totalSales.toFixed(2)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center' }}>
                        No product sales data for this month
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {selectedReport === 'ar' && (
        <>
          <h2 className="reports-table-title">Accounts Receivable Report</h2>
          <div className="reports-section">
            <div className="reports-search-card">
              <div className="reports-filters-container">
                <div className="reports-search-container" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="month"
                    id="month"
                    value={selectedMonth}
                    onChange={handleMonthChange}
                    className="reports-month-input"
                    style={{ marginRight: '10px', width: '100px' }}
                  />
                  <select
                    id="customerFilter"
                    value={selectedCustomer}
                    onChange={handleCustomerChange}
                    className="reports-customer-select"
                  >
                    <option value="">All Customers</option>
                    {customers.map(customer => (
                      <option key={customer.cust_no} value={customer.cust_no}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="reports-table-container">
                <table className="reports-styled-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Total Amount</th>
                      <th>Payment Status</th>
                      <th>Due Date</th>
                      <th>Customer Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {arData.length > 0 ? (
                      arData.map((item, index) => (
                        <tr key={index}>
                          <td style={{ textAlign: 'left' }}>
                            {new Date(item.date).toLocaleDateString()}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            ₱ {parseFloat(item.total_amt).toFixed(2)}
                          </td>
                          <td style={{ textAlign: 'left' }}>
                            <span className="status-badge status-pending">
                              {item.p_status || 'Pending'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'left' }}>
                            {item.due_date ? new Date(item.due_date).toLocaleDateString() : 'N/A'}
                          </td>
                          <td style={{ textAlign: 'left' }}>
                            {item.customer_name}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center' }}>
                          No accounts receivable data for this month
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Reports;