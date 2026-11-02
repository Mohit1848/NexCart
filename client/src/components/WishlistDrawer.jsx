import React from 'react';
import { X, Heart, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../api/client';
import { Link } from 'react-router-dom';

export const WishlistDrawer = () => {
  const {
    wishlist,
    isWishlistOpen,
    setIsWishlistOpen,
    toggleWishlist,
    moveToCart,
    loading
  } = useCart();

  if (!isWishlistOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        onClick={() => setIsWishlistOpen(false)}
        className="absolute inset-0 bg-navy-900/60 backdrop-blur-sm transition-opacity duration-300"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-pink-600 text-white flex items-center justify-center">
                <Heart className="w-4 h-4 fill-white" />
              </div>
              <h2 className="text-lg font-bold text-navy-900">
                Your Wishlist <span className="text-sm font-semibold text-pink-600">({wishlist.totalItems})</span>
              </h2>
            </div>
            <button
              onClick={() => setIsWishlistOpen(false)}
              className="p-2 text-slate-400 hover:text-navy-900 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {wishlist.items.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-pink-50 text-pink-500 mx-auto flex items-center justify-center">
                  <Heart className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-navy-900">Your wishlist is empty</h3>
                  <p className="text-xs text-slate-500">Save products you love to purchase later.</p>
                </div>
                <Link
                  to="/products"
                  onClick={() => setIsWishlistOpen(false)}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-pink-600 text-white text-xs font-bold hover:bg-pink-500 transition-colors"
                >
                  <span>Explore Catalog</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              wishlist.items.map((item) => (
                <div
                  key={item.itemId}
                  className="flex space-x-4 p-3.5 rounded-xl border border-slate-100 bg-white hover:border-slate-200 transition-all shadow-sm"
                >
                  <img
                    src={item.imageUrl || 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147'}
                    alt={item.name}
                    className="w-20 h-20 rounded-lg object-cover bg-slate-100 flex-shrink-0"
                  />

                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between">
                        <Link
                          to={`/products/${item.slug}`}
                          onClick={() => setIsWishlistOpen(false)}
                          className="text-xs font-bold text-navy-900 hover:text-blue-600 transition-colors line-clamp-1"
                        >
                          {item.name}
                        </Link>
                        <button
                          onClick={() => toggleWishlist(item.productId)}
                          className="text-slate-300 hover:text-red-500 p-1"
                          title="Remove from wishlist"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">{item.categoryName}</span>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs font-extrabold text-navy-900">{formatCurrency(item.price)}</span>
                      <button
                        onClick={() => moveToCart(item.productId)}
                        disabled={loading || item.stockQuantity <= 0}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold transition-colors disabled:opacity-40"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Move to Cart</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WishlistDrawer;