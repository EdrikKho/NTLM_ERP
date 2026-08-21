import React, { useEffect, useState } from 'react';
import { supabase } from '../client';
import Sidebar from './Sidebar';
import './Inventory.css'; // Changed to Inventory.css
import { FiSearch, FiPlus, FiTrash2, FiEdit } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { toast, ToastContainer } from 'react-toastify';

// For instant loading
const CACHE_KEY = 'productsInOrders';

const Inventory = () => {
  const { user } = useAuth();

  const role = user?.user_metadata?.role || '';
  const firstName = user?.user_metadata?.first_name || '';
  const lastName = user?.user_metadata?.last_name || '';

  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');

  const [submitted, setSubmitted] = useState(false);
  const [submittedEdit, setSubmittedEdit] = useState(false);

  const [locationFilter, setLocationFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const [sortOption, setSortOption] = useState('default'); // 'default' or 'alphabetical'

  // ADD PRODUCT STATE
  const [product, setProduct] = useState({
    brand: '',
    name: '',
    size_amt: '',
    u_size: '',
    category: '',
    price_case: '',
    price_piece: '',
    sup_no: '',
    loc_name: '',
    stock: ''
  });

  // EDIT PRODUCT STATE
  const [product2, setProduct2] = useState({
    prod_no: '',
    brand: '',
    name: '',
    size_amt: '',
    u_size: '',
    category: '',
    price_case: '',
    price_piece: '',
    sup_no: '',
    loc_name: '',
    stock: ''
  });

  const [showModal, setShowModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // DELETE MODAL
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [productsInOrders, setProductsInOrders] = useState(() => {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
});

  useEffect(() => {
    fetchProducts();
    fetchSuppliers();
    fetchProductsInAnyOrder();
  }, []);

  // FETCH PRODUCTS
  async function fetchProducts() {
    const { data, error } = await supabase
      .from('PRODUCT')
      .select('*')
      .order('prod_no', { ascending: false });

    if (!error) {
      setProducts(data || []);
    } else {
      toast.error('Failed to fetch products');
    }
  }

  // FETCH PRODUCTS THAT ARE IN LINE ITEMS, ORDER ITEMS, OR TRANSFER ITEMS
  async function fetchProductsInAnyOrder() {
    try {
      // Fetch all in parallel for speed
      const [purchaseLineItems, salesLineItems, transferItems] = await Promise.all([
        supabase.from('LINE_ITEM').select('prod_no'),
        supabase.from('ORDER_ITEM').select('prod_no'),
        supabase.from('TRANS_ITEM').select('from_prod, to_prod')
      ]);

      const allProductIds = new Set(); // Using Set for better performance

      // Add from purchase orders
      if (purchaseLineItems.data) {
        purchaseLineItems.data.forEach(item => allProductIds.add(item.prod_no));
      }

      // Add from sales orders
      if (salesLineItems.data) {
        salesLineItems.data.forEach(item => allProductIds.add(item.prod_no));
      }

      // Add from inventory transfers (both from_prod and to_prod)
      if (transferItems.data) {
        transferItems.data.forEach(item => {
          if (item.from_prod) allProductIds.add(item.from_prod);
          if (item.to_prod) allProductIds.add(item.to_prod);
        });
      }

      const uniqueProductIds = [...allProductIds];
      
      // Update state
      setProductsInOrders(uniqueProductIds);
      
      // Save to cache for instant loading next time
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(uniqueProductIds));
      } catch (e) {
        // Ignore storage errors
      }

      return uniqueProductIds;
    } catch (error) {
      console.error('Error fetching products in orders:', error);
      toast.error('Failed to check product usage in orders');
      return [];
    }
  }

  // FETCH SUPPLIERS FOR DROPDOWN
  async function fetchSuppliers() {
    const { data, error } = await supabase
      .from('SUPPLIER')
      .select('sup_no, com_name')
      .order('com_name', { ascending: true });

    if (!error) {
      setSuppliers(data || []);
    } else {
      toast.error('Failed to fetch suppliers');
    }
  }

  // HANDLE INPUT
  function handleChange(e) {
    setProduct(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  }

  function handleChange2(e) {
    setProduct2(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  }

  
  // ADD PRODUCT
  async function addProduct(e) {
    e.preventDefault();

    setSubmitted(true);

    // STOP SUBMIT if any required field is empty
    if (
      !product.brand ||
      !product.name ||
      !product.size_amt ||
      !product.u_size ||
      !product.category ||
      !product.price_case ||
      !product.price_piece ||
      !product.sup_no ||
      !product.loc_name ||
      !product.stock
    ) {
      return;
    }

    // Check for duplicate product
    const isDuplicate = await checkDuplicateProduct(
      product.brand,
      product.name,
      product.size_amt,
      product.u_size,
      product.loc_name
    );

    if (isDuplicate) {
      toast.error(`The product with the same details already exists in the ${product.loc_name}`);
      return;
    }

    const { error } = await supabase
      .from('PRODUCT')
      .insert([product]);

    if (!error) {
      toast.success('Product added successfully');

      setProduct({
        brand: '',
        name: '',
        size_amt: '',
        u_size: '',
        category: '',
        price_case: '',
        price_piece: '',
        sup_no: '',
        loc_name: '',
        stock: ''
      });

      setSubmitted(false);
      setShowAddModal(false);
      fetchProducts();
    } else {
      toast.error('Failed to add product');
    }
  }

  // OPEN EDIT MODAL
  function displayProduct(productId) {
    const selected = products.find(
      p => p.prod_no === productId
    );

    if (selected) {
      setProduct2({
        prod_no: selected.prod_no,
        brand: selected.brand,
        name: selected.name,
        size_amt: selected.size_amt,
        u_size: selected.u_size,
        category: selected.category,
        price_case: selected.price_case,
        price_piece: selected.price_piece,
        sup_no: selected.sup_no,
        loc_name: selected.loc_name,
        stock: selected.stock
      });
      setSubmittedEdit(false);
      setShowModal(true);
    }
  }

  // EDIT PRODUCT
  async function editProduct(e) {
    e.preventDefault();

    setSubmittedEdit(true);

    if (
      !product2.brand ||
      !product2.name ||
      !product2.size_amt ||
      !product2.u_size ||
      !product2.category ||
      !product2.price_case ||
      !product2.price_piece ||
      !product2.sup_no ||
      !product2.loc_name ||
      !product2.stock
    ) {
      return;
    }

    // Check for duplicate product (excluding current product)
    const isDuplicate = await checkDuplicateProduct(
      product2.brand,
      product2.name,
      product2.size_amt,
      product2.u_size,
      product2.loc_name,
      product2.prod_no  
    );

    if (isDuplicate) {
      toast.error(`The product with the same details already exists in the ${product2.loc_name}`);
      return;
    }

    const { error } = await supabase
      .from('PRODUCT')
      .update({
        brand: product2.brand,
        name: product2.name,
        size_amt: product2.size_amt,
        u_size: product2.u_size,
        category: product2.category,
        price_case: product2.price_case,
        price_piece: product2.price_piece,
        sup_no: product2.sup_no,
        loc_name: product2.loc_name,
        stock: product2.stock
      })
      .eq('prod_no', product2.prod_no);

    if (!error) {
      toast.success('Product updated successfully');
      setShowModal(false);
      setSubmittedEdit(false);
      fetchProducts();
    } else {
      toast.error('Failed to update product');
    }
  }

  // DELETE PRODUCT
  async function confirmDeleteProduct() {
    const { error } = await supabase
      .from('PRODUCT')
      .delete()
      .eq('prod_no', selectedProduct.prod_no);

    if (!error) {
      toast.success(
        `${selectedProduct.brand} ${selectedProduct.name} ${selectedProduct.size_amt} ${selectedProduct.u_size} deleted successfully`
      );
      
      // Update cache immediately after deletion
      const updatedProductsInOrders = [...productsInOrders, selectedProduct.prod_no];
      setProductsInOrders(updatedProductsInOrders);
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(updatedProductsInOrders));
      
      fetchProductsInAnyOrder();
    } else {
      toast.error('Failed to delete product');
    }

    setShowDeleteModal(false);
    setSelectedProduct(null);
    fetchProducts();
  }

  // CHECK FOR DUPLICATE PRODUCT
  async function checkDuplicateProduct(brand, name, size_amt, u_size, loc_name, excludeProdNo = null) {
    let query = supabase
      .from('PRODUCT')
      .select('*')
      .eq('brand', brand)
      .eq('name', name)
      .eq('size_amt', size_amt)
      .eq('u_size', u_size)
      .eq('loc_name', loc_name);
    
    // If editing, exclude the current product from the check
    if (excludeProdNo) {
      query = query.neq('prod_no', excludeProdNo);
    }
    
    const { data, error } = await query;
    
    if (error) {
      toast.error('Error checking for duplicates');
      return false;
    }
    
    return data && data.length > 0;
  }

  // FETCH UNIQUE CATEGORIES
  useEffect(() => {
    if (products.length > 0) {
      const uniqueCategories = [...new Set(products.map(p => p.category).filter(Boolean))];
      setCategories(uniqueCategories.sort());
    }
  }, [products]);

  // SEARCH FILTER WITH SORTING
const filteredProducts = products
  .filter((p) => {
    const matchesSearch = 
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.brand?.toLowerCase().includes(search.toLowerCase()) ||
      p.size_amt?.toString().toLowerCase().includes(search.toLowerCase()) ||
      p.u_size?.toLowerCase().includes(search.toLowerCase());
    
    const matchesLocation = locationFilter ? p.loc_name === locationFilter : true;
    
    const matchesCategory = categoryFilter ? p.category === categoryFilter : true;
    
    return matchesSearch && matchesLocation && matchesCategory;
  })
  .sort((a, b) => {
    if (sortOption === 'alphabetical') {
      // Sort alphabetically by brand
      return a.brand.localeCompare(b.brand);
    }
    // Default: sort by prod_no descending (most recently added first)
    return b.prod_no - a.prod_no;
  });

  return (
    <div className="inventory-page">
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
      <div className="inventory-header-row">
        
        <h1>Inventory</h1>
        <button
          className="add-product-btn"
          onClick={() => setShowAddModal(true)}
        >
          <FiPlus className="icon" />
          Add Product
        </button>
      </div>

      {/* SEARCH AND FILTERS */}
      
        <div className="inventory-top-wrapper">
          <div className="inventory-search-card">
            <div className="inventory-filters-container">
              <div className="inventory-search-container">
                <FiSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search by product...."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="inventory-search-bar"
                />
              </div>

              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="inventory-filter-select"
                style={{ marginRight: '-4px', marginLeft: '-4px', Width: '100px' }}
              >
                <option value="default">Default (Newest First)</option>
                <option value="alphabetical">Alphabetical (A-Z)</option>
              </select>

              <div className="inventory-filter-group">
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="inventory-filter-select"
                >
                  <option value="">All Locations</option>
                  <option value="Warehouse">Warehouse</option>
                  <option value="Store">Store</option>
                </select>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="inventory-filter-select"
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      

      {/* TABLE */}
        <div className="inventory-table-container">
          <table className="inventory-styled-table">
            <thead>
              <tr>
                <th>Brand</th>
                <th>Name</th>
                <th>Size</th>
                <th>Category</th>
                <th>Price (Box/Sack)</th>
                <th>Price (Piece)</th>
                <th>Location</th>
                <th>Quantity</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.prod_no}>
                  <td style={{ textAlign: 'left' }}>{product.brand}</td>
                  <td style={{ textAlign: 'left' }}>{product.name}</td>
                  <td style={{ textAlign: 'left' }}>{product.size_amt} {product.u_size}</td>
                  <td style={{ textAlign: 'left' }}>{product.category}</td>
                  <td style={{ textAlign: 'right' }}>₱ {parseFloat(product.price_case).toFixed(2)}</td>
                  <td style={{ textAlign: 'right' }}>₱ {parseFloat(product.price_piece).toFixed(2)}</td>
                  <td style={{ textAlign: 'left' }}>{product.loc_name}</td>
                  <td style={{ textAlign: 'left' }}>{product.stock}</td>

                  <td style={{ textAlign: 'left' }}>
                    <button
                      className="inventory-edit-btn"
                      onClick={() =>
                        displayProduct(product.prod_no)
                      }
                      title="Edit Product"
                    >
                      <FiEdit color="#185229" size={18} />
                    </button>

                    {!productsInOrders.includes(product.prod_no) && (
                      <button
                        className="inventory-del-btn"
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowDeleteModal(true);
                        }}
                        title="Delete Product"
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

      {/* ADD MODAL */}
      {showAddModal && (
        <div className="inventory-modal-overlay">
          <div className="inventory-modal">
            <h2>Add Product</h2>

            <form onSubmit={addProduct}>
              <label>
                Brand
                <span className="inventory-required">*</span>
              </label>
              <input
                name="brand"
                value={product.brand}
                onChange={handleChange}
                className={submitted && !product.brand ? "inventory-input-error" : ""}
              />

              {submitted && !product.brand && (
                <span className="inventory-error-text">
                  Brand is required.
                </span>
              )}

              <label>
                Product Name
                <span className="inventory-required">*</span>
              </label>
              <input
                name="name"
                value={product.name}
                onChange={handleChange}
                className={submitted && !product.name ? "inventory-input-error" : ""}
              />

              {submitted && !product.name && (
                <span className="inventory-error-text">Product Name is required.</span>
              )}

              <label>
                Size Amount
                <span className="inventory-required">*</span>
              </label>
              <input
                name="size_amt"
                type="number"
                step="any"
                value={product.size_amt}
                onChange={handleChange}
                className={submitted && !product.size_amt ? "inventory-input-error" : ""}
              />

              {submitted && !product.size_amt && (
                <span className="inventory-error-text">Size Amount is required.</span>
              )}

              <label>
                Unit Size
                <span className="inventory-required">*</span>
              </label>
              <input
                name="u_size"
                value={product.u_size}
                onChange={handleChange}
                className={submitted && !product.u_size ? "inventory-input-error" : ""}
              />

              {submitted && !product.u_size && (
                <span className="inventory-error-text">Unit Size is required.</span>
              )}

              <label>
                Category
                <span className="inventory-required">*</span>
              </label>
              <input
                name="category"
                value={product.category}
                onChange={handleChange}
                className={submitted && !product.category ? "inventory-input-error" : ""}
              />

              {submitted && !product.category && (
                <span className="inventory-error-text">Category is required.</span>
              )}

              <label>
                Price (Case)
                <span className="inventory-required">*</span>
              </label>
              <input
                name="price_case"
                type="number"
                step="0.01"
                value={product.price_case}
                onChange={handleChange}
                className={submitted && !product.price_case ? "inventory-input-error" : ""}
              />

              {submitted && !product.price_case && (
                <span className="inventory-error-text">Price (Case) is required.</span>
              )}

              <label>
                Price (Piece)
                <span className="inventory-required">*</span>
              </label>
              <input
                name="price_piece"
                type="number"
                step="0.01"
                value={product.price_piece}
                onChange={handleChange}
                className={submitted && !product.price_piece ? "inventory-input-error" : ""}
              />

              {submitted && !product.price_piece && (
                <span className="inventory-error-text">Price (Piece) is required.</span>
              )}

              <label>
                Supplier
                <span className="inventory-required">*</span>
              </label>
              <select
                name="sup_no"
                value={product.sup_no}
                onChange={handleChange}
                className={submitted && !product.sup_no ? "inventory-input-error" : ""}
              >
                <option value="">Select Supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.sup_no} value={supplier.sup_no}>
                    {supplier.com_name}
                  </option>
                ))}
              </select>

              {submitted && !product.sup_no && (
                <span className="inventory-error-text">Supplier is required.</span>
              )}

              <label>
                Location
                <span className="inventory-required">*</span>
              </label>
              <select
                name="loc_name"
                value={product.loc_name}
                onChange={handleChange}
                className={submitted && !product.loc_name ? "inventory-input-error" : ""}
              >
                <option value="">Select Location</option>
                <option value="Warehouse">Warehouse</option>
                <option value="Store">Store</option>
              </select>

              {submitted && !product.loc_name && (
                <span className="inventory-error-text">Location is required.</span>
              )}

              <label>
                Stock
                <span className="inventory-required">*</span>
              </label>
              <input
                name="stock"
                type="number"
                step="1"
                value={product.stock}
                onChange={handleChange}
                className={submitted && !product.stock ? "inventory-input-error" : ""}
              />

              {submitted && !product.stock && (
                <span className="inventory-error-text">Stock is required.</span>
              )}

              <div className="inventory-modal-actions">
                <button type="submit">
                  Save
                </button>

                <button
                  type="button"
                  className="inventory-cancel-btn"
                  onClick={() => {
                    setShowAddModal(false);
                    setSubmitted(false);

                    setProduct({
                      brand: '',
                      name: '',
                      size_amt: '',
                      u_size: '',
                      category: '',
                      price_case: '',
                      price_piece: '',
                      sup_no: '',
                      loc_name: '',
                      stock: ''
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
        <div className="inventory-modal-overlay">
          <div className="inventory-modal">
            <h2>Edit Product</h2>

            <form onSubmit={editProduct}>
              <label>
                Brand
                <span className="inventory-required">*</span>
              </label>
              <input
                name="brand"
                value={product2.brand}
                onChange={handleChange2}
                className={submittedEdit && !product2.brand ? "inventory-input-error" : ""}
              />

              {submittedEdit && !product2.brand && (
                <span className="inventory-error-text">Brand is required</span>
              )}

              <label>
                Product Name
                <span className="inventory-required">*</span>
              </label>
              <input
                name="name"
                value={product2.name}
                onChange={handleChange2}
                className={submittedEdit && !product2.name ? "inventory-input-error" : ""}
              />

              {submittedEdit && !product2.name && (
                <span className="inventory-error-text">Product Name is required</span>
              )}

              <label>
                Size Amount
                <span className="inventory-required">*</span>
              </label>
              <input
                name="size_amt"
                type="number"
                step="any"
                value={product2.size_amt}
                onChange={handleChange2}
                className={submittedEdit && !product2.size_amt ? "inventory-input-error" : ""}
              />

              {submittedEdit && !product2.size_amt && (
                <span className="inventory-error-text">Size Amount is required</span>
              )}

              <label>
                Unit Size
                <span className="inventory-required">*</span>
              </label>
              <input
                name="u_size"
                value={product2.u_size}
                onChange={handleChange2}
                className={submittedEdit && !product2.u_size ? "inventory-input-error" : ""}
              />

              {submittedEdit && !product2.u_size && (
                <span className="inventory-error-text">Unit Size is required</span>
              )}

              <label>
                Category
                <span className="inventory-required">*</span>
              </label>
              <input
                name="category"
                value={product2.category}
                onChange={handleChange2}
                className={submittedEdit && !product2.category ? "inventory-input-error" : ""}
              />

              {submittedEdit && !product2.category && (
                <span className="inventory-error-text">Category is required</span>
              )}

              <label>
                Price (Case)
                <span className="inventory-required">*</span>
              </label>
              <input
                name="price_case"
                type="number"
                step="0.01"
                value={product2.price_case}
                onChange={handleChange2}
                className={submittedEdit && !product2.price_case ? "inventory-input-error" : ""}
              />

              {submittedEdit && !product2.price_case && (
                <span className="inventory-error-text">Price (Case) is required.</span>
              )}

              <label>
                Price (Piece)
                <span className="inventory-required">*</span>
              </label>
              <input
                name="price_piece"
                type="number"
                step="0.01"
                value={product2.price_piece}
                onChange={handleChange2}
                className={submittedEdit && !product2.price_piece ? "inventory-input-error" : ""}
              />

              {submittedEdit && !product2.price_piece && (
                <span className="inventory-error-text">Price (Piece) is required.</span>
              )}

              <label>
                Supplier
                <span className="inventory-required">*</span>
              </label>
              <select
                name="sup_no"
                value={product2.sup_no}
                onChange={handleChange2}
                className={submittedEdit && !product2.sup_no ? "inventory-input-error" : ""}
              >
                <option value="">Select Supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.sup_no} value={supplier.sup_no}>
                    {supplier.com_name}
                  </option>
                ))}
              </select>

              {submittedEdit && !product2.sup_no && (
                <span className="inventory-error-text">Supplier is required</span>
              )}

              <label>
                Location
                <span className="inventory-required">*</span>
              </label>
              <select
                name="loc_name"
                value={product2.loc_name}
                onChange={handleChange2}
                className={submittedEdit && !product2.loc_name ? "inventory-input-error" : ""}
              >
                <option value="">Select Location</option>
                <option value="Warehouse">Warehouse</option>
                <option value="Store">Store</option>
              </select>

              {submittedEdit && !product2.loc_name && (
                <span className="inventory-error-text">Location is required</span>
              )}

              <label>
                Stock
                <span className="inventory-required">*</span>
              </label>
              <input
                name="stock"
                type="number"
                step="1"
                value={product2.stock}
                onChange={handleChange2}
                className={submittedEdit && !product2.stock ? "inventory-input-error" : ""}
              />

              {submittedEdit && !product2.stock && (
                <span className="inventory-error-text">Stock is required</span>
              )}

              <div className="inventory-modal-actions">
                <button type="submit">
                  Save Changes
                </button>

                <button
                  type="button"
                  className="inventory-cancel-btn"
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
        <div className="inventory-delete-modal">
          <div className="inventory-delete-modal-content">
            <p>
              Are you sure you want to delete{' '}
              <strong>
                {selectedProduct?.brand} {selectedProduct?.name} {selectedProduct?.size_amt} {selectedProduct?.u_size}
              </strong>
              ?
            </p>

            <div className="inventory-delete-modal-actions">
              <button
                className="inventory-confirm-delete-btn"
                onClick={confirmDeleteProduct}
              >
                Delete
              </button>

              <button
                className="inventory-cancel-delete-btn"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedProduct(null);
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

export default Inventory;