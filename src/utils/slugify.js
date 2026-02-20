const Category = require('../models/category');

/**
 * Generate URL-friendly slug from text
 */
const generateSlug = (text) => {
  if (!text) return '';
  
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // Spaces to hyphens
    .replace(/[^\w\-]+/g, '')    // Remove non-word chars
    .replace(/\-\-+/g, '-')      // Multiple hyphens to single
    .replace(/^-+/, '')          // Trim hyphens from start
    .replace(/-+$/, '');         // Trim hyphens from end
};

/**
 * Generate unique slug
 * Appends number if slug exists (e.g., category-name-2)
 */
const generateUniqueSlug = async (name, excludeId = null) => {
  let slug = generateSlug(name);
  let uniqueSlug = slug;
  let counter = 1;
  
  while (!(await Category.isSlugUnique(uniqueSlug, excludeId))) {
    counter++;
    uniqueSlug = `${slug}-${counter}`;
  }
  
  return uniqueSlug;
};

module.exports = {
  generateSlug,
  generateUniqueSlug
};
