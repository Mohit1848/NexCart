import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogIn, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AdminRoute = ({ children }) => {
  const { user, loading, isAdmin, logout } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Verifying administrator session...</p>
      </div>
    );
  }

  // If unauthenticated, redirect to login with return path
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // If authenticated but not an admin (i.e. role is customer)
  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto my-16 px-4">
        <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied (403)</h2>
          <p className="text-sm text-slate-600 mb-4">
            You are currently signed in as <span className="font-semibold text-slate-800">{user.email}</span> with the{' '}
            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 uppercase">
              {user.role}
            </span>{' '}
            role.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-6 text-xs text-amber-800 text-left">
            <p className="font-semibold mb-1">Administrative Privileges Required</p>
            <p>
              The NexCart Admin Portal is restricted to verified administrator accounts. To manage inventory and metrics, please sign in with administrator credentials.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Store</span>
            </Link>
            <Link
              to="/login"
              state={{ from: location.pathname }}
              onClick={logout}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/20"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign in as Admin</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default AdminRoute;

