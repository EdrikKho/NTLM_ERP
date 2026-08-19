import React, { useEffect, useState } from 'react';
import { supabase } from '../client';
import Sidebar from './Sidebar';
import './Customers.css';
import { FiSearch, FiPlus, FiTrash2, FiEdit } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Customers = () => {
  const { user } = useAuth();

  const role = user?.user_metadata?.role || '';
  const firstName = user?.user_metadata?.first_name || '';
  const lastName = user?.user_metadata?.last_name || '';

  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');

  const [submittedAdd, setSubmittedAdd] = useState(false);
  const [submittedEdit, setSubmittedEdit] = useState(false);

  // ADD CUSTOMER STATE
  const [customer, setCustomer] = useState({
    name: '',
    address: '',
    contact_no: '',
    p_terms: ''
  });

  // EDIT CUSTOMER STATE
  const [customer2, setCustomer2] = useState({
    cust_no: '',
    name: '',
    address: '',
    contact_no: '',
    p_terms: ''
  });

  const [showModal, setShowModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // DELETE MODAL
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [customersWithSales, setCustomersWithSales] = useState([]);

  useEffect(() => {
    fetchCustomers();
    fetchCustomersWithSalesOrders();
  }, []);

  // FETCH
  async function fetchCustomers() {
    const { data, error } = await supabase
      .from('CUSTOMER')
      .select('*')
      .order('cust_no', { ascending: false });

    if (!error) setCustomers(data || []);
    else toast.error("Failed to fetch customers");
  }

  // FETCH CUSTOMERS WITH SALES ORDERS
  async function fetchCustomersWithSalesOrders() {
    const { data, error } = await supabase
      .from('SALES_TRANS')
      .select('cust_no');

    if (!error && data) {
      // Get unique customer IDs that have sales orders
      const uniqueCustomerIds = [...new Set(data.map(item => item.cust_no))];
      setCustomersWithSales(uniqueCustomerIds);
    }
  }

  // HANDLE INPUT
  function handleChange(e) {
    setCustomer(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  }

  function handleChange2(e) {
    setCustomer2(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  }

  // ADD CUSTOMER
  async function addCustomers(e) {
    e.preventDefault();

    setSubmittedAdd(true);

    if (
      !customer.name ||
      !customer.contact_no ||
      !customer.address ||
      !customer.p_terms
    ) {
      return;
    }

    // Add this duplicate check
    const { data: existingCustomer } = await supabase
      .from('CUSTOMER')
      .select('name')
      .ilike('name', customer.name.trim());

    if (existingCustomer && existingCustomer.length > 0) {
      toast.error("Customer already exists");
      return;
    }

    const { error } = await supabase
      .from('CUSTOMER')
      .insert([customer]);

    if (!error) {
      toast.success("Customer added successfully");
      setCustomer({
        name: '',
        address: '',
        contact_no: '',
        p_terms: ''
      });
      setSubmittedAdd(false);
      setShowAddModal(false);
      fetchCustomers();
    } else {
      toast.error("Failed to add customer");
    }
  }

  // OPEN EDIT MODAL
  function displayCustomer(customerId) {
    const selected = customers.find(c => c.cust_no === customerId);

    if (selected) {
      setCustomer2({
        cust_no: selected.cust_no,
        name: selected.name,
        address: selected.address,
        contact_no: selected.contact_no,
        p_terms: selected.p_terms
      });

      setShowModal(true);
    }
  }

  // EDIT CUSTOMER
  async function editCustomer(e) {
    e.preventDefault();

    setSubmittedEdit(true);

    if (
      !customer2.name ||
      !customer2.contact_no ||
      !customer2.address ||
      !customer2.p_terms
    ) {
      return;
    }

    // Add this duplicate check (excluding current customer)
    const { data: existingCustomer } = await supabase
      .from('CUSTOMER')
      .select('name')
      .ilike('name', customer2.name.trim())
      .neq('cust_no', customer2.cust_no);

    if (existingCustomer && existingCustomer.length > 0) {
      toast.error("Customer already exists");
      return;
    }

    const { error } = await supabase
      .from('CUSTOMER')
      .update({
        name: customer2.name,
        address: customer2.address,
        contact_no: customer2.contact_no,
        p_terms: customer2.p_terms
      })
      .eq('cust_no', customer2.cust_no);

    if (!error) {
      toast.success("Customer updated successfully");
      setShowModal(false);
      setSubmittedEdit(false);
      fetchCustomers();
    } else {
      toast.error("Failed to update customer");
    }
  }

  // DELETE CUSTOMER
  async function confirmDeleteCustomer() {
    const { error } = await supabase
      .from('CUSTOMER')
      .delete()
      .eq('cust_no', selectedCustomer.cust_no);

    if (!error) {
      toast.success(`${selectedCustomer.name} deleted successfully`);
    } else {
      toast.error("Failed to delete customer");
    }

    setShowDeleteModal(false);
    setSelectedCustomer(null);
    fetchCustomers();
  }

  // SEARCH FILTER
  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="customerpage">

      <Sidebar />
      
      {/* Add ToastContainer here */}
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
      <div className="header-row">
        {(role === 'admin' || role === 'employee') && (
          <h1>Customers</h1>
        )}

        {(role === 'admin' || role === 'employee') && (
          <button
            className="addcustomer"
            onClick={() => setShowAddModal(true)}
          >
            <FiPlus className="icon" />
            Add Customer
          </button>
        )}
      </div>

      {/* SEARCH */}
      {(role === 'admin' || role === 'employee') && (
        <div className="customer-topwrapper">
          <div className="customersearch-card">
            <div className="customersearch-container">
              <FiSearch className="search-icon" />

              <input
                type="text"
                placeholder="Search by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-bar"
              />
            </div>
          </div>
        </div>
      )}

      {/* TABLE */}
      {(role === 'admin' || role === 'employee') && (
        <div className="table-container">
          <table className="styled-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact Number</th>
                <th>Address</th>
                {role === 'admin' && <th>Balance</th>}
                <th>Payment Terms</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.cust_no}>
                  <td style={{ textAlign: 'left' }}>{customer.name}</td>
                  <td style={{ textAlign: 'left' }}>{customer.contact_no}</td>
                  <td style={{ textAlign: 'left' }}>{customer.address}</td>
                  {role === 'admin' && <td style={{ textAlign: 'right' }}>₱ {customer.balance.toFixed(2)}</td>}
                  <td style={{ textAlign: 'left' }}>{customer.p_terms} Days</td>

                  <td style={{ textAlign: 'left' }}>
                    <button
                      className="edit-btn"
                      onClick={() => displayCustomer(customer.cust_no)}
                      title="Edit Customer"
                    >
                      <FiEdit color="#185229" size={18} />
                    </button>

                    {!customersWithSales.includes(customer.cust_no) && (
                      <button
                        className="del-btn"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setShowDeleteModal(true);
                        }}
                        title="Delete Customer"
                      >
                        <FiTrash2 color="rgb(219, 32, 32)" size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* ADD MODAL */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Add Customer</h2>

            <form onSubmit={addCustomers}>
              <label>Name<span className="cust_required">*</span></label>
              <input
                name="name"
                value={customer.name}
                onChange={handleChange}
                className={submittedAdd && !customer.name ? "custinput-error" : ""}
              />

              {submittedAdd && !customer.name && (
                <span className="custerror-text">Name is required.</span>
              )}

              <label>Contact Number<span className="cust_required">*</span></label>
              <input
                name="contact_no"
                value={customer.contact_no}
                onChange={handleChange}
                className={submittedAdd && !customer.contact_no ? "custinput-error" : ""}
              />

              {submittedAdd && !customer.contact_no && (
                <span className="custerror-text">Contact Number is required.</span>
              )}

              <label>Address<span className="cust_required">*</span></label>
              <input
                name="address"
                value={customer.address}
                onChange={handleChange}
                className={submittedAdd && !customer.address ? "custinput-error" : ""}
              />

              {submittedAdd && !customer.address && (
                <span className="custerror-text">Address is required.</span>
              )}

              <label>Payment Terms (Days)<span className="cust_required">*</span></label>
              <input
                type="number"
                name="p_terms"
                min="0"
                step="1"
                value={customer.p_terms}
                onChange={handleChange}
                className={submittedAdd && (customer.p_terms === '' || customer.p_terms === null) 
                  ? "custinput-error" 
                  : ""
                }
              />
              {submittedAdd && (customer.p_terms === '' || customer.p_terms === null) && (
                <span className="custerror-text">
                  Payment Term is required.
                </span>
              )}

              <div className="modal-actions">
                <button type="submit">Add Customer</button>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setShowAddModal(false);
                    setSubmittedAdd(false);

                    setCustomer({
                      name: '',
                      address: '',
                      contact_no: '',
                      p_terms: ''
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
        <div className="modal-overlay">
          <div className="modal">
            <h2>Edit Customer</h2>

            <form onSubmit={editCustomer}>
              <label>Name<span className="cust_required">*</span></label>
              <input
                name="name"
                value={customer2.name}
                onChange={handleChange2}
                className={submittedEdit && !customer2.name ? "custinput-error" : ""}
              />

              {submittedEdit && !customer2.name && (
                <span className="custerror-text">Name is required.</span>
              )}

              <label>Contact Number<span className="cust_required">*</span></label>
              <input
                name="contact_no"
                value={customer2.contact_no}
                onChange={handleChange2}
                className={submittedEdit && !customer2.contact_no ? "custinput-error" : ""}
              />

              {submittedEdit && !customer2.contact_no && (
                <span className="custerror-text">Contact Number is required.</span>
              )}

              <label>Address<span className="cust_required">*</span></label>
              <input
                name="address"
                value={customer2.address}
                onChange={handleChange2}
                className={submittedEdit && !customer2.address ? "custinput-error" : ""}
              />

              {submittedEdit && !customer2.address && (
                <span className="custerror-text">Address is required.</span>
              )}

              <label>Payment Terms<span className="cust_required">*</span></label>
              <input
                type="number"
                name="p_terms"
                value={customer2.p_terms}
                onChange={handleChange2}
                className={submittedEdit && (customer2.p_terms === '' || customer2.p_terms === null)
                  ? "custinput-error"
                  : ""
                }
                min="0"
                step="1"
              />

              {submittedEdit && (customer2.p_terms === '' || customer2.p_terms === null) && (
                <span className="custerror-text">
                  Payment Term is required.
                </span>
              )}

              <div className="modal-actions">
                <button type="submit">Save Changes</button>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {showDeleteModal && (
        <div className="delete-modal">
          <div className="delete-modal-content">
            <p>
              Are you sure you want to delete{' '}
              <strong>{selectedCustomer?.name}</strong>?
            </p>

            <div className="delete-modal-actions">
              <button
                className="confirm-delete-btn"
                onClick={confirmDeleteCustomer}
              >
                Delete
              </button>

              <button
                className="cancel-delete-btn"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedCustomer(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Customers;