// Department schema.
// A department belongs to the org (e.g. "Sales", "Engineering", "Finance").
// KPIs (Stage 4) will reference a department by _id.

import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Department name is required'],
      unique: true,
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [80, 'Name must be at most 80 characters'],
    },
    code: {
      type: String,
      required: [true, 'Department code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      minlength: [2, 'Code must be at least 2 characters'],
      maxlength: [10, 'Code must be at most 10 characters'],
    },
    head: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Description must be at most 500 characters'],
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

export const Department = mongoose.model('Department', departmentSchema);
