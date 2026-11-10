import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Package,
  Search,
  Filter,
  ArrowRight,
  Clock,
  CheckCircle2,
  Truck,
  RotateCcw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
  ShieldCheck,
  Eye,
  RefreshCw,
  Calendar,
  User,
  ShoppingBag,
  ArrowLeft,
  Boxes,
  Loader2
} from 'lucide-react';
import {
  fetchAdminOrders,
  fetchAdminOrderById,
  updateAdminOrderStatusApi,
  formatCurrency
} from '../api/client';

export const AdminOrdersPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Search & filter state from URL
  const statusParam = searchParams.get('status') || 'all';
  const searchParam = searchParams.get('search') || '';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const limitParam = parseInt(searchParams.get('limit') || '10', 10);

  // Orders data state
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 10,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [successBanner, setSuccessBanner] = useState(null);

  // Search input state
  const [searchInput, setSearchInput] = useState(searchParam);

  // Selected order for detail drawer
  const [detailOrderId, setDetailOrderId] = useState(null);
  const [detailOrder, setDetailOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  // Confirmation modal for status advance
  const [confirmingTransition, setConfirmingTransition] = useState(null);
  // e.g. { orderId, orderNumber, currentStatus, nextStatus }
  const [transitioning, setTransitioning] = useState(false);
  const [transitionError, setTransitionError] = useState(null);

  const loadOrders = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const data = await fetchAdminOrders({
        page: pageParam,
        limit: limitParam,
        status: statusParam,
        search: searchParam || undefined
      });

      setOrders(data.orders || []);
      setPagination(data.pagination || {
        totalItems: 0,
        totalPages: 1,
        currentPage: pageParam,
        limit: limitParam,
        hasNextPage: false,
        hasPrevPage: false
      });
    } catch (err) {
      console.error('Failed to load admin orders:', err);
      setError(err.response?.data?.error?.message || err.message || 'Failed to retrieve orders.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pageParam, limitParam, statusParam, searchParam]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Load order details when drawer opens
  useEffect(() => {
    if (!detailOrderId) {
      setDetailOrder(null);
      setDetailError(null);
      return;
    }

    let isMounted = true;
    const fetchDetail = async () => {
      setDetailLoading(true);
      setDetailError(null);
      try {
        const orderData = await fetchAdminOrderById(detailOrderId);
        if (isMounted) {
          setDetailOrder(orderData);
        }
      } catch (err) {
        if (isMounted) {
          setDetailError(err.response?.data?.error?.message || err.message || 'Failed to load order details');
        }
      } finally {
        if (isMounted) {
          setDetailLoading(false);
        }
      }
    };

    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [detailOrderId]);

  // Update query params
  const updateQuery = (updates) => {
    const nextParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === undefined || val === '') {
        nextParams.delete(key);
      } else {
        nextParams.set(key, val);
      }
    });
    // Reset to page 1 on filter/search change
    if (!('page' in updates)) {
      nextParams.set('page', '1');
    }
    setSearchParams(nextParams);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateQuery({ search: searchInput.trim() });
  };

  const handleStatusFilterChange = (status) => {
    updateQuery({ status: status === 'all' ? '' : status });
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages || newPage === pagination.currentPage) {
      return;
    }
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('page', newPage.toString());
    setSearchParams(nextParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Status transitions mapping
  const getNextTransition = (currentStatus) => {
    switch (currentStatus?.toLowerCase()) {
      case 'pending':
        return { target: 'processing', label: 'Mark as Processing' };
      case 'processing':
        return { target: 'shipped', label: 'Mark as Shipped' };
      case 'shipped':
        return { target: 'delivered', label: 'Mark as Delivered' };
      default:
        return null;
    }
  };

  const handleOpenAdvanceModal = (order) => {
    const next = getNextTransition(order.status);
    if (!next) return;

    setTransitionError(null);
    setConfirmingTransition({
      orderId: order.id,
      orderNumber: order.orderNumber,
      currentStatus: order.status,
      nextStatus: next.target,
      label: next.label
    });
  };

  const handleConfirmTransition = async () => {
    if (!confirmingTransition) return;
    setTransitioning(true);
    setTransitionError(null);

    try {
      const updated = await updateAdminOrderStatusApi(
        confirmingTransition.orderId,
        confirmingTransition.nextStatus
      );

      setSuccessBanner(
        `Order #${confirmingTransition.orderNumber} successfully advanced from ${confirmingTransition.currentStatus} to ${updated.status}.`
      );

      // If drawer is open with this order, update it
      if (detailOrder && detailOrder.id === confirmingTransition.orderId) {
        setDetailOrder((prev) => ({ ...prev, status: updated.status }));
      }

      setConfirmingTransition(null);
      // Reload orders table
      loadOrders(true);
    } catch (err) {
      console.error('Status transition failed:', err);
      setTransitionError(
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to advance order status. Please verify the order lifecycle.'
      );
    } finally {
      setTransitioning(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="capitalize">Delivered</span>
          </span>
        );
      case 'shipped':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <Truck className="w-3.5 h-3.5" />
            <span className="capitalize">Shipped</span>
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="capitalize">Processing</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5" />
            <span className="capitalize">Cancelled</span>
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5" />
            <span className="capitalize">Pending</span>
          </span>
        );
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      {/* Top Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Administrator Control Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center space-x-3">
            <Package className="w-7 h-7 text-blue-600" />
            <span>Orders Manager</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review customer orders across the platform, verify historical purchase snapshots, and manage fulfilment status.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => loadOrders(true)}
            disabled={refreshing}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <Link
            to="/admin"
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Overview</span>
          </Link>

          <Link
            to="/admin/inventory"
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/20"
          >
            <Boxes className="w-4 h-4" />
            <span>Inventory Manager</span>
          </Link>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between shadow-2xs animate-fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-600 hover:text-emerald-800 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 mb-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by order number or customer email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-slate-50 text-sm text-slate-800 placeholder-slate-400 rounded-xl pl-10 pr-4 py-2 border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          </form>

          {/* Quick status tabs */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((st) => (
              <button
                key={st}
                onClick={() => handleStatusFilterChange(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  (st === 'all' && (!statusParam || statusParam === 'all')) || statusParam === st
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600">Loading customer orders...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center max-w-xl mx-auto my-8">
          <AlertCircle className="w-10 h-10 text-rose-600 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-rose-900 mb-1">Failed to Load Orders</h2>
          <p className="text-sm text-rose-700 mb-5">{error}</p>
          <button
            onClick={() => loadOrders()}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-rose-600 text-white font-semibold text-sm hover:bg-rose-700 transition-colors shadow-sm"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retry Query</span>
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && orders.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center max-w-lg mx-auto shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">No matching orders found</h2>
          <p className="text-sm text-slate-500 mb-6">
            {searchParam || (statusParam && statusParam !== 'all')
              ? 'No orders matched your current search filters. Try clearing your search or status filter.'
              : 'There are currently no customer orders in the system database.'}
          </p>
          {(searchParam || (statusParam && statusParam !== 'all')) && (
            <button
              onClick={() => {
                setSearchInput('');
                updateQuery({ search: '', status: '' });
              }}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      )}

      {/* Orders Table */}
      {!loading && !error && orders.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Order Details</th>
                  <th className="py-4 px-6">Customer</th>
                  <th className="py-4 px-6 text-center">Items</th>
                  <th className="py-4 px-6 text-right">Total Amount</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => {
                  const nextTransition = getNextTransition(order.status);
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Order info */}
                      <td className="py-4 px-6">
                        <div className="font-mono font-bold text-slate-900 text-sm">{order.orderNumber}</div>
                        <div className="text-xs text-slate-400 mt-0.5 flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{formatDate(order.createdAt)}</span>
                        </div>
                      </td>

                      {/* Customer info */}
                      <td className="py-4 px-6">
                        <div className="font-medium text-slate-800 text-sm flex items-center space-x-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{order.user?.fullName || 'Customer'}</span>
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">{order.user?.email}</div>
                      </td>

                      {/* Items count */}
                      <td className="py-4 px-6 text-center">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 font-semibold text-slate-700 text-xs">
                          {order.itemCount} unit{order.itemCount === 1 ? '' : 's'}
                        </span>
                      </td>

                      {/* Total */}
                      <td className="py-4 px-6 text-right">
                        <div className="font-bold text-slate-900 font-mono text-base">
                          {formatCurrency(order.totalAmount || order.total || 0)}
                        </div>
                        <div className="text-[11px] text-slate-400 uppercase font-medium">{order.currency || 'INR'}</div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6 text-center">
                        {getStatusBadge(order.status)}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {/* Next Transition Button */}
                          {nextTransition && (
                            <button
                              onClick={() => handleOpenAdvanceModal(order)}
                              title={nextTransition.label}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                            >
                              <span>{nextTransition.label}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* View details */}
                          <button
                            onClick={() => setDetailOrderId(order.id)}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Details</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {pagination.totalPages > 1 && (
            <div className="p-4 sm:p-6 bg-slate-50/50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-slate-500 font-medium">
                Showing page <span className="font-bold text-slate-900">{pagination.currentPage}</span> of{' '}
                <span className="font-bold text-slate-900">{pagination.totalPages}</span> ({pagination.totalItems} total orders)
              </span>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={!pagination.hasPrevPage}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center space-x-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <div className="flex items-center space-x-1 px-1">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p)}
                      className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                        p === pagination.currentPage
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center space-x-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Advance Status Confirmation Modal */}
      {confirmingTransition && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2 text-slate-900 font-bold">
                <RotateCcw className="w-5 h-5 text-blue-600" />
                <span>Confirm Status Advance</span>
              </div>
              <button
                onClick={() => setConfirmingTransition(null)}
                disabled={transitioning}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <p className="text-sm text-slate-600">
                Are you sure you want to advance order{' '}
                <span className="font-mono font-bold text-slate-900">{confirmingTransition.orderNumber}</span> to{' '}
                <span className="font-bold text-blue-600 capitalize">{confirmingTransition.nextStatus}</span>?
              </p>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                <span className="text-slate-500">Current Status:</span>
                {getStatusBadge(confirmingTransition.currentStatus)}
              </div>

              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200/80 flex items-center justify-between text-xs">
                <span className="text-blue-900 font-medium">New Status:</span>
                {getStatusBadge(confirmingTransition.nextStatus)}
              </div>

              {transitionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                  {transitionError}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
              <button
                onClick={() => setConfirmingTransition(null)}
                disabled={transitioning}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmTransition}
                disabled={transitioning}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {transitioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>{transitioning ? 'Advancing...' : 'Confirm & Advance'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Drawer / Modal */}
      {detailOrderId && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-end">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col animate-slide-left overflow-hidden">
            {/* Drawer Header */}
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Order Audit & Details</div>
                <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
                  {detailOrder?.orderNumber || 'Loading...'}
                </div>
              </div>
              <button
                onClick={() => setDetailOrderId(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {detailLoading && (
                <div className="py-20 text-center">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-slate-500 font-medium">Fetching historical order snapshots...</p>
                </div>
              )}

              {detailError && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl">
                  {detailError}
                </div>
              )}

              {detailOrder && !detailLoading && (
                <>
                  {/* Status & Timing Overview */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium">Fulfilment Status</span>
                      <div className="mt-1">{getStatusBadge(detailOrder.status)}</div>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Order Placed</span>
                      <span className="font-medium text-slate-800 mt-1 block">{formatDate(detailOrder.createdAt)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Currency</span>
                      <span className="font-semibold text-slate-900 mt-1 block uppercase">
                        {detailOrder.currency || 'INR'}
                      </span>
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className="p-4 bg-blue-50/40 rounded-2xl border border-blue-200/70 text-xs space-y-1">
                    <div className="font-bold text-blue-900 flex items-center space-x-1.5">
                      <User className="w-4 h-4" />
                      <span>Customer Reference</span>
                    </div>
                    <div className="text-slate-800 font-medium text-sm pt-1">{detailOrder.user?.fullName}</div>
                    <div className="text-slate-500 font-mono">{detailOrder.user?.email}</div>
                    <div className="text-[11px] text-slate-400 font-mono pt-1">User ID: {detailOrder.user?.id}</div>
                  </div>

                  {/* Saved Order Items Snapshots */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                      Historical Purchase Snapshots ({(detailOrder.items || []).length} items)
                    </h3>
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                      {(detailOrder.items || []).map((item, idx) => (
                        <div key={item.id || idx} className="p-4 flex items-center justify-between text-sm">
                          <div>
                            <div className="font-bold text-slate-900">{item.productName}</div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              {item.quantity} × {formatCurrency(item.unitPrice)}
                            </div>
                          </div>
                          <div className="font-bold text-slate-900 font-mono">
                            {formatCurrency(item.lineTotal || item.unitPrice * item.quantity)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Financial Breakdown */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-sm">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal</span>
                      <span className="font-mono text-slate-800">
                        {formatCurrency(detailOrder.subtotal || detailOrder.totalAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Shipping</span>
                      <span className="text-emerald-600 font-medium">Free</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex justify-between text-base font-bold text-slate-900">
                      <span>Total Amount</span>
                      <span className="font-mono text-blue-600 text-lg">
                        {formatCurrency(detailOrder.totalAmount || detailOrder.total)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => setDetailOrderId(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Close Drawer
              </button>

              {detailOrder && getNextTransition(detailOrder.status) && (
                <button
                  onClick={() => {
                    handleOpenAdvanceModal(detailOrder);
                  }}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <span>{getNextTransition(detailOrder.status).label}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrdersPage;

