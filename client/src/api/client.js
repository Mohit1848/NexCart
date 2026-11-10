import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000
});

// Attach Authorization token to requests if present in localStorage
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('nexcart_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Format Indian Rupee currency standard
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(amount || 0);
};

/**
 * Ensures an active customer session exists for cart & wishlist interaction
 */
export const ensureCustomerSession = async () => {
  const existingToken = localStorage.getItem('nexcart_token');
  if (existingToken) return existingToken;

  try {
    // Attempt demo login first
    const demoEmail = 'shopper@nexcart.local';
    const demoPassword = 'Password123';

    try {
      const loginRes = await apiClient.post('/auth/login', {
        email: demoEmail,
        password: demoPassword
      });
      const token = loginRes.data.data.token;
      localStorage.setItem('nexcart_token', token);
      return token;
    } catch {
      // If demo user does not exist, auto-register once
      const regRes = await apiClient.post('/auth/register', {
        fullName: 'NexCart Customer',
        email: demoEmail,
        password: demoPassword
      });
      const token = regRes.data.data.token;
      localStorage.setItem('nexcart_token', token);
      return token;
    }
  } catch (err) {
    console.warn('Customer session init failed:', err.message);
    return null;
  }
};

/**
 * Catalog API calls
 */
export const fetchProducts = async (params = {}) => {
  const response = await apiClient.get('/products', { params });
  return response.data.data;
};

export const fetchProductById = async (id) => {
  const response = await apiClient.get(`/products/${id}`);
  return response.data.data.product;
};

export const fetchProductBySlug = async (slug) => {
  const response = await apiClient.get(`/products/slug/${slug}`);
  return response.data.data.product;
};

export const fetchCategories = async () => {
  const response = await apiClient.get('/categories');
  return response.data.data.categories;
};

/**
 * Cart API calls
 */
export const fetchCart = async () => {
  await ensureCustomerSession();
  const response = await apiClient.get('/cart');
  return response.data.data.cart;
};

export const addToCartApi = async (productId, quantity = 1) => {
  await ensureCustomerSession();
  const response = await apiClient.post('/cart/items', { productId, quantity });
  return response.data.data.cart;
};

export const updateCartItemApi = async (productId, quantity) => {
  await ensureCustomerSession();
  const response = await apiClient.patch(`/cart/items/${productId}`, { quantity });
  return response.data.data.cart;
};

export const removeCartItemApi = async (productId) => {
  await ensureCustomerSession();
  const response = await apiClient.delete(`/cart/items/${productId}`);
  return response.data.data.cart;
};

export const clearCartApi = async () => {
  await ensureCustomerSession();
  const response = await apiClient.delete('/cart/clear');
  return response.data.data.cart;
};

/**
 * Wishlist API calls
 */
export const fetchWishlist = async () => {
  await ensureCustomerSession();
  const response = await apiClient.get('/wishlist');
  return response.data.data.wishlist;
};

export const addToWishlistApi = async (productId) => {
  await ensureCustomerSession();
  const response = await apiClient.post('/wishlist/items', { productId });
  return response.data.data.wishlist;
};

export const removeWishlistItemApi = async (productId) => {
  await ensureCustomerSession();
  const response = await apiClient.delete(`/wishlist/items/${productId}`);
  return response.data.data.wishlist;
};

export const moveWishlistItemToCartApi = async (productId) => {
  await ensureCustomerSession();
  const response = await apiClient.post(`/wishlist/items/${productId}/move-to-cart`);
  return response.data.data;
};

/**
 * Authentication API calls
 */
export const loginUserApi = async (email, password) => {
  const response = await apiClient.post('/auth/login', { email, password });
  return response.data.data;
};

export const fetchCurrentUserApi = async () => {
  const response = await apiClient.get('/auth/me');
  return response.data.data.user;
};

/**
 * Customer Orders API calls
 */
export const fetchOrdersApi = async (params = {}) => {
  const response = await apiClient.get('/orders', { params });
  return response.data.data;
};

export const fetchOrderByIdApi = async (orderId) => {
  const response = await apiClient.get(`/orders/${orderId}`);
  return response.data.data.order;
};

export const checkoutApi = async (idempotencyKey = null) => {
  const headers = {};
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }
  const response = await apiClient.post('/orders/checkout', {}, { headers });
  return response.data.data.order;
};

/**
 * Admin API calls (Guarded by RBAC on backend)
 */
export const fetchAdminMetrics = async () => {
  const response = await apiClient.get('/admin/metrics');
  return response.data.data;
};

export const fetchAdminProducts = async (params = {}) => {
  const response = await apiClient.get('/admin/products', { params });
  return response.data.data;
};

export const updateProductStockApi = async (productId, stockQuantity) => {
  const response = await apiClient.patch(`/admin/products/${productId}/stock`, {
    stockQuantity: Number(stockQuantity)
  });
  return response.data.data.product;
};

export const toggleProductStatusApi = async (productId) => {
  const response = await apiClient.patch(`/admin/products/${productId}/toggle-status`);
  return response.data.data.product;
};

export const fetchAdminOrders = async (params = {}) => {
  const response = await apiClient.get('/admin/orders', { params });
  return response.data.data;
};

export const fetchAdminOrderById = async (orderId) => {
  const response = await apiClient.get(`/admin/orders/${orderId}`);
  return response.data.data.order;
};

export const updateAdminOrderStatusApi = async (orderId, status) => {
  const response = await apiClient.patch(`/admin/orders/${orderId}/status`, { status });
  return response.data.data.order;
};

export default apiClient;