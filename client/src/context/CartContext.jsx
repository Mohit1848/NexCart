import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  fetchCart,
  addToCartApi,
  updateCartItemApi,
  removeCartItemApi,
  clearCartApi,
  fetchWishlist,
  addToWishlistApi,
  removeWishlistItemApi,
  moveWishlistItemToCartApi
} from '../api/client';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({
    items: [],
    totalItems: 0,
    totalAmount: 0,
    hasUnavailableItems: false
  });
  const [wishlist, setWishlist] = useState({
    items: [],
    totalItems: 0
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  // Initialize Cart and Wishlist from backend
  const refreshData = async () => {
    try {
      const [cartData, wishData] = await Promise.all([
        fetchCart().catch(() => ({ items: [], totalItems: 0, totalAmount: 0 })),
        fetchWishlist().catch(() => ({ items: [], totalItems: 0 }))
      ]);
      setCart(cartData);
      setWishlist(wishData);
    } catch (err) {
      console.warn('Cart & Wishlist initialization notice:', err.message);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Add Item to Cart
  const addItem = async (productId, quantity = 1) => {
    try {
      setLoading(true);
      setActionError(null);
      const updatedCart = await addToCartApi(productId, quantity);
      setCart(updatedCart);
      setIsCartOpen(true); // Open drawer for immediate feedback
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to add item to cart';
      setActionError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  // Update Item Quantity
  const updateQuantity = async (productId, quantity) => {
    try {
      setLoading(true);
      setActionError(null);
      const updatedCart = await updateCartItemApi(productId, quantity);
      setCart(updatedCart);
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to update quantity';
      setActionError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Remove Item from Cart
  const removeItem = async (productId) => {
    try {
      setLoading(true);
      setActionError(null);
      const updatedCart = await removeCartItemApi(productId);
      setCart(updatedCart);
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to remove item';
      setActionError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Clear Cart
  const clear = async () => {
    try {
      setLoading(true);
      setActionError(null);
      const updatedCart = await clearCartApi();
      setCart(updatedCart);
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to clear cart';
      setActionError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Check if item is in wishlist
  const isInWishlist = (productId) => {
    return wishlist.items.some((item) => item.productId === productId);
  };

  // Toggle Wishlist item
  const toggleWishlist = async (productId) => {
    try {
      setLoading(true);
      setActionError(null);
      if (isInWishlist(productId)) {
        const updatedWish = await removeWishlistItemApi(productId);
        setWishlist(updatedWish);
      } else {
        const updatedWish = await addToWishlistApi(productId);
        setWishlist(updatedWish);
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to update wishlist';
      setActionError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Move item from Wishlist to Cart
  const moveToCart = async (productId) => {
    try {
      setLoading(true);
      setActionError(null);
      const res = await moveWishlistItemToCartApi(productId);
      setCart(res.cart);
      setWishlist(res.wishlist);
      setIsCartOpen(true);
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to move item to cart';
      setActionError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        wishlist,
        isCartOpen,
        setIsCartOpen,
        isWishlistOpen,
        setIsWishlistOpen,
        loading,
        actionError,
        setActionError,
        addItem,
        updateQuantity,
        removeItem,
        clear,
        isInWishlist,
        toggleWishlist,
        moveToCart
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartContext;