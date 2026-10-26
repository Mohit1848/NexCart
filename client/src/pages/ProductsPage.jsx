import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, ArrowUpDown, ChevronLeft, ChevronRight, PackageSearch } from 'lucide-react';
import { fetchCategories, fetchProducts } from '../api/client';
import ProductCard from '../components/ProductCard';
import ProductSkeleton from '../components/ProductSkeleton';

export const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    limit: 12
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Read current query state from URL
  const currentCategory = searchParams.get('category') || '';
  const currentSearch = searchParams.get('search') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const currentSortBy = searchParams.get('sortBy') || 'created_at';
  const currentOrder = searchParams.get('order') || 'desc';

  const [searchInput, setSearchInput] = useState(currentSearch);

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories()
      .then((cats) => setCategories(cats))
      .catch((err) => console.error('Failed to load categories:', err));
  }, []);

  // Synchronize local search input with URL search param
  useEffect(() => {
    setSearchInput(currentSearch);
  }, [currentSearch]);

  // Fetch products whenever search params change
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await fetchProducts({
          page: currentPage,
          limit: 12,
          category: currentCategory || undefined,
          search: currentSearch || undefined,
          sortBy: currentSortBy,
          order: currentOrder
        });

        setProducts(data.products || []);
        setPagination(data.pagination);
      } catch (err) {
        console.error('Failed to fetch products:', err);
        setError('Failed to fetch catalog. Please verify that the server is online.');
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [currentCategory, currentSearch, currentPage, currentSortBy, currentOrder]);

  const updateParam = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    // Reset to page 1 whenever filters change (except when changing page itself)
    if (key !== 'page') {
      newParams.set('page', '1');
    }
    setSearchParams(newParams);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateParam('search', searchInput.trim());
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setSearchParams({});
  };

  const handleSortChange = (e) => {
    const val = e.target.value;
    const [sortBy, order] = val.split('-');
    const newParams = new URLSearchParams(searchParams);
    newParams.set('sortBy', sortBy);
    newParams.set('order', order);
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Title & Breadcrumb */}
      <div>
        <h1 className="text-3xl font-extrabold text-navy-900 tracking-tight">Store Catalog</h1>
        <p className="text-sm text-slate-500 mt-1">
          Explore authentic tech products, audio devices, and wearables grounded in PostgreSQL.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
            <input
              type="text"
              placeholder="Search by title, specs, or keyword..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-slate-50 text-sm text-slate-800 placeholder-slate-400 rounded-xl pl-10 pr-9 py-2.5 border border-slate-200 focus:border-blue-500 focus:bg-white focus:outline-none transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  updateParam('search', '');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </form>

          {/* Sort Selector */}
          <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
            <div className="flex items-center space-x-2 text-slate-600 text-sm font-medium">
              <ArrowUpDown className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">Sort:</span>
            </div>
            <select
              value={`${currentSortBy}-${currentOrder}`}
              onChange={handleSortChange}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 font-medium focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="created_at-desc">Newest Arrivals</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name-asc">Name: A to Z</option>
            </select>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={() => updateParam('category', '')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              !currentCategory
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Departments
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => updateParam('category', cat.slug)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                currentCategory === cat.slug
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.name} ({cat.productCount})
            </button>
          ))}

          {(currentCategory || currentSearch) && (
            <button
              onClick={handleClearFilters}
              className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center space-x-1 ml-auto"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          Showing <strong className="text-navy-900">{products.length}</strong> of{' '}
          <strong className="text-navy-900">{pagination.totalItems}</strong> products
        </span>
      </div>

      {/* Product Grid / Loading / Empty States */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <ProductSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-8 rounded-2xl text-center space-y-3">
          <p className="font-semibold">{error}</p>
          <button
            onClick={() => updateParam('page', '1')}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold"
          >
            Retry Fetch
          </button>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <PackageSearch className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-navy-900">No products match your criteria</h3>
            <p className="text-sm text-slate-500 mt-1">
              Try searching with different terms or select another category.
            </p>
          </div>
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-500 transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 pt-6">
          <button
            onClick={() => updateParam('page', (currentPage - 1).toString())}
            disabled={!pagination.hasPrevPage}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {Array.from({ length: pagination.totalPages }, (_, idx) => idx + 1).map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => updateParam('page', pageNum.toString())}
              className={`w-9 h-9 rounded-lg text-xs font-bold transition-all ${
                currentPage === pageNum
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {pageNum}
            </button>
          ))}

          <button
            onClick={() => updateParam('page', (currentPage + 1).toString())}
            disabled={!pagination.hasNextPage}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;