import React from 'react';
import { X, Trash2, ShoppingBag, ArrowRight, AlertTriangle, ShieldCheck, Sparkles } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../api/client';
import { Link } from 'react-router-dom';

export const CartDrawer = () => {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeItem,
    clear,
    loading,
    actionError,
    setActionError
  } = useCart();

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={() => setIsCartOpen(false)}
        className="absolute inset-0 bg-navy-900/60 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-navy-900">
                Your Shopping Cart <span className="text-sm font-semibold text-blue-600">({cart.totalItems})</span>
              </h2>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-2 text-slate-400 hover:text-navy-900 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Action / Error Banner */}
          {actionError && (
            <div className="bg-red-50 border-l-4 border-red-500 p-3 mx-4 mt-3 rounded text-xs text-red-700 flex justify-between items-center">
              <span>{actionError}</span>
              <button onClick={() => setActionError(null)} className="text-red-500 hover:text-red-800">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {cart.items.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-500 mx-auto flex items-center justify-center">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-navy-900">Your cart is currently empty</h3>
                  <p className="text-xs text-slate-500">Discover premium tech products in our catalog.</p>
                </div>
                <Link
                  to="/products"
                  onClick={() => setIsCartOpen(false)}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition-colors"
                >
                  <span>Browse Products</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              cart.items.map((item) => {
                const isMaxStock = item.quantity >= item.stockQuantity;
                return (
                  <div
                    key={item.itemId}
                    className="flex space-x-4 p-3.5 rounded-xl border border-slate-100 bg-white hover:border-slate-200 transition-all shadow-sm"
                  >
                    {/* Thumbnail */}
                    <img
                      src={item.imageUrl || 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147'}
                      alt={item.name}
                      className="w-20 h-20 rounded-lg object-cover bg-slate-100 flex-shrink-0"
                    />

                    {/* Details */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between">
                          <Link
                            to={`/products/${item.slug}`}
                            onClick={() => setIsCartOpen(false)}
                            className="text-xs font-bold text-navy-900 hover:text-blue-600 transition-colors line-clamp-1"
                          >
                            {item.name}
                          </Link>
                          <button
                            onClick={() => removeItem(item.productId)}
                            disabled={loading}
                            className="text-slate-300 hover:text-red-500 p-1 transition-colors"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium block">{item.categoryName}</span>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        {/* Quantity Stepper */}
                        <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50">
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            disabled={loading}
                            className="px-2.5 py-0.5 text-xs font-bold text-slate-600 hover:text-navy-900"
                          >
                            -
                          </button>
                          <span className="px-2 text-xs font-bold text-navy-900">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            disabled={loading || isMaxStock}
                            className="px-2.5 py-0.5 text-xs font-bold text-slate-600 hover:text-navy-900 disabled:opacity-30 disabled:cursor-not-allowed"
                            title={isMaxStock ? 'Maximum stock reached' : 'Add one more'}
                          >
                            +
                          </button>
                        </div>

                        {/* Subtotal */}
                        <span className="text-xs font-extrabold text-navy-900">
                          {formatCurrency(item.subtotal)}
                        </span>
                      </div>

                      {isMaxStock && (
                        <span className="text-[10px] text-amber-600 font-medium flex items-center space-x-1 mt-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Max stock reached ({item.stockQuantity})</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer & Checkout */}
          {cart.items.length > 0 && (
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 space-y-4">
              {/* Summary */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Shipping Across India</span>
                  <span className="text-emerald-600 font-bold">FREE</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-navy-900 pt-2 border-t border-slate-200">
                  <span>Subtotal</span>
                  <span className="text-blue-600">{formatCurrency(cart.totalAmount)}</span>
                </div>
              </div>

              {/* Checkout Action */}
              <div className="space-y-2">
                <button
                  onClick={() => alert('Order Processing, ACID Stock Locking & Stripe Integration unlock in Phase 7!')}
                  className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center space-x-2"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={clear}
                  disabled={loading}
                  className="w-full py-2 text-center text-xs text-slate-400 hover:text-red-600 transition-colors"
                >
                  Clear Entire Cart
                </button>
              </div>

              <div className="pt-2 text-center">
                <span className="text-[11px] text-slate-400 inline-flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Real-time PostgreSQL Inventory Validation</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CartDrawer;