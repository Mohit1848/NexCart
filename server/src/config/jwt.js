import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_ISSUER = 'nexcart-api';
const JWT_AUDIENCE = 'nexcart-client';

if (!JWT_SECRET || JWT_SECRET === 'super_secret_jwt_random_key_change_me') {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[FATAL] Insecure JWT_SECRET configured in production environment!');
  } else {
    console.warn('[Security Warning] JWT_SECRET is using a default or development secret. Update with a high-entropy secret.');
  }
}

/**
 * Signs a payload into a secure JSON Web Token
 * @param {Object} payload - { id, email, role }
 * @returns {string} Signed JWT token
 */
export const signToken = (payload) => {
  return jwt.sign(
    {
      id: payload.id,
      email: payload.email,
      role: payload.role
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    }
  );
};

/**
 * Verifies and decodes a JSON Web Token
 * @param {string} token
 * @returns {Object} Decoded payload
 */
export const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET, {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE
  });
};

export default {
  signToken,
  verifyToken,
  JWT_EXPIRES_IN,
  JWT_ISSUER,
  JWT_AUDIENCE
};