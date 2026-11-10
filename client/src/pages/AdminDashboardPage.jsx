import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package,
  CheckCircle2,
  EyeOff,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Layers,
  RefreshCw,
  ArrowRight,
  Boxes,
  ShieldCheck,
  AlertCircle,
  ShoppingBag
} from 'lucide-react';
import { fetchAdminMetrics, formatCurrency } from '../api/client';

export const AdminDashboardPage = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const navigate = useNavigate();

  const loadMetrics = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const data = await fetchAdminMetrics();
      setMetrics(data);
      setLastUpdated(new Date());
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to retrieve administrative metrics.';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse space-y-6">
        <div className="h-8 bg-slate-200 rounded w-64"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-2xl"></div>
          ))}
        </div>
        <div className="h-64 bg-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto my-16 px-4">
        <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-8 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Metrics Unavailable</h2>
          <p className="text-sm text-slate-600 mb-6">{error}</p>
          <button
            onClick={() => loadMetrics()}
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry Connection</span>
          </button>
        </div>
      </div>
    );
  }

  const { overview, restockPriorityList } = metrics || { overview: {}, restockPriorityList: [] };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-900 tracking-tight">
              Admin Overview & Metrics
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              Verified Admin
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time catalog analytics, active inventory valuation, and restock priorities.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => loadMetrics(true)}
            disabled={refreshing}
            title="Refresh metrics from server"
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <Link
            to="/admin/orders"
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors shadow-sm"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-blue-400" />
            <span>Orders Manager</span>
          </Link>

          <Link
            to="/admin/inventory"
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/20"
          >
            <Boxes className="w-4 h-4" />
            <span>Open Inventory Manager</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total Products */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Products</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900">{overview.totalProducts || 0}</span>
            <p className="text-[11px] text-slate-400 mt-0.5">In catalog database</p>
          </div>
        </div>

        {/* Active Products */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Active</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-emerald-700">{overview.activeProducts || 0}</span>
            <p className="text-[11px] text-slate-400 mt-0.5">Live on storefront</p>
          </div>
        </div>

        {/* Inactive Products */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inactive</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
              <EyeOff className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-600">{overview.inactiveProducts || 0}</span>
            <p className="text-[11px] text-slate-400 mt-0.5">Hidden from customers</p>
          </div>
        </div>

        {/* Low Stock (1-5) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Low Stock</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-amber-600">{overview.lowStockProducts || 0}</span>
            <p className="text-[11px] text-slate-400 mt-0.5">Stock between 1 and 5</p>
          </div>
        </div>

        {/* Out of Stock (0) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-red-600 uppercase tracking-wider">Out of Stock</span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-red-600">{overview.outOfStockProducts || 0}</span>
            <p className="text-[11px] text-slate-400 mt-0.5">Immediate restock needed</p>
          </div>
        </div>

        {/* Total Categories */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider">Categories</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-purple-700">{overview.totalCategories || 0}</span>
            <p className="text-[11px] text-slate-400 mt-0.5">Product taxonomy</p>
          </div>
        </div>
      </div>

      {/* Inventory Valuation Banner */}
      <div className="bg-gradient-to-r from-navy-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/20">
            <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
            <span>Active Retail-Price Inventory Valuation</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            {formatCurrency(overview.totalInventoryValue)}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Calculated as the retail selling price multiplied by on-hand stock quantity across all{' '}
            <span className="text-white font-semibold">{overview.activeProducts || 0} active</span> marketable products.
            Inactive (soft-deleted) items are excluded from valuation. Basis: <code className="text-blue-300">{overview.valuationBasis || 'active_retail_price'}</code>.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/admin/inventory?stockStatus=out_of_stock"
            className="px-4 py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-white text-xs font-semibold text-center transition-colors"
          >
            Review Out-of-Stock ({overview.outOfStockProducts || 0})
          </Link>
          <Link
            to="/admin/inventory?stockStatus=low_stock"
            className="px-4 py-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-white text-xs font-semibold text-center transition-colors"
          >
            Review Low-Stock ({overview.lowStockProducts || 0})
          </Link>
        </div>
      </div>

      {/* Restock Priority List */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <span>Restock Priority Queue</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Top active products requiring replenishment (stock &le; 5 units, ordered most urgent first)
            </p>
          </div>

          <Link
            to="/admin/inventory"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
          >
            <span>View all inventory</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {restockPriorityList.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-900">Inventory Levels Healthy</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              There are currently no active products with stock at or below 5 units. All catalog items have sufficient stock.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-6">Product</th>
                  <th className="py-3 px-6">Category</th>
                  <th className="py-3 px-6">Price</th>
                  <th className="py-3 px-6">Current Stock</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {restockPriorityList.map((item) => {
                  const isOutOfStock = item.stockQuantity === 0;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-900">{item.name}</div>
                        <div className="text-xs text-slate-400 font-mono">{item.slug}</div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {item.categoryName}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-semibold text-slate-900">
                        {formatCurrency(item.price)}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                            isOutOfStock
                              ? 'bg-red-100 text-red-700 border border-red-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {isOutOfStock ? (
                            <>
                              <XCircle className="w-3 h-3 mr-1" />
                              0 units (Depleted)
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              {item.stockQuantity} unit{item.stockQuantity > 1 ? 's' : ''} left
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Active
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => navigate(`/admin/inventory?search=${encodeURIComponent(item.name)}`)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
                        >
                          Manage Stock →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {lastUpdated && (
        <div className="text-center text-xs text-slate-400">
          Last synchronized with NexCart API: {lastUpdated.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;

