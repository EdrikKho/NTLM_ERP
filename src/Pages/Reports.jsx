// Reports.jsx - Simplified version matching your other pages
import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../client';
import { FiSearch } from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import './Reports.css';

const Reports = () => {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [salesData, setSalesData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const role = user?.user_metadata?.role || '';

  // Generate month options
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);

  useEffect(() => {
    if (role === 'admin' || role === 'superuser') {
      fetchSalesData();
      fetchTopProducts();
    }
  }, [selectedMonth, selectedYear, role]);

  const fetchSalesData = async () => {
    setLoading(true);
    try {
      const startDate = new Date(selectedYear, selectedMonth - 1, 1);
      const endDate = new Date(selectedYear, selectedMonth, 0);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('SALES_TRANS')
        .select('date, total_amt')
        .eq('status', 'Completed')
        .gte('date', startDateStr)
        .lte('date', endDateStr)
        .order('date', { ascending: true });

      if (error) throw error;

      const salesByDate = {};
      let total = 0;
      
      data?.forEach(sale => {
        const dateStr = sale.date;
        if (salesByDate[dateStr]) {
          salesByDate[dateStr] += sale.total_amt;
        } else {
          salesByDate[dateStr] = sale.total_amt;
        }
        total += sale.total_amt;
      });

      const formattedSales = Object.entries(salesByDate).map(([date, totalAmt]) => ({
        date,
        totalAmt
      }));

      setSalesData(formattedSales);
      setMonthlyTotal(total);
    } catch (error) {
      console.error('Error fetching sales data:', error);
      toast.error('Failed to fetch sales data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTopProducts = async () => {
    try {
      const startDate = new Date(selectedYear, selectedMonth - 1, 1);
      const endDate = new Date(selectedYear, selectedMonth, 0);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const { data: salesData, error: salesError } = await supabase
        .from('SALES_TRANS')
        .select('sales_trans_no')
        .eq('status', 'Completed')
        .gte('date', startDateStr)
        .lte('date', endDateStr);

      if (salesError) throw salesError;

      if (!salesData || salesData.length === 0) {
        setTopProducts([]);
        return;
      }

      const salesTransNos = salesData.map(s => s.sales_trans_no);

      const { data: salesItems, error: itemsError } = await supabase
        .from('SALES_ITEM')
        .select('prod_no, qty')
        .in('sales_trans_no', salesTransNos);

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

  const handleMonthChange = (e) => {
    setSelectedMonth(parseInt(e.target.value));
  };

  const handleYearChange = (e) => {
    setSelectedYear(parseInt(e.target.value));
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

      <div className="reports-section">
        <div className="reports-search-card">
          <div className="reports-filters-container">
            <div className="reports-search-container">
              <FiSearch className="reports-search-icon" />
              <select
                value={selectedMonth}
                onChange={handleMonthChange}
                className="reports-filter-select"
              >
                {months.map(month => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="reports-filter-group">
              <select
                value={selectedYear}
                onChange={handleYearChange}
                className="reports-filter-select"
              >
                {years.map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="reports-table-container">
          <h2 className="reports-table-title">Sales Report</h2>
          {loading ? (
            <div className="reports-loading">Loading...</div>
          ) : (
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
                        ₱ {sale.totalAmt.toFixed(2)}
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
                    <strong>Total Monthly Sales</strong>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <strong>₱ {monthlyTotal.toFixed(2)}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      <div className="reports-section">
        <div className="reports-table-container">
          <h2 className="reports-table-title">Top Performing Products</h2>
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
    </div>
  );
};

export default Reports;