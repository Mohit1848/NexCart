/**
 * Category Validation Rules
 */

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // Replace spaces with -
    .replace(/[^\w\-]+/g, '')    // Remove non-word chars
    .replace(/\-\-+/g, '-')      // Replace multiple - with single -
    .replace(/^-+/, '')          // Trim - from start
    .replace(/-+$/, '');         // Trim - from end
};

export const validateCreateCategory = ({ name, slug, description, imageUrl }) => {
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('Category name must be at least 2 characters long');
  } else if (name.trim().length > 100) {
    errors.push('Category name cannot exceed 100 characters');
  }

  const finalSlug = slug ? slug.trim() : slugify(name || '');
  if (!finalSlug || !SLUG_REGEX.test(finalSlug)) {
    errors.push('Slug must contain only lowercase letters, numbers, and hyphens');
  } else if (finalSlug.length > 120) {
    errors.push('Slug cannot exceed 120 characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      name: name ? name.trim() : '',
      slug: finalSlug,
      description: description ? description.trim() : null,
      imageUrl: imageUrl ? imageUrl.trim() : null
    }
  };
};

export const validateUpdateCategory = (data) => {
  const errors = [];
  const allowedFields = ['name', 'slug', 'description', 'imageUrl'];
  const submittedFields = Object.keys(data);

  const forbiddenFields = submittedFields.filter((f) => !allowedFields.includes(f));
  if (forbiddenFields.length > 0) {
    errors.push(`Fields cannot be modified: ${forbiddenFields.join(', ')}`);
  }

  if (data.name !== undefined) {
    if (typeof data.name !== 'string' || data.name.trim().length < 2) {
      errors.push('Category name must be at least 2 characters long');
    } else if (data.name.trim().length > 100) {
      errors.push('Category name cannot exceed 100 characters');
    }
  }

  if (data.slug !== undefined) {
    const trimmedSlug = data.slug.trim();
    if (!SLUG_REGEX.test(trimmedSlug)) {
      errors.push('Slug must contain only lowercase alphanumeric characters and hyphens');
    } else if (trimmedSlug.length > 120) {
      errors.push('Slug cannot exceed 120 characters');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};