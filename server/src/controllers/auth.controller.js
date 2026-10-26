import {
  registerUser,
  loginUser,
  getUserById
} from '../services/auth.service.js';
import {
  validateRegistration,
  validateLogin
} from '../validators/auth.validators.js';

/**
 * @route   POST /api/auth/register
 * @desc    Register a new customer account
 * @access  Public
 */
export const register = async (req, res, next) => {
  try {
    const { fullName, email, password } = req.body;

    const validation = validateRegistration({ fullName, email, password });
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

    const result = await registerUser({ fullName, email, password });

    res.status(201).json({
      success: true,
      message: 'Account registered successfully',
      data: result
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and issue JWT
 * @access  Public
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const validation = validateLogin({ email, password });
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

    const result = await loginUser({ email, password });

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      data: result
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/auth/me
 * @desc    Retrieve currently authenticated user profile
 * @access  Protected (Requires Bearer token)
 */
export const getMe = async (req, res, next) => {
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
 * @route   POST /api/auth/logout
 * @desc    Client logout endpoint
 * @access  Public / Protected
 * @note    In stateless JWT Bearer token authentication, the client discards the token.
 *          Server revocation lists (e.g. Redis blocklist) can be added for instantaneous server-side invalidation.
 */
export const logout = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully. Please discard the client token.'
  });
};

export default {
  register,
  login,
  getMe,
  logout
};