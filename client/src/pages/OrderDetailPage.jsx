import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Package,
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  RotateCcw,
  ShieldCheck,
  Receipt,
  Loader2,
  ShoppingBag
} from 'lucide-react';
import { fetchOrderByIdApi, formatCurrency } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const OrderDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadOrder = async () => {
      setLoading(true);
      setError(null);

      try {
        const orderData = await fetchOrderByIdApi(id);
        if (isMounted) {
          setOrder(orderData);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load order details:', err);
          setError(
            err.response?.status === 404
              ? 'Order not found or you do not have permission to view it.'
              : err.response?.data?.error?.message || err.message || 'Failed to retrieve order details.'
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadOrder();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-4 h-4" />
            <span className="capitalize">Delivered</span>
          </span>
        );
      case 'shipped':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <Truck className="w-4 h-4" />
            <span className="capitalize">Shipped</span>
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <RotateCcw className="w-4 h-4 animate-spin" />
            <span className="capitalize">Processing</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-4 h-4" />
            <span className="capitalize">Cancelled</span>
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-4 h-4" />
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
        weekday: 'short',
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

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-500">Loading order receipt and item details...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Order Not Available</h1>
        <p className="text-sm text-slate-600 mb-6">{error || 'Unable to display order details.'}</p>
        <Link
          to="/orders"
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Order History</span>
        </Link>
      </div>
    );
  }

  const items = order.items || [];
  const totalItemCount = items.reduce((acc, itm) => acc + (itm.quantity || 0), 0);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Back Navigation */}
      <div className="mb-6">
        <Link
          to="/orders"
          className="inline-flex items-center space-x-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Orders</span>
        </Link>
      </div>

      {/* Main Order Card */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm mb-8">
        {/* Order Header */}
        <div className="p-6 sm:p-8 bg-slate-50/80 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <Receipt className="w-5 h-5 text-blue-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Order Confirmation</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 font-mono">{order.orderNumber}</h1>
              <p className="text-xs text-slate-500 mt-1 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Placed on {formatDate(order.createdAt)}</span>
              </p>
            </div>

            <div className="flex flex-col items-start sm:items-end space-y-1.5">
              {getStatusBadge(order.status)}
              <span className="text-xs text-slate-500">
                Currency:{' '}
                <span className="font-semibold text-slate-700 uppercase">{order.currency || 'INR'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Customer Information Banner */}
        <div className="px-6 sm:px-8 py-4 bg-blue-50/40 border-b border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Verified Customer Account:</span>
            <span className="font-semibold text-slate-900">{user?.email || 'Authenticated Owner'}</span>
          </div>
          <span className="text-slate-400">Historical Snapshot Preserved</span>
        </div>

        {/* Itemized Table */}
        <div className="p-6 sm:p-8">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center justify-between">
            <span>Purchased Items ({totalItemCount})</span>
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 pr-4">Product Name</th>
                  <th className="pb-3 px-4 text-center">Qty</th>
                  <th className="pb-3 px-4 text-right">Unit Price</th>
                  <th className="pb-3 pl-4 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, index) => (
                  <tr key={item.id || index} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 pr-4">
                      <div className="font-medium text-slate-900">{item.productName}</div>
                      <div className="text-xs text-slate-400 mt-0.5">Snapshot from time of purchase</div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-lg bg-slate-100 font-semibold text-slate-700 text-xs">
                        {item.quantity}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right text-slate-700 font-mono">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="py-4 pl-4 text-right font-bold text-slate-900 font-mono">
                      {formatCurrency(item.lineTotal || item.unitPrice * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="p-6 sm:p-8 bg-slate-50/50 border-t border-slate-200">
          <div className="max-w-xs ml-auto space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-mono text-slate-800">
                {formatCurrency(order.subtotal || order.totalAmount || 0)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Shipping & Handling</span>
              <span className="text-emerald-600 font-medium">Free</span>
            </div>
            <div className="pt-3 border-t border-slate-200 flex justify-between text-base font-bold text-slate-900">
              <span>Order Total</span>
              <span className="font-mono text-blue-600 text-lg">
                {formatCurrency(order.totalAmount || order.total || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage;

