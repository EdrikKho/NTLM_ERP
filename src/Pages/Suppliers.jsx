import React, { useEffect, useState } from 'react';
import { supabase } from '../client';
import Sidebar from './Sidebar';
import './Suppliers.css';
import { FiSearch, FiPlus, FiTrash2, FiEdit } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { toast, ToastContainer } from 'react-toastify';

const Suppliers = () => {
  const { user } = useAuth();

  const role = user?.user_metadata?.role || '';
  const firstName = user?.user_metadata?.first_name || '';
  const lastName = user?.user_metadata?.last_name || '';

  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');

  const [submitted, setSubmitted] = useState(false);
  const [submittedEdit, setSubmittedEdit] = useState(false);

  // ADD SUPPLIER STATE
  const [supplier, setSupplier] = useState({
    com_name: '',
    address: '',
    sales_p: '',
    contact_no: ''
  });

  // EDIT SUPPLIER STATE
  const [supplier2, setSupplier2] = useState({
    sup_no: '',
    com_name: '',
    address: '',
    sales_p: '',
    contact_no: ''
  });

  const [showModal, setShowModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // DELETE MODAL
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  // FETCH SUPPLIERS
  async function fetchSuppliers() {
    try {
      const { data, error } = await supabase
        .from('SUPPLIER')
        .select(`
          *,
          PRODUCT (prod_no)
        `)
        .order('sup_no', { ascending: false });

      if (!error && data) {
        const suppliersWithStatus = data.map(supplier => ({
          ...supplier,
          hasProducts: supplier.PRODUCT && supplier.PRODUCT.length > 0
        }));
        setSuppliers(suppliersWithStatus);
      } else if (error) {
        toast.error('Failed to fetch suppliers');
      }
    } catch (error) {
      toast.error('An error occurred while fetching suppliers');
    }
  }

  // HANDLE INPUT
  function handleChange(e) {
    setSupplier(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  }

  function handleChange2(e) {
    setSupplier2(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  }

  // ADD SUPPLIER
  async function addSuppliers(e) {
    e.preventDefault();

    setSubmitted(true);

    if (
      !supplier.com_name ||
      !supplier.address ||
      !supplier.sales_p ||
      !supplier.contact_no
    ) {
      return;
    }

    // Add this duplicate check
    const { data: existingSupplier } = await supabase
      .from('SUPPLIER')
      .select('com_name')
      .ilike('com_name', supplier.com_name.trim());

    if (existingSupplier && existingSupplier.length > 0) {
      toast.error("Supplier already exists");
      return;
    }

    const { error } = await supabase
      .from('SUPPLIER')
      .insert([supplier]);

    if (!error) {
      toast.success('Supplier added successfully');

      setSupplier({
        com_name: '',
        address: '',
        sales_p: '',
        contact_no: ''
      });

      setSubmitted(false);
      setShowAddModal(false);
      fetchSuppliers();
    } else {
      toast.error('Failed to add supplier');
    }
  }

  // OPEN EDIT MODAL
  function displaySupplier(supplierId) {
    const selected = suppliers.find(
      s => s.sup_no === supplierId
    );

    if (selected) {
      setSupplier2({
        sup_no: selected.sup_no,
        com_name: selected.com_name,
        address: selected.address,
        sales_p: selected.sales_p,
        contact_no: selected.contact_no
      });
      setSubmittedEdit(false);
      setShowModal(true);
    }
  }

  // EDIT SUPPLIER
  async function editSupplier(e) {
    e.preventDefault();

    setSubmittedEdit(true);

    if (
      !supplier2.com_name ||
      !supplier2.address ||
      !supplier2.sales_p ||
      !supplier2.contact_no
    ) {
      return;
    }

    // Add this duplicate check (excluding current supplier)
    const { data: existingSupplier } = await supabase
      .from('SUPPLIER')
      .select('com_name')
      .ilike('com_name', supplier2.com_name.trim())
      .neq('sup_no', supplier2.sup_no);

    if (existingSupplier && existingSupplier.length > 0) {
      toast.error("Supplier already exists");
      return;
    }

    const { error } = await supabase
      .from('SUPPLIER')
      .update({
        com_name: supplier2.com_name,
        address: supplier2.address,
        sales_p: supplier2.sales_p,
        contact_no: supplier2.contact_no
      })
      .eq('sup_no', supplier2.sup_no);

    if (!error) {
      toast.success('Supplier updated successfully');
      setShowModal(false);
      setSubmittedEdit(false);
      fetchSuppliers();
    } else {
      toast.error('Failed to update supplier');
    }
  }

  // DELETE SUPPLIER
  async function confirmDeleteSupplier() {
    const { error } = await supabase
      .from('SUPPLIER')
      .delete()
      .eq('sup_no', selectedSupplier.sup_no);

    if (!error) {
      toast.success(
        `${selectedSupplier.com_name} deleted successfully`
      );
    } else {
      toast.error('Failed to delete supplier');
    }

    setShowDeleteModal(false);
    setSelectedSupplier(null);
    fetchSuppliers();
  }

  // SEARCH FILTER
  const filteredSuppliers = suppliers.filter((s) =>
    s.com_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="supplierpage">
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
      <div className="header-row">
        {(role === 'admin' || role === 'employee') && (
          <h1>Suppliers</h1>
        )}

        {(role === 'admin' || role === 'employee') && (
          <button
            className="addsupplier"
            onClick={() => setShowAddModal(true)}
          >
            <FiPlus className="icon" />
            Add Supplier
          </button>
        )}
      </div>

      {/* SEARCH */}
      {(role === 'admin' || role === 'employee') && (
        <div className="supplier-topwrapper">
          <div className="suppliersearch-card">
            <div className="suppliersearch-container">
              <FiSearch className="search-icon" />

              <input
                type="text"
                placeholder="Search by company name..."
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
                <th>Company Name</th>
                <th>Address</th>
                <th>Sales Person</th>
                <th>Contact Number</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredSuppliers.map((supplier) => (
                <tr key={supplier.sup_no}>
                  <td style={{ textAlign: 'left' }}>{supplier.com_name}</td>
                  <td style={{ textAlign: 'left' }}>{supplier.address}</td>
                  <td style={{ textAlign: 'left' }}>{supplier.sales_p}</td>
                  <td style={{ textAlign: 'left' }}>{supplier.contact_no}</td>

                  <td style={{ textAlign: 'left' }}>
                    <button
                      className="edit-btn"
                      onClick={() =>
                        displaySupplier(supplier.sup_no)
                      }
                    >
                      <FiEdit color="#185229" size={18} />
                    </button>

                    {!supplier.hasProducts && (
                      <button
                        className="del-btn"
                        onClick={() => {
                          setSelectedSupplier(supplier);
                          setShowDeleteModal(true);
                        }}
                      >
                        <FiTrash2
                          color="rgb(219, 32, 32)"
                          size={18}
                        />
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
            <h2>Add Supplier</h2>

            <form onSubmit={addSuppliers}>
              <label>
                Company Name
                <span className="supplier_required">*</span>
              </label>
              <input
                name="com_name"
                value={supplier.com_name}
                onChange={handleChange}
                className={submitted && !supplier.com_name ? "supinput-error" : ""}
              />

              {submitted && !supplier.com_name && (
                <span className="superror-text">
                  Company Name is required.
                </span>
              )}

              <label>
                Address
                <span className="supplier_required">*</span>
              </label>
              <input
                name="address"
                value={supplier.address}
                onChange={handleChange}
                className={submitted && !supplier.address ? "supinput-error" : ""}
              />

              {submitted && !supplier.address && (
                <span className="superror-text">Address is required.</span>
              )}

              <label>
                Sales Person
                <span className="supplier_required">*</span>
              </label>
              <input
                name="sales_p"
                value={supplier.sales_p}
                onChange={handleChange}
                className={submitted && !supplier.sales_p ? "supinput-error" : ""}
              />

              {submitted && !supplier.sales_p && (
                <span className="superror-text">Sales Person is required.</span>
              )}

              <label>
                Contact Number
                <span className="supplier_required">*</span>
              </label>
              <input
                name="contact_no"
                value={supplier.contact_no}
                onChange={handleChange}
                className={submitted && !supplier.contact_no ? "supinput-error" : ""}
              />

              {submitted && !supplier.contact_no && (
                <span className="superror-text">Contact Number is required.</span>
              )}

              <div className="modal-actions">
                <button type="submit">
                  Add Supplier
                </button>

                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setShowAddModal(false);
                    setSubmitted(false);

                    setSupplier({
                      com_name: '',
                      address: '',
                      sales_p: '',
                      contact_no: ''
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
            <h2>Edit Supplier</h2>

            <form onSubmit={editSupplier}>
              <label>
                Company Name
                <span className="supplier_required">*</span>
              </label>
              <input
                name="com_name"
                value={supplier2.com_name}
                onChange={handleChange2}
                className={submittedEdit && !supplier2.com_name ? "supinput-error" : ""}
              />

              {submittedEdit && !supplier2.com_name && (
                <span className="superror-text">Company Name is required.</span>
              )}

              <label>
                Address
                <span className="supplier_required">*</span>
              </label>
              <input
                name="address"
                value={supplier2.address}
                onChange={handleChange2}
                className={submittedEdit && !supplier2.address ? "supinput-error" : ""}
              />

              {submittedEdit && !supplier2.address && (
                <span className="superror-text">Address is required.</span>
              )}

              <label>
                Sales Person
                <span className="supplier_required">*</span>
              </label>
              <input
                name="sales_p"
                value={supplier2.sales_p}
                onChange={handleChange2}
                className={submittedEdit && !supplier2.sales_p ? "supinput-error" : ""}
              />

              {submittedEdit && !supplier2.sales_p && (
                <span className="superror-text">Sales Person is required.</span>
              )}

              <label>
                Contact Number
                <span className="supplier_required">*</span>
              </label>
              <input
                name="contact_no"
                value={supplier2.contact_no}
                onChange={handleChange2}
                className={submittedEdit && !supplier2.contact_no ? "supinput-error" : ""}
              />

              {submittedEdit && !supplier2.contact_no && (
                <span className="superror-text">Contact Number is required.</span>
              )}

              <div className="modal-actions">
                <button type="submit">
                  Save Changes
                </button>

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
              <strong>
                {selectedSupplier?.com_name}
              </strong>
              ?
            </p>

            <div className="delete-modal-actions">
              <button
                className="confirm-delete-btn"
                onClick={confirmDeleteSupplier}
              >
                Delete
              </button>

              <button
                className="cancel-delete-btn"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedSupplier(null);
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

export default Suppliers;