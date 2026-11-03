import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ShoppingBag,
  Loader2,
  Calendar,
  CreditCard
} from 'lucide-react';
import { fetchOrdersApi, formatCurrency } from '../api/client';

export const OrdersPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const limitParam = parseInt(searchParams.get('limit') || '10', 10);

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
  const [error, setError] = useState(null);

  const loadOrders = useCallback(async (page, limit) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOrdersApi({ page, limit });
      setOrders(data.orders || []);
      setPagination(data.pagination || {
        totalItems: 0,
        totalPages: 1,
        currentPage: page,
        limit,
        hasNextPage: false,
        hasPrevPage: false
      });
    } catch (err) {
      console.error('Failed to load customer orders:', err);
      setError(
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to load order history. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders(pageParam, limitParam);
  }, [loadOrders, pageParam, limitParam]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages || newPage === pagination.currentPage) {
      return;
    }
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('page', newPage.toString());
    setSearchParams(nextParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
            <RotateCcw className="w-3.5 h-3.5 animate-spin" />
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Page Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center space-x-3">
            <Package className="w-7 h-7 text-blue-600" />
            <span>My Orders</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review your historical purchases, order status, and item snapshots.
          </p>
        </div>

        <Link
          to="/products"
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors self-start sm:self-auto"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Continue Shopping</span>
        </Link>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600">Retrieving your order history...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 sm:p-8 text-center max-w-xl mx-auto my-8">
          <AlertCircle className="w-10 h-10 text-rose-600 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-rose-900 mb-1">Unable to load orders</h2>
          <p className="text-sm text-rose-700 mb-5">{error}</p>
          <button
            onClick={() => loadOrders(pagination.currentPage, pagination.limit)}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-rose-600 text-white font-semibold text-sm hover:bg-rose-700 transition-colors shadow-sm"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && orders.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 sm:p-16 text-center max-w-lg mx-auto shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">No orders placed yet</h2>
          <p className="text-sm text-slate-500 mb-6">
            When you complete checkout for items in your cart, your order history and receipts will be recorded here.
          </p>
          <Link
            to="/products"
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/20"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Discover Products</span>
          </Link>
        </div>
      )}

      {/* Orders List */}
      {!loading && !error && orders.length > 0 && (
        <div className="space-y-6">
          {orders.map((order) => {
            const totalQty = (order.items || []).reduce((acc, itm) => acc + (itm.quantity || 0), 0);
            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:border-slate-300 transition-all"
              >
                {/* Order Top Bar */}
                <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 text-sm">
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                    <div>
                      <span className="text-xs text-slate-400 block font-medium">Order Number</span>
                      <span className="font-mono font-bold text-slate-800 text-sm">{order.orderNumber}</span>
                    </div>

                    <div className="border-l border-slate-200 pl-4 sm:pl-6">
                      <span className="text-xs text-slate-400 block font-medium">Order Placed</span>
                      <span className="text-slate-700 font-medium text-xs sm:text-sm flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDate(order.createdAt)}</span>
                      </span>
                    </div>

                    <div className="border-l border-slate-200 pl-4 sm:pl-6">
                      <span className="text-xs text-slate-400 block font-medium">Total Amount</span>
                      <span className="text-slate-900 font-bold text-sm sm:text-base">
                        {formatCurrency(order.totalAmount || order.total || 0)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {getStatusBadge(order.status)}
                    <Link
                      to={`/orders/${order.id}`}
                      className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
                    >
                      <span>View Details</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </Link>
                  </div>
                </div>

                {/* Items Preview */}
                <div className="p-6">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Purchased Items ({totalQty} item{totalQty === 1 ? '' : 's'})
                  </div>

                  <div className="divide-y divide-slate-100">
                    {(order.items || []).map((item, idx) => (
                      <div key={item.id || idx} className="py-2.5 flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-3 pr-4">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold shrink-0">
                            {item.quantity}×
                          </div>
                          <span className="font-medium text-slate-800 line-clamp-1">{item.productName}</span>
                        </div>
                        <div className="text-right shrink-0 font-medium text-slate-700">
                          {formatCurrency(item.lineTotal || item.unitPrice * item.quantity || 0)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-slate-500 font-medium">
                Showing page <span className="font-semibold text-slate-800">{pagination.currentPage}</span> of{' '}
                <span className="font-semibold text-slate-800">{pagination.totalPages}</span> ({pagination.totalItems} total orders)
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
    </div>
  );
};

export default OrdersPage;

