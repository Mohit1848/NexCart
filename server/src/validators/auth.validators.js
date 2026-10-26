/**
 * Authentication and User Input Validators
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates registration input
 */
export const validateRegistration = ({ fullName, email, password }) => {
  const errors = [];

  if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
    errors.push('Full name must be at least 2 characters long');
  } else if (fullName.trim().length > 100) {
    errors.push('Full name cannot exceed 100 characters');
  }

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    errors.push('A valid email address is required');
  } else if (email.trim().length > 255) {
    errors.push('Email address cannot exceed 255 characters');
  }

  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
  } else if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  } else if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one letter and one number');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates login input
 */
export const validateLogin = ({ email, password }) => {
  const errors = [];

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    errors.push('A valid email address is required');
  }

  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates profile update input (explicit allowlist of editable fields)
 */
export const validateProfileUpdate = (data) => {
  const errors = [];
  const allowedFields = ['fullName'];
  const submittedFields = Object.keys(data);

  // Check for forbidden fields
  const forbiddenFields = submittedFields.filter((field) => !allowedFields.includes(field));
  if (forbiddenFields.length > 0) {
    errors.push(`The following fields cannot be modified directly: ${forbiddenFields.join(', ')}`);
  }

  if (data.fullName !== undefined) {
    if (typeof data.fullName !== 'string' || data.fullName.trim().length < 2) {
      errors.push('Full name must be at least 2 characters long');
    } else if (data.fullName.trim().length > 100) {
      errors.push('Full name cannot exceed 100 characters');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates password change input
 */
export const validatePasswordChange = ({ currentPassword, newPassword }) => {
  const errors = [];

  if (!currentPassword || typeof currentPassword !== 'string') {
    errors.push('Current password is required');
  }

  if (!newPassword || typeof newPassword !== 'string') {
    errors.push('New password is required');
  } else if (newPassword.length < 8) {
    errors.push('New password must be at least 8 characters long');
  } else if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    errors.push('New password must contain at least one letter and one number');
  }

  if (currentPassword && newPassword && currentPassword === newPassword) {
    errors.push('New password must be different from current password');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};