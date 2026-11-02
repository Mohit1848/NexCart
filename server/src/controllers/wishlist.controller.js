import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  moveWishlistItemToCart
} from '../services/wishlist.service.js';

export const fetchUserWishlist = async (req, res, next) => {
  try {
    const wishlist = await getWishlist(req.user.id);
    res.status(200).json({
      success: true,
      data: { wishlist }
    });
  } catch (err) {
    next(err);
  }
};

export const addItemToWishlist = async (req, res, next) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'productId is required',
          statusCode: 400
        }
      });
    }

    const wishlist = await addToWishlist(req.user.id, productId);
    res.status(200).json({
      success: true,
      message: 'Item saved to wishlist',
      data: { wishlist }
    });
  } catch (err) {
    next(err);
  }
};

export const removeItem = async (req, res, next) => {
  try {
    const wishlist = await removeFromWishlist(req.user.id, req.params.productId);
    res.status(200).json({
      success: true,
      message: 'Item removed from wishlist',
      data: { wishlist }
    });
  } catch (err) {
    next(err);
  }
};

export const moveToCart = async (req, res, next) => {
  try {
    const result = await moveWishlistItemToCart(req.user.id, req.params.productId);
    res.status(200).json({
      success: true,
      message: 'Item moved from wishlist to cart',
      data: result
    });
  } catch (err) {
    next(err);
  }
};

export default {
  fetchUserWishlist,
  addItemToWishlist,
  removeItem,
  moveToCart
};