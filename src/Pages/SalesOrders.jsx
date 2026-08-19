import React, { useEffect, useState } from 'react';
import { supabase } from '../client';
import Sidebar from './Sidebar';
import './SalesOrder.css';
import { FiSearch, FiPlus, FiTrash2, FiEdit, FiEye } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { toast, ToastContainer } from 'react-toastify';

const SalesOrder = () => {
  const { user } = useAuth();
  const role = user?.user_metadata?.role || '';
  const userId = user?.id;

  const [salesOrders, setSalesOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lineItemSearch, setLineItemSearch] = useState('');
  const [lineItemSearchEdit, setLineItemSearchEdit] = useState('');

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editingOrderItems, setEditingOrderItems] = useState([]);
  const [editSalesOrder, setEditSalesOrder] = useState({
    date: '',
    cust_no: '',
    status: 'Pending',
    p_status: 'Pending'
  });
  const [editTempLineItems, setEditTempLineItems] = useState([]);
  const [editLineItem, setEditLineItem] = useState({
    prod_no: '',
    qty: 1,
    unit: 'Case'
  });
  const [submittedEdit, setSubmittedEdit] = useState(false);

  // Edit line item modal state (for editing items in temp list)
  const [showEditLineItemModal, setShowEditLineItemModal] = useState(false);
  const [editingLineItem, setEditingLineItem] = useState(null);
  const [editLineItemForm, setEditLineItemForm] = useState({
    prod_no: '',
    qty: 1,
    unit: 'Case'
  });

  // Edit line item modal for edit sales order
  const [showEditLineItemModalEdit, setShowEditLineItemModalEdit] = useState(false);
  const [editingLineItemEdit, setEditingLineItemEdit] = useState(null);
  const [editLineItemFormEdit, setEditLineItemFormEdit] = useState({
    prod_no: '',
    qty: 1,
    unit: 'Case'
  });

  // Temporary line items (not yet in database)
  const [tempLineItems, setTempLineItems] = useState([]);

  // ADD SALES ORDER STATE
  const [salesOrder, setSalesOrder] = useState({
    date: new Date().toISOString().split('T')[0],
    cust_no: '',
    status: 'Pending',
    p_status: 'Pending'
  });

  // LINE ITEM STATE (for adding to temp list)
  const [lineItem, setLineItem] = useState({
    prod_no: '',
    qty: 1,
    unit: 'Case'
  });

  const [submitted, setSubmitted] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedOrderItems, setSelectedOrderItems] = useState([]);

  // Print data state
  const [printData, setPrintData] = useState({
    date: '',
    customer: '',
    items: [],
    total: 0
  });

  const [showViewOnlyModal, setShowViewOnlyModal] = useState(false);
  const [viewOrder, setViewOrder] = useState(null);
  const [viewOrderItems, setViewOrderItems] = useState([]);
  const [viewLineItemSearch, setViewLineItemSearch] = useState('');

  const [selectedProductStock, setSelectedProductStock] = useState(0);
  const [selectedEditProductStock, setSelectedEditProductStock] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');

  const [editLineItemErrors, setEditLineItemErrors] = useState({});
  const [editLineItemErrorsEdit, setEditLineItemErrorsEdit] = useState({});

  const [showDeleteItemModal, setShowDeleteItemModal] = useState(false);
  const [selectedDeleteItem, setSelectedDeleteItem] = useState(null);
  const [deleteModalContext, setDeleteModalContext] = useState('add');

  // Add line item validation errors for Add Sales Order modal
  const [addLineItemErrors, setAddLineItemErrors] = useState({
    prod_no: '',
    qty: ''
  });

  // Add line item validation errors for Edit Sales Order modal
  const [editAddLineItemErrors, setEditAddLineItemErrors] = useState({
    prod_no: '',
    qty: ''
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  // FETCH ALL DATA
  async function fetchAllData() {
    setLoading(true);
    await fetchSalesOrders();
    await fetchCustomers();
    await fetchProducts();
    setLoading(false);
  }

  // FETCH SALES ORDERS
  async function fetchSalesOrders() {
    try {
      console.log('Fetching sales orders...');
      
      const { data, error } = await supabase
        .from('SALES_TRANS')
        .select(`
          *,
          CUSTOMER (
            cust_no,
            name
          )
        `)
        .order('salestrans_no', { ascending: false });

      if (error) {
        console.error('Error fetching sales orders:', error);
        toast.error(`Failed to fetch sales orders: ${error.message}`);
        return;
      }

      console.log('Sales orders fetched:', data);
      setSalesOrders(data || []);
      
    } catch (error) {
      console.error('Unexpected error fetching sales orders:', error);
      toast.error('Failed to fetch sales orders');
    }
  }

  // FETCH CUSTOMERS
  async function fetchCustomers() {
    try {
      console.log('Fetching customers...');
      
      const { data, error } = await supabase
        .from('CUSTOMER')
        .select('cust_no, name, p_terms')
        .order('name');

      if (error) {
        console.error('Error fetching customers:', error);
        toast.error(`Failed to fetch customers: ${error.message}`);
        return;
      }

      console.log('Customers fetched:', data);
      setCustomers(data || []);
      
    } catch (error) {
      console.error('Unexpected error fetching customers:', error);
      toast.error('Failed to fetch customers');
    }
  }

  // FETCH PRODUCTS
  async function fetchProducts() {
    try {
      console.log('Fetching products...');
      
      // First, get all products without selection to see what columns exist
      const { data: allData, error: allError } = await supabase
        .from('PRODUCT')
        .select('*')
        .limit(1);
      
      if (allError) {
        console.error('Error fetching product structure:', allError);
      } else if (allData && allData[0]) {
        console.log('Available columns in PRODUCT table:', Object.keys(allData[0]));
        console.log('Sample product data:', allData[0]);
      }
      
      // Now fetch with proper column names (use the exact names from the log above)
      const { data, error } = await supabase
        .from('PRODUCT')
        .select('prod_no, name, brand, size_amt, u_size, price_case, price_piece, stock, loc_name')
        .order('name');

      if (error) {
        console.error('Error fetching products:', error);
        toast.error(`Failed to fetch products: ${error.message}`);
        return;
      }

      console.log('Products with stock check:', data?.map(p => ({ 
        name: p.name, 
        stock: p.stock, 
        loc_name: p.loc_name 
      })));
      
      setProducts(data || []);
      
    } catch (error) {
      console.error('Unexpected error fetching products:', error);
      toast.error('Failed to fetch products');
    }
  }

  // function to filter products and exclude already added items
  const getAvailableProducts = (addedProductIds) => {
    return products.filter(product => {
      // Exclude products already in the line items list
      const notAdded = !addedProductIds.includes(Number(product.prod_no));
      return notAdded;
    });
  };

  // GROUP PRODUCTS FOR PRINT (combine same products from different locations)
  const groupProductsForPrint = (items) => {
    const grouped = items.reduce((acc, item) => {
      // Create a unique key based on product details excluding location
      const key = `${item.brand}|${item.name}|${item.size_amt}|${item.u_size}|${item.unit}|${item.price}`;
      
      if (acc[key]) {
        // If product exists (from different location), add quantities and subtotal
        // Use Number() to ensure they are treated as numbers, not strings
        acc[key].qty = Number(acc[key].qty) + Number(item.qty);
        acc[key].subtotal = Number(acc[key].subtotal) + Number(item.subtotal);
      } else {
        // Create new entry with the combined data
        acc[key] = {
          brand: item.brand,
          name: item.name,
          size_amt: item.size_amt,
          u_size: item.u_size,
          unit: item.unit,
          price: Number(item.price),
          qty: Number(item.qty),
          subtotal: Number(item.subtotal)
        };
      }
      return acc;
    }, {});
    
    return Object.values(grouped);
  };

  // CALCULATE DUE DATE based on customer's p_terms
  const calculateDueDate = (orderDate, cust_no) => {
    const customer = customers.find(c => c.cust_no === parseInt(cust_no));
    if (customer && customer.p_terms) {
      const date = new Date(orderDate);
      date.setDate(date.getDate() + customer.p_terms);
      return date.toISOString().split('T')[0];
    }
    return orderDate;
  };

  // CHECK STOCK AVAILABILITY (Only for Case units)
  const checkStockAvailability = (prod_no, qty, unit) => {
    // Only check stock if unit is "Case"
    if (unit !== 'Case') {
      return { available: true, message: '' };
    }
    
    const product = products.find(p => p.prod_no === parseInt(prod_no));
    if (!product) return { available: false, message: 'Product not found' };
    
    const availableStock = product.stock || 0;
    
    if (qty > availableStock) {
      return { 
        available: false, 
        message: `Insufficient stock for Case unit! Only ${availableStock} Case(s) available.` 
      };
    }
    
    return { available: true, message: '' };
  };

  // Handle product selection in add modal
  function handleProductSelection(prod_no) {
    setLineItem(prev => ({
      ...prev,
      prod_no: prod_no
    }));
    
    const product = products.find(p => p.prod_no === parseInt(prod_no));
    if (product) {
      setSelectedProductStock(product.stock || 0);
    } else {
      setSelectedProductStock(0);
    }
  }

  // Handle product selection in edit modal
  function handleEditProductSelection(prod_no) {
    setEditLineItem(prev => ({
      ...prev,
      prod_no: prod_no
    }));
    
    const product = products.find(p => p.prod_no === parseInt(prod_no));
    if (product) {
      setSelectedEditProductStock(product.stock || 0);
    } else {
      setSelectedEditProductStock(0);
    }
  }

  // HANDLE SALES ORDER INPUT
  function handleSalesOrderChange(e) {
    const { name, value } = e.target;
    setSalesOrder(prev => ({
      ...prev,
      [name]: value
    }));

    // Recalculate due date when customer or date changes
    if (name === 'cust_no' || name === 'date') {
      const newDueDate = calculateDueDate(
        name === 'date' ? value : salesOrder.date,
        name === 'cust_no' ? value : salesOrder.cust_no
      );
      setSalesOrder(prev => ({
        ...prev,
        due_date: newDueDate
      }));
    }
  }

  // HANDLE EDIT SALES ORDER INPUT
  function handleEditSalesOrderChange(e) {
    const { name, value } = e.target;
    setEditSalesOrder(prev => ({
      ...prev,
      [name]: value
    }));

    // Recalculate due date when customer or date changes
    if (name === 'cust_no' || name === 'date') {
      const newDueDate = calculateDueDate(
        name === 'date' ? value : editSalesOrder.date,
        name === 'cust_no' ? value : editSalesOrder.cust_no
      );
      setEditSalesOrder(prev => ({
        ...prev,
        due_date: newDueDate
      }));
    }
  }

  // HANDLE LINE ITEM INPUT
  function handleLineItemChange(e) {
    const { name, value } = e.target;
    setLineItem(prev => ({
      ...prev,
      [name]: value
    }));
  }

  // HANDLE EDIT LINE ITEM INPUT (for the add modal's edit feature)
  function handleEditLineItemChange(e) {
    const { name, value } = e.target;
    setEditLineItemForm(prev => ({
      ...prev,
      [name]: value
    }));
  }

  // HANDLE EDIT LINE ITEM INPUT (for the edit modal's edit feature)
  function handleEditLineItemChangeEdit(e) {
    const { name, value } = e.target;
    setEditLineItemFormEdit(prev => ({
      ...prev,
      [name]: value
    }));
  }

  // GET PRODUCT PRICE based on unit
  const getProductPrice = (prod_no, unit) => {
    const product = products.find(p => p.prod_no === parseInt(prod_no));
    if (!product) return 0;
    return unit === 'Case' ? product.price_case : product.price_piece;
  };

  // GET PRODUCT NAME
  const getProductName = (prod_no) => {
    const product = products.find(p => p.prod_no === parseInt(prod_no));
    return product?.name || '';
  };

  // ADD LINE ITEM TO TEMPORARY LIST
  function addLineItemToTemp() {
    if (!lineItem.prod_no) {
      toast.error('Please select a product');
      return;
    }
    if (!lineItem.qty || lineItem.qty <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    // Only check stock if unit is "Case"
    if (lineItem.unit === 'Case') {
      const stockCheck = checkStockAvailability(lineItem.prod_no, lineItem.qty, lineItem.unit);
      if (!stockCheck.available) {
        toast.error(stockCheck.message);
        return;
      }
    }

    const product = products.find(p => p.prod_no === parseInt(lineItem.prod_no));
    const price = getProductPrice(lineItem.prod_no, lineItem.unit);
    const subtotal = lineItem.qty * price;

    setTempLineItems(prev => [
      ...prev,
      {
        id: Date.now(),
        prod_no: lineItem.prod_no,
        brand: product?.brand || '',
        name: product?.name || '',
        size_amt: product?.size_amt || '',
        u_size: product?.u_size || '',
        stock: product?.stock || '',
        loc_name: product?.loc_name || '',
        qty: lineItem.qty,
        unit: lineItem.unit,
        price: price,
        subtotal: subtotal
      }
    ]);

    toast.success('Line item added successfully');

    // Reset line item form
    setLineItem({
      prod_no: '',
      qty: 1,
      unit: 'Case'
    });
  }

  // ADD LINE ITEM TO EDIT TEMPORARY LIST
  function addEditLineItemToTemp() {
    if (!editLineItem.prod_no) {
      toast.error('Please select a product');
      return;
    }
    if (!editLineItem.qty || editLineItem.qty <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    // Only check stock if unit is "Case"
    if (editLineItem.unit === 'Case') {
      const stockCheck = checkStockAvailability(editLineItem.prod_no, editLineItem.qty, editLineItem.unit);
      if (!stockCheck.available) {
        toast.error(stockCheck.message);
        return;
      }
    }

    const product = products.find(p => p.prod_no === parseInt(editLineItem.prod_no));
    const price = getProductPrice(editLineItem.prod_no, editLineItem.unit);
    const subtotal = editLineItem.qty * price;

    setEditTempLineItems(prev => [
      ...prev,
      {
        id: Date.now(),
        prod_no: editLineItem.prod_no,
        brand: product?.brand || '',
        name: product?.name || '',
        size_amt: product?.size_amt || '',
        u_size: product?.u_size || '',
        stock: product?.stock || '',
        loc_name: product?.loc_name || '',
        qty: editLineItem.qty,
        unit: editLineItem.unit,
        price: price,
        subtotal: subtotal
      }
    ]);

    toast.success('Line item added successfully');

    // Reset edit line item form
    setEditLineItem({
      prod_no: '',
      qty: 1,
      unit: 'Case'
    });
  }

  // OPEN EDIT LINE ITEM MODAL (for add modal)
  function openEditLineItemModal(item) {
    setEditingLineItem(item);
    setEditLineItemForm({
      prod_no: item.prod_no,
      qty: item.qty,
      unit: item.unit
    });
    setShowEditLineItemModal(true);
  }

  // UPDATE LINE ITEM IN ADD MODAL
  function updateLineItem() {
    if (!editLineItemForm.qty || editLineItemForm.qty <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    // Only check stock if unit is "Case"
    if (editLineItemForm.unit === 'Case') {
      const stockCheck = checkStockAvailability(editLineItemForm.prod_no, editLineItemForm.qty, editLineItemForm.unit);
      if (!stockCheck.available) {
        toast.error(stockCheck.message);
        return;
      }
    }

    const product = products.find(p => p.prod_no === parseInt(editLineItemForm.prod_no));
    const price = getProductPrice(editLineItemForm.prod_no, editLineItemForm.unit);
    const subtotal = editLineItemForm.qty * price;

    setTempLineItems(prev => prev.map(item => 
      item.id === editingLineItem.id ? {
        ...item,
        prod_no: editLineItemForm.prod_no,
        brand: product?.brand || '',
        name: product?.name || '',
        size_amt: product?.size_amt || '',
        u_size: product?.u_size || '',
        stock: product?.stock || '',
        loc_name: product?.loc_name || '',
        qty: editLineItemForm.qty,
        unit: editLineItemForm.unit,
        price: price,
        subtotal: subtotal
      } : item
    ));

    setShowEditLineItemModal(false);
    setEditingLineItem(null);
    setEditLineItemForm({
      prod_no: '',
      qty: 1,
      unit: 'Case'
    });
    toast.success('Line item updated');
  }

  // OPEN EDIT LINE ITEM MODAL (for edit modal)
  function openEditLineItemModalEdit(item) {
    setEditingLineItemEdit(item);
    setEditLineItemFormEdit({
      prod_no: item.prod_no,
      qty: item.qty,
      unit: item.unit
    });
    setShowEditLineItemModalEdit(true);
  }

  // UPDATE LINE ITEM IN EDIT MODAL
  function updateLineItemEdit() {
    if (!editLineItemFormEdit.qty || editLineItemFormEdit.qty <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    // Only check stock if unit is "Case"
    if (editLineItemFormEdit.unit === 'Case') {
      const stockCheck = checkStockAvailability(editLineItemFormEdit.prod_no, editLineItemFormEdit.qty, editLineItemFormEdit.unit);
      if (!stockCheck.available) {
        toast.error(stockCheck.message);
        return;
      }
    }

    const product = products.find(p => p.prod_no === parseInt(editLineItemFormEdit.prod_no));
    const price = getProductPrice(editLineItemFormEdit.prod_no, editLineItemFormEdit.unit);
    const subtotal = editLineItemFormEdit.qty * price;

    setEditTempLineItems(prev => prev.map(item => 
      item.id === editingLineItemEdit.id ? {
        ...item,
        prod_no: editLineItemFormEdit.prod_no,
        brand: product?.brand || '',
        name: product?.name || '',
        size_amt: product?.size_amt || '',
        u_size: product?.u_size || '',
        stock: product?.stock || '',
        loc_name: product?.loc_name || '',
        qty: editLineItemFormEdit.qty,
        unit: editLineItemFormEdit.unit,
        price: price,
        subtotal: subtotal
      } : item
    ));

    setShowEditLineItemModalEdit(false);
    setEditingLineItemEdit(null);
    setEditLineItemFormEdit({
      prod_no: '',
      qty: 1,
      unit: 'Case'
    });
    toast.success('Line item updated');
  }

  // REMOVE LINE ITEM FROM TEMPORARY LIST
  function removeTempLineItem(id) {
    setTempLineItems(prev => prev.filter(item => item.id !== id));
    toast.success('Line item deleted successfully');
  }

  // REMOVE EDIT LINE ITEM FROM TEMPORARY LIST
  function removeEditTempLineItem(id) {
    setEditTempLineItems(prev => prev.filter(item => item.id !== id));
    toast.success('Line item deleted successfully');
  }

  // CALCULATE TOTAL AMOUNT from temp line items
  const calculateTotalAmount = () => {
    return tempLineItems.reduce((sum, item) => sum + item.subtotal, 0);
  };

  // CALCULATE EDIT TOTAL AMOUNT from edit temp line items
  const calculateEditTotalAmount = () => {
    return editTempLineItems.reduce((sum, item) => sum + item.subtotal, 0);
  };

  // HANDLE PRINT FUNCTION
  const handlePrint = (type) => {
    if (type === 'add') {
      const customerName = customers.find(c => c.cust_no === parseInt(salesOrder.cust_no))?.name || 'Not selected';
      // Group the items before printing
      const groupedItems = groupProductsForPrint(tempLineItems);
      setPrintData({
        date: salesOrder.date,
        customer: customerName,
        items: groupedItems,
        total: calculateTotalAmount()
      });
    } else if (type === 'edit') {
      const customerName = customers.find(c => c.cust_no === parseInt(editSalesOrder.cust_no))?.name || 'Not selected';
      // Group the items before printing
      const groupedItems = groupProductsForPrint(editTempLineItems);
      setPrintData({
        date: editSalesOrder.date,
        customer: customerName,
        items: groupedItems,
        total: calculateEditTotalAmount()
      });
    }
    
    // Small delay to ensure state updates before printing
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // ADD SALES ORDER
  async function addSalesOrder(e) {
    e.preventDefault();
    setSubmitted(true);

    if (!salesOrder.cust_no) {
      return;
    }
    if (!salesOrder.date) {
      return;
    }
    if (tempLineItems.length === 0) {
      return;
    }

    const totalAmount = calculateTotalAmount();
    const dueDate = calculateDueDate(salesOrder.date, salesOrder.cust_no);

    // Get the user ID from USER table
    const userIdFromTable = await fetchUserId();
    
    if (!userIdFromTable) {
      toast.error('User not found in database');
      return;
    }

    try {
      // 1. Insert into SALES_TRANS with the fetched u_id
      const { data: orderData, error: orderError } = await supabase
        .from('SALES_TRANS')
        .insert([{
          date: salesOrder.date,
          status: salesOrder.status,
          total_amt: totalAmount,
          p_status: salesOrder.p_status,
          due_date: dueDate,
          cust_no: parseInt(salesOrder.cust_no),
          u_id: userIdFromTable
        }])
        .select();

      if (orderError) {
        console.error('Order insert error details:', orderError);
        toast.error(`Order insert failed: ${orderError.message}`);
        return;
      }

      const newOrderId = orderData[0].salestrans_no;

      // 2. Insert all line items with the foreign key
      const lineItemsToInsert = tempLineItems.map(item => ({
        qty: item.qty,
        unit: item.unit,
        subtotal: item.subtotal,
        prod_no: parseInt(item.prod_no),
        salestrans_no: newOrderId
      }));

      const { error: lineItemsError } = await supabase
        .from('LINE_ITEM')
        .insert(lineItemsToInsert);

      if (lineItemsError) {
        console.error('Line items insert error details:', lineItemsError);
        toast.error(`Line items insert failed: ${lineItemsError.message}`);
        return;
      }

      toast.success('Sales Order added successfully');
      
      // Reset form
      setSalesOrder({
        date: new Date().toISOString().split('T')[0],
        cust_no: '',
        status: 'Pending',
        p_status: 'Unpaid'
      });
      setTempLineItems([]);
      setSubmitted(false);
      setShowAddModal(false);
      fetchSalesOrders();

    } catch (error) {
      console.error('Error adding sales order:', error);
      toast.error('Failed to add sales order');
    }
  }

  // UPDATE SALES ORDER
  async function updateSalesOrder(e) {
    e.preventDefault();
    setSubmittedEdit(true);

    if (!editSalesOrder.cust_no) {
      return;
    }
    if (!editSalesOrder.date) {
      return;
    }
    if (editTempLineItems.length === 0) {
      return;
    }

    const totalAmount = calculateEditTotalAmount();
    const dueDate = calculateDueDate(editSalesOrder.date, editSalesOrder.cust_no);

    try {
      // 1. Update SALES_TRANS
      const { error: orderError } = await supabase
        .from('SALES_TRANS')
        .update({
          date: editSalesOrder.date,
          status: editSalesOrder.status,
          total_amt: totalAmount,
          p_status: editSalesOrder.p_status,
          due_date: dueDate,
          cust_no: parseInt(editSalesOrder.cust_no)
        })
        .eq('salestrans_no', editingOrder.salestrans_no);

      if (orderError) {
        console.error('Order update error details:', orderError);
        toast.error(`Order update failed: ${orderError.message}`);
        return;
      }

      // 2. Delete existing line items
      const { error: deleteError } = await supabase
        .from('LINE_ITEM')
        .delete()
        .eq('salestrans_no', editingOrder.salestrans_no);

      if (deleteError) {
        console.error('Delete line items error:', deleteError);
        toast.error(`Failed to delete existing line items: ${deleteError.message}`);
        return;
      }

      // 3. Insert updated line items
      const lineItemsToInsert = editTempLineItems.map(item => ({
        qty: item.qty,
        unit: item.unit,
        subtotal: item.subtotal,
        prod_no: parseInt(item.prod_no),
        salestrans_no: editingOrder.salestrans_no
      }));

      const { error: lineItemsError } = await supabase
        .from('LINE_ITEM')
        .insert(lineItemsToInsert);

      if (lineItemsError) {
        console.error('Line items insert error details:', lineItemsError);
        toast.error(`Line items insert failed: ${lineItemsError.message}`);
        return;
      }

      toast.success('Sales Order updated successfully');
      
      // Reset edit form
      setShowEditModal(false);
      setEditingOrder(null);
      setEditTempLineItems([]);
      setSubmittedEdit(false);
      fetchSalesOrders();

    } catch (error) {
      console.error('Error updating sales order:', error);
      toast.error('Failed to update sales order');
    }
  }

  // FETCH USER ID from USER table based on authenticated user's email
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

  // OPEN EDIT MODAL
  async function openEditModal(order) {

    setEditAddLineItemErrors({ prod_no: '', qty: '' });
    // Fetch line items for this order
    const { data: lineItems, error } = await supabase
      .from('LINE_ITEM')
      .select(`
        *,
        PRODUCT (
          prod_no,
          name,
          brand,
          size_amt,
          u_size,
          stock,
          loc_name,
          price_case,
          price_piece
        )
      `)
      .eq('salestrans_no', order.salestrans_no);

    if (error) {
      toast.error('Failed to load order details for editing');
      return;
    }

    // Transform line items to match the temp line items structure
    const transformedLineItems = lineItems.map((item, index) => ({
      id: Date.now() + index,
      prod_no: item.prod_no,
      brand: item.PRODUCT?.brand || '',
      name: item.PRODUCT?.name || '',
      size_amt: item.PRODUCT?.size_amt || '',
      u_size: item.PRODUCT?.u_size || '',
      stock: item.PRODUCT?.stock || '',
      loc_name: item.PRODUCT?.loc_name || '',
      qty: item.qty,
      unit: item.unit,
      price: item.unit === 'Case' ? item.PRODUCT?.price_case : item.PRODUCT?.price_piece,
      subtotal: item.subtotal
    }));

    setEditingOrder(order);
    setEditSalesOrder({
      date: order.date,
      cust_no: order.cust_no.toString(),
      status: order.status,
      p_status: order.p_status || 'Pending'
    });
    setEditTempLineItems(transformedLineItems);
    setShowEditModal(true);
  }

  // VIEW SALES ORDER DETAILS
  async function viewSalesOrder(salestrans_no) {
    const order = salesOrders.find(o => o.salestrans_no === salestrans_no);
    
    // Fetch line items for this order
    const { data: lineItems, error } = await supabase
      .from('LINE_ITEM')
      .select(`
        *,
        PRODUCT (
          prod_no,
          name,
          price_case,
          price_piece
        )
      `)
      .eq('salestrans_no', salestrans_no);

    if (!error) {
      setSelectedOrder(order);
      setSelectedOrderItems(lineItems || []);
      setShowViewModal(true);
    } else {
      toast.error('Failed to load order details');
    }
  }

  // UPDATE ORDER STATUS
  async function updateOrderStatus(salestrans_no, newStatus) {
    const { error } = await supabase
      .from('SALES_TRANS')
      .update({ status: newStatus })
      .eq('salestrans_no', salestrans_no);

    if (!error) {
      toast.success('Order status updated');
      fetchSalesOrders();
    } else {
      toast.error('Failed to update status');
    }
  }

  // Validation function for edit line item (add modal)
  function validateEditLineItem() {
    const errors = {};
    
    if (!editLineItemForm.prod_no) {
      errors.prod_no = 'Product is required.';
    }
    
    if (!editLineItemForm.unit) {
      errors.unit = 'Unit is required.';
    }
    
    if (!editLineItemForm.qty || editLineItemForm.qty <= 0) {
      errors.qty = 'Quantity must be greater than 0.';
    } else if (editLineItemForm.qty < 1) {
      errors.qty = 'Quantity must be at least 1.';
    }
    
    // Check stock if unit is Case
    if (editLineItemForm.unit === 'Case' && editLineItemForm.prod_no) {
      const product = products.find(p => p.prod_no === parseInt(editLineItemForm.prod_no));
      if (product && editLineItemForm.qty > (product.stock || 0)) {
        errors.qty = `Insufficient stock! Only ${product.stock || 0} Case(s) available.`;
      }
    }
    
    return errors;
  }

  // Validation function for edit line item (edit modal)
  function validateEditLineItemEdit() {
    const errors = {};
    
    if (!editLineItemFormEdit.prod_no) {
      errors.prod_no = 'Product is required.';
    }
    
    if (!editLineItemFormEdit.unit) {
      errors.unit = 'Unit is required.';
    }
    
    if (!editLineItemFormEdit.qty || editLineItemFormEdit.qty <= 0) {
      errors.qty = 'Quantity must be greater than 0';
    } else if (editLineItemFormEdit.qty < 1) {
      errors.qty = 'Quantity must be at least 1.';
    }
    
    // Check stock if unit is Case
    if (editLineItemFormEdit.unit === 'Case' && editLineItemFormEdit.prod_no) {
      const product = products.find(p => p.prod_no === parseInt(editLineItemFormEdit.prod_no));
      if (product && editLineItemFormEdit.qty > (product.stock || 0)) {
        errors.qty = `Insufficient stock! Only ${product.stock || 0} Case(s) available.`;
      }
    }
    
    return errors;
  }

  // VIEW ONLY SALES ORDER DETAILS
  async function viewOrderDetails(salestrans_no) {
    const order = salesOrders.find(o => o.salestrans_no === salestrans_no);
    
    // Fetch line items for this order
    const { data: lineItems, error } = await supabase
      .from('LINE_ITEM')
      .select(`
        *,
        PRODUCT (
          prod_no,
          name,
          brand,
          size_amt,
          u_size,
          loc_name,
          price_case,
          price_piece
        )
      `)
      .eq('salestrans_no', salestrans_no);

    if (!error) {
      setViewOrder(order);
      setViewOrderItems(lineItems || []);
      setShowViewOnlyModal(true);
    } else {
      toast.error('Failed to load order details');
    }
  }

  function confirmDeleteLineItem() {
    if (!selectedDeleteItem) return;
    
    if (deleteModalContext === 'add') {
      // Remove from tempLineItems (add modal)
      setTempLineItems(prev => prev.filter(item => item.id !== selectedDeleteItem.id));
    } else if (deleteModalContext === 'edit') {
      // Remove from editTempLineItems (edit modal)
      setEditTempLineItems(prev => prev.filter(item => item.id !== selectedDeleteItem.id));
    }
    
    // Close modal and clear selection
    setShowDeleteItemModal(false);
    setSelectedDeleteItem(null);
    setDeleteModalContext('add');
    toast.success('Line item deleted successfully');
  }

  // SEARCH FILTER
  const filteredOrders = salesOrders.filter((order) => {
    const matchesDate = order.date?.includes(search);
    const matchesStatus = statusFilter === '' || order.status === statusFilter;
    return matchesDate && matchesStatus;
  });

  return (
    <div className="salesorder-page">
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
      <div className="salesorder-header-row">
        {(role === 'admin' || role === 'employee') && (
          <h1>Sales Orders</h1>
        )}

        {(role === 'admin' || role === 'employee') && (
          <button
            className="add-salesorder-btn"
            onClick={() => setShowAddModal(true)}
          >
            <FiPlus className="icon" />
            Add Sales Order
          </button>
        )}
      </div>

      {/* SEARCH */}
      {(role === 'admin' || role === 'employee') && (
        <div className="salesorder-top-wrapper">
          <div className="suppliersearch-card">
            <div className="salesorder-search-container">
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
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* TABLE */}
      {(role === 'admin' || role === 'employee') && (
        <div className="salesorder-table-container">
          <table className="salesorder-styled-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
                <th>Total Amount</th>
                <th>Customer Name</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.salestrans_no}>
                  <td style={{ textAlign: 'left' }}>{new Date(order.date).toLocaleDateString()}</td>
                  <td style={{ textAlign: 'left' }}>{order.status}</td>
                  <td style={{ textAlign: 'right' }}>₱ {order.total_amt?.toFixed(2)}</td>
                  <td style={{ textAlign: 'left' }}>{order.CUSTOMER?.name}</td>
                  <td style={{ textAlign: 'left' }}>
                    <button
                      className="view-btn"
                      onClick={() => viewOrderDetails(order.salestrans_no)}
                      title="View Sales Order"
                    >
                      <FiEye color="#185229" size={18} />
                    </button>
                    {order.status !== 'Completed' && (
                      <button
                        className="edit-btn"
                        onClick={() => openEditModal(order)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                        title="Edit Sales Order"
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

      {/* ADD SALES ORDER MODAL */}
      {showAddModal && (
        <div className="salesorder-modal-overlay">
          <div className="salesorder-modal salesorder-modal-large">
            <h2>Add Sales Order</h2>

            <form onSubmit={addSalesOrder}>
              {/* Sales Order Information Section */}
              <div className="salesorder-form-section">
                <h3>Sales Order Information</h3>
                <div className="salesorder-form-row">
                  <div className="salesorder-form-group">
                    <label>
                      Date <span className="so-required">*</span>
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={salesOrder.date}
                      onChange={handleSalesOrderChange}
                      className={submitted && !salesOrder.date ? "input-error" : ""}
                      style={{ fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif', fontSize: '14px', fontWeight: 499, color: '#000' }}
                    />
                    {submitted && !salesOrder.date && (
                      <span className="error-text">Date is required.</span>
                    )}
                  </div>

                  <div className="salesorder-form-group">
                    <label>
                      Customer <span className="so-required">*</span>
                    </label>
                    <select
                      name="cust_no"
                      value={salesOrder.cust_no}
                      onChange={handleSalesOrderChange}
                      className={submitted && !salesOrder.cust_no ? "input-error" : ""}
                    >
                      <option value="">Select Customer</option>
                      {customers.map(customer => (
                        <option key={customer.cust_no} value={customer.cust_no}>
                          {customer.name}
                        </option>
                      ))}
                    </select>
                    {submitted && !salesOrder.cust_no && (
                      <span className="error-text">Customer is required.</span>
                    )}
                  </div>

                  <div className="salesorder-form-group">
                    <label>
                      Status <span className="so-required">*</span>
                    </label>
                    <select
                      name="status"
                      value={salesOrder.status}
                      onChange={handleSalesOrderChange}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Add Line Item Section */}
              <div className="salesorder-form-section">
                <h3>Add Line Item</h3>
                <div className="salesorder-form-row">
                  <div className="salesorder-form-group">
                    <label>Product <span className="so-required">*</span></label>
                    <select
                      name="prod_no"
                      value={lineItem.prod_no}
                      onChange={(e) => {
                        handleProductSelection(e.target.value);
                        setAddLineItemErrors(prev => ({ ...prev, prod_no: '' }));
                      }}
                      className={addLineItemErrors.prod_no ? "input-error" : ""}
                      style={{ fontSize: '14px' }}
                    >
                      <option value="">Select Product</option>
                      {getAvailableProducts(
                        tempLineItems.map(item => parseInt(item.prod_no))
                      ).map(product => (
                        <option key={product.prod_no} value={product.prod_no} style={{ fontSize: '11px' }}>
                          {product.brand} {product.name} {product.size_amt} {product.u_size} 
                          | Stock: <span style={{ 
                            color: (lineItem.unit === 'Case' && (product.stock || 0) < (lineItem.qty || 0)) ? 'red' : 'green',
                            fontWeight: 'bold'
                          }}>
                            {product.stock !== null && product.stock !== undefined ? product.stock : '0'}
                          </span>
                          | Loc: {product.loc_name || 'Not Assigned'}
                        </option>
                      ))}
                    </select>
                    {addLineItemErrors.prod_no && (
                      <span className="error-text">{addLineItemErrors.prod_no}</span>
                    )}
                  </div>

                  <div className="salesorder-form-group">
                    <label>Unit <span className="so-required">*</span></label>
                    <select
                      name="unit"
                      value={lineItem.unit}
                      onChange={handleLineItemChange}
                    >
                      <option value="Case">Case</option>
                      <option value="Piece">Piece</option>
                    </select>
                  </div>

                  <div className="salesorder-form-group">
                    <label>Quantity <span className="so-required">*</span></label>
                    <input
                      type="number"
                      name="qty"
                      value={lineItem.qty}
                      onChange={(e) => {
                        const newValue = parseInt(e.target.value) || 0;
                        // Prevent setting value to 0 or negative - keep it as 1
                        if (newValue <= 0) {
                          setLineItem(prev => ({ ...prev, qty: 1 }));
                          setAddLineItemErrors(prev => ({ ...prev, qty: '' }));
                        } else {
                          setLineItem(prev => ({ ...prev, qty: newValue }));
                          
                          // Check stock immediately when typing (for Case units)
                          if (lineItem.unit === 'Case' && lineItem.prod_no) {
                            const product = products.find(p => p.prod_no === parseInt(lineItem.prod_no));
                            if (product && newValue > (product.stock || 0)) {
                              setAddLineItemErrors(prev => ({ 
                                ...prev, 
                                qty: `Insufficient stock! Only ${product.stock || 0} Case(s) available.` 
                              }));
                            } else {
                              setAddLineItemErrors(prev => ({ ...prev, qty: '' }));
                            }
                          } else {
                            setAddLineItemErrors(prev => ({ ...prev, qty: '' }));
                          }
                        }
                      }}
                      onBlur={() => {
                        // Also check on blur for when user tabs out
                        if (lineItem.unit === 'Case' && lineItem.prod_no && lineItem.qty > 0) {
                          const product = products.find(p => p.prod_no === parseInt(lineItem.prod_no));
                          if (product && lineItem.qty > (product.stock || 0)) {
                            setAddLineItemErrors(prev => ({ 
                              ...prev, 
                              qty: `Insufficient stock! Only ${product.stock || 0} Case(s) available.` 
                            }));
                          }
                        }
                      }}
                      min="1"
                      className={addLineItemErrors.qty ? "input-error" : ""}
                    />
                    {addLineItemErrors.qty && (
                      <span className="error-text">{addLineItemErrors.qty}</span>
                    )}
                  </div>

                  <div className="salesorder-form-group">
                    <button
                      type="button"
                      className="add-item-btn"
                      onClick={() => {
                        // Validate before adding
                        let hasError = false;
                        const errors = { prod_no: '', qty: '' };
                        
                        if (!lineItem.prod_no) {
                          errors.prod_no = 'Product is required.';
                          hasError = true;
                        }
                        
                        // Only check stock for Case units (remove quantity <= 0 check)
                        if (lineItem.unit === 'Case' && lineItem.prod_no) {
                          const product = products.find(p => p.prod_no === parseInt(lineItem.prod_no));
                          if (product && lineItem.qty > (product.stock || 0)) {
                            errors.qty = `Insufficient stock! Only ${product.stock || 0} Case(s) available.`;
                            hasError = true;
                          }
                        }
                        
                        if (hasError) {
                          setAddLineItemErrors(errors);
                        } else {
                          addLineItemToTemp();
                          setAddLineItemErrors({ prod_no: '', qty: '' });
                        }
                      }}
                    >
                      Add Item
                    </button>
                  </div>
                </div>
              </div>

              {/* Line Items Table (Temporary) */}
              <div className="line-items-header">
                <h3>Line Items</h3>
                <div className="line-items-search">
                  <FiSearch className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search line items..."
                    value={lineItemSearch}
                    onChange={(e) => setLineItemSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="salesorder-table-wrapper">
                <table className="salesorder-lineitems-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Unit</th>
                      <th>Price</th>
                      <th>Subtotal</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tempLineItems
                      .filter(item => {
                        const fullProductName = `${item.brand} ${item.name} ${item.size_amt} ${item.u_size}`;
                        return fullProductName.toLowerCase().includes(lineItemSearch.toLowerCase());
                      })
                      .map((item) => (
                        <tr key={item.id}>
                          <td style={{ textAlign: 'left' }}>{item.brand} {item.name} {item.size_amt} {item.u_size} {item.loc_name && `(${item.loc_name})`}</td>
                          <td style={{ textAlign: 'left' }}>{item.qty}</td>
                          <td style={{ textAlign: 'left' }}>{item.unit}</td>
                          <td style={{ textAlign: 'right' }}>₱{item.price?.toFixed(2)}</td>
                          <td style={{ textAlign: 'right' }}>₱{item.subtotal?.toFixed(2)}</td>
                          <td style={{ display: 'flex', gap: '5px', justifyContent: 'center', textAlign: 'left' }}>
                            <button
                              type="button"
                              className="edit-item-btn"
                              onClick={() => openEditLineItemModal(item)}
                              title="Edit Line Item"
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
                              title="Delete Line Item"
                            >
                              <FiTrash2 color="rgb(219, 32, 32)" size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>

                <div className="salesorder-total">
                  <strong>Total Amount: ₱{calculateTotalAmount().toFixed(2)}</strong>
                </div>
                {submitted && tempLineItems.length === 0 && (
                  <span className="error-text" style={{ display: 'block', marginTop: '10px' }}>
                    At least one line item is required.
                  </span>
                )}
              </div>

              <div className="salesorder-modal-actions">
                <button type="submit" className="submit-btn">
                  Add Sales Order
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
                    setTempLineItems([]);
                    setSalesOrder({
                      date: new Date().toISOString().split('T')[0],
                      cust_no: '',
                      status: 'Pending',
                      p_status: 'Pending'
                    });
                    setLineItem({
                      prod_no: '',
                      qty: 1,
                      unit: 'Case'
                    });
                    // Reset errors when closing
                    setAddLineItemErrors({ prod_no: '', qty: '' });
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SALES ORDER MODAL */}
      {showEditModal && editingOrder && (
        <div className="salesorder-modal-overlay">
          <div className="salesorder-modal salesorder-modal-large">
            <h2>Edit Sales Order</h2>

            <form onSubmit={updateSalesOrder}>
              {/* Sales Order Information Section */}
              <div className="salesorder-form-section">
                <h3>Sales Order Information</h3>
                <div className="salesorder-form-row">
                  <div className="salesorder-form-group">
                    <label>
                      Date <span className="so-required">*</span>
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={editSalesOrder.date}
                      onChange={handleEditSalesOrderChange}
                      className={submittedEdit && !editSalesOrder.date ? "input-error" : ""}
                      style={{ fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif', fontSize: '14px', fontWeight: 495 }}
                    />
                    {submittedEdit && !editSalesOrder.date && (
                      <span className="error-text">Date is required.</span>
                    )}
                  </div>

                  <div className="salesorder-form-group">
                    <label>
                      Customer <span className="so-required">*</span>
                    </label>
                    <select
                      name="cust_no"
                      value={editSalesOrder.cust_no}
                      onChange={handleEditSalesOrderChange}
                      className={submittedEdit && !editSalesOrder.cust_no ? "input-error" : ""}
                    >
                      <option value="">Select Customer</option>
                      {customers.map(customer => (
                        <option key={customer.cust_no} value={customer.cust_no}>
                          {customer.name}
                        </option>
                      ))}
                    </select>
                    {submittedEdit && !editSalesOrder.cust_no && (
                      <span className="error-text">Customer is required.</span>
                    )}
                  </div>

                  <div className="salesorder-form-group">
                    <label>
                      Status <span className="so-required">*</span>
                    </label>
                    <select
                      name="status"
                      value={editSalesOrder.status}
                      onChange={handleEditSalesOrderChange}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Add Line Item Section */}
              <div className="salesorder-form-section">
                <h3>Add Line Item</h3>
                <div className="salesorder-form-row">
                  <div className="salesorder-form-group">
                    <label>Product <span className="so-required">*</span></label>
                    <select
                      name="prod_no"
                      value={editLineItem.prod_no}
                      onChange={(e) => {
                        handleEditProductSelection(e.target.value);
                        setEditAddLineItemErrors(prev => ({ ...prev, prod_no: '' }));
                      }}
                      className={editAddLineItemErrors.prod_no ? "input-error" : ""}
                      style={{ fontSize: '14px' }}
                    >
                      <option value="">Select Product</option>
                      {getAvailableProducts(
                        editTempLineItems.map(item => parseInt(item.prod_no))
                      ).map(product => (
                        <option key={product.prod_no} value={product.prod_no} style={{ fontSize: '11px' }}>
                          {product.brand} {product.name} {product.size_amt} {product.u_size} 
                          | Stock: <span style={{ 
                            color: (editLineItem.unit === 'Case' && (product.stock || 0) < (editLineItem.qty || 0)) ? 'red' : 'green',
                            fontWeight: 'bold'
                          }}>
                            {product.stock !== null && product.stock !== undefined ? product.stock : '0'}
                          </span>
                          | Loc: {product.loc_name || 'Not Assigned'}
                        </option>
                      ))}
                    </select>
                    {editAddLineItemErrors.prod_no && (
                      <span className="error-text">{editAddLineItemErrors.prod_no}</span>
                    )}
                  </div>

                  <div className="salesorder-form-group">
                    <label>Unit <span className="so-required">*</span></label>
                    <select
                      name="unit"
                      value={editLineItem.unit}
                      onChange={(e) => {
                        setEditLineItem(prev => ({
                          ...prev,
                          unit: e.target.value
                        }));
                      }}
                    >
                      <option value="Case">Case</option>
                      <option value="Piece">Piece</option>
                    </select>
                  </div>

                  <div className="salesorder-form-group">
                    <label>Quantity <span className="so-required">*</span></label>
                    <input
                      type="number"
                      name="qty"
                      value={editLineItem.qty}
                      onChange={(e) => {
                        const newValue = parseInt(e.target.value) || 0;
                        if (newValue <= 0) {
                          setEditLineItem(prev => ({ ...prev, qty: 1 }));
                          setEditAddLineItemErrors(prev => ({ ...prev, qty: '' }));
                        } else {
                          setEditLineItem(prev => ({ ...prev, qty: newValue }));
                          
                          // Check stock immediately when typing (for Case units)
                          if (editLineItem.unit === 'Case' && editLineItem.prod_no) {
                            const product = products.find(p => p.prod_no === parseInt(editLineItem.prod_no));
                            if (product && newValue > (product.stock || 0)) {
                              setEditAddLineItemErrors(prev => ({ 
                                ...prev, 
                                qty: `Insufficient stock! Only ${product.stock || 0} Case(s) available.` 
                              }));
                            } else {
                              setEditAddLineItemErrors(prev => ({ ...prev, qty: '' }));
                            }
                          } else {
                            setEditAddLineItemErrors(prev => ({ ...prev, qty: '' }));
                          }
                        }
                      }}
                      onBlur={() => {
                        
                        if (editLineItem.unit === 'Case' && editLineItem.prod_no && editLineItem.qty > 0) {
                          const product = products.find(p => p.prod_no === parseInt(editLineItem.prod_no));
                          if (product && editLineItem.qty > (product.stock || 0)) {
                            setEditAddLineItemErrors(prev => ({ 
                              ...prev, 
                              qty: `Insufficient stock! Only ${product.stock || 0} Case(s) available.` 
                            }));
                          }
                        }
                      }}
                      min="1"
                      className={editAddLineItemErrors.qty ? "input-error" : ""}
                    />
                    {editAddLineItemErrors.qty && (
                      <span className="error-text">{editAddLineItemErrors.qty}</span>
                    )}
                  </div>

                  <div className="salesorder-form-group">
                    <button
                      type="button"
                      className="add-item-btn"
                      onClick={() => {
                        // Validate before adding
                        let hasError = false;
                        const errors = { prod_no: '', qty: '' };
                        
                        if (!editLineItem.prod_no) {  
                          errors.prod_no = 'Product is required.';
                          hasError = true;
                        }
                        
                        // Only check stock for Case units
                        if (editLineItem.unit === 'Case' && editLineItem.prod_no) {  
                          const product = products.find(p => p.prod_no === parseInt(editLineItem.prod_no));
                          if (product && editLineItem.qty > (product.stock || 0)) {
                            errors.qty = `Insufficient stock! Only ${product.stock || 0} Case(s) available.`;
                            hasError = true;
                          }
                        }
                        
                        if (hasError) {
                          setEditAddLineItemErrors(errors);  
                        } else {
                          addEditLineItemToTemp();  
                          setEditAddLineItemErrors({ prod_no: '', qty: '' });  
                        }
                      }}
                    >
                      Add Item
                    </button>
                  </div>
                </div>
              </div>

              {/* Line Items Table (Edit Temporary) */}
              <div className="line-items-header">
                <h3>Line Items</h3>
                <div className="line-items-search">
                  <FiSearch className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search line items..."
                    value={lineItemSearchEdit}
                    onChange={(e) => setLineItemSearchEdit(e.target.value)}
                  />
                </div>
              </div>
              <div className="salesorder-table-wrapper">
                <table className="salesorder-lineitems-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Unit</th>
                      <th>Price</th>
                      <th>Subtotal</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editTempLineItems
                      .filter(item => {
                        const fullProductName = `${item.brand} ${item.name} ${item.size_amt} ${item.u_size}`;
                        return fullProductName.toLowerCase().includes(lineItemSearchEdit.toLowerCase());
                      })
                      .map((item) => (
                        <tr key={item.id}>
                          <td style={{ textAlign: 'left' }}>{item.brand} {item.name} {item.size_amt} {item.u_size} {item.loc_name && `(${item.loc_name})`}</td>
                          <td style={{ textAlign: 'left' }}>{item.qty}</td>
                          <td style={{ textAlign: 'left' }}>{item.unit}</td>
                          <td style={{ textAlign: 'right' }}>₱{item.price?.toFixed(2)}</td>
                          <td style={{ textAlign: 'right' }}>₱{item.subtotal?.toFixed(2)}</td>
                          <td style={{ display: 'flex', gap: '5px', justifyContent: 'center', textAlign: 'left' }}>
                            <button
                              type="button"
                              className="edit-item-btn"
                              onClick={() => openEditLineItemModalEdit(item)}
                              title="Edit Line Item"
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
                              title="Delete Line Item"
                            >
                              <FiTrash2 color="rgb(219, 32, 32)" size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>

                <div className="salesorder-total">
                  <strong>Total Amount: ₱{calculateEditTotalAmount().toFixed(2)}</strong>
                </div>
                {submittedEdit && editTempLineItems.length === 0 && (
                  <span className="error-text" style={{ display: 'block', marginTop: '10px' }}>
                    At least one line item is required.
                  </span>
                )}
              </div>

              <div className="salesorder-modal-actions">
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
                    setEditTempLineItems([]);
                    setSubmittedEdit(false);
                    setEditLineItem({
                      prod_no: '',
                      qty: 1,
                      unit: 'Case'
                    });
                    // Reset the add line item errors for edit modal
                    setEditAddLineItemErrors({ prod_no: '', qty: '' });
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT LINE ITEM MODAL FOR ADD SALES ORDER */}
      {showEditLineItemModal && editingLineItem && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Edit Line Item</h2>
            
            <form onSubmit={(e) => { 
              e.preventDefault(); 
              const errors = validateEditLineItem();
              if (Object.keys(errors).length === 0) {
                updateLineItem();
              } else {
                setEditLineItemErrors(errors);
              }
            }}>
              <div className="form-group">
                <label>
                  Product <span className="so-required">*</span>
                </label>
                <select
                  name="prod_no"
                  value={editLineItemForm.prod_no}
                  onChange={(e) => {
                    handleEditLineItemChange(e);
                    setEditLineItemErrors(prev => ({ ...prev, prod_no: '' }));
                  }}
                  className={editLineItemErrors.prod_no ? "input-error" : ""}
                  style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }}
                >
                  <option value="">Select Product</option>
                  {products
                    .filter(product => {
                      // Get all product IDs that are already in the temp list
                      const addedProductIds = tempLineItems.map(item => parseInt(item.prod_no));
                      
                      // Exclude ALL products that are already in the temp list
                      if (Number(product.prod_no) === Number(editLineItemForm.prod_no)) {
                        return true;
                      }
                      return !addedProductIds.includes(Number(product.prod_no));
                    })
                    .map(product => (
                      <option key={product.prod_no} value={product.prod_no}>
                        {product.brand} {product.name} {product.size_amt} {product.u_size} 
                        | Stock: {product.stock !== null && product.stock !== undefined ? product.stock : '0'} 
                        | Loc: {product.loc_name || 'Not Assigned'}
                      </option>
                    ))}
                </select>
                {editLineItemErrors.prod_no && (
                  <span className="error-text">{editLineItemErrors.prod_no}</span>
                )}
              </div>

              <div className="form-group">
                <label>
                  Unit <span className="so-required">*</span>
                </label>
                <select
                  name="unit"
                  value={editLineItemForm.unit}
                  onChange={(e) => {
                    handleEditLineItemChange(e);
                    setEditLineItemErrors(prev => ({ ...prev, unit: '' }));
                  }}
                  onBlur={() => {
                    if (!editLineItemForm.unit) {
                      setEditLineItemErrors(prev => ({ ...prev, unit: 'Unit is required' }));
                    }
                  }}
                  className={editLineItemErrors.unit ? "input-error" : ""}
                  style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }}
                >
                  <option value="Piece">Piece</option>
                  <option value="Case">Case</option>
                </select>
                {editLineItemErrors.unit && (
                  <span className="error-text">{editLineItemErrors.unit}</span>
                )}
              </div>

              <div className="form-group">
                <label>
                  Quantity <span className="so-required">*</span>
                </label>
                <input
                  type="number"
                  name="qty"
                  value={editLineItemForm.qty}
                  onChange={(e) => {
                    handleEditLineItemChange(e);
                    setEditLineItemErrors(prev => ({ ...prev, qty: '' }));
                  }}
                  onBlur={() => {
                    const qty = editLineItemForm.qty;
                    if (!qty || qty <= 0) {
                      setEditLineItemErrors(prev => ({ ...prev, qty: 'Quantity must be greater than 0' }));
                    } else if (editLineItemForm.unit === 'Case' && editLineItemForm.prod_no) {
                      const product = products.find(p => p.prod_no === parseInt(editLineItemForm.prod_no));
                      if (product && qty > (product.stock || 0)) {
                        setEditLineItemErrors(prev => ({ 
                          ...prev, 
                          qty: `Insufficient stock! Only ${product.stock || 0} Case(s) available.` 
                        }));
                      }
                    }
                  }}
                  className={editLineItemErrors.qty ? "input-error" : ""}
                  style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }}
                />
                {editLineItemErrors.qty && (
                  <span className="error-text">{editLineItemErrors.qty}</span>
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
                    setShowEditLineItemModal(false);
                    setEditingLineItem(null);
                    setEditLineItemForm({
                      prod_no: '',
                      qty: 1,
                      unit: 'Case'
                    });
                    setEditLineItemErrors({});
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT LINE ITEM MODAL FOR EDIT SALES ORDER */}
      {showEditLineItemModalEdit && editingLineItemEdit && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Edit Line Item</h2>
            
            <form onSubmit={(e) => { 
              e.preventDefault(); 
              const errors = validateEditLineItemEdit();
              if (Object.keys(errors).length === 0) {
                updateLineItemEdit();
              } else {
                setEditLineItemErrorsEdit(errors);
              }
            }}>
              <div className="form-group">
                <label>
                  Product <span className="so-required">*</span>
                </label>
                <select
                  name="prod_no"
                  value={editLineItemFormEdit.prod_no}
                  onChange={(e) => {
                    handleEditLineItemChangeEdit(e);
                    setEditLineItemErrorsEdit(prev => ({ ...prev, prod_no: '' }));
                  }}
                  className={editLineItemErrorsEdit.prod_no ? "input-error" : ""}
                  style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }}
                >
                  <option value="">Select Product</option>
                  {products
                    .filter(product => {
                      // Get all product IDs that are already in the edit temp list
                      const addedProductIds = editTempLineItems.map(item => parseInt(item.prod_no));
                      
                      // Exclude ALL products that are already in the edit temp list 
                      if (Number(product.prod_no) === Number(editLineItemFormEdit.prod_no)) {
                        return true;
                      }
                      return !addedProductIds.includes(Number(product.prod_no));
                    })
                    .map(product => (
                      <option key={product.prod_no} value={product.prod_no}>
                        {product.brand} {product.name} {product.size_amt} {product.u_size} 
                        | Stock: {product.stock !== null && product.stock !== undefined ? product.stock : '0'} 
                        | Loc: {product.loc_name || 'Not Assigned'}
                      </option>
                    ))}
                </select>
                {editLineItemErrorsEdit.prod_no && (
                  <span className="error-text">{editLineItemErrorsEdit.prod_no}</span>
                )}
              </div>

              <div className="form-group">
                <label>
                  Unit <span className="so-required">*</span>
                </label>
                <select
                  name="unit"
                  value={editLineItemFormEdit.unit}
                  onChange={(e) => {
                    handleEditLineItemChangeEdit(e);
                    setEditLineItemErrorsEdit(prev => ({ ...prev, unit: '' }));
                  }}
                  onBlur={() => {
                    if (!editLineItemFormEdit.unit) {
                      setEditLineItemErrorsEdit(prev => ({ ...prev, unit: 'Unit is required' }));
                    }
                  }}
                  className={editLineItemErrorsEdit.unit ? "input-error" : ""}
                  style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }}
                >
                  <option value="Piece">Piece</option>
                  <option value="Case">Case</option>
                </select>
                {editLineItemErrorsEdit.unit && (
                  <span className="error-text">{editLineItemErrorsEdit.unit}</span>
                )}
              </div>

              <div className="form-group">
                <label>
                  Quantity <span className="so-required">*</span>
                </label>
                <input
                  type="number"
                  name="qty"
                  value={editLineItemFormEdit.qty}
                  onChange={(e) => {
                    handleEditLineItemChangeEdit(e);
                    setEditLineItemErrorsEdit(prev => ({ ...prev, qty: '' }));
                  }}
                  onBlur={() => {
                    const qty = editLineItemFormEdit.qty;
                    if (!qty || qty <= 0) {
                      setEditLineItemErrorsEdit(prev => ({ ...prev, qty: 'Quantity must be greater than 0' }));
                    } else if (editLineItemFormEdit.unit === 'Case' && editLineItemFormEdit.prod_no) {
                      const product = products.find(p => p.prod_no === parseInt(editLineItemFormEdit.prod_no));
                      if (product && qty > (product.stock || 0)) {
                        setEditLineItemErrorsEdit(prev => ({ 
                          ...prev, 
                          qty: `Insufficient stock! Only ${product.stock || 0} Case(s) available.` 
                        }));
                      }
                    }
                  }}
                  className={editLineItemErrorsEdit.qty ? "input-error" : ""}
                  style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }}
                />
                {editLineItemErrorsEdit.qty && (
                  <span className="error-text">{editLineItemErrorsEdit.qty}</span>
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
                    setShowEditLineItemModalEdit(false);
                    setEditingLineItemEdit(null);
                    setEditLineItemFormEdit({
                      prod_no: '',
                      qty: 1,
                      unit: 'Case'
                    });
                    setEditLineItemErrorsEdit({});
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE LINE ITEM MODAL - SHARED FOR BOTH ADD AND EDIT */}
      {showDeleteItemModal && selectedDeleteItem && (
        <div className="salesorder-delete-modal-overlay">
          <div className="salesorder-delete-modal-content">
            <p>
              Are you sure you want to delete{' '}
              <strong>
                {selectedDeleteItem?.brand} {selectedDeleteItem?.name} {selectedDeleteItem?.size_amt} {selectedDeleteItem?.u_size}
                {selectedDeleteItem?.loc_name && ` (${selectedDeleteItem.loc_name})`}
              </strong>
              ?
            </p>
            <div className="salesorder-delete-modal-actions">
              <button
                className="salesorder-confirm-delete-btn"
                onClick={confirmDeleteLineItem}
              >
                Delete
              </button>
              <button
                className="salesorder-cancel-delete-btn"
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
            <h2 className="title">Sales Order</h2>
            <hr />
            <p><strong>Date:</strong> {printData.date ? new Date(printData.date).toLocaleDateString() : 'N/A'}</p>
            <p><strong>Customer:</strong> {printData.customer}</p>
          </div>

          <div className="print-items">
            <h3 style={{marginTop: '40px'}}>Line Items</h3>
            <table className="print-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Unit</th>
                  <th>Price</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {printData.items && printData.items.length > 0 ? (
                  printData.items.map((item, index) => (
                    <tr key={index}>
                      <td style={{ textAlign: 'left' }}>{item?.brand || ''} {item?.name || ''} {item?.size_amt || ''} {item?.u_size || ''}</td>
                      <td style={{ textAlign: 'left' }}>{item?.qty || 0}</td>
                      <td style={{ textAlign: 'left' }}>{item?.unit || ''}</td>
                      <td style={{ textAlign: 'right' }}>₱{(item?.price || 0).toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>₱{(item?.subtotal || 0).toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center' }}>No items added</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="4" style={{ textAlign: 'right' }}><strong>Total Amount:</strong></td>
                  <td><strong>₱{(printData.total || 0).toFixed(2)}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          <div className="print-footer" style={{marginTop: '40px'}}>
            <p>Thank you!</p>
          </div>
        </div>
      </div>

      {/* VIEW ONLY SALES ORDER MODAL */}
      {showViewOnlyModal && viewOrder && (
        <div className="salesorder-modal-overlay">
          <div className="salesorder-modal salesorder-modal-large">
            <h2>Sales Order</h2>

            {/* Sales Order Information Section */}
            <div className="salesorder-form-section">
              <h3>Sales Order Information</h3>
              <div className="salesorder-form-row">
                <div className="salesorder-form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    value={viewOrder.date ? new Date(viewOrder.date).toISOString().split('T')[0] : ''}
                    disabled
                    style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                    style={{ fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif', fontSize: '14px', fontWeight: 499, color: '#000' }}
                  />
                </div>

                <div className="salesorder-form-group">
                  <label>Customer</label>
                  <div className="view-only-display">
                    {customers.find(c => c.cust_no === parseInt(viewOrder.cust_no))?.name || 'Not selected'}
                  </div>
                </div>

                <div className="salesorder-form-group">
                  <label>Status</label>
                  <div className="view-only-display">
                    {viewOrder.status || 'Pending'}
                  </div>
                </div>
              </div>
            </div>

            {/* Line Items Table (View Only with Search) */}
            <div className="line-items-header">
              <h3>Line Items</h3>
              <div className="line-items-search">
                <FiSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search line items..."
                  value={viewLineItemSearch}
                  onChange={(e) => setViewLineItemSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="salesorder-table-wrapper">
              <table className="salesorder-lineitems-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Unit</th>
                    <th>Price</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {viewOrderItems
                    .filter(item => {
                      const fullProductName = `${item.PRODUCT?.brand || ''} ${item.PRODUCT?.name || ''} ${item.PRODUCT?.size_amt || ''} ${item.PRODUCT?.u_size || ''}`;
                      return fullProductName.toLowerCase().includes(viewLineItemSearch.toLowerCase());
                    })
                    .map((item, index) => (
                      <tr key={index}>
                        <td style={{ textAlign: 'left' }}>{item.PRODUCT?.brand || ''} {item.PRODUCT?.name || ''} {item.PRODUCT?.size_amt || ''} {item.PRODUCT?.u_size || ''} {item.PRODUCT?.loc_name && `(${item.PRODUCT.loc_name})`}</td>
                        <td style={{ textAlign: 'left' }}>{item.qty}</td>
                        <td style={{ textAlign: 'left' }}>{item.unit}</td>
                        <td style={{ textAlign: 'right' }}>₱{(item.unit === 'Case' ? item.PRODUCT?.price_case : item.PRODUCT?.price_piece)?.toFixed(2)}</td>
                        <td style={{ textAlign: 'right' }}>₱{item.subtotal?.toFixed(2)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>

              <div className="salesorder-total">
                <strong>Total Amount: ₱{viewOrder.total_amt?.toFixed(2)}</strong>
              </div>
            </div>

            <div className="salesorder-modal-actions">
              <button
                type="button"
                className="print-btn"
                onClick={() => {
                  const customerName = customers.find(c => c.cust_no === parseInt(viewOrder.cust_no))?.name || 'Not selected';
                  const transformedItems = viewOrderItems.map(item => ({
                    brand: item.PRODUCT?.brand || '',
                    name: item.PRODUCT?.name || '',
                    size_amt: item.PRODUCT?.size_amt || '',
                    u_size: item.PRODUCT?.u_size || '',
                    qty: item.qty,
                    unit: item.unit,
                    price: item.unit === 'Case' ? item.PRODUCT?.price_case : item.PRODUCT?.price_piece,
                    subtotal: item.subtotal
                  }));
                  // Group the items before printing
                  const groupedItems = groupProductsForPrint(transformedItems);
                  setPrintData({
                    date: viewOrder.date,
                    customer: customerName,
                    items: groupedItems,
                    total: viewOrder.total_amt || 0
                  });
                  setTimeout(() => {
                    window.print();
                  }, 100);
                }}
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
                  setViewLineItemSearch('');
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesOrder;