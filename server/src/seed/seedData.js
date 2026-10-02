// Seed script. Populates the database with sample departments + KPIs.
// Run with:  npm run seed
// WARNING: this WIPES existing departments and kpis collections first.

import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { connectDB } from '../config/db.js';
import { Department } from '../models/Department.js';
import { Kpi } from '../models/Kpi.js';

const departments = [
  { name: 'Sales', code: 'SAL', head: 'Alice Chen', description: 'Revenue and pipeline' },
  { name: 'Engineering', code: 'ENG', head: 'Bob Patel', description: 'Product engineering' },
  { name: 'Marketing', code: 'MKT', head: 'Carla Ruiz', description: 'Brand and demand gen' },
  { name: 'Finance', code: 'FIN', head: 'Daniel Okafor', description: 'Financial planning' },
  { name: 'Customer Success', code: 'CS', head: 'Elena Petrov', description: 'Retention and support' },
];

// Each KPI references a department by code — resolved to _id at insert time.
const kpis = [
  { name: 'Monthly Revenue', code: 'SAL-REV', dept: 'SAL', unit: 'USD', target: 500000, currentValue: 420000, status: 'on_track', period: 'monthly' },
  { name: 'New Deals Closed', code: 'SAL-DEALS', dept: 'SAL', unit: 'count', target: 40, currentValue: 33, status: 'on_track', period: 'monthly' },
  { name: 'Average Deal Size', code: 'SAL-AVG', dept: 'SAL', unit: 'USD', target: 15000, currentValue: 12500, status: 'at_risk', period: 'monthly' },

  { name: 'Deployment Frequency', code: 'ENG-DEPLOY', dept: 'ENG', unit: 'per week', target: 10, currentValue: 12, status: 'completed', period: 'monthly' },
  { name: 'Bug Escape Rate', code: 'ENG-BUGS', dept: 'ENG', unit: '%', target: 2, currentValue: 3.5, status: 'off_track', period: 'monthly' },
  { name: 'Sprint Velocity', code: 'ENG-VEL', dept: 'ENG', unit: 'points', target: 80, currentValue: 72, status: 'on_track', period: 'monthly' },

  { name: 'Qualified Leads', code: 'MKT-MQL', dept: 'MKT', unit: 'count', target: 1200, currentValue: 980, status: 'at_risk', period: 'monthly' },
  { name: 'Cost Per Lead', code: 'MKT-CPL', dept: 'MKT', unit: 'USD', target: 45, currentValue: 52, status: 'off_track', period: 'monthly' },
  { name: 'Campaign ROAS', code: 'MKT-ROAS', dept: 'MKT', unit: 'x', target: 4, currentValue: 3.6, status: 'on_track', period: 'quarterly' },

  { name: 'Gross Margin', code: 'FIN-GM', dept: 'FIN', unit: '%', target: 65, currentValue: 62, status: 'on_track', period: 'quarterly' },
  { name: 'Operating Cash Flow', code: 'FIN-OCF', dept: 'FIN', unit: 'USD', target: 250000, currentValue: 210000, status: 'at_risk', period: 'monthly' },

  { name: 'Customer Retention', code: 'CS-RET', dept: 'CS', unit: '%', target: 92, currentValue: 94, status: 'completed', period: 'monthly' },
  { name: 'Net Promoter Score', code: 'CS-NPS', dept: 'CS', unit: 'score', target: 60, currentValue: 55, status: 'on_track', period: 'quarterly' },
  { name: 'Avg Response Time', code: 'CS-RESP', dept: 'CS', unit: 'hours', target: 4, currentValue: 5.5, status: 'at_risk', period: 'monthly' },
];

const run = async () => {
  try {
    await connectDB();

    console.log('[seed] Clearing existing departments and kpis...');
    await Promise.all([Department.deleteMany({}), Kpi.deleteMany({})]);

    console.log(`[seed] Inserting ${departments.length} departments...`);
    const insertedDepts = await Department.insertMany(departments);

    // Map code -> _id so KPIs can resolve their department reference.
    const codeToId = {};
    insertedDepts.forEach((d) => {
      codeToId[d.code] = d._id;
    });

    const kpisToInsert = kpis.map((k) => ({
      name: k.name,
      code: k.code,
      department: codeToId[k.dept],
      unit: k.unit,
      target: k.target,
      currentValue: k.currentValue,
      status: k.status,
      period: k.period,
    }));

    console.log(`[seed] Inserting ${kpisToInsert.length} KPIs...`);
    await Kpi.insertMany(kpisToInsert);

    console.log('[seed] Done.');
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('[seed] Failed:', err.message);
    process.exit(1);
  }
};

run();
