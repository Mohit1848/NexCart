import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Shield, Truck, RotateCcw, Headphones } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-navy-900 text-slate-400 mt-20 border-t border-navy-800">
      {/* Guarantees Bar */}
      <div className="border-b border-navy-800 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="flex flex-col items-center p-3">
            <Truck className="w-6 h-6 text-blue-400 mb-2" />
            <h4 className="text-sm font-semibold text-white">Express Delivery</h4>
            <p className="text-xs text-slate-400 mt-1">Dispatched within 24 hours</p>
          </div>
          <div className="flex flex-col items-center p-3">
            <Shield className="w-6 h-6 text-emerald-400 mb-2" />
            <h4 className="text-sm font-semibold text-white">Genuine Guarantee</h4>
            <p className="text-xs text-slate-400 mt-1">100% authentic tech products</p>
          </div>
          <div className="flex flex-col items-center p-3">
            <RotateCcw className="w-6 h-6 text-amber-400 mb-2" />
            <h4 className="text-sm font-semibold text-white">7-Day Easy Returns</h4>
            <p className="text-xs text-slate-400 mt-1">Hassle-free replacement policy</p>
          </div>
          <div className="flex flex-col items-center p-3">
            <Headphones className="w-6 h-6 text-purple-400 mb-2" />
            <h4 className="text-sm font-semibold text-white">24/7 AI Assistance</h4>
            <p className="text-xs text-slate-400 mt-1">Grounded recommendation engine</p>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">
              Nex<span className="text-blue-500">Cart</span>
            </span>
          </div>
          <p className="text-sm leading-relaxed text-slate-400">
            Next-generation AI-assisted e-commerce shopping platform. Discover curated electronics, smart wearables, and audiophile gear with guaranteed database integrity.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Quick Shop</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link to="/products" className="hover:text-white transition-colors">
                All Products
              </Link>
            </li>
            <li>
              <Link to="/products?category=electronics" className="hover:text-white transition-colors">
                Electronics & PC
              </Link>
            </li>
            <li>
              <Link to="/products?category=audio-sound" className="hover:text-white transition-colors">
                Audio & Noise-Cancelling
              </Link>
            </li>
            <li>
              <Link to="/products?category=wearables" className="hover:text-white transition-colors">
                Smartwatches & Bands
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Platform Stack</h4>
          <ul className="space-y-2 text-sm text-slate-400">
            <li>PostgreSQL 18 Database</li>
            <li>Node.js / Express REST API</li>
            <li>JWT & Bcrypt Security</li>
            <li>React + Vite Client</li>
            <li>Gemini AI Discovery (Phase 8)</li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">API Readiness</h4>
          <p className="text-xs text-slate-400 mb-3">
            The NexCart backend runs an automated health & readiness probe connected to PostgreSQL.
          </p>
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-navy-800 text-xs font-mono text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>API v1.0.0 Online</span>
          </div>
        </div>
      </div>

      <div className="border-t border-navy-800 py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} NexCart AI Platform. Developed for Portfolio & Production Deployment.
      </div>
    </footer>
  );
};

export default Footer;