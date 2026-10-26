import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, Shield, Truck, RotateCcw, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { fetchProductBySlug, formatCurrency } from '../api/client';

export const ProductDetailPage = () => {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchProductBySlug(slug);
        setProduct(data);
      } catch (err) {
        console.error('Failed to load product details:', err);
        setError(err.response?.status === 404 ? 'Product not found' : 'Failed to load product details');
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-1/4 mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="aspect-square bg-slate-200 rounded-3xl"></div>
          <div className="space-y-4">
            <div className="h-5 bg-slate-200 rounded w-1/3"></div>
            <div className="h-8 bg-slate-200 rounded w-3/4"></div>
            <div className="h-6 bg-slate-200 rounded w-1/4"></div>
            <div className="h-24 bg-slate-200 rounded w-full"></div>
            <div className="h-12 bg-slate-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 mx-auto flex items-center justify-center">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-navy-900">Product Unavailable</h2>
        <p className="text-sm text-slate-500">{error || 'This product does not exist or has been deactivated.'}</p>
        <Link
          to="/products"
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Store Catalog</span>
        </Link>
      </div>
    );
  }

  const fallbackImage = 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=800&q=80';
  const inStock = product.stockQuantity > 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center space-x-2 text-xs text-slate-500">
        <Link to="/" className="hover:text-blue-600 transition-colors">Home</Link>
        <span>/</span>
        <Link to="/products" className="hover:text-blue-600 transition-colors">Catalog</Link>
        <span>/</span>
        <Link to={`/products?category=${product.categorySlug}`} className="hover:text-blue-600 transition-colors">
          {product.categoryName}
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-medium truncate max-w-xs">{product.name}</span>
      </nav>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-14 bg-white p-6 sm:p-10 rounded-3xl border border-slate-200/80 shadow-sm">
        {/* Product Image Section */}
        <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/60 flex items-center justify-center">
          <img
            src={imageError || !product.imageUrl ? fallbackImage : product.imageUrl}
            alt={product.name}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover object-center"
          />
          <span className="absolute top-4 left-4 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-navy-900 border border-slate-200 shadow-sm">
            {product.categoryName}
          </span>
        </div>

        {/* Product Information Section */}
        <div className="flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-900 leading-tight">
              {product.name}
            </h1>

            {/* Price & Stock Badge */}
            <div className="flex items-center space-x-4">
              <span className="text-3xl font-extrabold text-navy-900">
                {formatCurrency(product.price)}
              </span>

              {inStock ? (
                <span className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>In Stock ({product.stockQuantity} available)</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 text-xs font-semibold text-red-700 bg-red-50 px-3 py-1.5 rounded-full border border-red-100">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span>Temporarily Out of Stock</span>
                </span>
              )}
            </div>

            {/* Description */}
            <div className="pt-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Description</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {product.description}
              </p>
            </div>
          </div>

          {/* Action & Phase 5 Notice */}
          <div className="space-y-4 pt-6 border-t border-slate-100">
            {/* Quantity Selector */}
            {inStock && (
              <div className="flex items-center space-x-4">
                <span className="text-xs font-bold text-slate-700">Quantity:</span>
                <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3.5 py-1.5 text-slate-600 hover:text-navy-900 font-bold"
                  >
                    -
                  </button>
                  <span className="px-3 text-sm font-bold text-navy-900">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stockQuantity, quantity + 1))}
                    className="px-3.5 py-1.5 text-slate-600 hover:text-navy-900 font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Placeholder Add to Cart Button */}
            <div className="space-y-2">
              <button
                disabled
                className="w-full py-4 rounded-xl bg-slate-100 text-slate-400 font-bold text-sm flex items-center justify-center space-x-2 border border-slate-200 cursor-not-allowed"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Add to Cart</span>
              </button>
              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-700 flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span>
                  <strong>Phase 4 Storefront Preview:</strong> Full shopping cart, persistent items, and checkout pipeline unlock in Phase 5!
                </span>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100 text-center">
              <div className="flex flex-col items-center p-2 rounded-xl bg-slate-50">
                <Truck className="w-4 h-4 text-blue-600 mb-1" />
                <span className="text-[11px] font-semibold text-slate-700">Free Shipping</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-xl bg-slate-50">
                <Shield className="w-4 h-4 text-emerald-600 mb-1" />
                <span className="text-[11px] font-semibold text-slate-700">1-Year Warranty</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-xl bg-slate-50">
                <RotateCcw className="w-4 h-4 text-amber-600 mb-1" />
                <span className="text-[11px] font-semibold text-slate-700">7-Day Return</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;