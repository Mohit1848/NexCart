import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';

export const NotFoundPage = () => {
  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center space-y-6">
      <div className="w-20 h-20 rounded-3xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center shadow-inner">
        <Compass className="w-10 h-10 animate-spin-slow" />
      </div>

      <div className="space-y-2">
        <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Error 404</span>
        <h1 className="text-3xl font-extrabold text-navy-900">Page Not Found</h1>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">
          The page or product you are looking for doesn't exist or has moved to a new URL.
        </p>
      </div>

      <div>
        <Link
          to="/"
          className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Storefront</span>
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;