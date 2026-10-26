import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../api/client';

export const ProductCard = ({ product }) => {
  const [imageError, setImageError] = useState(false);
  const fallbackImage = 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=600&q=80';

  const inStock = product.stockQuantity > 0;

  return (
    <div className="group bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden">
      {/* Product Image */}
      <Link to={`/products/${product.slug}`} className="relative aspect-square overflow-hidden bg-slate-100 block">
        <img
          src={imageError || !product.imageUrl ? fallbackImage : product.imageUrl}
          alt={product.name}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {/* Category Pill Tag */}
        <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-semibold text-slate-700 shadow-sm border border-slate-200/50">
          {product.categoryName}
        </span>
      </Link>

      {/* Product Details */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <Link to={`/products/${product.slug}`}>
            <h3 className="text-base font-bold text-navy-900 group-hover:text-blue-600 transition-colors line-clamp-1">
              {product.name}
            </h3>
          </Link>
          <p className="mt-1.5 text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>

        <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block font-medium">Price</span>
            <span className="text-lg font-extrabold text-navy-900">
              {formatCurrency(product.price)}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {inStock ? (
              <span className="inline-flex items-center space-x-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>In Stock</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-1 rounded-full border border-red-100">
                <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                <span>Out of Stock</span>
              </span>
            )}

            <Link
              to={`/products/${product.slug}`}
              className="p-2 rounded-xl bg-slate-50 group-hover:bg-blue-600 text-slate-600 group-hover:text-white transition-all duration-200 shadow-sm"
              title="View Product"
            >
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;