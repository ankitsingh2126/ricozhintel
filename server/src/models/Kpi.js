// KPI schema.
// Each KPI belongs to one department (referenced by _id).
// Fields are intentionally simple — target tracking and scorecards come later.

import mongoose from 'mongoose';

const kpiSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'KPI name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [120, 'Name must be at most 120 characters'],
    },
    code: {
      type: String,
      required: [true, 'KPI code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      minlength: [2, 'Code must be at least 2 characters'],
      maxlength: [20, 'Code must be at most 20 characters'],
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required'],
      index: true, // fast filtering by department
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Description must be at most 500 characters'],
    },
    unit: {
      type: String,
      trim: true,
      default: '%',
      maxlength: [10, 'Unit must be at most 10 characters'],
    },
    target: {
      type: Number,
      required: [true, 'Target is required'],
      min: [0, 'Target cannot be negative'],
    },
    currentValue: {
      type: Number,
      default: 0,
      min: [0, 'Current value cannot be negative'],
    },
    status: {
      type: String,
      enum: ['on_track', 'at_risk', 'off_track', 'completed'],
      default: 'on_track',
      index: true,
    },
    period: {
      type: String,
      enum: ['monthly', 'quarterly', 'yearly'],
      default: 'monthly',
    },
  },
  {
    timestamps: true,
  }
);

export const Kpi = mongoose.model('Kpi', kpiSchema);
