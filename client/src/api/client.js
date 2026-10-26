import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000
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
 * Products API calls
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

/**
 * Categories API calls
 */
export const fetchCategories = async () => {
  const response = await apiClient.get('/categories');
  return response.data.data.categories;
};

export default apiClient;