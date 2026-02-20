const mongoose = require('mongoose');


const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 200
  },

  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true
  },

  // ========== DESCRIPTION FIELD ==========
  description: {
    type: String,
    required: true,
    trim: true,
    minlength: 10,
    maxlength: 2000
  },

  price: {
    type: Number,
    required: true,
    min: 0
  },

  oldPrice: {
    type: Number,
    default: null,
    min: 0
  },

  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR', 'GBP']
  },

  isOnSale: {
    type: Boolean,
    default: false
  },

  salePercentage: {
    type: Number,
    default: null,
    min: 0,
    max: 100
  },

  stock: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },

  inStock: {
    type: Boolean,
    default: true
  },

  images: [{
    type: String,
    required: true
  }],

  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
    index: true
  },

  subcategories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],

  brand: {
    type: String,
    trim: true,
    maxlength: 100
  },

  // Flexible attributes for filtering
  attributes: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },

  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    unit: {
      type: String,
      default: 'cm',
      enum: ['cm', 'inch', 'm']
    }
  },

  weight: {
    value: Number,
    unit: {
      type: String,
      default: 'kg',
      enum: ['kg', 'g', 'lb']
    }
  },

  assemblyRequired: {
    type: Boolean,
    default: false
  },

  warranty: {
    type: String,
    default: ''
  },

  careInstructions: [String],

  tags: [String],

  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },

  reviewsCount: {
    type: Number,
    default: 0,
    min: 0
  },

  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true
});

// Indexes
productSchema.index({ slug: 1, isDeleted: 1 });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ rating: -1 });
productSchema.index({ brand: 1 });

// Update inStock based on stock
productSchema.pre('save', function (next) {
  this.inStock = this.stock > 0;
  next();
});

// Calculate sale percentage
productSchema.pre('save', function (next) {
  if (this.oldPrice && this.price < this.oldPrice) {
    this.isOnSale = true;
    this.salePercentage = Math.round(((this.oldPrice - this.price) / this.oldPrice) * 100);
  } else {
    this.isOnSale = false;
    this.salePercentage = null;
  }
  next();
});

// Soft delete
productSchema.methods.softDelete = async function () {
  this.isDeleted = true;
  this.isActive = false;
  return await this.save();
};

/**
 * ========== GET UNIQUE FILTER OPTIONS ==========
 * Returns all unique values for shop page filters
 * @param {String|ObjectId} categoryId - Can be category slug or ObjectId
 */
productSchema.statics.getUniqueFilterOptions = async function (categoryId = null) {
  const Category = require('./category');

  // Build query
  const query = { isDeleted: false, isActive: true };

  // Handle category filter (accept both slug and ObjectId)
  if (categoryId) {
    // Check if it's already an ObjectId or a slug
    if (mongoose.Types.ObjectId.isValid(categoryId) && categoryId.length === 24) {
      // It's a valid ObjectId
      query.category = categoryId;
    } else {
      // It's a slug, find the category first
      const category = await Category.findOne({ slug: categoryId });
      if (category) {
        query.category = category._id;
      }
    }
  }

  // Get all products WITHOUT .lean() to preserve Map type
  const products = await this.find(query)
    .populate('category', 'name slug')
    .populate('subcategories', 'name slug');

  // Extract unique values
  const filterOptions = {
    categories: [],
    subcategories: [],
    brands: [],
    colors: [],
    materials: [],
    styles: [],
    roomTypes: [],
    seatingCapacity: [],
    sizes: [],
    priceRanges: [
      { label: 'Under ₹20,000', min: 0, max: 20000 },
      { label: '₹20,000 - ₹50,000', min: 20000, max: 50000 },
      { label: '₹50,000 - ₹1,00,000', min: 50000, max: 100000 },
      { label: 'Above ₹1,00,000', min: 100000, max: Infinity }
    ],
    ratings: [5, 4, 3, 2, 1],
    availability: ['In Stock', 'Out of Stock']
  };

  // Use Sets to collect unique values
  const categoriesSet = new Set();
  const subcategoriesSet = new Set();
  const brandsSet = new Set();
  const colorsSet = new Set();
  const materialsSet = new Set();
  const stylesSet = new Set();
  const roomTypesSet = new Set();
  const seatingCapacitySet = new Set();
  const sizesSet = new Set();

  // Process each product
  products.forEach(product => {
    // Categories
    if (product.category) {
      categoriesSet.add(JSON.stringify({
        _id: product.category._id,
        name: product.category.name,
        slug: product.category.slug
      }));
    }

    // Subcategories
    if (product.subcategories && product.subcategories.length > 0) {
      product.subcategories.forEach(sub => {
        subcategoriesSet.add(JSON.stringify({
          _id: sub._id,
          name: sub.name,
          slug: sub.slug
        }));
      });
    }

    // Brands
    if (product.brand) {
      brandsSet.add(product.brand);
    }

    // Attributes - Handle both Map and Object
    if (product.attributes) {
      // Helper function to get attribute value (works for both Map and Object)
      const getAttrValue = (key) => {
        if (product.attributes instanceof Map) {
          return product.attributes.get(key);
        } else {
          return product.attributes[key];
        }
      };

      // Color
      const color = getAttrValue('color');
      if (color) {
        if (Array.isArray(color)) {
          color.forEach(c => colorsSet.add(c));
        } else {
          colorsSet.add(color);
        }
      }

      // Material
      const material = getAttrValue('material');
      if (material) {
        if (Array.isArray(material)) {
          material.forEach(m => materialsSet.add(m));
        } else {
          materialsSet.add(material);
        }
      }

      // Style
      const style = getAttrValue('style');
      if (style) {
        stylesSet.add(style);
      }

      // Room Type
      const roomType = getAttrValue('roomType');
      if (roomType) {
        roomTypesSet.add(roomType);
      }

      // Seating Capacity
      const seatingCapacity = getAttrValue('seatingCapacity');
      if (seatingCapacity) {
        seatingCapacitySet.add(seatingCapacity);
      }

      // Size (check both 'size' and 'bedSize')
      const size = getAttrValue('size');
      const bedSize = getAttrValue('bedSize');
      if (size) {
        sizesSet.add(size);
      }
      if (bedSize) {
        sizesSet.add(bedSize);
      }
    }
  });

  // Convert Sets to Arrays
  filterOptions.categories = Array.from(categoriesSet).map(item => JSON.parse(item));
  filterOptions.subcategories = Array.from(subcategoriesSet).map(item => JSON.parse(item));
  filterOptions.brands = Array.from(brandsSet).sort();
  filterOptions.colors = Array.from(colorsSet).sort();
  filterOptions.materials = Array.from(materialsSet).sort();
  filterOptions.styles = Array.from(stylesSet).sort();
  filterOptions.roomTypes = Array.from(roomTypesSet).sort();
  filterOptions.seatingCapacity = Array.from(seatingCapacitySet).sort();
  filterOptions.sizes = Array.from(sizesSet).sort();

  return filterOptions;
};

module.exports = mongoose.model('Product', productSchema);