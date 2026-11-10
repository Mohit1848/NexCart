import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ShoppingBag, Search, Menu, X, Heart, User, ShieldCheck, LogIn, LogOut, Boxes, Package } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { cart, wishlist, setIsCartOpen, setIsWishlistOpen } = useCart();
  const { user, isAdmin, logout } = useAuth();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setMobileMenuOpen(false);
    }
  };

  const navLinkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors ${
      isActive ? 'text-blue-600 font-semibold' : 'text-slate-600 hover:text-slate-900'
    }`;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      {/* Top Banner */}
      <div className="bg-navy-900 text-slate-300 text-xs py-1.5 px-4 text-center font-medium flex items-center justify-center space-x-2">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>Authentic Tech & Smart Devices • Next-Gen AI Grounded Catalog • Free Shipping Across India</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-navy-900">
              Nex<span className="text-blue-600">Cart</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <NavLink to="/" className={navLinkClass}>
              Home
            </NavLink>
            <NavLink to="/products" className={navLinkClass}>
              Store Catalog
            </NavLink>

            {/* Customer My Orders link rendered for authenticated users */}
            {user && (
              <NavLink to="/orders" className={navLinkClass}>
                My Orders
              </NavLink>
            )}

            {/* Admin Portal link rendered ONLY when authenticated user has server-verified role 'admin' */}
            {isAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `text-xs font-semibold inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                  }`
                }
              >
                <ShieldCheck className="w-4 h-4 text-blue-500" />
                <span>Admin Portal</span>
              </NavLink>
            )}
          </nav>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="hidden lg:flex items-center relative w-64">
            <input
              type="text"
              placeholder="Search gadgets, audio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 text-sm text-slate-800 placeholder-slate-400 rounded-full pl-9 pr-4 py-1.5 border border-transparent focus:border-blue-500 focus:bg-white focus:outline-none transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </form>

          {/* Right Action Icons */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Wishlist */}
            <div className="relative">
              <button
                onClick={() => setIsWishlistOpen(true)}
                title="Wishlist"
                className="p-2 text-slate-600 hover:text-pink-600 rounded-full hover:bg-slate-100 transition-colors relative"
              >
                <Heart className="w-5 h-5" />
                {wishlist.totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-pink-600 text-[10px] font-bold text-white flex items-center justify-center">
                    {wishlist.totalItems}
                  </span>
                )}
              </button>
            </div>

            {/* Shopping Cart */}
            <div className="relative">
              <button
                onClick={() => setIsCartOpen(true)}
                title="Shopping Cart"
                className="p-2 text-slate-600 hover:text-blue-600 rounded-full hover:bg-slate-100 transition-colors relative"
              >
                <ShoppingBag className="w-5 h-5" />
                {cart.totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-blue-600 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                    {cart.totalItems}
                  </span>
                )}
              </button>
            </div>

            {/* User Profile / Auth Link */}
            {user ? (
              <div className="relative flex items-center space-x-2 pl-1 sm:pl-2 border-l border-slate-200">
                <Link
                  to="/login"
                  title={`Signed in as ${user.email} (${user.role})`}
                  className="flex items-center space-x-1.5 py-1 px-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span className="hidden sm:inline-block max-w-[100px] truncate">{user.fullName || user.email}</span>
                </Link>

                <button
                  onClick={logout}
                  title="Sign out"
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </Link>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 text-sm rounded-lg pl-9 pr-4 py-2 border focus:outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </form>
          <div className="flex flex-col space-y-2 pt-2">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Home
            </Link>
            <Link
              to="/products"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Store Catalog
            </Link>

            {user && (
              <Link
                to="/orders"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
              >
                <Package className="w-4 h-4 text-slate-500" />
                <span>My Orders</span>
              </Link>
            )}

            {isAdmin && (
              <>
                <div className="pt-2 border-t border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3">
                  Admin Tools
                </div>
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-md text-sm font-semibold text-blue-700 bg-blue-50 flex items-center space-x-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Admin Overview</span>
                </Link>
                <Link
                  to="/admin/inventory"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-md text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
                >
                  <Boxes className="w-4 h-4" />
                  <span>Inventory Manager</span>
                </Link>
                <Link
                  to="/admin/orders"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-md text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
                >
                  <Package className="w-4 h-4" />
                  <span>Orders Manager</span>
                </Link>
              </>
            )}

            <div className="pt-2 border-t border-slate-100">
              {user ? (
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-xs text-slate-600 font-medium truncate">
                    {user.email} ({user.role})
                  </span>
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="text-xs font-semibold text-red-600 hover:underline"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-sm font-semibold text-blue-600 hover:bg-blue-50"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
