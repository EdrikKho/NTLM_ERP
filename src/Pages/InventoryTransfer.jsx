// InventoryTransfer.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../client';
import Sidebar from './Sidebar';
import './InventoryTransfer.css';
import { FiSearch, FiPlus, FiTrash2, FiEdit, FiEye } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { toast, ToastContainer } from 'react-toastify';

const InventoryTransfer = () => {
  const { user } = useAuth();
  const role = user?.user_metadata?.role || '';
  const userId = user?.id;

  const [transfers, setTransfers] = useState([]);
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [transferItemSearch, setTransferItemSearch] = useState('');
  const [transferItemSearchEdit, setTransferItemSearchEdit] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState(null);
  const [editTransfer, setEditTransfer] = useState({
    date: '',
    status: 'Pending',
    canEditStatus: false
  });
  const [editTempTransferItems, setEditTempTransferItems] = useState([]);
  const [editTransferItem, setEditTransferItem] = useState({
    from_prod: '',
    to_prod: '',
    qty: 1
  });
  const [submittedEdit, setSubmittedEdit] = useState(false);

  const [showEditTransferItemModal, setShowEditTransferItemModal] = useState(false);
  const [editingTransferItem, setEditingTransferItem] = useState(null);
  const [editTransferItemForm, setEditTransferItemForm] = useState({
    from_prod: '',
    to_prod: '',
    qty: 1
  });

  const [showEditTransferItemModalEdit, setShowEditTransferItemModalEdit] = useState(false);
  const [editingTransferItemEdit, setEditingTransferItemEdit] = useState(null);
  const [editTransferItemFormEdit, setEditTransferItemFormEdit] = useState({
    from_prod: '',
    to_prod: '',
    qty: 1
  });

  const [tempTransferItems, setTempTransferItems] = useState([]);

  const [transfer, setTransfer] = useState({
    date: new Date().toISOString().split('T')[0],
    status: 'Pending'
  });

  const [transferItem, setTransferItem] = useState({
    from_prod: '',
    to_prod: '',
    qty: 1
  });

  const [submitted, setSubmitted] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewOnlyModal, setShowViewOnlyModal] = useState(false);
  const [viewTransfer, setViewTransfer] = useState(null);
  const [viewTransferItems, setViewTransferItems] = useState([]);
  const [viewTransferItemSearch, setViewTransferItemSearch] = useState('');

  const [editTransferItemErrors, setEditTransferItemErrors] = useState({});
  const [editTransferItemErrorsEdit, setEditTransferItemErrorsEdit] = useState({});

  // Checks Quantity (For Error Trap)
  const [addTransferStockError, setAddTransferStockError] = useState('');
  const [editAddTransferStockError, setEditAddTransferStockError] = useState('');
  const [editTransferItemStockError, setEditTransferItemStockError] = useState('');
  const [editTransferItemStockErrorEdit, setEditTransferItemStockErrorEdit] = useState('');

  const [showDeleteItemModal, setShowDeleteItemModal] = useState(false);
  const [selectedDeleteItem, setSelectedDeleteItem] = useState(null);
  const [deleteModalContext, setDeleteModalContext] = useState('add'); 

  const [addTransferItemErrors, setAddTransferItemErrors] = useState({
    from_prod: '',
    to_prod: '',
    qty: ''
  });

  const [editAddTransferItemErrors, setEditAddTransferItemErrors] = useState({
    from_prod: '',
    to_prod: '',
    qty: ''
  });

  // Print data state
  const [printData, setPrintData] = useState({
    date: '',
    items: []
  });

  // Function to check if quantity exceeds available stock
  const checkStockAvailability = (productId, qty) => {
    const product = products.find(p => Number(p.prod_no) === Number(productId));
    if (!product) return { available: false, stock: 0 };
    
    const stock = product.stock || 0;
    const available = qty <= stock;
    return { available, stock };
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  async function fetchAllData() {
    setLoading(true);
    await fetchTransfers();
    await fetchProducts();
    await fetchUsers();
    setLoading(false);
  }

  async function fetchTransfers() {
    try {
      const { data, error } = await supabase
        .from('TRANSFER_TRANS')
        .select(`
          *,
          requester:USER!requester_id (u_id, f_name, l_name),
          dispatcher:USER!dispatcher_id (u_id, f_name, l_name),
          receiver:USER!receiver_id (u_id, f_name, l_name)
        `)
        .order('transfertrans_no', { ascending: false });

      if (error) {
        console.error('Error fetching transfers:', error);
        toast.error(`Failed to fetch transfers: ${error.message}`);
        return;
      }

      setTransfers(data || []);
    } catch (error) {
      console.error('Unexpected error fetching transfers:', error);
      toast.error('Failed to fetch transfers');
    }
  }

  async function fetchProducts() {
    try {
      const { data, error } = await supabase
        .from('PRODUCT')
        .select('prod_no, name, brand, size_amt, u_size, stock, loc_name')
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

  async function fetchUsers() {
    try {
      const { data, error } = await supabase
        .from('USER')
        .select('u_id, f_name, l_name')
        .order('f_name');

      if (error) {
        console.error('Error fetching users:', error);
        toast.error(`Failed to fetch users: ${error.message}`);
        return;
      }

      setUsers(data || []);
    } catch (error) {
      console.error('Unexpected error fetching users:', error);
      toast.error('Failed to fetch users');
    }
  }

  // Function to get warehouse products (loc_name = 'Warehouse')
  const getWarehouseProducts = (addedProductIds, selectedProductId = null) => {
    return products.filter(product => {
      const matchesLocation = product.loc_name?.toLowerCase() === 'warehouse';
      if (selectedProductId && Number(product.prod_no) === Number(selectedProductId)) {
        return matchesLocation;
      }
      const notAdded = !addedProductIds.includes(Number(product.prod_no));
      return matchesLocation && notAdded;
    });
  };

  // Function to get store products based on selected from_prod
  const getStoreProducts = (fromProdNo, addedProductIds, selectedProductId = null) => {
    if (!fromProdNo) return [];
    
    const fromProduct = products.find(p => Number(p.prod_no) === Number(fromProdNo));
    if (!fromProduct) return [];

    return products.filter(product => {
      const matchesLocation = product.loc_name?.toLowerCase() === 'store';
      const matchesDetails = product.brand === fromProduct.brand && 
                           product.name === fromProduct.name && 
                           product.size_amt === fromProduct.size_amt &&
                           product.u_size === fromProduct.u_size;
      if (selectedProductId && Number(product.prod_no) === Number(selectedProductId)) {
        return matchesLocation && matchesDetails;
      }
      const notAdded = !addedProductIds.includes(Number(product.prod_no));
      return matchesLocation && matchesDetails && notAdded;
    });
  };

  function handleTransferChange(e) {
    const { name, value } = e.target;
    setTransfer(prev => ({
      ...prev,
      [name]: value
    }));
  }

  function handleEditTransferChange(e) {
    const { name, value } = e.target;
    setEditTransfer(prev => ({
      ...prev,
      [name]: value
    }));
  }

  function handleTransferItemChange(e) {
    const { name, value } = e.target;
    setTransferItem(prev => ({
      ...prev,
      [name]: value
    }));
  }

  function handleEditTransferItemChange(e) {
    const { name, value } = e.target;
    setEditTransferItemForm(prev => ({
      ...prev,
      [name]: value
    }));
  }

  function handleEditTransferItemChangeEdit(e) {
    const { name, value } = e.target;
    setEditTransferItemFormEdit(prev => ({
      ...prev,
      [name]: value
    }));
  }

  // HANDLE PRINT FUNCTION
  const handlePrint = (type) => {
    if (type === 'add') {
      setPrintData({
        date: transfer.date,
        items: tempTransferItems
      });
    } else if (type === 'edit') {
      setPrintData({
        date: editTransfer.date,
        items: editTempTransferItems
      });
    } else if (type === 'view') {
      const transformedItems = viewTransferItems.map(item => ({
        brand: item.TO_PRODUCT?.brand || '',
        name: item.TO_PRODUCT?.name || '',
        size_amt: item.TO_PRODUCT?.size_amt || '',
        u_size: item.TO_PRODUCT?.u_size || '',
        qty: item.qty
      }));
      setPrintData({
        date: viewTransfer.date,
        items: transformedItems
      });
    }
    
    setTimeout(() => {
      window.print();
    }, 100);
  };

  function addTransferItemToTemp() {
    setAddTransferStockError('');
    
    if (!transferItem.from_prod) {
      return;
    }
    if (!transferItem.to_prod) {
      return;
    }
    if (!transferItem.qty || transferItem.qty <= 0) {
      return;
    }

    // Check stock availability
    const stockCheck = checkStockAvailability(transferItem.from_prod, transferItem.qty);
    if (!stockCheck.available) {
      setAddTransferStockError(`Insufficient stock! Available: ${stockCheck.stock}`);
      return;
    }

    const fromProduct = products.find(p => p.prod_no === parseInt(transferItem.from_prod));
    const toProduct = products.find(p => p.prod_no === parseInt(transferItem.to_prod));

    setTempTransferItems(prev => [
      ...prev,
      {
        id: Date.now(),
        from_prod: transferItem.from_prod,
        to_prod: transferItem.to_prod,
        brand: toProduct?.brand || '',
        name: toProduct?.name || '',
        size_amt: toProduct?.size_amt || '',
        u_size: toProduct?.u_size || '',
        qty: transferItem.qty
      }
    ]);

    toast.success('Transfer item added successfully');

    setTransferItem({
      from_prod: '',
      to_prod: '',
      qty: 1
    });
  }

  function addEditTransferItemToTemp() {
    setEditAddTransferStockError('');
    
    if (!editTransferItem.from_prod) {
      return;
    }
    if (!editTransferItem.to_prod) {
      return;
    }
    if (!editTransferItem.qty || editTransferItem.qty <= 0) {
      return;
    }

    // Check stock availability
    const stockCheck = checkStockAvailability(editTransferItem.from_prod, editTransferItem.qty);
    if (!stockCheck.available) {
      setEditAddTransferStockError(`Insufficient stock! Available: ${stockCheck.stock}`);
      return;
    }

    const toProduct = products.find(p => p.prod_no === parseInt(editTransferItem.to_prod));

    setEditTempTransferItems(prev => [
      ...prev,
      {
        id: Date.now(),
        from_prod: editTransferItem.from_prod,
        to_prod: editTransferItem.to_prod,
        brand: toProduct?.brand || '',
        name: toProduct?.name || '',
        size_amt: toProduct?.size_amt || '',
        u_size: toProduct?.u_size || '',
        qty: editTransferItem.qty
      }
    ]);

    toast.success('Transfer item added successfully');

    setEditTransferItem({
      from_prod: '',
      to_prod: '',
      qty: 1
    });
  }

  function openEditTransferItemModal(item) {
    setEditTransferItemStockError('');
    setEditingTransferItem(item);
    setEditTransferItemForm({
      from_prod: item.from_prod,
      to_prod: item.to_prod,
      qty: item.qty
    });
    setShowEditTransferItemModal(true);
  }

  function updateTransferItem() {
    setEditTransferItemStockError('');
    
    if (!editTransferItemForm.qty || editTransferItemForm.qty <= 0) {
      return;
    }

    // Check stock availability for the updated quantity
    const stockCheck = checkStockAvailability(editTransferItemForm.from_prod, editTransferItemForm.qty);
    if (!stockCheck.available) {
      setEditTransferItemStockError(`Insufficient stock! Available: ${stockCheck.stock}`);
      return;
    }

    const toProduct = products.find(p => p.prod_no === parseInt(editTransferItemForm.to_prod));

    setTempTransferItems(prev => prev.map(item => 
      item.id === editingTransferItem.id ? {
        ...item,
        from_prod: editTransferItemForm.from_prod,
        to_prod: editTransferItemForm.to_prod,
        brand: toProduct?.brand || '',
        name: toProduct?.name || '',
        size_amt: toProduct?.size_amt || '',
        u_size: toProduct?.u_size || '',
        qty: editTransferItemForm.qty
      } : item
    ));

    setShowEditTransferItemModal(false);
    setEditingTransferItem(null);
    setEditTransferItemForm({
      from_prod: '',
      to_prod: '',
      qty: 1
    });
    setEditTransferItemStockError('');
    toast.success('Transfer item updated');
  }

  function openEditTransferItemModalEdit(item) {
    setEditTransferItemStockErrorEdit(''); 
    setEditingTransferItemEdit(item);
    setEditTransferItemFormEdit({
      from_prod: item.from_prod,
      to_prod: item.to_prod,
      qty: item.qty
    });
    setShowEditTransferItemModalEdit(true);
  }

  function updateTransferItemEdit() {
    setEditTransferItemStockErrorEdit('');
    
    if (!editTransferItemFormEdit.qty || editTransferItemFormEdit.qty <= 0) {
      return;
    }

    // Check stock availability for the updated quantity
    const stockCheck = checkStockAvailability(editTransferItemFormEdit.from_prod, editTransferItemFormEdit.qty);
    if (!stockCheck.available) {
      setEditTransferItemStockErrorEdit(`Insufficient stock! Available: ${stockCheck.stock}`);
      return;
    }

    const toProduct = products.find(p => p.prod_no === parseInt(editTransferItemFormEdit.to_prod));

    setEditTempTransferItems(prev => prev.map(item => 
      item.id === editingTransferItemEdit.id ? {
        ...item,
        from_prod: editTransferItemFormEdit.from_prod,
        to_prod: editTransferItemFormEdit.to_prod,
        brand: toProduct?.brand || '',
        name: toProduct?.name || '',
        size_amt: toProduct?.size_amt || '',
        u_size: toProduct?.u_size || '',
        qty: editTransferItemFormEdit.qty
      } : item
    ));

    setShowEditTransferItemModalEdit(false);
    setEditingTransferItemEdit(null);
    setEditTransferItemFormEdit({
      from_prod: '',
      to_prod: '',
      qty: 1
    });
    setEditTransferItemStockErrorEdit('');
    toast.success('Transfer item updated');
  }

  function removeTempTransferItem(id) {
    setTempTransferItems(prev => prev.filter(item => item.id !== id));
    toast.success('Transfer item deleted successfully');
  }

  function removeEditTempTransferItem(id) {
    setEditTempTransferItems(prev => prev.filter(item => item.id !== id));
    toast.success('Transfer item deleted successfully');
  }

  async function addTransfer(e) {
    e.preventDefault();
    setSubmitted(true);

    if (!transfer.date) {
      return;
    }
    if (tempTransferItems.length === 0) {
      return;
    }

    const userIdFromTable = await fetchUserId();
    
    if (!userIdFromTable) {
      toast.error('User not found in database');
      return;
    }

    try {
      const { data: transferData, error: transferError } = await supabase
        .from('TRANSFER_TRANS')
        .insert([{
          date: transfer.date,
          status: transfer.status,
          requester_id: userIdFromTable
        }])
        .select();

      if (transferError) {
        console.error('Transfer insert error details:', transferError);
        toast.error(`Transfer insert failed: ${transferError.message}`);
        return;
      }

      const newTransferId = transferData[0].transfertrans_no;

      const transferItemsToInsert = tempTransferItems.map(item => ({
        qty: item.qty,
        from_prod: parseInt(item.from_prod),
        to_prod: parseInt(item.to_prod),
        transfertrans_no: newTransferId
      }));

      const { error: transferItemsError } = await supabase
        .from('TRANS_ITEM')
        .insert(transferItemsToInsert);

      if (transferItemsError) {
        console.error('Transfer items insert error details:', transferItemsError);
        toast.error(`Transfer items insert failed: ${transferItemsError.message}`);
        return;
      }

      toast.success('Inventory Transfer added successfully');
      
      setTransfer({
        date: new Date().toISOString().split('T')[0],
        status: 'Pending'
      });
      setTempTransferItems([]);
      setSubmitted(false);
      setShowAddModal(false);
      fetchTransfers();

    } catch (error) {
      console.error('Error adding transfer:', error);
      toast.error('Failed to add inventory transfer');
    }
  }

  async function updateTransfer(e) {
    e.preventDefault();
    setSubmittedEdit(true);

    if (!editTransfer.date) {
      return;
    }
    if (editTempTransferItems.length === 0) {
      return;
    }

    try {
      // STEP 1: First, delete old transfer items
      const { error: deleteError } = await supabase
        .from('TRANS_ITEM')
        .delete()
        .eq('transfertrans_no', editingTransfer.transfertrans_no);

      if (deleteError) {
        console.error('Delete transfer items error:', deleteError);
        toast.error(`Failed to delete existing transfer items: ${deleteError.message}`);
        return;
      }

      // STEP 2: Then, insert new transfer items
      const transferItemsToInsert = editTempTransferItems.map(item => ({
        qty: item.qty,
        from_prod: parseInt(item.from_prod),
        to_prod: parseInt(item.to_prod),
        transfertrans_no: editingTransfer.transfertrans_no
      }));

      const { error: transferItemsError } = await supabase
        .from('TRANS_ITEM')
        .insert(transferItemsToInsert);

      if (transferItemsError) {
        console.error('Transfer items insert error details:', transferItemsError);
        toast.error(`Transfer items insert failed: ${transferItemsError.message}`);
        return;
      }

      // STEP 3: Update the transfer
      const { error: transferError } = await supabase
        .from('TRANSFER_TRANS')
        .update({
          date: editTransfer.date,
          status: editTransfer.status
        })
        .eq('transfertrans_no', editingTransfer.transfertrans_no);

      if (transferError) {
        console.error('Transfer update error details:', transferError);
        toast.error(`Transfer update failed: ${transferError.message}`);
        return;
      }

      toast.success('Inventory Transfer updated successfully');
      
      setShowEditModal(false);
      setEditingTransfer(null);
      setEditTempTransferItems([]);
      setSubmittedEdit(false);
      fetchTransfers();

    } catch (error) {
      console.error('Error updating transfer:', error);
      toast.error('Failed to update inventory transfer');
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

  async function openEditModal(transfer) {
    setEditAddTransferStockError(''); 
    setEditAddTransferItemErrors({ from_prod: '', to_prod: '', qty: '' });
    
    // Determine if user can edit status
    let canEditStatus = false;
    let initialStatus = transfer.status;
    
    // Check if status can be edited based on role and current status
    if (role === 'dispatcher' && transfer.status === 'Pending') {
      canEditStatus = true;
      initialStatus = 'Pending'; // Dispatcher can only select 'Released'
    } else if ((role === 'admin' || role === 'employee') && transfer.status === 'Released') {
      canEditStatus = true;
      initialStatus = 'Released'; // Admin/Employee can only select 'Completed'
    }
    // If status is not in the right state for the role, canEditStatus remains false
    
    const { data: transferItems, error } = await supabase
      .from('TRANS_ITEM')
      .select(`
        *,
        FROM_PRODUCT:from_prod (prod_no, name, brand, size_amt, u_size, stock, loc_name),
        TO_PRODUCT:to_prod (prod_no, name, brand, size_amt, u_size, stock, loc_name)
      `)
      .eq('transfertrans_no', transfer.transfertrans_no);

    if (error) {
      toast.error('Failed to load transfer details for editing');
      return;
    }

    const transformedTransferItems = transferItems.map((item, index) => ({
      id: Date.now() + index,
      from_prod: item.from_prod,
      to_prod: item.to_prod,
      brand: item.TO_PRODUCT?.brand || '',
      name: item.TO_PRODUCT?.name || '',
      size_amt: item.TO_PRODUCT?.size_amt || '',
      u_size: item.TO_PRODUCT?.u_size || '',
      qty: item.qty
    }));

    setEditingTransfer(transfer);
    setEditTransfer({
      date: transfer.date,
      status: initialStatus,
      canEditStatus: canEditStatus // Add this flag
    });
    setEditTempTransferItems(transformedTransferItems);
    setShowEditModal(true);
  }

  async function viewTransferDetails(transfertrans_no) {
    const transfer = transfers.find(t => t.transfertrans_no === transfertrans_no);
    
    const { data: transferItems, error } = await supabase
      .from('TRANS_ITEM')
      .select(`
        *,
        TO_PRODUCT:to_prod (prod_no, name, brand, size_amt, u_size, loc_name)
      `)
      .eq('transfertrans_no', transfertrans_no);

    if (!error) {
      setViewTransfer(transfer);
      setViewTransferItems(transferItems || []);
      setShowViewOnlyModal(true);
    } else {
      toast.error('Failed to load transfer details');
    }
  }

  function validateEditTransferItem() {
    const errors = {};
    
    if (!editTransferItemForm.from_prod) {
      errors.from_prod = 'Product from warehouse is required.';
    }
    
    if (!editTransferItemForm.to_prod) {
      errors.to_prod = 'Product to store is required.';
    }
    
    if (!editTransferItemForm.qty || editTransferItemForm.qty <= 0) {
      errors.qty = 'Quantity must be greater than 0';
    } else if (editTransferItemForm.qty < 1) {
      errors.qty = 'Quantity must be at least 1.';
    }
    
    return errors;
  }

  function validateEditTransferItemEdit() {
    const errors = {};
    
    if (!editTransferItemFormEdit.from_prod) {
      errors.from_prod = 'Product from warehouse is required.';
    }
    
    if (!editTransferItemFormEdit.to_prod) {
      errors.to_prod = 'Product to store is required.';
    }
    
    if (!editTransferItemFormEdit.qty || editTransferItemFormEdit.qty <= 0) {
      errors.qty = 'Quantity must be greater than 0.';
    } else if (editTransferItemFormEdit.qty < 1) {
      errors.qty = 'Quantity must be at least 1';
    }
    
    return errors;
  }

  function confirmDeleteTransferItem() {
    if (!selectedDeleteItem) return;
    
    if (deleteModalContext === 'add') {
      // Remove from tempTransferItems (add modal)
      setTempTransferItems(prev => prev.filter(item => item.id !== selectedDeleteItem.id));
    } else if (deleteModalContext === 'edit') {
      // Remove from editTempTransferItems (edit modal)
      setEditTempTransferItems(prev => prev.filter(item => item.id !== selectedDeleteItem.id));
    }
    
    // Close modal and clear selection
    setShowDeleteItemModal(false);
    setSelectedDeleteItem(null);
    setDeleteModalContext('add');
    toast.success('Transfer item deleted successfully');
  }

  const filteredTransfers = transfers.filter((transfer) => {
    const matchesDate = search === '' || transfer.date?.includes(search);
    const matchesStatus = statusFilter === '' || transfer.status === statusFilter;
    return matchesDate && matchesStatus;
  });

  return (
    <div className="inventorytransfer-page">
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

      <div className="inventorytransfer-header-row">
       
        <h1>Inventory Transfer</h1>

        {(role === 'admin' || role === 'employee') && (
          <button
            className="add-inventorytransfer-btn"
            onClick={() => {
              setShowAddModal(true);
              setAddTransferStockError(''); 
              setAddTransferItemErrors({ from_prod: '', to_prod: '', qty: '' });
            }}
          >
            <FiPlus className="icon" />
            Add Inventory Transfer
          </button>
        )}
      </div>

      {/* SEARCH */}
        <div className="inventorytransfer-top-wrapper">
          <div className="inventorytransfer-search-card">
            <div className="inventorytransfer-search-container">
              <FiSearch className="search-icon" />
              <input
                type="date"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-bar"
                style={{ fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif', fontSize: '14px', fontWeight: 499, color: '#000' }}
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="status-filter-select"
              >
                <option value="">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Released">Released</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        <div className="inventorytransfer-table-container">
          <table className="inventorytransfer-styled-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
                <th>Requester</th>
                <th>Dispatcher</th>
                <th>Receiver</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransfers.map((transfer) => (
                <tr key={transfer.transfertrans_no}>
                  <td style={{ textAlign: 'left' }}>{new Date(transfer.date).toLocaleDateString()}</td>
                  <td style={{ textAlign: 'left' }}>{transfer.status}</td>
                  <td style={{ textAlign: 'left' }}>{transfer.requester ? `${transfer.requester.f_name}` : '-'}</td>
                  <td style={{ textAlign: 'left' }}>{transfer.dispatcher ? `${transfer.dispatcher.f_name}` : '-'}</td>
                  <td style={{ textAlign: 'left' }}>{transfer.receiver ? `${transfer.receiver.f_name}` : '-'}</td>
                  <td style={{ textAlign: 'left' }}>
                    <button
                      className="view-btn"
                      onClick={() => viewTransferDetails(transfer.transfertrans_no)}
                      title="View Inventory Transfer"
                    >
                      <FiEye color="#185229" size={18} />
                    </button>
                    {transfer.status !== 'Completed' && (
                      <button
                        className="edit-btn"
                        onClick={() => openEditModal(transfer)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                        title="Edit Inventory Transfer"
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

      {/* ADD TRANSFER MODAL */}
      {showAddModal && (
        <div className="inventorytransfer-modal-overlay">
          <div className="inventorytransfer-modal inventorytransfer-modal-large">
            <h2>Add Inventory Transfer</h2>

            <form onSubmit={addTransfer}>
              <div className="inventorytransfer-form-section">
                <h3>Inventory Transfer Information</h3>
                <div className="inventorytransfer-form-row">
                  <div className="inventorytransfer-form-group">
                    <label>
                      Date <span className="it-required">*</span>
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={transfer.date}
                      onChange={handleTransferChange}
                      className={submitted && !transfer.date ? "input-error" : ""}
                      style={{ fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif', fontSize: '14px', fontWeight: 499, color: '#000' }}
                    />
                    {submitted && !transfer.date && (
                      <span className="error-text">Date is required.</span>
                    )}
                  </div>

                  <div className="inventorytransfer-form-group">
                    <label>
                      Status <span className="it-required">*</span>
                    </label>
                    <select
                      name="status"
                      value={transfer.status}
                      onChange={handleTransferChange}
                      disabled
                    >
                      <option value="Pending">Pending</option>
                      <option value="Released">Released</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="inventorytransfer-form-section">
                <h3>Add Transfer Item</h3>
                <div className="inventorytransfer-form-row">
                  <div className="inventorytransfer-form-group">
                    <label>Product (From) <span className="it-required">*</span></label>
                    <select
                      name="from_prod"
                      value={transferItem.from_prod}
                      onChange={(e) => {
                        handleTransferItemChange(e);
                        setTransferItem(prev => ({ ...prev, to_prod: '' }));
                        setAddTransferItemErrors(prev => ({ ...prev, from_prod: '', to_prod: '' }));
                      }}
                      className={addTransferItemErrors.from_prod ? "input-error" : ""}
                      style={{ fontSize: '14px' }}
                    >
                      <option value="">Select Product from Warehouse.</option>
                      {getWarehouseProducts(
                        tempTransferItems.map(item => parseInt(item.from_prod))
                      ).map(product => (
                        <option key={product.prod_no} value={product.prod_no} style={{ fontSize: '14px' }}>
                          {product.brand} {product.name} {product.size_amt} {product.u_size} 
                          | Stock: {product.stock !== null && product.stock !== undefined ? product.stock : '0'}
                        </option>
                      ))}
                    </select>
                    {addTransferItemErrors.from_prod && (
                      <span className="error-text">{addTransferItemErrors.from_prod}</span>
                    )}
                  </div>

                  <div className="inventorytransfer-form-group">
                    <label>Product (To) <span className="it-required">*</span></label>
                    <select
                      name="to_prod"
                      value={transferItem.to_prod}
                      onChange={(e) => {
                        handleTransferItemChange(e);
                        setAddTransferItemErrors(prev => ({ ...prev, to_prod: '' }));
                      }}
                      className={addTransferItemErrors.to_prod ? "input-error" : ""}
                      style={{ fontSize: '14px' }}
                      disabled={!transferItem.from_prod}
                    >
                      <option value="">
                        {!transferItem.from_prod ? 'Please select a product from the warehouse first.' : 'Select Product to Store.'}
                      </option>
                      {getStoreProducts(
                        transferItem.from_prod,
                        tempTransferItems.map(item => parseInt(item.to_prod))
                      ).map(product => (
                        <option key={product.prod_no} value={product.prod_no} style={{ fontSize: '14px' }}>
                          {product.brand} {product.name} {product.size_amt} {product.u_size}
                          | Stock: {product.stock !== null && product.stock !== undefined ? product.stock : '0'}
                        </option>
                      ))}
                    </select>
                    {addTransferItemErrors.to_prod && (
                      <span className="error-text">{addTransferItemErrors.to_prod}</span>
                    )}
                  </div>

                  <div className="inventorytransfer-form-group">
                    <label>Quantity <span className="it-required">*</span></label>
                    <input
                      type="number"
                      name="qty"
                      value={transferItem.qty}
                      onChange={(e) => {
                        const newValue = parseInt(e.target.value) || 0;
                        if (newValue <= 0) {
                          setTransferItem(prev => ({ ...prev, qty: 1 }));
                          setAddTransferItemErrors(prev => ({ ...prev, qty: '' }));
                        } else {
                          setTransferItem(prev => ({ ...prev, qty: newValue }));
                          setAddTransferItemErrors(prev => ({ ...prev, qty: '' }));
                        }
                      }}
                      min="1"
                      className={addTransferItemErrors.qty ? "input-error" : ""}
                    />
                    {addTransferItemErrors.qty && (
                      <span className="error-text">{addTransferItemErrors.qty}</span>
                    )}
                    {addTransferStockError && (
                      <span className="error-text">
                        {addTransferStockError}
                      </span>
                    )}
                  </div>

                  <div className="inventorytransfer-form-group">
                    <button
                      type="button"
                      className="add-item-btn"
                      onClick={() => {
                        setAddTransferStockError(''); 
                        let hasError = false;
                        const errors = { from_prod: '', to_prod: '', qty: '' };
                        
                        if (!transferItem.from_prod) {
                          errors.from_prod = 'Product from warehouse is required.';
                          hasError = true;
                        }
                        if (!transferItem.to_prod) {
                          errors.to_prod = 'Product to store is required.';
                          hasError = true;
                        }
                        if (!transferItem.qty || transferItem.qty <= 0) {
                          errors.qty = 'Quantity must be greater than 0.';
                          hasError = true;
                        }
                        
                        if (hasError) {
                          setAddTransferItemErrors(errors);
                        } else {
                          addTransferItemToTemp();
                          setAddTransferItemErrors({ from_prod: '', to_prod: '', qty: '' });
                        }
                      }}
                    >
                      Add Item
                    </button>
                  </div>
                </div>
              </div>

              <div className="transferitems-header">
                <h3>Transfer Items</h3>
                <div className="transferitems-search">
                  <FiSearch className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search transfer items..."
                    value={transferItemSearch}
                    onChange={(e) => setTransferItemSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="inventorytransfer-table-wrapper">
                <table className="inventorytransfer-transferitems-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tempTransferItems
                      .filter(item => {
                        const fullProductName = `${item.brand} ${item.name} ${item.size_amt} ${item.u_size}`;
                        return fullProductName.toLowerCase().includes(transferItemSearch.toLowerCase());
                      })
                      .map((item) => (
                        <tr key={item.id}>
                          <td style={{ textAlign: 'left' }}>{item.brand} {item.name} {item.size_amt} {item.u_size}</td>
                          <td style={{ textAlign: 'left' }}>{item.qty}</td>
                          <td style={{ display: 'flex', gap: '5px', justifyContent: 'center', textAlign: 'left' }}>
                            <button
                              type="button"
                              className="edit-item-btn"
                              onClick={() => openEditTransferItemModal(item)}
                              title="Edit Transfer Item"
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
                              title="Delete Transfer Item"
                            >
                              <FiTrash2 color="rgb(219, 32, 32)" size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>

                {submitted && tempTransferItems.length === 0 && (
                  <span className="error-text" style={{ display: 'block', marginTop: '10px' }}>
                    At least one transfer item is required.
                  </span>
                )}
              </div>

              <div className="inventorytransfer-modal-actions">
                <button type="submit" className="submit-btn">
                  Add Inventory Transfer
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
                    setTempTransferItems([]);
                    setTransfer({
                      date: new Date().toISOString().split('T')[0],
                      status: 'Pending'
                    });
                    setTransferItem({
                      from_prod: '',
                      to_prod: '',
                      qty: 1
                    });
                    setAddTransferItemErrors({ from_prod: '', to_prod: '', qty: '' });
                    setAddTransferStockError(''); 
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TRANSFER MODAL */}
      {showEditModal && editingTransfer && (
        <div className="inventorytransfer-modal-overlay">
          <div className="inventorytransfer-modal inventorytransfer-modal-large">
            <h2>Edit Inventory Transfer</h2>

            <form onSubmit={updateTransfer}>
              <div className="inventorytransfer-form-section">
                <h3>Inventory Transfer Information</h3>
                <div className="inventorytransfer-form-row">
                  <div className="inventorytransfer-form-group">
                    <label>
                      Date <span className="it-required">*</span>
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={editTransfer.date}
                      onChange={handleEditTransferChange}
                      className={submittedEdit && !editTransfer.date ? "input-error" : ""}
                      style={{ fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif', fontSize: '14px', fontWeight: 499, color: '#000' }}
                    />
                    {submittedEdit && !editTransfer.date && (
                      <span className="error-text">Date is required.</span>
                    )}
                  </div>

                  <div className="inventorytransfer-form-group">
                    <label>
                      Status <span className="it-required">*</span>
                    </label>
                    <select
                      name="status"
                      value={editTransfer.status}
                      onChange={handleEditTransferChange}
                      disabled={!editTransfer.canEditStatus}
                      style={!editTransfer.canEditStatus ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
                    >
                      {role === 'dispatcher' && (
                        <>
                          <option value="Pending">Pending</option>
                          <option value="Released">Released</option>
                        </>
                      )}
                      {(role === 'admin' || role === 'employee') && (
                        <>
                          <option value="Released">Released</option>
                          <option value="Completed">Completed</option>
                        </>
                      )}
                      {!editTransfer.canEditStatus && (
                        <option value={editTransfer.status}>{editTransfer.status}</option>
                      )}
                    </select>
                  </div>
                </div>
              </div>

              <div className="inventorytransfer-form-section">
                <h3>Add Transfer Item</h3>
                <div className="inventorytransfer-form-row">
                  <div className="inventorytransfer-form-group">
                    <label>Product (From) <span className="it-required">*</span></label>
                    <select
                      name="from_prod"
                      value={editTransferItem.from_prod}
                      onChange={(e) => {
                        setEditTransferItem(prev => ({ ...prev, from_prod: e.target.value, to_prod: '' }));
                        setEditAddTransferItemErrors(prev => ({ ...prev, from_prod: '', to_prod: '' }));
                      }}
                      className={editAddTransferItemErrors.from_prod ? "input-error" : ""}
                      style={{ fontSize: '14px' }}
                    >
                      <option value="">Select Product from Warehouse.</option>
                      {getWarehouseProducts(
                        editTempTransferItems.map(item => parseInt(item.from_prod))
                      ).map(product => (
                        <option key={product.prod_no} value={product.prod_no} style={{ fontSize: '14px' }}>
                          {product.brand} {product.name} {product.size_amt} {product.u_size} 
                          | Stock: {product.stock !== null && product.stock !== undefined ? product.stock : '0'}
                        </option>
                      ))}
                    </select>
                    {editAddTransferItemErrors.from_prod && (
                      <span className="error-text">{editAddTransferItemErrors.from_prod}</span>
                    )}
                  </div>

                  <div className="inventorytransfer-form-group">
                    <label>Product (To) <span className="it-required">*</span></label>
                    <select
                      name="to_prod"
                      value={editTransferItem.to_prod}
                      onChange={(e) => {
                        setEditTransferItem(prev => ({ ...prev, to_prod: e.target.value }));
                        setEditAddTransferItemErrors(prev => ({ ...prev, to_prod: '' }));
                      }}
                      className={editAddTransferItemErrors.to_prod ? "input-error" : ""}
                      style={{ fontSize: '14px' }}
                      disabled={!editTransferItem.from_prod}
                    >
                      <option value="">
                        {!editTransferItem.from_prod ? 'Please select a product from the warehouse first.' : 'Select Product to Store.'}
                      </option>
                      {getStoreProducts(
                        editTransferItem.from_prod,
                        editTempTransferItems.map(item => parseInt(item.to_prod))
                      ).map(product => (
                        <option key={product.prod_no} value={product.prod_no} style={{ fontSize: '14px' }}>
                          {product.brand} {product.name} {product.size_amt} {product.u_size}
                          | Stock: {product.stock !== null && product.stock !== undefined ? product.stock : '0'}
                        </option>
                      ))}
                    </select>
                    {editAddTransferItemErrors.to_prod && (
                      <span className="error-text">{editAddTransferItemErrors.to_prod}</span>
                    )}
                  </div>

                  <div className="inventorytransfer-form-group">
                    <label>Quantity <span className="it-required">*</span></label>
                    <input
                      type="number"
                      name="qty"
                      value={editTransferItem.qty}
                      onChange={(e) => {
                        const newValue = parseInt(e.target.value) || 0;
                        if (newValue <= 0) {
                          setEditTransferItem(prev => ({ ...prev, qty: 1 }));
                          setEditAddTransferItemErrors(prev => ({ ...prev, qty: '' }));
                        } else {
                          setEditTransferItem(prev => ({ ...prev, qty: newValue }));
                          setEditAddTransferItemErrors(prev => ({ ...prev, qty: '' }));
                        }
                      }}
                      min="1"
                      className={editAddTransferItemErrors.qty ? "input-error" : ""}
                    />
                    {editAddTransferItemErrors.qty && (
                      <span className="error-text">{editAddTransferItemErrors.qty}</span>
                    )}
                    {editAddTransferStockError && (
                      <span className="error-text">
                        {editAddTransferStockError}
                      </span>
                    )}
                  </div>

                  <div className="inventorytransfer-form-group">
                    <button
                      type="button"
                      className="add-item-btn"
                      onClick={() => {
                        setAddTransferStockError('');
                        let hasError = false;
                        const errors = { from_prod: '', to_prod: '', qty: '' };
                        
                        if (!editTransferItem.from_prod) {
                          errors.from_prod = 'Product from warehouse is required.';
                          hasError = true;
                        }
                        if (!editTransferItem.to_prod) {
                          errors.to_prod = 'Product to store is required.';
                          hasError = true;
                        }
                        if (!editTransferItem.qty || editTransferItem.qty <= 0) {
                          errors.qty = 'Quantity must be greater than 0.';
                          hasError = true;
                        }
                        
                        if (hasError) {
                          setEditAddTransferItemErrors(errors);
                        } else {
                          addEditTransferItemToTemp();
                          setEditAddTransferItemErrors({ from_prod: '', to_prod: '', qty: '' });
                        }
                      }}
                    >
                      Add Item
                    </button>
                  </div>
                </div>
              </div>

              <div className="transferitems-header">
                <h3>Transfer Items</h3>
                <div className="transferitems-search">
                  <FiSearch className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search transfer items..."
                    value={transferItemSearchEdit}
                    onChange={(e) => setTransferItemSearchEdit(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="inventorytransfer-table-wrapper">
                <table className="inventorytransfer-transferitems-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editTempTransferItems
                      .filter(item => {
                        const fullProductName = `${item.brand} ${item.name} ${item.size_amt} ${item.u_size}`;
                        return fullProductName.toLowerCase().includes(transferItemSearchEdit.toLowerCase());
                      })
                      .map((item) => (
                        <tr key={item.id}>
                          <td style={{ textAlign: 'left' }}>{item.brand} {item.name} {item.size_amt} {item.u_size}</td>
                          <td style={{ textAlign: 'left' }}>{item.qty}</td>
                          <td style={{ display: 'flex', gap: '5px', justifyContent: 'center', textAlign: 'left' }}>
                            <button
                              type="button"
                              className="edit-item-btn"
                              onClick={() => openEditTransferItemModalEdit(item)}
                              title="Edit Transfer Item"
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
                              title="Delete Transfer Item"
                            >
                              <FiTrash2 color="rgb(219, 32, 32)" size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>

                {submittedEdit && editTempTransferItems.length === 0 && (
                  <span className="error-text" style={{ display: 'block', marginTop: '10px' }}>
                    At least one transfer item is required.
                  </span>
                )}
              </div> 

              <div className="inventorytransfer-modal-actions">
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
                    setEditingTransfer(null);
                    setEditTempTransferItems([]);
                    setSubmittedEdit(false);
                    setEditTransfer({
                      date: '',
                      status: 'Pending',
                      canEditStatus: false 
                    });
                    setEditTransferItem({
                      from_prod: '',
                      to_prod: '',
                      qty: 1
                    });
                    setEditAddTransferItemErrors({ from_prod: '', to_prod: '', qty: '' });
                    setEditAddTransferStockError(''); 
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TRANSFER ITEM MODAL FOR ADD TRANSFER */}
      {showEditTransferItemModal && editingTransferItem && (
        <div className="edit-transferitem-modal-overlay">
          <div className="edit-transferitem-modal">
            <h2>Edit Transfer Item</h2>
            
            <form onSubmit={(e) => { 
              e.preventDefault(); 
              const errors = validateEditTransferItem();
              if (Object.keys(errors).length === 0) {
                updateTransferItem();
              } else {
                setEditTransferItemErrors(errors);
              }
            }}>
              <div className="form-group">
                <label>
                  Product (From) <span className="it-required">*</span>
                </label>
                <select
                  name="from_prod"
                  value={editTransferItemForm.from_prod}
                  onChange={(e) => {
                    handleEditTransferItemChange(e);
                    setEditTransferItemForm(prev => ({ ...prev, to_prod: '' }));
                    setEditTransferItemErrors(prev => ({ ...prev, from_prod: '', to_prod: '' }));
                  }}
                  className={editTransferItemErrors.from_prod ? "input-error" : ""}
                  style={{ minWidth: '100%', fontSize: '14px' }}
                >
                  <option value="">Select Product from Warehouse.</option>
                  {getWarehouseProducts(
                    tempTransferItems.map(item => parseInt(item.from_prod)),
                    editTransferItemForm.from_prod ? parseInt(editTransferItemForm.from_prod) : null
                  ).map(product => (
                    <option key={product.prod_no} value={product.prod_no} style={{ fontSize: '14px' }}>
                      {product.brand} {product.name} {product.size_amt} {product.u_size} 
                      | Stock: {product.stock !== null && product.stock !== undefined ? product.stock : '0'}
                    </option>
                  ))}
                </select>
                {editTransferItemErrors.from_prod && (
                  <span className="error-text">{editTransferItemErrors.from_prod}</span>
                )}
              </div>

              <div className="form-group">
                <label>
                  Product (To) <span className="it-required">*</span>
                </label>
                <select
                  name="to_prod"
                  value={editTransferItemForm.to_prod}
                  onChange={(e) => {
                    handleEditTransferItemChange(e);
                    setEditTransferItemErrors(prev => ({ ...prev, to_prod: '' }));
                  }}
                  className={editTransferItemErrors.to_prod ? "input-error" : ""}
                  style={{ minWidth: '100%', fontSize: '14px' }}
                  disabled={!editTransferItemForm.from_prod}
                >
                  <option value="">
                    {!editTransferItemForm.from_prod ? 'Please select a product from the warehouse first.' : 'Select Product to Store.'}
                  </option>
                  {getStoreProducts(
                    editTransferItemForm.from_prod,
                    tempTransferItems.map(item => parseInt(item.to_prod)),
                    editTransferItemForm.to_prod ? parseInt(editTransferItemForm.to_prod) : null
                  ).map(product => (
                    <option key={product.prod_no} value={product.prod_no} style={{ fontSize: '14px' }}>
                      {product.brand} {product.name} {product.size_amt} {product.u_size}
                      | Stock: {product.stock !== null && product.stock !== undefined ? product.stock : '0'}
                    </option>
                  ))}
                </select>
                {editTransferItemErrors.to_prod && (
                  <span className="error-text">{editTransferItemErrors.to_prod}</span>
                )}
              </div>

              <div className="form-group">
                <label>
                  Quantity <span className="it-required">*</span>
                </label>
                <input
                  type="number"
                  name="qty"
                  value={editTransferItemForm.qty}
                  onChange={(e) => {
                    handleEditTransferItemChange(e);
                    setEditTransferItemErrors(prev => ({ ...prev, qty: '' }));
                  }}
                  onBlur={() => {
                    const qty = editTransferItemForm.qty;
                    if (!qty || qty <= 0) {
                      setEditTransferItemErrors(prev => ({ ...prev, qty: 'Quantity must be greater than 0' }));
                    }
                  }}
                  className={editTransferItemErrors.qty ? "input-error" : ""}
                />
                {editTransferItemErrors.qty && (
                  <span className="error-text">{editTransferItemErrors.qty}</span>
                )}
              </div>
              {editTransferItemStockError && (
                <span className="error-text">{editTransferItemStockError}</span>
              )}

              <div className="modal-actions">
                <button type="submit" className="save-btn">
                  Save Changes
                </button>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setShowEditTransferItemModal(false);
                    setEditingTransferItem(null);
                    setEditTransferItemForm({
                      from_prod: '',
                      to_prod: '',
                      qty: 1
                    });
                    setEditTransferItemErrors({});
                    setEditTransferItemStockError(''); 
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TRANSFER ITEM MODAL FOR EDIT TRANSFER */}
      {showEditTransferItemModalEdit && editingTransferItemEdit && (
        <div className="edit-transferitem-modal-overlay">
          <div className="edit-transferitem-modal">
            <h2>Edit Transfer Item</h2>
            
            <form onSubmit={(e) => { 
              e.preventDefault(); 
              const errors = validateEditTransferItemEdit();
              if (Object.keys(errors).length === 0) {
                updateTransferItemEdit();
              } else {
                setEditTransferItemErrorsEdit(errors);
              }
            }}>
              <div className="form-group">
                <label>
                  Product (From) <span className="it-required">*</span>
                </label>
                <select
                  name="from_prod"
                  value={editTransferItemFormEdit.from_prod}
                  onChange={(e) => {
                    handleEditTransferItemChangeEdit(e);
                    setEditTransferItemFormEdit(prev => ({ ...prev, to_prod: '' }));
                    setEditTransferItemErrorsEdit(prev => ({ ...prev, from_prod: '', to_prod: '' }));
                  }}
                  className={editTransferItemErrorsEdit.from_prod ? "input-error" : ""}
                  style={{ minWidth: '100%', fontSize: '14px' }}
                >
                  <option value="">Select Product from Warehouse</option>
                  {getWarehouseProducts(
                    editTempTransferItems.map(item => parseInt(item.from_prod)),
                    editTransferItemFormEdit.from_prod ? parseInt(editTransferItemFormEdit.from_prod) : null
                  ).map(product => (
                    <option key={product.prod_no} value={product.prod_no} style={{ fontSize: '14px' }}>
                      {product.brand} {product.name} {product.size_amt} {product.u_size} 
                      | Stock: {product.stock !== null && product.stock !== undefined ? product.stock : '0'}
                    </option>
                  ))}
                </select>
                {editTransferItemErrorsEdit.from_prod && (
                  <span className="error-text">{editTransferItemErrorsEdit.from_prod}</span>
                )}
              </div>

              <div className="form-group">
                <label>
                  Product (To) <span className="it-required">*</span>
                </label>
                <select
                  name="to_prod"
                  value={editTransferItemFormEdit.to_prod}
                  onChange={(e) => {
                    handleEditTransferItemChangeEdit(e);
                    setEditTransferItemErrorsEdit(prev => ({ ...prev, to_prod: '' }));
                  }}
                  className={editTransferItemErrorsEdit.to_prod ? "input-error" : ""}
                  style={{ minWidth: '100%', fontSize: '14px' }}
                  disabled={!editTransferItemFormEdit.from_prod}
                >
                  <option value="">
                    {!editTransferItemFormEdit.from_prod ? 'Please select a product from the warehouse first.' : 'Select Product to Store.'}
                  </option>
                  {getStoreProducts(
                    editTransferItemFormEdit.from_prod,
                    editTempTransferItems.map(item => parseInt(item.to_prod)),
                    editTransferItemFormEdit.to_prod ? parseInt(editTransferItemFormEdit.to_prod) : null
                  ).map(product => (
                    <option key={product.prod_no} value={product.prod_no} style={{ fontSize: '14px' }}>
                      {product.brand} {product.name} {product.size_amt} {product.u_size}
                      | Stock: {product.stock !== null && product.stock !== undefined ? product.stock : '0'}
                    </option>
                  ))}
                </select>
                {editTransferItemErrorsEdit.to_prod && (
                  <span className="error-text">{editTransferItemErrorsEdit.to_prod}</span>
                )}
              </div>

              <div className="form-group">
                <label>
                  Quantity <span className="it-required">*</span>
                </label>
                <input
                  type="number"
                  name="qty"
                  value={editTransferItemFormEdit.qty}
                  onChange={(e) => {
                    handleEditTransferItemChangeEdit(e);
                    setEditTransferItemErrorsEdit(prev => ({ ...prev, qty: '' }));
                  }}
                  onBlur={() => {
                    const qty = editTransferItemFormEdit.qty;
                    if (!qty || qty <= 0) {
                      setEditTransferItemErrorsEdit(prev => ({ ...prev, qty: 'Quantity must be greater than 0' }));
                    }
                  }}
                  className={editTransferItemErrorsEdit.qty ? "input-error" : ""}
                />
                {editTransferItemErrorsEdit.qty && (
                  <span className="error-text">{editTransferItemErrorsEdit.qty}</span>
                )}
                {editTransferItemStockErrorEdit && (
                  <span className="error-text">{editTransferItemStockErrorEdit}</span>
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
                    setShowEditTransferItemModalEdit(false);
                    setEditingTransferItemEdit(null);
                    setEditTransferItemFormEdit({
                      from_prod: '',
                      to_prod: '',
                      qty: 1
                    });
                    setEditTransferItemErrorsEdit({});
                    setEditTransferItemStockErrorEdit('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW ONLY TRANSFER MODAL */}
      {showViewOnlyModal && viewTransfer && (
        <div className="inventorytransfer-modal-overlay">
          <div className="inventorytransfer-modal inventorytransfer-modal-large">
            <h2>Inventory Transfer</h2>

            <div className="inventorytransfer-form-section">
              <h3>Inventory Transfer Information</h3>
              <div className="inventorytransfer-form-row">
                <div className="inventorytransfer-form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    value={viewTransfer.date ? new Date(viewTransfer.date).toISOString().split('T')[0] : ''}
                    disabled
                    style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                    style={{ fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif', fontSize: '14px', fontWeight: 499, color: '#000' }}
                  />
                </div>

                <div className="inventorytransfer-form-group">
                  <label>Status</label>
                  <div className="view-only-display">
                    {viewTransfer.status || 'Pending'}
                  </div>
                </div>
              </div>
            </div>

            <div className="transferitems-header">
              <h3>Transfer Items</h3>
              <div className="transferitems-search">
                <FiSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search transfer items..."
                  value={viewTransferItemSearch}
                  onChange={(e) => setViewTransferItemSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="inventorytransfer-table-wrapper">
              <table className="inventorytransfer-transferitems-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {viewTransferItems
                    .filter(item => {
                      const fullProductName = `${item.TO_PRODUCT?.brand || ''} ${item.TO_PRODUCT?.name || ''} ${item.TO_PRODUCT?.size_amt || ''} ${item.TO_PRODUCT?.u_size || ''}`;
                      return fullProductName.toLowerCase().includes(viewTransferItemSearch.toLowerCase());
                    })
                    .map((item, index) => (
                      <tr key={index}>
                        <td style={{ textAlign: 'left' }}>{item.TO_PRODUCT?.brand || ''} {item.TO_PRODUCT?.name || ''} {item.TO_PRODUCT?.size_amt || ''} {item.TO_PRODUCT?.u_size || ''}</td>
                        <td style={{ textAlign: 'left' }}>{item.qty}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="inventorytransfer-modal-actions">
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
                  setViewTransfer(null);
                  setViewTransferItems([]);
                  setViewTransferItemSearch('');
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE TRANSFER ITEM MODAL - SHARED FOR BOTH ADD AND EDIT */}
      {showDeleteItemModal && selectedDeleteItem && (
        <div className="inventorytransfer-delete-modal-overlay">
          <div className="inventorytransfer-delete-modal-content">
            <p>
              Are you sure you want to delete{' '}
              <strong>
                {selectedDeleteItem?.brand} {selectedDeleteItem?.name} {selectedDeleteItem?.size_amt} {selectedDeleteItem?.u_size}
              </strong>
              ?
            </p>
            <div className="inventorytransfer-delete-modal-actions">
              <button
                className="inventorytransfer-confirm-delete-btn"
                onClick={confirmDeleteTransferItem}
              >
                Delete
              </button>
              <button
                className="inventorytransfer-cancel-delete-btn"
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
            <h1 className="name" >New Trader's Lucky Mart</h1>
            <h2 className="street">Pinili Street, Dumaguete City</h2>
            <h2 className="contact_no">Contact No: 422-3192</h2>
            <h2 className="title">Inventory Transfer</h2>
            <hr />
            <p><strong>Date:</strong> {printData.date ? new Date(printData.date).toLocaleDateString() : 'N/A'}</p>
          </div>

          <div className="print-items">
            <h3 style={{marginTop: '40px'}}>Transfer Items</h3>
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

export default InventoryTransfer;