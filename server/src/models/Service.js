const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Service name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: ['hair', 'skin', 'nails', 'makeup', 'spa', 'bridal', 'grooming', 'combo'],
        message: '{VALUE} is not a valid category',
      },
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    discountPrice: {
      type: Number,
      default: null,
      validate: {
        validator: function (v) {
          return v === null || v < this.price;
        },
        message: 'Discount price must be less than regular price',
      },
    },
    duration: {
      type: Number,
      required: [true, 'Duration is required'],
      min: [5, 'Duration must be at least 5 minutes'],
      max: [480, 'Duration cannot exceed 8 hours'],
    },
    image: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'unisex'],
      default: 'unisex',
    },
    popularity: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: formatted price
serviceSchema.virtual('formattedPrice').get(function () {
  return `₹${this.price.toLocaleString('en-IN')}`;
});

// Virtual: formatted duration
serviceSchema.virtual('formattedDuration').get(function () {
  if (this.duration >= 60) {
    const hrs = Math.floor(this.duration / 60);
    const mins = this.duration % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }
  return `${this.duration} min`;
});

// Index for faster queries
serviceSchema.index({ category: 1, isActive: 1 });
serviceSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Service', serviceSchema);