const mongoose = require('mongoose');

/**
 * Category Model
 * 
 * Features:
 * - Hierarchical structure (parent-child)
 * - Multiple images with primary selection
 * - Unique URL-friendly slugs
 * - SEO optimization
 * - Soft deletes
 * 
 * Hierarchy Example:
 * Electronics (level 0)
 *   └── Smartphones (level 1)
 *        └── iPhone (level 2)
 */

const categorySchema = new mongoose.Schema({
    
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  
  description: {
    type: String,
    default: '',
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  
  // Hierarchical relationship
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null,
    index: true
  },
  
  // Auto-calculated nesting depth
  level: {
    type: Number,
    default: 0,
    min: 0,
    max: 3 // Maximum nesting: Root(0), Cat(1), Sub(2), Sub-sub(3)
  },
  
  // Full path for breadcrumbs (e.g., "electronics/smartphones/iphone")
  path: {
    type: String,
    default: '',
    index: true
  },
  
  // Images array
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: {
      type: String,
      default: ''
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  
  // SEO fields
  seo: {
    title: {
      type: String,
      maxlength: 60
    },
    description: {
      type: String,
      maxlength: 160
    },
    keywords: [String]
  },
  
  // Status and ordering
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  displayOrder: {
    type: Number,
    default: 0
  },
  
  productCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ========== INDEXES ==========
categorySchema.index({ slug: 1, isDeleted: 1 });
categorySchema.index({ parent: 1, isActive: 1 });
categorySchema.index({ isActive: 1, displayOrder: 1 });

// ========== VIRTUALS ==========
categorySchema.virtual('primaryImage').get(function() {
  if (!this.images || this.images.length === 0) return null;
  return this.images.find(img => img.isPrimary) || this.images[0];
});

// ========== PRE-SAVE HOOKS ==========
categorySchema.pre('save', async function(next) {
  // Calculate level and path based on parent
  if (this.isModified('parent') || this.isNew) {
    if (this.parent) {
      const parent = await this.constructor.findById(this.parent);
      if (!parent) throw new Error('Parent category not found');
      
      // Prevent self-reference
      if (parent._id.equals(this._id)) {
        throw new Error('Category cannot be its own parent');
      }
      
      this.level = parent.level + 1;
      this.path = parent.path ? `${parent.path}/${this.slug}` : this.slug;
    } else {
      this.level = 0;
      this.path = this.slug;
    }
  }
  
  next();
});

// ========== INSTANCE METHODS ==========

// Soft delete
categorySchema.methods.softDelete = async function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.isActive = false;
  return await this.save();
};

// Restore
categorySchema.methods.restore = async function() {
  this.isDeleted = false;
  this.deletedAt = null;
  this.isActive = true;
  return await this.save();
};

// Get all descendants
categorySchema.methods.getDescendants = async function() {
  const descendants = [];
  
  const findChildren = async (parentId) => {
    const children = await this.constructor.find({ 
      parent: parentId, 
      isDeleted: false 
    });
    
    for (const child of children) {
      descendants.push(child);
      await findChildren(child._id);
    }
  };
  
  await findChildren(this._id);
  return descendants;
};

// ========== STATIC METHODS ==========

// Check slug uniqueness
categorySchema.statics.isSlugUnique = async function(slug, excludeId = null) {
  const query = { slug, isDeleted: false };
  if (excludeId) query._id = { $ne: excludeId };
  
  const existing = await this.findOne(query);
  return !existing;
};

// Get category tree
categorySchema.statics.getTree = async function() {
  const categories = await this.find({ isDeleted: false })
    .sort({ displayOrder: 1, name: 1 })
    .lean();
  
  const categoryMap = new Map();
  const tree = [];
  
  // Create map
  categories.forEach(cat => {
    categoryMap.set(cat._id.toString(), { ...cat, children: [] });
  });
  
  // Build tree
  categories.forEach(cat => {
    const node = categoryMap.get(cat._id.toString());
    if (cat.parent) {
      const parent = categoryMap.get(cat.parent.toString());
      if (parent) parent.children.push(node);
    } else {
      tree.push(node);
    }
  });
  
  return tree;
};

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
