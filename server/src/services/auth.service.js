import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { signToken } from '../config/jwt.js';

const BCRYPT_SALT_ROUNDS = 12;

/**
 * Registers a new user account
 * Enforces role='customer' to prevent privilege escalation via registration
 */
export const registerUser = async ({ fullName, email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();

  // Hash password with 12 salt rounds
  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  try {
    const insertSql = `
      INSERT INTO users (full_name, email, password_hash, role)
      VALUES ($1, $2, $3, 'customer')
      RETURNING id, full_name, email, role, created_at, updated_at;
    `;
    const res = await query(insertSql, [fullName.trim(), normalizedEmail, passwordHash]);
    const user = res.rows[0];

    // Generate JWT token
    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    return {
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      },
      token
    };
  } catch (err) {
    // PostgreSQL error 23505 = unique_violation
    if (err.code === '23505') {
      const error = new Error('An account with this email address already exists');
      error.statusCode = 409;
      throw error;
    }
    throw err;
  }
};

/**
 * Authenticates a user with email and password
 * Uses constant-time bcrypt comparison and generic error messages to prevent enumeration
 */
export const loginUser = async ({ email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();

  const findSql = `
    SELECT id, full_name, email, password_hash, role, created_at, updated_at
    FROM users
    WHERE LOWER(email) = $1
    LIMIT 1;
  `;
  const res = await query(findSql, [normalizedEmail]);
  const user = res.rows[0];

  // Generic authentication error message to prevent user enumeration
  const invalidCredentialsError = new Error('Invalid email or password');
  invalidCredentialsError.statusCode = 401;

  if (!user) {
    // Perform a dummy hash compare to prevent timing side-channel attacks
    await bcrypt.compare(password, '$2a$12$e8qC194f4W8i83.8iG9FMe24QkZk1J.oR1Jz0uJ6Y9r59685wQ76G');
    throw invalidCredentialsError;
  }

  const isPasswordMatch = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordMatch) {
    throw invalidCredentialsError;
  }

  const token = signToken({
    id: user.id,
    email: user.email,
    role: user.role
  });

  return {
    user: {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    },
    token
  };
};

/**
 * Retrieves safe user profile by ID
 */
export const getUserById = async (id) => {
  const sql = `
    SELECT id, full_name, email, role, created_at, updated_at
    FROM users
    WHERE id = $1
    LIMIT 1;
  `;
  const res = await query(sql, [id]);
  const user = res.rows[0];

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    role: user.role,
    createdAt: user.created_at,
    updatedAt: user.updated_at
  };
};

/**
 * Updates editable profile fields
 */
export const updateUserProfile = async (id, { fullName }) => {
  const sql = `
    UPDATE users
    SET full_name = $1
    WHERE id = $2
    RETURNING id, full_name, email, role, created_at, updated_at;
  `;
  const res = await query(sql, [fullName.trim(), id]);
  const user = res.rows[0];

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    role: user.role,
    createdAt: user.created_at,
    updatedAt: user.updated_at
  };
};

/**
 * Changes a user's password with current password verification
 */
export const changeUserPassword = async (id, { currentPassword, newPassword }) => {
  const findSql = `
    SELECT id, password_hash
    FROM users
    WHERE id = $1
    LIMIT 1;
  `;
  const res = await query(findSql, [id]);
  const user = res.rows[0];

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const isCurrentMatch = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isCurrentMatch) {
    const error = new Error('Current password is incorrect');
    error.statusCode = 400;
    throw error;
  }

  const newHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, id]);

  return {
    success: true,
    message: 'Password updated successfully'
  };
};

export default {
  registerUser,
  loginUser,
  getUserById,
  updateUserProfile,
  changeUserPassword
};