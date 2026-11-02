import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Boxes,
  Search,
  Filter,
  ArrowUpDown,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Edit2,
  Power,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Check,
  X,
  ArrowLeft
} from 'lucide-react';
import {
  fetchAdminProducts,
  fetchCategories,
  updateProductStockApi,
  toggleProductStatusApi,
  formatCurrency
} from '../api/client';

export const AdminInventoryPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state
  const searchParam = searchParams.get('search') || '';
  const categoryParam = searchParams.get('category') || '';
  const stockStatusParam = searchParams.get('stockStatus') || 'all';
  const sortByParam = searchParams.get('sortBy') || 'created_at';
  const orderParam = searchParams.get('order') || 'desc';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const limitParam = parseInt(searchParams.get('limit') || '10', 10);

  // Component state
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 10,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successBanner, setSuccessBanner] = useState(null);

  // Search input state
  const [searchInput, setSearchInput] = useState(searchParam);

  // Stock edit modal/inline state
  const [editingStockProduct, setEditingStockProduct] = useState(null);
  const [stockInputVal, setStockInputVal] = useState('');
  const [stockEditError, setStockEditError] = useState(null);
  const [stockSubmitting, setStockSubmitting] = useState(false);

  // Status toggle confirmation modal state
  const [togglingProduct, setTogglingProduct] = useState(null);
  const [toggleSubmitting, setToggleSubmitting] = useState(false);

  // Load categories once
  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch((err) => console.warn('Failed to load categories:', err.message));
  }, []);

  // Update search input if URL changes externally
  useEffect(() => {
    setSearchInput(searchParam);
  }, [searchParam]);

  // Load products from backend
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAdminProducts({
        page: pageParam,
        limit: limitParam,
        search: searchParam || undefined,
        category: categoryParam || undefined,
        stockStatus: stockStatusParam,
        sortBy: sortByParam,
        order: orderParam
      });
      setProducts(data.products || []);
      setPagination(data.pagination || {});
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to load inventory.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [pageParam, limitParam, searchParam, categoryParam, stockStatusParam, sortByParam, orderParam]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Parameter update helpers
  const updateQueryParam = (updates) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === undefined || val === '') {
        next.delete(key);
      } else {
        next.set(key, String(val));
      }
    });
    // Reset to page 1 unless changing page
    if (!('page' in updates)) {
      next.set('page', '1');
    }
    setSearchParams(next);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateQueryParam({ search: searchInput.trim() });
  };

  // Stock update handler
  const handleOpenStockEdit = (product) => {
    setEditingStockProduct(product);
    setStockInputVal(String(product.stockQuantity));
    setStockEditError(null);
  };

  const handleSaveStock = async (e) => {
    e.preventDefault();
    if (!editingStockProduct) return;

    const num = Number(stockInputVal);
    if (!Number.isInteger(num) || num < 0 || num > 100000) {
      setStockEditError('Stock must be an integer between 0 and 100,000.');
      return;
    }

    try {
      setStockSubmitting(true);
      setStockEditError(null);
      const updatedProduct = await updateProductStockApi(editingStockProduct.id, num);

      // Update in local state
      setProducts((prev) =>
        prev.map((p) => (p.id === updatedProduct.id ? { ...p, stockQuantity: updatedProduct.stockQuantity } : p))
      );
      setSuccessBanner(`Stock for "${updatedProduct.name}" updated to ${updatedProduct.stockQuantity} units.`);
      setEditingStockProduct(null);

      // Auto-clear success banner after 4 seconds
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch (err) {
      const details = err.response?.data?.error?.details;
      const msg = Array.isArray(details) ? details.join(', ') : err.response?.data?.error?.message || err.message;
      setStockEditError(msg);
    } finally {
      setStockSubmitting(false);
    }
  };

  // Status toggle handler
  const handleConfirmToggleStatus = async () => {
    if (!togglingProduct) return;

    try {
      setToggleSubmitting(true);
      const updatedProduct = await toggleProductStatusApi(togglingProduct.id);

      // Update in local state
      setProducts((prev) =>
        prev.map((p) => (p.id === updatedProduct.id ? { ...p, isActive: updatedProduct.isActive } : p))
      );
      setSuccessBanner(
        `Product "${updatedProduct.name}" is now ${updatedProduct.isActive ? 'Active' : 'Inactive'}.`
      );
      setTogglingProduct(null);

      // Auto-clear success banner after 4 seconds
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setToggleSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <Link
              to="/admin"
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center space-x-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Overview</span>
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-900 tracking-tight mt-1">
            Inventory Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage product stock quantities, monitor replenishment alerts, and toggle catalog visibility.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => loadProducts()}
            disabled={loading}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {successBanner && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">{successBanner}</span>
          </div>
          <button onClick={() => setSuccessBanner(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Controls & Filter Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="md:col-span-5 relative">
            <input
              type="text"
              placeholder="Search by product name or slug..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-slate-50 text-xs rounded-xl pl-9 pr-16 py-2.5 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  updateQueryParam({ search: '' });
                }}
                className="absolute right-10 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                Clear
              </button>
            )}
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-semibold hover:bg-blue-700"
            >
              Go
            </button>
          </form>

          {/* Category Filter */}
          <div className="md:col-span-3">
            <select
              value={categoryParam}
              onChange={(e) => updateQueryParam({ category: e.target.value })}
              className="w-full bg-slate-50 text-xs rounded-xl px-3 py-2.5 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By Column */}
          <div className="md:col-span-2">
            <select
              value={sortByParam}
              onChange={(e) => updateQueryParam({ sortBy: e.target.value })}
              className="w-full bg-slate-50 text-xs rounded-xl px-3 py-2.5 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="created_at">Date Added</option>
              <option value="stock_quantity">Stock Level</option>
              <option value="price">Price</option>
              <option value="name">Product Name</option>
            </select>
          </div>

          {/* Sort Order Direction */}
          <div className="md:col-span-2">
            <select
              value={orderParam}
              onChange={(e) => updateQueryParam({ order: e.target.value })}
              className="w-full bg-slate-50 text-xs rounded-xl px-3 py-2.5 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>

        {/* Stock Status Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="font-semibold text-slate-500 mr-1 flex items-center space-x-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Stock Status:</span>
          </span>

          {[
            { id: 'all', label: 'All Items' },
            { id: 'in_stock', label: 'In Stock (> 0)' },
            { id: 'low_stock', label: 'Low Stock (1–5)' },
            { id: 'out_of_stock', label: 'Out of Stock (0)' }
          ].map((pill) => {
            const isActive = stockStatusParam === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => updateQueryParam({ stockStatus: pill.id })}
                className={`px-3 py-1.5 rounded-full font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Inventory Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Fetching catalog items...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center space-y-3 px-4">
            <Boxes className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No products found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No catalog items match your search or filter criteria. Try adjusting the query or stock filter.
            </p>
            <button
              onClick={() => setSearchParams(new URLSearchParams())}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-6">Product</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Price</th>
                  <th className="py-3.5 px-4">Stock Level</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Last Updated</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((product) => {
                  const isOutOfStock = product.stockQuantity === 0;
                  const isLowStock = product.stockQuantity >= 1 && product.stockQuantity <= 5;
                  const formattedDate = product.updatedAt
                    ? new Date(product.updatedAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })
                    : '—';

                  return (
                    <tr
                      key={product.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        !product.isActive ? 'bg-slate-50/40 text-slate-400' : ''
                      }`}
                    >
                      {/* Product Name & Slug */}
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          {product.imageUrl && (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className={`w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-slate-200 ${
                                !product.isActive ? 'grayscale opacity-60' : ''
                              }`}
                            />
                          )}
                          <div>
                            <div
                              className={`font-semibold line-clamp-1 ${
                                product.isActive ? 'text-slate-900' : 'text-slate-500'
                              }`}
                            >
                              {product.name}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono line-clamp-1">
                              {product.slug}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-4 px-4">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {product.categoryName}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-4 px-4 font-semibold text-slate-900">
                        {formatCurrency(product.price)}
                      </td>

                      {/* Stock Quantity */}
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              isOutOfStock
                                ? 'bg-red-100 text-red-700 border border-red-200'
                                : isLowStock
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {isOutOfStock && <XCircle className="w-3 h-3 mr-1" />}
                            {isLowStock && <AlertTriangle className="w-3 h-3 mr-1" />}
                            {!isOutOfStock && !isLowStock && <CheckCircle2 className="w-3 h-3 mr-1" />}
                            <span>{product.stockQuantity} units</span>
                          </span>

                          <button
                            onClick={() => handleOpenStockEdit(product)}
                            title="Quick edit stock"
                            className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Status Active / Inactive */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                            product.isActive
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              product.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {product.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Last Updated */}
                      <td className="py-4 px-4 text-xs text-slate-400 font-mono">
                        {formattedDate}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenStockEdit(product)}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                          >
                            Edit Stock
                          </button>

                          <button
                            onClick={() => setTogglingProduct(product)}
                            title={product.isActive ? 'Deactivate product' : 'Activate product'}
                            className={`p-1.5 rounded-lg border text-xs transition-colors ${
                              product.isActive
                                ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                                : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Toolbar */}
        {!loading && pagination.totalPages > 1 && (
          <div className="p-4 sm:p-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-slate-500">
              Showing page <span className="font-bold text-slate-800">{pagination.currentPage}</span> of{' '}
              <span className="font-bold text-slate-800">{pagination.totalPages}</span> ({pagination.totalItems} products)
            </div>

            <div className="flex items-center space-x-2">
              <button
                disabled={!pagination.hasPrevPage}
                onClick={() => updateQueryParam({ page: pagination.currentPage - 1 })}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none flex items-center space-x-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <button
                disabled={!pagination.hasNextPage}
                onClick={() => updateQueryParam({ page: pagination.currentPage + 1 })}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none flex items-center space-x-1"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stock Edit Modal Dialog */}
      {editingStockProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Update Stock Quantity</h3>
              <button
                onClick={() => setEditingStockProduct(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-900 text-sm">{editingStockProduct.name}</p>
              <p className="text-slate-400 font-mono">{editingStockProduct.slug}</p>
              <p>
                Current Price: <span className="font-bold text-slate-800">{formatCurrency(editingStockProduct.price)}</span> (Price will not be modified)
              </p>
            </div>

            {stockEditError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <span>{stockEditError}</span>
              </div>
            )}

            <form onSubmit={handleSaveStock} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  New Stock Quantity (Units)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100000"
                  step="1"
                  autoFocus
                  required
                  value={stockInputVal}
                  onChange={(e) => setStockInputVal(e.target.value)}
                  className="w-full px-3 py-2 text-base font-bold border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Accepted values: Non-negative integers (0 to 100,000). Setting to 0 marks product as out-of-stock.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingStockProduct(null)}
                  disabled={stockSubmitting}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={stockSubmitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm shadow-blue-500/20 disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {stockSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>Save Stock Quantity</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Status Toggle Confirmation Modal */}
      {togglingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 text-center">
            <div
              className={`w-12 h-12 mx-auto rounded-2xl flex items-center justify-center ${
                togglingProduct.isActive ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
              }`}
            >
              <Power className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">
                {togglingProduct.isActive ? 'Deactivate Product?' : 'Reactivate Product?'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {togglingProduct.name}
              </p>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 text-left">
              {togglingProduct.isActive
                ? 'Deactivating this product will hide it from customer searches, product detail pages, and storefront browsing. It will remain visible here in the admin inventory.'
                : 'Reactivating this product will restore it to the customer catalog, making it visible and available for customer purchases immediately.'}
            </p>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTogglingProduct(null)}
                disabled={toggleSubmitting}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmToggleStatus}
                disabled={toggleSubmitting}
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-sm transition-colors ${
                  togglingProduct.isActive
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {toggleSubmitting
                  ? 'Updating...'
                  : togglingProduct.isActive
                  ? 'Confirm Deactivation'
                  : 'Confirm Activation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminInventoryPage;

