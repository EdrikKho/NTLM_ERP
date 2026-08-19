import React, { useEffect, useState } from 'react';
import { supabase } from '../client';
import Sidebar from './Sidebar';
import './Payments.css';
import { FiSearch, FiPlus, FiEdit } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { toast, ToastContainer } from 'react-toastify';

const Payments = () => {
  const { user } = useAuth();

  const role = user?.user_metadata?.role || '';
  const email = user?.email || '';

  const [payments, setPayments] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [search, setSearch] = useState('');

  const [submitted, setSubmitted] = useState(false);
  const [submittedEdit, setSubmittedEdit] = useState(false);

  const [customerFilter, setCustomerFilter] = useState('');
  const [customers, setCustomers] = useState([]);

  const [editOrderOptions, setEditOrderOptions] = useState([]);

  // ADD PAYMENT STATE
  const [payment, setPayment] = useState({
    date: new Date().toISOString().split('T')[0],
    p_method: '',
    salestrans_no: ''
  });

  // EDIT PAYMENT STATE
  const [payment2, setPayment2] = useState({
    pay_no: '',
    date: '',
    p_method: '',
    salestrans_no: ''
  });

  const [showModal, setShowModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchPayments();
    fetchSalesOrders();
    fetchCustomers();
  }, []);

  // FETCH PAYMENTS
  async function fetchPayments() {
    const { data, error } = await supabase
      .from('PAYMENT')
      .select(`
        *,
        SALES_TRANS (
          salestrans_no,
          date,
          total_amt,
          CUSTOMER (
            cust_no,
            name
          )
        )
      `)
      .order('pay_no', { ascending: false });

    if (!error) {
      setPayments(data || []);
    } else {
      toast.error('Failed to fetch payments');
    }
  }

  // FETCH SALES ORDERS (Completed status, Pending p_status)
  async function fetchSalesOrders() {
    const { data, error } = await supabase
      .from('SALES_TRANS')
      .select(`
        salestrans_no,
        date,
        total_amt,
        CUSTOMER (
          cust_no,
          name
        )
      `)
      .eq('status', 'Completed')
      .eq('p_status', 'Pending')
      .order('date', { ascending: false });

    if (!error) {
      setSalesOrders(data || []);
    } else {
      toast.error('Failed to fetch sales orders');
    }
  }

  // FETCH CUSTOMERS FOR FILTER
  async function fetchCustomers() {
    const { data, error } = await supabase
      .from('CUSTOMER')
      .select('cust_no, name')
      .order('name', { ascending: true });

    if (!error) {
      setCustomers(data || []);
    } else {
      toast.error('Failed to fetch customers');
    }
  }

  // GET USER ID FROM EMAIL
  async function getUserIdFromEmail(userEmail) {
    const { data, error } = await supabase
      .from('USER')
      .select('u_id')
      .eq('email', userEmail)
      .single();

    if (error) {
      toast.error('Failed to get user information');
      return null;
    }

    return data?.u_id;
  }

  // HANDLE INPUT
  function handleChange(e) {
    setPayment(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  }

  function handleChange2(e) {
    setPayment2(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  }

  // ADD PAYMENT
  async function addPayment(e) {
    e.preventDefault();

    setSubmitted(true);

    if (!payment.date || !payment.p_method || !payment.salestrans_no) {
      return;
    }

    // Get user ID from email
    const u_id = await getUserIdFromEmail(email);
    if (!u_id) {
      return;
    }

    const paymentData = {
      date: payment.date,
      p_method: payment.p_method,
      u_id: u_id,
      salestrans_no: parseInt(payment.salestrans_no)
    };

    const { error } = await supabase
      .from('PAYMENT')
      .insert([paymentData]);

    if (!error) {
      toast.success('Payment added successfully');

      setPayment({
        date: '',
        p_method: '',
        salestrans_no: ''
      });

      setSubmitted(false);
      setShowAddModal(false);
      fetchPayments();
      fetchSalesOrders();
    } else {
      toast.error('Failed to add payment');
    }
  }

  // OPEN EDIT MODAL
  function displayPayment(pay_no) {
    const selected = payments.find(
      p => p.pay_no === pay_no
    );

    if (selected) {
      setPayment2({
        pay_no: selected.pay_no,
        date: selected.date,
        p_method: selected.p_method,
        salestrans_no: selected.salestrans_no
      });
      
      // Build the options list for edit dropdown
      const currentOrder = selected.SALES_TRANS;
      const existingOrderNumbers = new Set(
        salesOrders.map(order => order.salestrans_no)
      );
      
      let options = [...salesOrders];
      
      // If the current order is not in the list, add it
      if (currentOrder && !existingOrderNumbers.has(currentOrder.salestrans_no)) {
        options.push({
          salestrans_no: currentOrder.salestrans_no,
          date: currentOrder.date,
          total_amt: currentOrder.total_amt,
          CUSTOMER: currentOrder.CUSTOMER
        });
      }
      
      // Sort options by date (newest first)
      options.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      setEditOrderOptions(options);
      setSubmittedEdit(false);
      setShowModal(true);
    }
  }

  // EDIT PAYMENT
  async function editPayment(e) {
    e.preventDefault();

    setSubmittedEdit(true);

    if (!payment2.date || !payment2.p_method || !payment2.salestrans_no) {
      return;
    }

    const { error } = await supabase
      .from('PAYMENT')
      .update({
        date: payment2.date,
        p_method: payment2.p_method,
        salestrans_no: parseInt(payment2.salestrans_no)
      })
      .eq('pay_no', payment2.pay_no);

    if (!error) {
      toast.success('Payment updated successfully');
      setShowModal(false);
      setSubmittedEdit(false);
      fetchPayments();
      fetchSalesOrders();
    } else {
      toast.error('Failed to update payment');
    }
  }

  // SEARCH FILTER
  const filteredPayments = payments.filter((payment) => {
    const matchesDate = payment.date?.includes(search);
    const matchesCustomer = customerFilter === '' || 
      payment.SALES_TRANS?.CUSTOMER?.cust_no === parseInt(customerFilter);
    return matchesDate && matchesCustomer;
  });

  return (
    <div className="paymentpage">
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

      {/* HEADER */}
      <div className="payment-header-row">
        {(role === 'admin') && (
          <h1>Payments</h1>
        )}

        {(role === 'admin') && (
          <button
            className="addpayment"
            onClick={() => setShowAddModal(true)}
          >
            <FiPlus className="payment-icon" />
            Add Payment
          </button>
        )}
      </div>

      {/* SEARCH AND FILTERS */}
      {(role === 'admin') && (
        <div className="payment-topwrapper">
          <div className="paymentsearch-card">
            <div className="payment-filters-container">
              <div className="payment-search-container">
                <FiSearch className="payment-search-icon" />
                <input
                  type="date"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="payment-search-bar"
                  style={{ fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif', fontSize: '14px', fontWeight: 499, color: '#000' }}
                />
              </div>

              <div className="payment-filter-group">
                <select
                  value={customerFilter}
                  onChange={(e) => setCustomerFilter(e.target.value)}
                  className="payment-filter-select"
                >
                  <option value="">All Customers</option>
                  {customers.map((customer) => (
                    <option key={customer.cust_no} value={customer.cust_no}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TABLE */}
      {(role === 'admin') && (
        <div className="payment-table-container">
          <table className="payment-styled-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Payment Method</th>
                <th>Customer Name</th>
                <th>Sales Order Date</th>
                <th>Total Amount</th>
                {/* <th>Actions</th> */}
              </tr>
            </thead>

            <tbody>
              {filteredPayments.map((payment) => (
                <tr key={payment.pay_no}>
                  <td style={{ textAlign: 'left' }}>{payment.date ? new Date(payment.date).toLocaleDateString() : ''}</td>
                  <td style={{ textAlign: 'left' }}>{payment.p_method}</td>
                  <td style={{ textAlign: 'left' }}>{payment.SALES_TRANS?.CUSTOMER?.name || 'N/A'}</td>
                  <td style={{ textAlign: 'left' }}>{payment.SALES_TRANS?.date ? new Date(payment.SALES_TRANS.date).toLocaleDateString() : 'N/A'}</td>
                  <td style={{ textAlign: 'right' }}>₱ {payment.SALES_TRANS?.total_amt?.toLocaleString() || '0.00'}</td>

                  {/* <td>
                    <button
                      className="payment-edit-btn"
                      onClick={() =>
                        displayPayment(payment.pay_no)
                      }
                    >
                      <FiEdit color="#185229" size={18} />
                    </button>
                  </td> */}

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ADD MODAL */}
      {showAddModal && (
        <div className="payment-modal-overlay">
          <div className="payment-modal">
            <h2>Add Payment</h2>

            <form onSubmit={addPayment}>
              <label>
                Date
                <span className="payment_required">*</span>
              </label>
              <input
                type="date"
                name="date"
                value={payment.date}
                onChange={handleChange}
                className={submitted && !payment.date ? "payment-input-error" : ""}
              />

              {submitted && !payment.date && (
                <span className="payment-error-text">
                  Date is required.
                </span>
              )}

              <label>
                Payment Method
                <span className="payment_required">*</span>
              </label>
              <select
                name="p_method"
                value={payment.p_method}
                onChange={handleChange}
                className={submitted && !payment.p_method ? "payment-input-error" : ""}
              >
                <option value="">Select Payment Method</option>
                <option value="Cash">Cash</option>
                <option value="Check">Check</option>
              </select>

              {submitted && !payment.p_method && (
                <span className="payment-error-text">Payment Method is required.</span>
              )}

              <label>
                Sales Order
                <span className="payment_required">*</span>
              </label>
              <select
                name="salestrans_no"
                value={payment.salestrans_no}
                onChange={handleChange}
                className={submitted && !payment.salestrans_no ? "payment-input-error" : ""}
              >
                <option value="">Select Sales Order</option>
                {salesOrders.map((order) => (
                  <option key={order.salestrans_no} value={order.salestrans_no}>
                    {order.date ? new Date(order.date).toLocaleDateString() : ''} - {order.CUSTOMER?.name || 'N/A'} - ₱{order.total_amt?.toLocaleString() || '0.00'}
                  </option>
                ))}
              </select>

              {submitted && !payment.salestrans_no && (
                <span className="payment-error-text">Sales Order is required.</span>
              )}

              <div className="payment-modal-actions">
                <button type="submit">
                  Add Payment
                </button>

                <button
                  type="button"
                  className="payment-cancel-btn"
                  onClick={() => {
                    setShowAddModal(false);
                    setSubmitted(false);
                    setPayment({
                      date: new Date().toISOString().split('T')[0],
                      p_method: '',
                      salestrans_no: ''
                    });
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showModal && (
        <div className="payment-modal-overlay">
          <div className="payment-modal">
            <h2>Edit Payment</h2>

            <form onSubmit={editPayment}>
              <label>
                Date
                <span className="payment_required">*</span>
              </label>
              <input
                type="date"
                name="date"
                value={payment2.date}
                onChange={handleChange2}
                className={submittedEdit && !payment2.date ? "payment-input-error" : ""}
              />

              {submittedEdit && !payment2.date && (
                <span className="payment-error-text">Date is required.</span>
              )}

              <label>
                Payment Method
                <span className="payment_required">*</span>
              </label>
              <select
                name="p_method"
                value={payment2.p_method}
                onChange={handleChange2}
                className={submittedEdit && !payment2.p_method ? "payment-input-error" : ""}
              >
                <option value="">Select Payment Method</option>
                <option value="Cash">Cash</option>
                <option value="Check">Check</option>
              </select>

              {submittedEdit && !payment2.p_method && (
                <span className="payment-error-text">Payment Method is required.</span>
              )}

              <label>
                Sales Order
                <span className="payment_required">*</span>
              </label>
              <select
                name="salestrans_no"
                value={payment2.salestrans_no}
                onChange={handleChange2}
                className={submittedEdit && !payment2.salestrans_no ? "payment-input-error" : ""}
              >
                <option value="">Select Sales Order</option>
                {editOrderOptions.map((order) => (
                  <option key={order.salestrans_no} value={order.salestrans_no}>
                    {order.date ? new Date(order.date).toLocaleDateString() : ''} - 
                    {order.CUSTOMER?.name || 'N/A'} - 
                    ₱{order.total_amt?.toLocaleString() || '0.00'}
                  </option>
                ))}
              </select>

              {submittedEdit && !payment2.salestrans_no && (
                <span className="payment-error-text">Sales Order is required.</span>
              )}

              <div className="payment-modal-actions">
                <button type="submit">
                  Save Changes
                </button>

                <button
                  type="button"
                  className="payment-cancel-btn"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;