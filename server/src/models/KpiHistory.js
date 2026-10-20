// KPI History schema.
// Records chronological value changes and updates for KPI trend tracking.
//
// Compound index covers querying a KPI's history sorted by newest first:
//   { kpi: 1, createdAt: -1 }

import mongoose from 'mongoose';

const kpiHistorySchema = new mongoose.Schema(
  {
    kpi: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Kpi',
      required: [true, 'KPI reference is required'],
      index: true,
    },
    previousValue: {
      type: Number,
      required: [true, 'Previous value is required'],
      min: [0, 'Previous value cannot be negative'],
    },
    newValue: {
      type: Number,
      required: [true, 'New value is required'],
      min: [0, 'New value cannot be negative'],
    },
    target: {
      type: Number,
      required: [true, 'Target is required'],
      min: [0, 'Target cannot be negative'],
    },
    status: {
      type: String,
      enum: ['on_track', 'at_risk', 'off_track', 'completed'],
      required: [true, 'Status is required'],
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    changedByName: {
      type: String,
      trim: true,
      default: 'System',
      maxlength: [100, 'Changed-by name cannot exceed 100 characters'],
    },
    note: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Note cannot exceed 500 characters'],
    },
    changeType: {
      type: String,
      enum: ['initial', 'value_update', 'full_edit'],
      default: 'value_update',
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

// Compound index for querying chronological history of a specific KPI
kpiHistorySchema.index({ kpi: 1, createdAt: -1 });

export const KpiHistory = mongoose.model('KpiHistory', kpiHistorySchema);
