import {
  getUserById,
  updateUserProfile,
  changeUserPassword
} from '../services/auth.service.js';
import {
  validateProfileUpdate,
  validatePasswordChange
} from '../validators/auth.validators.js';

/**
 * @route   GET /api/users/me
 * @desc    Get current user profile
 * @access  Protected
 */
export const getProfile = async (req, res, next) => {
  try {
    const user = await getUserById(req.user.id);
    res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PATCH /api/users/me
 * @desc    Update permitted profile fields (fullName)
 * @access  Protected
 */
export const updateProfile = async (req, res, next) => {
  try {
    const validation = validateProfileUpdate(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: validation.errors,
          statusCode: 400
        }
      });
    }

    const { fullName } = req.body;
    const updatedUser = await updateUserProfile(req.user.id, { fullName });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PATCH /api/users/me/password
 * @desc    Change user password with current password verification
 * @access  Protected
 */
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const validation = validatePasswordChange({ currentPassword, newPassword });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: validation.errors,
          statusCode: 400
        }
      });
    }

    const result = await changeUserPassword(req.user.id, { currentPassword, newPassword });

    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (err) {
    next(err);
  }
};

export default {
  getProfile,
  updateProfile,
  changePassword
};