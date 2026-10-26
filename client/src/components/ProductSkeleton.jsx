import React from 'react';

export const ProductSkeleton = () => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm animate-pulse flex flex-col">
      <div className="aspect-square w-full bg-slate-200 rounded-xl mb-4"></div>
      <div className="h-4 bg-slate-200 rounded w-1/3 mb-2"></div>
      <div className="h-5 bg-slate-200 rounded w-3/4 mb-2"></div>
      <div className="h-3 bg-slate-200 rounded w-full mb-1"></div>
      <div className="h-3 bg-slate-200 rounded w-2/3 mb-4"></div>
      <div className="pt-3 border-t border-slate-100 flex justify-between items-center mt-auto">
        <div className="h-6 bg-slate-200 rounded w-1/3"></div>
        <div className="h-8 bg-slate-200 rounded w-1/4"></div>
      </div>
    </div>
  );
};

export default ProductSkeleton;