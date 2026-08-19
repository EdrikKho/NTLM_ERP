// PurchaseOrders.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../client';
import Sidebar from './Sidebar';
import './PurchaseOrders.css';
import { FiSearch, FiPlus, FiTrash2, FiEdit, FiEye } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { toast, ToastContainer } from 'react-toastify';

const PurchaseOrders = () => {
  const { user } = useAuth();
  const role = user?.user_metadata?.role || '';
  const userId = user?.id;

  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [orderItemSearch, setOrderItemSearch] = useState('');
  const [orderItemSearchEdit, setOrderItemSearchEdit] = useState('');

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editPurchaseOrder, setEditPurchaseOrder] = useState({
    date: '',
    sup_no: '',
    status: 'Pending'
  });
  const [editTempOrderItems, setEditTempOrderItems] = useState([]);
  const [editOrderItem, setEditOrderItem] = useState({
    prod_no: '',
    qty: 1
  });
  const [submittedEdit, setSubmittedEdit] = useState(false);

  const [showEditOrderItemModal, setShowEditOrderItemModal] = useState(false);
  const [editingOrderItem, setEditingOrderItem] = useState(null);
  const [editOrderItemForm, setEditOrderItemForm] = useState({
    prod_no: '',
    qty: 1
  });

  const [showEditOrderItemModalEdit, setShowEditOrderItemModalEdit] = useState(false);
  const [editingOrderItemEdit, setEditingOrderItemEdit] = useState(null);
  const [editOrderItemFormEdit, setEditOrderItemFormEdit] = useState({
    prod_no: '',
    qty: 1
  });

  const [tempOrderItems, setTempOrderItems] = useState([]);

  const [purchaseOrder, setPurchaseOrder] = useState({
    date: new Date().toISOString().split('T')[0],
    sup_no: '',
    status: 'Pending'
  });

  const [orderItem, setOrderItem] = useState({
    prod_no: '',
    qty: 1
  });

  const [submitted, setSubmitted] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewOnlyModal, setShowViewOnlyModal] = useState(false);
  const [viewOrder, setViewOrder] = useState(null);
  const [viewOrderItems, setViewOrderItems] = useState([]);
  const [viewOrderItemSearch, setViewOrderItemSearch] = useState('');

  const [statusFilter, setStatusFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [editOrderItemErrors, setEditOrderItemErrors] = useState({});
  const [editOrderItemErrorsEdit, setEditOrderItemErrorsEdit] = useState({});

  const [showDeleteItemModal, setShowDeleteItemModal] = useState(false);
  const [selectedDeleteItem, setSelectedDeleteItem] = useState(null);
  const [deleteModalContext, setDeleteModalContext] = useState('add');

  const [addOrderItemErrors, setAddOrderItemErrors] = useState({
    prod_no: '',
    qty: ''
  });

  const [editAddOrderItemErrors, setEditAddOrderItemErrors] = useState({
    prod_no: '',
    qty: ''
  });

  // Print data state
  const [printData, setPrintData] = useState({
    date: '',
    supplier: '',
    items: []
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  async function fetchAllData() {
    setLoading(true);
    await fetchPurchaseOrders();
    await fetchSuppliers();
    await fetchProducts();
    setLoading(false);
  }

  async function fetchPurchaseOrders() {
    try {
      const { data, error } = await supabase
        .from('PURCHASE_TRANS')
        .select(`
          *,
          SUPPLIER (
            sup_no,
            com_name
          )
        `)
        .order('purtrans_no', { ascending: false });

      if (error) {
        console.error('Error fetching purchase orders:', error);
        toast.error(`Failed to fetch purchase orders: ${error.message}`);
        return;
      }

      setPurchaseOrders(data || []);
    } catch (error) {
      console.error('Unexpected error fetching purchase orders:', error);
      toast.error('Failed to fetch purchase orders');
    }
  }

  async function fetchSuppliers() {
    try {
      const { data, error } = await supabase
        .from('SUPPLIER')
        .select('sup_no, com_name')
        .order('com_name');

      if (error) {
        console.error('Error fetching suppliers:', error);
        toast.error(`Failed to fetch suppliers: ${error.message}`);
        return;
      }

      setSuppliers(data || []);
    } catch (error) {
      console.error('Unexpected error fetching suppliers:', error);
      toast.error('Failed to fetch suppliers');
    }
  }

  async function fetchProducts() {
    try {
      const { data, error } = await supabase
        .from('PRODUCT')
        .select('prod_no, name, brand, size_amt, u_size, stock, loc_name, sup_no')
        .order('name');

      if (error) {
        console.error('Error fetching products:', error);
        toast.error(`Failed to fetch products: ${error.message}`);
        return;
      }

      setProducts(data || []);
    } catch (error) {
      console.error('Unexpected error fetching products:', error);
      toast.error('Failed to fetch products');
    }
  }

  // function to filter products by supplier and exclude added items
  const getAvailableProducts = (supplierNo, addedProductIds, selectedProductId = null) => {
    // Return empty array if no supplier selected
    if (!supplierNo) return [];
    
    // Convert supplierNo to number (since it might come as string from select)
    const supplierNumber = Number(supplierNo);
    
    // Filter products
    return products.filter(product => {
      // Make sure product has sup_no and it matches the selected supplier
      const matchesSupplier = Number(product.sup_no) === supplierNumber;
      // Exclude products already in the order list
      if (selectedProductId && Number(product.prod_no) === Number(selectedProductId)) {
        return matchesSupplier;
      }
      const notAdded = !addedProductIds.includes(Number(product.prod_no));
      
      return matchesSupplier && notAdded;
    });
  };

  function handlePurchaseOrderChange(e) {
    const { name, value } = e.target;
    setPurchaseOrder(prev => ({
      ...prev,
      [name]: value
    }));
  }

  function handleEditPurchaseOrderChange(e) {
    const { name, value } = e.target;
    setEditPurchaseOrder(prev => ({
      ...prev,
      [name]: value
    }));
  }

  function handleOrderItemChange(e) {
    const { name, value } = e.target;
    setOrderItem(prev => ({
      ...prev,
      [name]: value
    }));
  }

  function handleEditOrderItemChange(e) {
    const { name, value } = e.target;
    setEditOrderItemForm(prev => ({
      ...prev,
      [name]: value
    }));
  }

  function handleEditOrderItemChangeEdit(e) {
    const { name, value } = e.target;
    setEditOrderItemFormEdit(prev => ({
      ...prev,
      [name]: value
    }));
  }

  // HANDLE PRINT FUNCTION
  const handlePrint = (type) => {
    if (type === 'add') {
      const supplierName = suppliers.find(s => s.sup_no === parseInt(purchaseOrder.sup_no))?.com_name || 'Not selected';
      setPrintData({
        date: purchaseOrder.date,
        supplier: supplierName,
        items: tempOrderItems
      });
    } else if (type === 'edit') {
      const supplierName = suppliers.find(s => s.sup_no === parseInt(editPurchaseOrder.sup_no))?.com_name || 'Not selected';
      setPrintData({
        date: editPurchaseOrder.date,
        supplier: supplierName,
        items: editTempOrderItems
      });
    } else if (type === 'view') {
      const supplierName = suppliers.find(s => s.sup_no === parseInt(viewOrder.sup_no))?.com_name || 'Not selected';
      const transformedItems = viewOrderItems.map(item => ({
        brand: item.PRODUCT?.brand || '',
        name: item.PRODUCT?.name || '',
        size_amt: item.PRODUCT?.size_amt || '',
        u_size: item.PRODUCT?.u_size || '',
        loc_name: item.PRODUCT?.loc_name || '',
        qty: item.qty
      }));
      setPrintData({
        date: viewOrder.date,
        supplier: supplierName,
        items: transformedItems
      });
    }
    
    setTimeout(() => {
      window.print();
    }, 100);
  };

  function addOrderItemToTemp() {
    if (!orderItem.prod_no) {
      return;
    }
    if (!orderItem.qty || orderItem.qty <= 0) {
      return;
    }

    const product = products.find(p => p.prod_no === parseInt(orderItem.prod_no));

    setTempOrderItems(prev => [
      ...prev,
      {
        id: Date.now(),
        prod_no: orderItem.prod_no,
        brand: product?.brand || '',
        name: product?.name || '',
        size_amt: product?.size_amt || '',
        u_size: product?.u_size || '',
        stock: product?.stock || '',
        loc_name: product?.loc_name || '',
        qty: orderItem.qty
      }
    ]);

    toast.success('Order item added successfully');

    setOrderItem({
      prod_no: '',
      qty: 1
    });
  }

  function addEditOrderItemToTemp() {
    if (!editOrderItem.prod_no) {
      toast.error('Please select a product');
      return;
    }
    if (!editOrderItem.qty || editOrderItem.qty <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    const product = products.find(p => p.prod_no === parseInt(editOrderItem.prod_no));

    setEditTempOrderItems(prev => [
      ...prev,
      {
        id: Date.now(),
        prod_no: editOrderItem.prod_no,
        brand: product?.brand || '',
        name: product?.name || '',
        size_amt: product?.size_amt || '',
        u_size: product?.u_size || '',
        stock: product?.stock || '',
        loc_name: product?.loc_name || '',
        qty: editOrderItem.qty
      }
    ]);

    toast.success('Order item added successfully');

    setEditOrderItem({
      prod_no: '',
      qty: 1
    });
  }

  function openEditOrderItemModal(item) {
    setEditingOrderItem(item);
    setEditOrderItemForm({
      prod_no: item.prod_no,
      qty: item.qty
    });
    setShowEditOrderItemModal(true);
  }

  function updateOrderItem() {
    if (!editOrderItemForm.qty || editOrderItemForm.qty <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    const product = products.find(p => p.prod_no === parseInt(editOrderItemForm.prod_no));

    setTempOrderItems(prev => prev.map(item => 
      item.id === editingOrderItem.id ? {
        ...item,
        prod_no: editOrderItemForm.prod_no,
        brand: product?.brand || '',
        name: product?.name || '',
        size_amt: product?.size_amt || '',
        u_size: product?.u_size || '',
        stock: product?.stock || '',
        loc_name: product?.loc_name || '',
        qty: editOrderItemForm.qty
      } : item
    ));

    setShowEditOrderItemModal(false);
    setEditingOrderItem(null);
    setEditOrderItemForm({
      prod_no: '',
      qty: 1
    });
    toast.success('Order item updated');
  }

  function openEditOrderItemModalEdit(item) {
    setEditingOrderItemEdit(item);
    setEditOrderItemFormEdit({
      prod_no: item.prod_no,
      qty: item.qty
    });
    setShowEditOrderItemModalEdit(true);
  }

  function updateOrderItemEdit() {
    if (!editOrderItemFormEdit.qty || editOrderItemFormEdit.qty <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    const product = products.find(p => p.prod_no === parseInt(editOrderItemFormEdit.prod_no));

    setEditTempOrderItems(prev => prev.map(item => 
      item.id === editingOrderItemEdit.id ? {
        ...item,
        prod_no: editOrderItemFormEdit.prod_no,
        brand: product?.brand || '',
        name: product?.name || '',
        size_amt: product?.size_amt || '',
        u_size: product?.u_size || '',
        stock: product?.stock || '',
        loc_name: product?.loc_name || '',
        qty: editOrderItemFormEdit.qty
      } : item
    ));

    setShowEditOrderItemModalEdit(false);
    setEditingOrderItemEdit(null);
    setEditOrderItemFormEdit({
      prod_no: '',
      qty: 1
    });
    toast.success('Order item updated');
  }

  function removeTempOrderItem(id) {
    setTempOrderItems(prev => prev.filter(item => item.id !== id));
    toast.success('Order item deleted successfully');
  }

  function removeEditTempOrderItem(id) {
    setEditTempOrderItems(prev => prev.filter(item => item.id !== id));
    toast.success('Order item deleted successfully');
  }

  async function addPurchaseOrder(e) {
    e.preventDefault();
    setSubmitted(true);

    if (!purchaseOrder.sup_no) {
      return;
    }
    if (!purchaseOrder.date) {
      return;
    }
    if (tempOrderItems.length === 0) {
      return;
    }

    const userIdFromTable = await fetchUserId();
    
    if (!userIdFromTable) {
      toast.error('User not found in database');
      return;
    }

    try {
      const { data: orderData, error: orderError } = await supabase
        .from('PURCHASE_TRANS')
        .insert([{
          date: purchaseOrder.date,
          status: purchaseOrder.status,
          sup_no: parseInt(purchaseOrder.sup_no),
          u_id: userIdFromTable
        }])
        .select();

      if (orderError) {
        console.error('Order insert error details:', orderError);
        toast.error(`Order insert failed: ${orderError.message}`);
        return;
      }

      const newOrderId = orderData[0].purtrans_no;

      const orderItemsToInsert = tempOrderItems.map(item => ({
        qty: item.qty,
        prod_no: parseInt(item.prod_no),
        purtrans_no: newOrderId
      }));

      const { error: orderItemsError } = await supabase
        .from('ORDER_ITEM')
        .insert(orderItemsToInsert);

      if (orderItemsError) {
        console.error('Order items insert error details:', orderItemsError);
        toast.error(`Order items insert failed: ${orderItemsError.message}`);
        return;
      }

      toast.success('Purchase Order added successfully');
      
      setPurchaseOrder({
        date: new Date().toISOString().split('T')[0],
        sup_no: '',
        status: 'Pending'
      });
      setTempOrderItems([]);
      setSubmitted(false);
      setShowAddModal(false);
      fetchPurchaseOrders();

    } catch (error) {
      console.error('Error adding purchase order:', error);
      toast.error('Failed to add purchase order');
    }
  }

  async function updatePurchaseOrder(e) {
    e.preventDefault();
    setSubmittedEdit(true);

    if (!editPurchaseOrder.sup_no) {
      return;
    }
    if (!editPurchaseOrder.date) {
      return;
    }
    if (editTempOrderItems.length === 0) {
      return;
    }

    try {
      // STEP 1: First, delete old order items
      const { error: deleteError } = await supabase
        .from('ORDER_ITEM')
        .delete()
        .eq('purtrans_no', editingOrder.purtrans_no);

      if (deleteError) {
        console.error('Delete order items error:', deleteError);
        toast.error(`Failed to delete existing order items: ${deleteError.message}`);
        return;
      }

      // STEP 2: Then, insert new order items
      const orderItemsToInsert = editTempOrderItems.map(item => ({
        qty: item.qty,
        prod_no: parseInt(item.prod_no),
        purtrans_no: editingOrder.purtrans_no
      }));

      const { error: orderItemsError } = await supabase
        .from('ORDER_ITEM')
        .insert(orderItemsToInsert);

      if (orderItemsError) {
        console.error('Order items insert error details:', orderItemsError);
        toast.error(`Order items insert failed: ${orderItemsError.message}`);
        return;
      }

      // STEP 3: LASTLY, update the status (this triggers the stock update)
      const { error: orderError } = await supabase
        .from('PURCHASE_TRANS')
        .update({
          date: editPurchaseOrder.date,
          status: editPurchaseOrder.status,
          sup_no: parseInt(editPurchaseOrder.sup_no)
        })
        .eq('purtrans_no', editingOrder.purtrans_no);

      if (orderError) {
        console.error('Order update error details:', orderError);
        toast.error(`Order update failed: ${orderError.message}`);
        return;
      }

      toast.success('Purchase Order updated successfully');
      
      setShowEditModal(false);
      setEditingOrder(null);
      setEditTempOrderItems([]);
      setSubmittedEdit(false);
      fetchPurchaseOrders();

    } catch (error) {
      console.error('Error updating purchase order:', error);
      toast.error('Failed to update purchase order');
    }
  }

  async function fetchUserId() {
    try {
      const { data: userData, error: userError } = await supabase
        .from('USER')
        .select('u_id')
        .eq('email', user?.email)
        .single();

      if (userError) {
        console.error('Error fetching user ID:', userError);
        return null;
      }

      return userData?.u_id;
    } catch (error) {
      console.error('Unexpected error fetching user ID:', error);
      return null;
    }
  }

  async function openEditModal(order) {
    setEditAddOrderItemErrors({ prod_no: '', qty: '' });
    const { data: orderItems, error } = await supabase
      .from('ORDER_ITEM')
      .select(`
        *,
        PRODUCT (
          prod_no,
          name,
          brand,
          size_amt,
          u_size,
          stock,
          loc_name
        )
      `)
      .eq('purtrans_no', order.purtrans_no);

    if (error) {
      toast.error('Failed to load order details for editing');
      return;
    }

    const transformedOrderItems = orderItems.map((item, index) => ({
      id: Date.now() + index,
      prod_no: item.prod_no,
      brand: item.PRODUCT?.brand || '',
      name: item.PRODUCT?.name || '',
      size_amt: item.PRODUCT?.size_amt || '',
      u_size: item.PRODUCT?.u_size || '',
      stock: item.PRODUCT?.stock || '',
      loc_name: item.PRODUCT?.loc_name || '',
      qty: item.qty
    }));

    setEditingOrder(order);
    setEditPurchaseOrder({
      date: order.date,
      sup_no: order.sup_no.toString(),
      status: order.status
    });
    setEditTempOrderItems(transformedOrderItems);
    setShowEditModal(true);
  }

  async function viewOrderDetails(purtrans_no) {
    const order = purchaseOrders.find(o => o.purtrans_no === purtrans_no);
    
    const { data: orderItems, error } = await supabase
      .from('ORDER_ITEM')
      .select(`
        *,
        PRODUCT (
          prod_no,
          name,
          brand,
          size_amt,
          u_size,
          loc_name
        )
      `)
      .eq('purtrans_no', purtrans_no);

    if (!error) {
      setViewOrder(order);
      setViewOrderItems(orderItems || []);
      setShowViewOnlyModal(true);
    } else {
      toast.error('Failed to load order details');
    }
  }

  function validateEditOrderItem() {
    const errors = {};
    
    if (!editOrderItemForm.prod_no) {
      errors.prod_no = 'Product is required.';
    }
    
    if (!editOrderItemForm.qty || editOrderItemForm.qty <= 0) {
      errors.qty = 'Quantity must be greater than 0';
    } else if (editOrderItemForm.qty < 1) {
      errors.qty = 'Quantity must be at least 1.';
    }
    
    return errors;
  }

  function validateEditOrderItemEdit() {
    const errors = {};
    
    if (!editOrderItemFormEdit.prod_no) {
      errors.prod_no = 'Product is required.';
    }
    
    if (!editOrderItemFormEdit.qty || editOrderItemFormEdit.qty <= 0) {
      errors.qty = 'Quantity must be greater than 0';
    } else if (editOrderItemFormEdit.qty < 1) {
      errors.qty = 'Quantity must be at least 1.';
    }
    
    return errors;
  }

  function confirmDeleteOrderItem() {
    if (!selectedDeleteItem) return;
    
    if (deleteModalContext === 'add') {
      // Remove from tempOrderItems (add modal)
      setTempOrderItems(prev => prev.filter(item => item.id !== selectedDeleteItem.id));
    } else if (deleteModalContext === 'edit') {
      // Remove from editTempOrderItems (edit modal)
      setEditTempOrderItems(prev => prev.filter(item => item.id !== selectedDeleteItem.id));
    }
    
    // Close modal and clear selection
    setShowDeleteItemModal(false);
    setSelectedDeleteItem(null);
    setDeleteModalContext('add');
    toast.success('Order item deleted successfully');
  }

  const filteredOrders = purchaseOrders.filter((order) => {
    const matchesDate = search === '' || order.date?.includes(search);
    const matchesStatus = statusFilter === '' || order.status === statusFilter;
    const matchesSupplier = supplierFilter === '' || order.sup_no?.toString() === supplierFilter;
    return matchesDate && matchesStatus && matchesSupplier;
  });

  return (
    <div className="purchaseorder-page">
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

      <div className="purchaseorder-header-row">
        {(role === 'admin' || role === 'employee') && (
          <h1>Purchase Orders</h1>
        )}

        {(role === 'admin' || role === 'employee') && (
          <button
            className="add-purchaseorder-btn"
            onClick={() => setShowAddModal(true)}
          >
            <FiPlus className="icon" />
            Add Purchase Order
          </button>
        )}
      </div>

      {/* SEARCH */}
      {(role === 'admin' || role === 'employee') && (
        <div className="purchaseorder-top-wrapper">
          <div className="purchaseorder-search-card">
            <div className="purchaseorder-search-container">
              <FiSearch className="search-icon" />
              <input
                type="date"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-bar"
              />
              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="supplier-filter-select"
              >
                <option value="">All Suppliers</option>
                {suppliers.map(supplier => (
                  <option key={supplier.sup_no} value={supplier.sup_no}>
                    {supplier.com_name}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="status-filter-select"
              >
                <option value="">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {(role === 'admin' || role === 'employee') && (
        <div className="purchaseorder-table-container">
          <table className="purchaseorder-styled-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
                <th>Company Name</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.purtrans_no}>
                  <td style={{ textAlign: 'left' }}>{new Date(order.date).toLocaleDateString()}</td>
                  <td style={{ textAlign: 'left' }}>{order.status}</td>
                  <td style={{ textAlign: 'left' }}>{order.SUPPLIER?.com_name}</td>
                  <td style={{ textAlign: 'left' }}>
                    <button
                      className="view-btn"
                      onClick={() => viewOrderDetails(order.purtrans_no)}
                    >
                      <FiEye color="#185229" size={18} />
                    </button>
                    {order.status !== 'Completed' && (
                      <button
                        className="edit-btn"
                        onClick={() => openEditModal(order)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        <FiEdit color="#185229" size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ADD PURCHASE ORDER MODAL */}
      {showAddModal && (
        <div className="purchaseorder-modal-overlay">
          <div className="purchaseorder-modal purchaseorder-modal-large">
            <h2>Add Purchase Order</h2>

            <form onSubmit={addPurchaseOrder}>
              <div className="purchaseorder-form-section">
                <h3>Purchase Order Information</h3>
                <div className="purchaseorder-form-row">
                  <div className="purchaseorder-form-group">
                    <label>
                      Date <span className="po-required">*</span>
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={purchaseOrder.date}
                      onChange={handlePurchaseOrderChange}
                      className={submitted && !purchaseOrder.date ? "input-error" : ""}
                    />
                    {submitted && !purchaseOrder.date && (
                      <span className="error-text">Date is required.</span>
                    )}
                  </div>

                  <div className="purchaseorder-form-group">
                    <label>
                      Supplier <span className="po-required">*</span>
                    </label>
                    <select
                      name="sup_no"
                      value={purchaseOrder.sup_no}
                      onChange={handlePurchaseOrderChange}
                      className={submitted && !purchaseOrder.sup_no ? "input-error" : ""}
                    >
                      <option value="">Select Supplier</option>
                      {suppliers.map(supplier => (
                        <option key={supplier.sup_no} value={supplier.sup_no}>
                          {supplier.com_name}
                        </option>
                      ))}
                    </select>
                    {submitted && !purchaseOrder.sup_no && (
                      <span className="error-text">Supplier is required.</span>
                    )}
                  </div>

                  <div className="purchaseorder-form-group">
                    <label>
                      Status <span className="po-required">*</span>
                    </label>
                    <select
                      name="status"
                      value={purchaseOrder.status}
                      onChange={handlePurchaseOrderChange}
                      disabled
                    >
                      <option value="Pending">Pending</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="purchaseorder-form-section">
                <h3>Add Order Item</h3>
                <div className="purchaseorder-form-row">
                  <div className="purchaseorder-form-group">
                    <label>Product <span className="po-required">*</span></label>
                    <select
                      name="prod_no"
                      value={orderItem.prod_no}
                      onChange={handleOrderItemChange}
                      className={submitted && !orderItem.prod_no ? "input-error" : ""}
                      style={{ fontSize: '12px' }}
                      disabled={!purchaseOrder.sup_no}
                    >
                      <option value="">
                        {!purchaseOrder.sup_no ? 'Please select a supplier first.' : 'Select Product'}
                      </option>
                      {getAvailableProducts(
                        purchaseOrder.sup_no, 
                        tempOrderItems.map(item => parseInt(item.prod_no))
                      ).map(product => (
                        <option key={product.prod_no} value={product.prod_no} style={{ fontSize: '11px' }}>
                          {product.brand} {product.name} {product.size_amt} {product.u_size} 
                          | Stock: {product.stock !== null && product.stock !== undefined ? product.stock : '0'}
                          | Loc: {product.loc_name || 'Not Assigned'}
                        </option>
                      ))}
                    </select>
                    {addOrderItemErrors.prod_no && (
                      <span className="error-text">{addOrderItemErrors.prod_no}</span>
                    )}
                  </div>

                  <div className="purchaseorder-form-group">
                    <label>Quantity <span className="po-required">*</span></label>
                    <input
                      type="number"
                      name="qty"
                      value={orderItem.qty}
                      onChange={(e) => {
                        const newValue = parseInt(e.target.value) || 0;
                        if (newValue <= 0) {
                          setOrderItem(prev => ({ ...prev, qty: 1 }));
                          setAddOrderItemErrors(prev => ({ ...prev, qty: '' }));
                        } else {
                          setOrderItem(prev => ({ ...prev, qty: newValue }));
                          setAddOrderItemErrors(prev => ({ ...prev, qty: '' }));
                        }
                      }}
                      min="1"
                      className={addOrderItemErrors.qty ? "input-error" : ""}
                    />
                    {addOrderItemErrors.qty && (
                      <span className="error-text">{addOrderItemErrors.qty}</span>
                    )}
                  </div>

                  <div className="purchaseorder-form-group">
                    <button
                      type="button"
                      className="add-item-btn"
                      onClick={() => {
                        let hasError = false;
                        const errors = { prod_no: '', qty: '' };
                        
                        if (!orderItem.prod_no) {
                          errors.prod_no = 'Product is required.';
                          hasError = true;
                        }
                        
                        if (hasError) {
                          setAddOrderItemErrors(errors);
                        } else {
                          addOrderItemToTemp();
                          setAddOrderItemErrors({ prod_no: '', qty: '' });
                        }
                      }}
                    >
                      Add Item
                    </button>
                  </div>
                </div>
              </div>

              <div className="orderitems-header">
                <h3>Order Items</h3>
                <div className="orderitems-search">
                  <FiSearch className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search order items..."
                    value={orderItemSearch}
                    onChange={(e) => setOrderItemSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="purchaseorder-table-wrapper">
                <table className="purchaseorder-orderitems-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tempOrderItems
                      .filter(item => {
                        const fullProductName = `${item.brand} ${item.name} ${item.size_amt} ${item.u_size}`;
                        return fullProductName.toLowerCase().includes(orderItemSearch.toLowerCase());
                      })
                      .map((item) => (
                        <tr key={item.id}>
                          <td style={{ textAlign: 'left' }}>{item.brand} {item.name} {item.size_amt} {item.u_size} {item.loc_name && `(${item.loc_name})`}</td>
                          <td style={{ textAlign: 'left' }}>{item.qty}</td>
                          <td style={{ display: 'flex', gap: '5px', justifyContent: 'center', textAlign: 'left' }}>
                            <button
                              type="button"
                              className="edit-item-btn"
                              onClick={() => openEditOrderItemModal(item)}
                            >
                              <FiEdit color="#185229" size={16} />
                            </button>
                            <button
                              type="button"
                              className="remove-item-btn"
                              onClick={() => {
                                setSelectedDeleteItem(item);
                                setDeleteModalContext('add');
                                setShowDeleteItemModal(true);
                              }}
                            >
                              <FiTrash2 color="rgb(219, 32, 32)" size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>

                {submitted && tempOrderItems.length === 0 && (
                  <span className="error-text" style={{ display: 'block', marginTop: '10px' }}>
                    At least one order item is required.
                  </span>
                )}
              </div>

              <div className="purchaseorder-modal-actions">
                <button type="submit" className="submit-btn">
                  Add Purchase Order
                </button>
                <button
                  type="button"
                  className="print-btn"
                  onClick={() => handlePrint('add')}
                >
                  Print
                </button>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setShowAddModal(false);
                    setSubmitted(false);
                    setTempOrderItems([]);
                    setPurchaseOrder({
                      date: new Date().toISOString().split('T')[0],
                      sup_no: '',
                      status: 'Pending'
                    });
                    setOrderItem({
                      prod_no: '',
                      qty: 1
                    });
                    setAddOrderItemErrors({ prod_no: '', qty: '' });
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PURCHASE ORDER MODAL */}
      {showEditModal && editingOrder && (
        <div className="purchaseorder-modal-overlay">
          <div className="purchaseorder-modal purchaseorder-modal-large">
            <h2>Edit Purchase Order</h2>

            <form onSubmit={updatePurchaseOrder}>
              <div className="purchaseorder-form-section">
                <h3>Purchase Order Information</h3>
                <div className="purchaseorder-form-row">
                  <div className="purchaseorder-form-group">
                    <label>
                      Date <span className="po-required">*</span>
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={editPurchaseOrder.date}
                      onChange={handleEditPurchaseOrderChange}
                      className={submittedEdit && !editPurchaseOrder.date ? "input-error" : ""}
                    />
                    {submittedEdit && !editPurchaseOrder.date && (
                      <span className="error-text">Date is required.</span>
                    )}
                  </div>

                  <div className="purchaseorder-form-group">
                    <label>
                      Supplier <span className="po-required">*</span>
                    </label>
                    <select
                      name="sup_no"
                      value={editPurchaseOrder.sup_no}
                      onChange={handleEditPurchaseOrderChange}
                      className={submittedEdit && !editPurchaseOrder.sup_no ? "input-error" : ""}
                      disabled
                    >
                      <option value="">Select Supplier</option>
                      {suppliers.map(supplier => (
                        <option key={supplier.sup_no} value={supplier.sup_no}>
                          {supplier.com_name}
                        </option>
                      ))}
                    </select>
                    {submittedEdit && !editPurchaseOrder.sup_no && (
                      <span className="error-text">Supplier is required.</span>
                    )}
                  </div>

                  <div className="purchaseorder-form-group">
                    <label>
                      Status <span className="po-required">*</span>
                    </label>
                    <select
                      name="status"
                      value={editPurchaseOrder.status}
                      onChange={handleEditPurchaseOrderChange}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="purchaseorder-form-section">
                <h3>Add Order Item</h3>
                <div className="purchaseorder-form-row">
                  <div className="purchaseorder-form-group">
                    <label>Product <span className="po-required">*</span></label>
                    <select
                      name="prod_no"
                      value={editOrderItem.prod_no}
                      onChange={(e) => {
                        setEditOrderItem(prev => ({ ...prev, prod_no: e.target.value }));
                        setEditAddOrderItemErrors(prev => ({ ...prev, prod_no: '' }));
                      }}
                      className={editAddOrderItemErrors.prod_no ? "input-error" : ""}
                      style={{ fontSize: '12px' }}
                      disabled={!editPurchaseOrder.sup_no}
                    >
                      <option value="">
                        {!editPurchaseOrder.sup_no ? 'Please select a supplier first.' : 'Select Product'}
                      </option>
                      {getAvailableProducts(
                        editPurchaseOrder.sup_no, 
                        editTempOrderItems.map(item => parseInt(item.prod_no))
                      ).map(product => (
                        <option key={product.prod_no} value={product.prod_no} style={{ fontSize: '11px' }}>
                          {product.brand} {product.name} {product.size_amt} {product.u_size} 
                          | Stock: {product.stock !== null && product.stock !== undefined ? product.stock : '0'}
                          | Loc: {product.loc_name || 'Not Assigned'}
                        </option>
                      ))}
                    </select>
                    {editAddOrderItemErrors.prod_no && (
                      <span className="error-text">{editAddOrderItemErrors.prod_no}</span>
                    )}
                  </div>

                  <div className="purchaseorder-form-group">
                    <label>Quantity <span className="po-required">*</span></label>
                    <input
                      type="number"
                      name="qty"
                      value={editOrderItem.qty}
                      onChange={(e) => {
                        const newValue = parseInt(e.target.value) || 0;
                        if (newValue <= 0) {
                          setEditOrderItem(prev => ({ ...prev, qty: 1 }));
                          setEditAddOrderItemErrors(prev => ({ ...prev, qty: '' }));
                        } else {
                          setEditOrderItem(prev => ({ ...prev, qty: newValue }));
                          setEditAddOrderItemErrors(prev => ({ ...prev, qty: '' }));
                        }
                      }}
                      min="1"
                      className={editAddOrderItemErrors.qty ? "input-error" : ""}
                    />
                    {editAddOrderItemErrors.qty && (
                      <span className="error-text">{editAddOrderItemErrors.qty}</span>
                    )}
                  </div>

                  <div className="purchaseorder-form-group">
                    <button
                      type="button"
                      className="add-item-btn"
                      onClick={() => {
                        let hasError = false;
                        const errors = { prod_no: '', qty: '' };
                        
                        if (!editOrderItem.prod_no) {  
                          errors.prod_no = 'Product is required.';
                          hasError = true;
                        }
                        
                        if (hasError) {
                          setEditAddOrderItemErrors(errors);  
                        } else {
                          addEditOrderItemToTemp();  
                          setEditAddOrderItemErrors({ prod_no: '', qty: '' });  
                        }
                      }}
                    >
                      Add Item
                    </button>
                  </div>
                </div>
              </div>

              <div className="orderitems-header">
                <h3>Order Items</h3>
                <div className="orderitems-search">
                  <FiSearch className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search order items..."
                    value={orderItemSearchEdit}
                    onChange={(e) => setOrderItemSearchEdit(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="purchaseorder-table-wrapper">
                <table className="purchaseorder-orderitems-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editTempOrderItems
                      .filter(item => {
                        const fullProductName = `${item.brand} ${item.name} ${item.size_amt} ${item.u_size}`;
                        return fullProductName.toLowerCase().includes(orderItemSearchEdit.toLowerCase());
                      })
                      .map((item) => (
                        <tr key={item.id}>
                          <td style={{ textAlign: 'left' }}>{item.brand} {item.name} {item.size_amt} {item.u_size} {item.loc_name && `(${item.loc_name})`}</td>
                          <td style={{ textAlign: 'left' }}>{item.qty}</td>
                          <td style={{ display: 'flex', gap: '5px', justifyContent: 'center', textAlign: 'left' }}>
                            <button
                              type="button"
                              className="edit-item-btn"
                              onClick={() => openEditOrderItemModalEdit(item)}
                            >
                              <FiEdit color="#185229" size={16} />
                            </button>
                            <button
                              type="button"
                              className="remove-item-btn"
                              onClick={() => {
                                setSelectedDeleteItem(item);
                                setDeleteModalContext('edit');
                                setShowDeleteItemModal(true);
                              }}
                            >
                              <FiTrash2 color="rgb(219, 32, 32)" size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>

                {submittedEdit && editTempOrderItems.length === 0 && (
                  <span className="error-text" style={{ display: 'block', marginTop: '10px' }}>
                    At least one order item is required.
                  </span>
                )}
              </div> 

              <div className="purchaseorder-modal-actions">
                <button type="submit" className="submit-btn">
                  Save Changes
                </button>
                <button
                  type="button"
                  className="print-btn"
                  onClick={() => handlePrint('edit')}
                >
                  Print
                </button>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingOrder(null);
                    setEditTempOrderItems([]);
                    setSubmittedEdit(false);
                    setEditOrderItem({
                      prod_no: '',
                      qty: 1
                    });
                    setEditAddOrderItemErrors({ prod_no: '', qty: '' });
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ORDER ITEM MODAL FOR ADD PURCHASE ORDER */}
      {showEditOrderItemModal && editingOrderItem && (
        <div className="edit-orderitem-modal-overlay">
          <div className="edit-orderitem-modal">
            <h2>Edit Order Item</h2>
            
            <form onSubmit={(e) => { 
              e.preventDefault(); 
              const errors = validateEditOrderItem();
              if (Object.keys(errors).length === 0) {
                updateOrderItem();
              } else {
                setEditOrderItemErrors(errors);
              }
            }}>
              <div className="form-group">
                <label>
                  Product <span className="po-required">*</span>
                </label>
                <select
                  name="prod_no"
                  value={editOrderItemForm.prod_no}
                  onChange={(e) => {
                    handleEditOrderItemChange(e);
                    setEditOrderItemErrors(prev => ({ ...prev, prod_no: '' }));
                  }}
                  onBlur={() => {
                    if (!editOrderItemForm.prod_no) {
                      setEditOrderItemErrors(prev => ({ ...prev, prod_no: 'Product is required.' }));
                    }
                  }}
                  className={editOrderItemErrors.prod_no ? "input-error" : ""}
                  style={{ minWidth: '100%', fontSize: '12px' }}
                  disabled={!purchaseOrder.sup_no}
                >
                  <option value="">
                    {!purchaseOrder.sup_no ? 'Please select a supplier first.' : 'Select Product'}
                  </option>
                  {getAvailableProducts(
                    purchaseOrder.sup_no,
                    tempOrderItems.map(item => parseInt(item.prod_no)),
                    editOrderItemForm.prod_no ? parseInt(editOrderItemForm.prod_no) : null
                  ).map(product => (
                    <option key={product.prod_no} value={product.prod_no} style={{ fontSize: '11px' }}>
                      {product.brand} {product.name} {product.size_amt} {product.u_size} 
                      | Stock: {product.stock !== null && product.stock !== undefined ? product.stock : '0'}
                      | Loc: {product.loc_name || 'Not Assigned'}
                    </option>
                  ))}
                </select>
                {editOrderItemErrors.prod_no && (
                  <span className="error-text">{editOrderItemErrors.prod_no}</span>
                )}
              </div>

              <div className="form-group">
                <label>
                  Quantity <span className="po-required">*</span>
                </label>
                <input
                  type="number"
                  name="qty"
                  value={editOrderItemForm.qty}
                  onChange={(e) => {
                    handleEditOrderItemChange(e);
                    setEditOrderItemErrors(prev => ({ ...prev, qty: '' }));
                  }}
                  onBlur={() => {
                    const qty = editOrderItemForm.qty;
                    if (!qty || qty <= 0) {
                      setEditOrderItemErrors(prev => ({ ...prev, qty: 'Quantity must be greater than 0.' }));
                    }
                  }}
                  className={editOrderItemErrors.qty ? "input-error" : ""}
                />
                {editOrderItemErrors.qty && (
                  <span className="error-text">{editOrderItemErrors.qty}</span>
                )}
              </div>

              <div className="modal-actions">
                <button type="submit" className="save-btn">
                  Save Changes
                </button>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setShowEditOrderItemModal(false);
                    setEditingOrderItem(null);
                    setEditOrderItemForm({
                      prod_no: '',
                      qty: 1
                    });
                    setEditOrderItemErrors({});
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ORDER ITEM MODAL FOR EDIT PURCHASE ORDER */}
      {showEditOrderItemModalEdit && editingOrderItemEdit && (
        <div className="edit-orderitem-modal-overlay">
          <div className="edit-orderitem-modal">
            <h2>Edit Order Item</h2>
            
            <form onSubmit={(e) => { 
              e.preventDefault(); 
              const errors = validateEditOrderItemEdit();
              if (Object.keys(errors).length === 0) {
                updateOrderItemEdit();
              } else {
                setEditOrderItemErrorsEdit(errors);
              }
            }}>
              <div className="form-group">
                <label>
                  Product <span className="po-required">*</span>
                </label>
                <select
                  name="prod_no"
                  value={editOrderItemFormEdit.prod_no}
                  onChange={(e) => {
                    handleEditOrderItemChangeEdit(e);
                    setEditOrderItemErrorsEdit(prev => ({ ...prev, prod_no: '' }));
                  }}
                  onBlur={() => {
                    if (!editOrderItemFormEdit.prod_no) {
                      setEditOrderItemErrorsEdit(prev => ({ ...prev, prod_no: 'Product is required.' }));
                    }
                  }}
                  className={editOrderItemErrorsEdit.prod_no ? "input-error" : ""}
                  style={{ minWidth: '100%', fontSize: '12px' }}
                  disabled={!editPurchaseOrder.sup_no}
                >
                  <option value="">
                    {!editPurchaseOrder.sup_no ? 'Please select a supplier first.' : 'Select Product'}
                  </option>
                  {getAvailableProducts(
                    editPurchaseOrder.sup_no,
                    editTempOrderItems.map(item => parseInt(item.prod_no)),
                    editOrderItemFormEdit.prod_no ? parseInt(editOrderItemFormEdit.prod_no) : null
                  ).map(product => (
                    <option key={product.prod_no} value={product.prod_no} style={{ fontSize: '11px' }}>
                      {product.brand} {product.name} {product.size_amt} {product.u_size} 
                      | Stock: {product.stock !== null && product.stock !== undefined ? product.stock : '0'}
                      | Loc: {product.loc_name || 'Not Assigned'}
                    </option>
                  ))}
                </select>
                {editOrderItemErrorsEdit.prod_no && (
                  <span className="error-text">{editOrderItemErrorsEdit.prod_no}</span>
                )}
              </div>

              <div className="form-group">
                <label>
                  Quantity <span className="po-required">*</span>
                </label>
                <input
                  type="number"
                  name="qty"
                  value={editOrderItemFormEdit.qty}
                  onChange={(e) => {
                    handleEditOrderItemChangeEdit(e);
                    setEditOrderItemErrorsEdit(prev => ({ ...prev, qty: '' }));
                  }}
                  onBlur={() => {
                    const qty = editOrderItemFormEdit.qty;
                    if (!qty || qty <= 0) {
                      setEditOrderItemErrorsEdit(prev => ({ ...prev, qty: 'Quantity must be greater than 0.' }));
                    }
                  }}
                  className={editOrderItemErrorsEdit.qty ? "input-error" : ""}
                />
                {editOrderItemErrorsEdit.qty && (
                  <span className="error-text">{editOrderItemErrorsEdit.qty}</span>
                )}
              </div>

              <div className="modal-actions">
                <button type="submit" className="save-btn">
                  Save Changes
                </button>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setShowEditOrderItemModalEdit(false);
                    setEditingOrderItemEdit(null);
                    setEditOrderItemFormEdit({
                      prod_no: '',
                      qty: 1
                    });
                    setEditOrderItemErrorsEdit({});
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW ONLY PURCHASE ORDER MODAL */}
      {showViewOnlyModal && viewOrder && (
        <div className="purchaseorder-modal-overlay">
          <div className="purchaseorder-modal purchaseorder-modal-large">
            <h2>Purchase Order</h2>

            <div className="purchaseorder-form-section">
              <h3>Purchase Order Information</h3>
              <div className="purchaseorder-form-row">
                <div className="purchaseorder-form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    value={viewOrder.date ? new Date(viewOrder.date).toISOString().split('T')[0] : ''}
                    disabled
                    style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                  />
                </div>

                <div className="purchaseorder-form-group">
                  <label>Supplier</label>
                  <div className="view-only-display">
                    {suppliers.find(s => s.sup_no === parseInt(viewOrder.sup_no))?.com_name || 'Not selected'}
                  </div>
                </div>

                <div className="purchaseorder-form-group">
                  <label>Status</label>
                  <div className="view-only-display">
                    {viewOrder.status || 'Pending'}
                  </div>
                </div>
              </div>
            </div>

            <div className="orderitems-header">
              <h3>Order Items</h3>
              <div className="orderitems-search">
                <FiSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search order items..."
                  value={viewOrderItemSearch}
                  onChange={(e) => setViewOrderItemSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="purchaseorder-table-wrapper">
              <table className="purchaseorder-orderitems-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {viewOrderItems
                    .filter(item => {
                      const fullProductName = `${item.PRODUCT?.brand || ''} ${item.PRODUCT?.name || ''} ${item.PRODUCT?.size_amt || ''} ${item.PRODUCT?.u_size || ''}`;
                      return fullProductName.toLowerCase().includes(viewOrderItemSearch.toLowerCase());
                    })
                    .map((item, index) => (
                      <tr key={index}>
                        <td style={{ textAlign: 'left' }}>{item.PRODUCT?.brand || ''} {item.PRODUCT?.name || ''} {item.PRODUCT?.size_amt || ''} {item.PRODUCT?.u_size || ''} {item.PRODUCT?.loc_name && `(${item.PRODUCT.loc_name})`}</td>
                        <td style={{ textAlign: 'left' }}>{item.qty}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="purchaseorder-modal-actions">
              <button
                type="button"
                className="print-btn"
                onClick={() => handlePrint('view')}
              >
                Print
              </button>
              <button
                type="button"
                className="cancel-btn"
                onClick={() => {
                  setShowViewOnlyModal(false);
                  setViewOrder(null);
                  setViewOrderItems([]);
                  setViewOrderItemSearch('');
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE ORDER ITEM MODAL - SHARED FOR BOTH ADD AND EDIT */}
      {showDeleteItemModal && selectedDeleteItem && (
        <div className="purchaseorder-delete-modal-overlay">
          <div className="purchaseorder-delete-modal-content">
            <p>
              Are you sure you want to delete{' '}
              <strong>
                {selectedDeleteItem?.brand} {selectedDeleteItem?.name} {selectedDeleteItem?.size_amt} {selectedDeleteItem?.u_size}
                {selectedDeleteItem?.loc_name && ` (${selectedDeleteItem.loc_name})`}
              </strong>
              ?
            </p>
            <div className="purchaseorder-delete-modal-actions">
              <button
                className="purchaseorder-confirm-delete-btn"
                onClick={confirmDeleteOrderItem}
              >
                Delete
              </button>
              <button
                className="purchaseorder-cancel-delete-btn"
                onClick={() => {
                  setShowDeleteItemModal(false);
                  setSelectedDeleteItem(null);
                  setDeleteModalContext('add');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Template */}
      <div className="print-template" style={{ display: 'none' }}>
        <div className="print-content">
          <div className="print-header">
            <h1 className="name">New Trader's Lucky Mart</h1>
            <h2 className="street">Pinili Street, Dumaguete City</h2>
            <h2 className="contact_no">Contact No: 422-3192</h2>
            <h2 className="title">Purchase Order</h2>
            <hr />
            <p><strong>Date:</strong> {printData.date ? new Date(printData.date).toLocaleDateString() : 'N/A'}</p>
            <p><strong>Supplier:</strong> {printData.supplier}</p>
          </div>

          <div className="print-items">
            <h3 style={{marginTop: '40px'}}>Order Items</h3>
            <table className="print-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                </tr>
              </thead>
              <tbody>
                {printData.items && printData.items.length > 0 ? (
                  printData.items.map((item, index) => (
                    <tr key={index}>
                      <td style={{ textAlign: 'left' }}>
                        {item?.brand || ''} {item?.name || ''} {item?.size_amt || ''} {item?.u_size || ''}
                        {item?.loc_name && ` (${item.loc_name})`}
                      </td>
                      <td style={{ textAlign: 'left' }}>{item?.qty || 0}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="2" style={{ textAlign: 'center' }}>No items added</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="print-footer" style={{marginTop: '40px'}}>
            <p>Thank you!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrders;