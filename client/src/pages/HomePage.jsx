import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, Layers, Flame, CheckCircle, Cpu } from 'lucide-react';
import { fetchCategories, fetchProducts } from '../api/client';
import ProductCard from '../components/ProductCard';
import ProductSkeleton from '../components/ProductSkeleton';

export const HomePage = () => {
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        setLoading(true);
        const [cats, prodsData] = await Promise.all([
          fetchCategories(),
          fetchProducts({ limit: 4, sortBy: 'created_at', order: 'desc' })
        ]);
        setCategories(cats);
        setFeaturedProducts(prodsData.products || []);
      } catch (err) {
        console.error('Failed to load homepage data:', err);
        setError('Unable to load catalog from server. Make sure the backend API is running.');
      } finally {
        setLoading(false);
      }
    };

    loadHomeData();
  }, []);

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-navy-900 via-navy-800 to-navy-900 text-white py-20 px-4 sm:px-6 lg:px-8 rounded-3xl mx-4 sm:mx-6 lg:mx-8 mt-6 shadow-2xl">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]"></div>
        
        <div className="relative max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>AI-Assisted E-Commerce Platform</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
            Curated Tech & Gadgets, <br />
            <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
              Built on PostgreSQL Precision
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Experience lightning-fast product discovery with full database integrity. Browse noise-cancelling audio, AMOLED wearables, and high-performance developer hardware.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              to="/products"
              className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all duration-200 transform hover:-translate-y-0.5"
            >
              <span>Explore All Products</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href="#categories"
              className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm border border-white/10 backdrop-blur-sm transition-all"
            >
              <Layers className="w-4 h-4 text-slate-300" />
              <span>Browse Categories</span>
            </a>
          </div>
        </div>
      </section>

      {/* Categories Showcase */}
      <section id="categories" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Browse by Category</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-navy-900 mt-1">Explore Departments</h2>
          </div>
          <Link to="/products" className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1">
            <span>View All</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/products?category=${cat.slug}`}
              className="group bg-white p-6 rounded-2xl border border-slate-200/80 hover:border-blue-500/50 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col items-center text-center space-y-3"
            >
              <div className="w-16 h-16 rounded-2xl bg-blue-50 group-hover:bg-blue-600 group-hover:text-white text-blue-600 flex items-center justify-center transition-colors duration-300">
                <Cpu className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-navy-900 text-base group-hover:text-blue-600 transition-colors">
                  {cat.name}
                </h3>
                <span className="text-xs text-slate-500 font-medium">
                  {cat.productCount} {cat.productCount === 1 ? 'Product' : 'Products'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider flex items-center space-x-1">
              <Flame className="w-3.5 h-3.5" />
              <span>Trending Now</span>
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-navy-900 mt-1">Featured Tech Gear</h2>
          </div>
          <Link to="/products" className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1">
            <span>Browse Catalog</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl text-center">
            <p className="text-sm font-medium">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default HomePage;