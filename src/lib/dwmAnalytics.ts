// ============================================================================
// HELPING HANDS - Data Warehousing & Mining (DWM) Analytical Engine
// READ-ONLY algorithmic processing on Supabase datasets (In-memory analytics)
// ============================================================================

import { Donation, NGOProfile, UserProfile } from '../types';

// ----------------------------------------------------------------------------
// 1. DATA EXPLORATION TYPES & FUNCTIONS
// ----------------------------------------------------------------------------

export interface AttributeInfo {
  name: string;
  type: 'numeric' | 'categorical' | 'datetime' | 'identifier';
  nonNullCount: number;
  nullCount: number;
  distinctCount: number;
  sampleValues: string[];
}

export interface NumericalStats {
  attribute: string;
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  variance: number;
  stdDev: number;
  q1: number;
  q3: number;
  iqr: number;
}

export interface DataExplorationResult {
  totalDonationRecords: number;
  totalDonorRecords: number;
  totalNGORecords: number;
  attributes: AttributeInfo[];
  numericalStats: NumericalStats | null;
  duplicateCount: number;
  categoryDistribution: Record<string, number>;
  statusDistribution: Record<string, number>;
  cityDistribution: Record<string, number>;
}

export function computeDataExploration(
  donations: Donation[],
  ngos: NGOProfile[],
  donors: UserProfile[]
): DataExplorationResult {
  const totalDonationRecords = donations.length;
  const totalDonorRecords = donors.length;
  const totalNGORecords = ngos.length;

  // Numerical stats for donation 'quantity'
  const quantities = donations
    .map((d) => Number(d.quantity))
    .filter((q) => !isNaN(q) && q > 0)
    .sort((a, b) => a - b);

  let numericalStats: NumericalStats | null = null;
  if (quantities.length > 0) {
    const count = quantities.length;
    const min = quantities[0];
    const max = quantities[count - 1];
    const sum = quantities.reduce((acc, v) => acc + v, 0);
    const mean = sum / count;

    // Median
    const mid = Math.floor(count / 2);
    const median = count % 2 !== 0 ? quantities[mid] : (quantities[mid - 1] + quantities[mid]) / 2;

    // Quartiles
    const q1Idx = Math.floor(count * 0.25);
    const q3Idx = Math.floor(count * 0.75);
    const q1 = quantities[q1Idx];
    const q3 = quantities[q3Idx];
    const iqr = q3 - q1;

    // Variance & StdDev
    const variance = quantities.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / count;
    const stdDev = Math.sqrt(variance);

    numericalStats = {
      attribute: 'quantity',
      count,
      min,
      max,
      mean: Math.round(mean * 100) / 100,
      median,
      variance: Math.round(variance * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
      q1,
      q3,
      iqr,
    };
  }

  // Detect duplicates (by same title, donor_id, pickup_date)
  const seenKeys = new Set<string>();
  let duplicateCount = 0;
  for (const d of donations) {
    const key = `${d.title.trim().toLowerCase()}|${d.donor_id}|${d.pickup_date}`;
    if (seenKeys.has(key)) {
      duplicateCount++;
    } else {
      seenKeys.add(key);
    }
  }

  // Attribute inventory
  const attributes: AttributeInfo[] = [
    {
      name: 'id',
      type: 'identifier',
      nonNullCount: donations.filter((d) => d.id).length,
      nullCount: donations.filter((d) => !d.id).length,
      distinctCount: new Set(donations.map((d) => d.id)).size,
      sampleValues: donations.slice(0, 3).map((d) => d.id.slice(0, 8) + '...'),
    },
    {
      name: 'donor_id',
      type: 'identifier',
      nonNullCount: donations.filter((d) => d.donor_id).length,
      nullCount: donations.filter((d) => !d.donor_id).length,
      distinctCount: new Set(donations.map((d) => d.donor_id)).size,
      sampleValues: donations.slice(0, 3).map((d) => d.donor_id.slice(0, 8) + '...'),
    },
    {
      name: 'category',
      type: 'categorical',
      nonNullCount: donations.filter((d) => d.category).length,
      nullCount: donations.filter((d) => !d.category).length,
      distinctCount: new Set(donations.map((d) => d.category)).size,
      sampleValues: Array.from(new Set(donations.map((d) => d.category))).slice(0, 4),
    },
    {
      name: 'quantity',
      type: 'numeric',
      nonNullCount: quantities.length,
      nullCount: donations.length - quantities.length,
      distinctCount: new Set(quantities).size,
      sampleValues: Array.from(new Set(quantities.map(String))).slice(0, 4),
    },
    {
      name: 'condition',
      type: 'categorical',
      nonNullCount: donations.filter((d) => d.condition).length,
      nullCount: donations.filter((d) => !d.condition).length,
      distinctCount: new Set(donations.map((d) => d.condition)).size,
      sampleValues: Array.from(new Set(donations.map((d) => d.condition))).slice(0, 4),
    },
    {
      name: 'city',
      type: 'categorical',
      nonNullCount: donations.filter((d) => d.city).length,
      nullCount: donations.filter((d) => !d.city).length,
      distinctCount: new Set(donations.map((d) => d.city)).size,
      sampleValues: Array.from(new Set(donations.map((d) => d.city))).slice(0, 4),
    },
    {
      name: 'status',
      type: 'categorical',
      nonNullCount: donations.filter((d) => d.status).length,
      nullCount: donations.filter((d) => !d.status).length,
      distinctCount: new Set(donations.map((d) => d.status)).size,
      sampleValues: Array.from(new Set(donations.map((d) => d.status))),
    },
    {
      name: 'accepted_ngo_id',
      type: 'identifier',
      nonNullCount: donations.filter((d) => d.accepted_ngo_id).length,
      nullCount: donations.filter((d) => !d.accepted_ngo_id).length,
      distinctCount: new Set(donations.filter((d) => d.accepted_ngo_id).map((d) => d.accepted_ngo_id)).size,
      sampleValues: donations.filter((d) => d.accepted_ngo_id).slice(0, 3).map((d) => (d.accepted_ngo_id || '').slice(0, 8) + '...'),
    },
    {
      name: 'pickup_date',
      type: 'datetime',
      nonNullCount: donations.filter((d) => d.pickup_date).length,
      nullCount: donations.filter((d) => !d.pickup_date).length,
      distinctCount: new Set(donations.map((d) => d.pickup_date)).size,
      sampleValues: Array.from(new Set(donations.map((d) => d.pickup_date))).slice(0, 3),
    },
    {
      name: 'created_at',
      type: 'datetime',
      nonNullCount: donations.filter((d) => d.created_at).length,
      nullCount: donations.filter((d) => !d.created_at).length,
      distinctCount: new Set(donations.map((d) => d.created_at)).size,
      sampleValues: donations.slice(0, 2).map((d) => new Date(d.created_at).toLocaleDateString()),
    },
  ];

  // Frequency distributions
  const categoryDistribution: Record<string, number> = {};
  const statusDistribution: Record<string, number> = {};
  const cityDistribution: Record<string, number> = {};

  for (const d of donations) {
    const cat = d.category || 'Uncategorized';
    categoryDistribution[cat] = (categoryDistribution[cat] || 0) + 1;

    const st = d.status || 'UNKNOWN';
    statusDistribution[st] = (statusDistribution[st] || 0) + 1;

    const cty = d.city || 'Unspecified';
    cityDistribution[cty] = (cityDistribution[cty] || 0) + 1;
  }

  return {
    totalDonationRecords,
    totalDonorRecords,
    totalNGORecords,
    attributes,
    numericalStats,
    duplicateCount,
    categoryDistribution,
    statusDistribution,
    cityDistribution,
  };
}

// ----------------------------------------------------------------------------
// 2. DATA PREPROCESSING PIPELINE
// ----------------------------------------------------------------------------

export interface PreprocessingStep {
  stepNumber: number;
  name: string;
  description: string;
  inputRecordCount: number;
  outputRecordCount: number;
  details: string[];
}

export interface CleanedDonationRecord {
  id: string;
  donorId: string;
  category: string;
  categoryCode: number;
  quantity: number;
  normalizedQuantity: number;
  condition: string;
  conditionCode: number;
  city: string;
  cityCode: number;
  status: string;
  statusCode: number;
  hasNgoAssigned: number;
  createdAt: string;
}

export interface PreprocessingResult {
  steps: PreprocessingStep[];
  cleanedDataset: CleanedDonationRecord[];
  categoryEncodingMap: Record<string, number>;
  conditionEncodingMap: Record<string, number>;
  cityEncodingMap: Record<string, number>;
  statusEncodingMap: Record<string, number>;
  minQuantity: number;
  maxQuantity: number;
}

export function runPreprocessingPipeline(donations: Donation[]): PreprocessingResult {
  const steps: PreprocessingStep[] = [];
  const rawCount = donations.length;

  // Step 1: Raw Ingestion
  steps.push({
    stepNumber: 1,
    name: 'Raw Data Ingestion',
    description: 'Read raw records from Supabase public.donations table.',
    inputRecordCount: rawCount,
    outputRecordCount: rawCount,
    details: [
      `Ingested ${rawCount} raw rows.`,
      `Attributes ingested: id, donor_id, category, quantity, condition, city, status, accepted_ngo_id.`,
    ],
  });

  // Step 2: Missing Value Handling & Deduplication
  const cleaned: Donation[] = [];
  let nullQuantityFixed = 0;
  let missingCityFixed = 0;
  const seen = new Set<string>();
  let dupesRemoved = 0;

  for (const d of donations) {
    const key = `${d.id}`;
    if (seen.has(key)) {
      dupesRemoved++;
      continue;
    }
    seen.add(key);

    const safeQty = d.quantity && !isNaN(d.quantity) && d.quantity > 0 ? d.quantity : 1;
    if (d.quantity !== safeQty) nullQuantityFixed++;

    const safeCity = (d.city || 'General').trim();
    if (!d.city) missingCityFixed++;

    cleaned.push({
      ...d,
      quantity: safeQty,
      city: safeCity,
      category: (d.category || 'General Aid').trim(),
      condition: (d.condition || 'Gently Used').trim(),
      status: (d.status || 'PENDING').trim() as any,
    });
  }

  steps.push({
    stepNumber: 2,
    name: 'Data Cleaning & Validation',
    description: 'Handle missing values, trim whitespace, and guarantee integrity constraints.',
    inputRecordCount: rawCount,
    outputRecordCount: cleaned.length,
    details: [
      `Deduplication: ${dupesRemoved} duplicate record(s) flagged/handled.`,
      `Missing quantity imputed to 1 for ${nullQuantityFixed} row(s).`,
      `Missing city imputed to 'General' for ${missingCityFixed} row(s).`,
    ],
  });

  // Step 3: Categorical Encoding (Label Encoding)
  const categoryEncodingMap: Record<string, number> = {};
  const conditionEncodingMap: Record<string, number> = {};
  const cityEncodingMap: Record<string, number> = {};
  const statusEncodingMap: Record<string, number> = {
    PENDING: 0,
    ACCEPTED: 1,
    SCHEDULED: 2,
    COMPLETED: 3,
    CANCELLED: 4,
  };

  let catCode = 0;
  let condCode = 0;
  let ctyCode = 0;

  for (const d of cleaned) {
    if (categoryEncodingMap[d.category] === undefined) {
      categoryEncodingMap[d.category] = catCode++;
    }
    if (conditionEncodingMap[d.condition] === undefined) {
      conditionEncodingMap[d.condition] = condCode++;
    }
    if (cityEncodingMap[d.city] === undefined) {
      cityEncodingMap[d.city] = ctyCode++;
    }
  }

  // Step 4: Numerical Normalization (Min-Max Scaling to [0, 1])
  const quantities = cleaned.map((d) => d.quantity);
  const minQuantity = quantities.length > 0 ? Math.min(...quantities) : 1;
  const maxQuantity = quantities.length > 0 ? Math.max(...quantities) : 1;
  const quantityRange = maxQuantity - minQuantity || 1;

  const transformedDataset: CleanedDonationRecord[] = cleaned.map((d) => {
    const normalizedQuantity = (d.quantity - minQuantity) / quantityRange;
    return {
      id: d.id,
      donorId: d.donor_id,
      category: d.category,
      categoryCode: categoryEncodingMap[d.category] ?? 0,
      quantity: d.quantity,
      normalizedQuantity: Math.round(normalizedQuantity * 1000) / 1000,
      condition: d.condition,
      conditionCode: conditionEncodingMap[d.condition] ?? 0,
      city: d.city,
      cityCode: cityEncodingMap[d.city] ?? 0,
      status: d.status,
      statusCode: statusEncodingMap[d.status] ?? 0,
      hasNgoAssigned: d.accepted_ngo_id ? 1 : 0,
      createdAt: d.created_at,
    };
  });

  steps.push({
    stepNumber: 3,
    name: 'Transformation & Label Encoding',
    description: 'Map categorical variables to integer indices for algorithmic readiness.',
    inputRecordCount: cleaned.length,
    outputRecordCount: transformedDataset.length,
    details: [
      `Categories mapped: ${Object.keys(categoryEncodingMap).length} distinct categories.`,
      `Conditions mapped: ${Object.keys(conditionEncodingMap).length} distinct conditions.`,
      `Cities mapped: ${Object.keys(cityEncodingMap).length} distinct cities.`,
      `Statuses mapped: 5 standard statuses (PENDING -> CANCELLED).`,
    ],
  });

  steps.push({
    stepNumber: 4,
    name: 'Feature Scaling & Analytical Matrix',
    description: 'Min-Max normalize continuous numerical features to range [0, 1].',
    inputRecordCount: transformedDataset.length,
    outputRecordCount: transformedDataset.length,
    details: [
      `Normalized 'quantity' from range [${minQuantity}, ${maxQuantity}] to [0.00, 1.00].`,
      `Prepared final in-memory feature vectors for OLAP, K-Means, and Association Mining.`,
    ],
  });

  return {
    steps,
    cleanedDataset: transformedDataset,
    categoryEncodingMap,
    conditionEncodingMap,
    cityEncodingMap,
    statusEncodingMap,
    minQuantity,
    maxQuantity,
  };
}

// ----------------------------------------------------------------------------
// 3. ON-LINE ANALYTICAL PROCESSING (OLAP) ENGINE
// ----------------------------------------------------------------------------

export type OLAPGranularity = 'day' | 'month' | 'year';
export type OLAPDimension = 'category' | 'city' | 'status' | 'date' | 'ngo';
export type OLAPMeasure = 'count' | 'quantity';

export interface OLAPRollUpDrillDownRow {
  period: string;
  totalDonations: number;
  totalQuantity: number;
  completedDonations: number;
  pendingDonations: number;
  acceptedDonations: number;
  scheduledDonations: number;
  completionRate: number;
}

export interface OLAPSliceFilter {
  dimension: OLAPDimension;
  value: string;
}

export interface OLAPDiceFilter {
  categories: string[];
  cities: string[];
  statuses: string[];
  ngos?: string[];
}

export interface OLAPPivotCell {
  rowValue: string;
  colValue: string;
  count: number;
  quantitySum: number;
}

export interface OLAPPivotTable {
  rowDimension: OLAPDimension;
  colDimension: OLAPDimension;
  measure: OLAPMeasure;
  rowLabels: string[];
  colLabels: string[];
  matrix: Record<string, Record<string, { count: number; quantity: number }>>;
  totalRowCounts: Record<string, number>;
  totalColCounts: Record<string, number>;
  totalRowQuantities: Record<string, number>;
  totalColQuantities: Record<string, number>;
  grandTotalCount: number;
  grandTotalQuantity: number;
}

export function getOLAPDimensionValue(
  d: Donation,
  dim: OLAPDimension,
  granularity: OLAPGranularity = 'month'
): string {
  if (dim === 'category') return (d.category || 'Uncategorized').trim();
  if (dim === 'city') return (d.city || 'Unspecified').trim();
  if (dim === 'status') return (d.status || 'UNKNOWN').trim();
  if (dim === 'ngo') {
    return (
      d.ngo?.org_name ||
      (d.accepted_ngo_id ? 'Assigned Partner' : 'Unassigned')
    ).trim();
  }
  if (dim === 'date') {
    const dateObj = new Date(d.created_at || d.pickup_date);
    if (isNaN(dateObj.getTime())) return 'Undated';
    if (granularity === 'year') {
      return String(dateObj.getFullYear());
    } else if (granularity === 'month') {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
    }
    return dateObj.toISOString().split('T')[0];
  }
  return 'Other';
}

export function computeOLAPRollUp(
  donations: Donation[],
  granularity: OLAPGranularity
): OLAPRollUpDrillDownRow[] {
  const map: Record<string, { count: number; qty: number; completed: number; pending: number; accepted: number; scheduled: number; sortKey: string }> = {};

  for (const d of donations) {
    const dateObj = new Date(d.created_at || d.pickup_date);
    if (isNaN(dateObj.getTime())) continue;

    let key = '';
    let sortKey = '';

    if (granularity === 'year') {
      key = String(dateObj.getFullYear());
      sortKey = key;
    } else if (granularity === 'month') {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      key = `${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
      sortKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
    } else {
      key = dateObj.toISOString().split('T')[0];
      sortKey = key;
    }

    if (!map[key]) {
      map[key] = { count: 0, qty: 0, completed: 0, pending: 0, accepted: 0, scheduled: 0, sortKey };
    }

    map[key].count++;
    map[key].qty += Number(d.quantity) || 1;
    if (d.status === 'COMPLETED') map[key].completed++;
    if (d.status === 'PENDING') map[key].pending++;
    if (d.status === 'ACCEPTED') map[key].accepted++;
    if (d.status === 'SCHEDULED') map[key].scheduled++;
  }

  const results = Object.entries(map).map(([period, data]) => ({
    period,
    sortKey: data.sortKey,
    totalDonations: data.count,
    totalQuantity: data.qty,
    completedDonations: data.completed,
    pendingDonations: data.pending,
    acceptedDonations: data.accepted,
    scheduledDonations: data.scheduled,
    completionRate: data.count > 0 ? Math.round((data.completed / data.count) * 100) : 0,
  }));

  // Sort chronologically
  results.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  return results.map(({ sortKey, ...rest }) => rest);
}

export function computeOLAPSlice(
  donations: Donation[],
  slice: OLAPSliceFilter,
  granularity: OLAPGranularity = 'month'
): Donation[] {
  if (!slice.value) return donations;
  return donations.filter((d) => {
    const val = getOLAPDimensionValue(d, slice.dimension, granularity);
    return val === slice.value;
  });
}

export function computeOLAPDice(
  donations: Donation[],
  dice: OLAPDiceFilter
): Donation[] {
  return donations.filter((d) => {
    const cat = (d.category || 'Uncategorized').trim();
    const cty = (d.city || 'Unspecified').trim();
    const st = (d.status || 'UNKNOWN').trim();
    const ngo = (d.ngo?.org_name || (d.accepted_ngo_id ? 'Assigned Partner' : 'Unassigned')).trim();

    const matchCategory = dice.categories.length === 0 || dice.categories.includes(cat);
    const matchCity = dice.cities.length === 0 || dice.cities.includes(cty);
    const matchStatus = dice.statuses.length === 0 || dice.statuses.includes(st);
    const matchNgo = !dice.ngos || dice.ngos.length === 0 || dice.ngos.includes(ngo);

    return matchCategory && matchCity && matchStatus && matchNgo;
  });
}

export function computeOLAPPivot(
  donations: Donation[],
  rowDimension: OLAPDimension,
  colDimension: OLAPDimension,
  granularity: OLAPGranularity = 'month',
  measure: OLAPMeasure = 'count'
): OLAPPivotTable {
  const rowSet = new Set<string>();
  const colSet = new Set<string>();
  const matrix: Record<string, Record<string, { count: number; quantity: number }>> = {};

  for (const d of donations) {
    const rVal = getOLAPDimensionValue(d, rowDimension, granularity);
    const cVal = getOLAPDimensionValue(d, colDimension, granularity);

    rowSet.add(rVal);
    colSet.add(cVal);

    if (!matrix[rVal]) matrix[rVal] = {};
    if (!matrix[rVal][cVal]) matrix[rVal][cVal] = { count: 0, quantity: 0 };

    matrix[rVal][cVal].count += 1;
    matrix[rVal][cVal].quantity += Number(d.quantity) || 1;
  }

  const rowLabels = Array.from(rowSet).sort();
  const colLabels = Array.from(colSet).sort();

  const totalRowCounts: Record<string, number> = {};
  const totalColCounts: Record<string, number> = {};
  const totalRowQuantities: Record<string, number> = {};
  const totalColQuantities: Record<string, number> = {};
  let grandTotalCount = 0;
  let grandTotalQuantity = 0;

  for (const r of rowLabels) {
    totalRowCounts[r] = 0;
    totalRowQuantities[r] = 0;
    for (const c of colLabels) {
      const cell = matrix[r]?.[c] || { count: 0, quantity: 0 };
      totalRowCounts[r] += cell.count;
      totalRowQuantities[r] += cell.quantity;
      totalColCounts[c] = (totalColCounts[c] || 0) + cell.count;
      totalColQuantities[c] = (totalColQuantities[c] || 0) + cell.quantity;
      grandTotalCount += cell.count;
      grandTotalQuantity += cell.quantity;
    }
  }

  return {
    rowDimension,
    colDimension,
    measure,
    rowLabels,
    colLabels,
    matrix,
    totalRowCounts,
    totalColCounts,
    totalRowQuantities,
    totalColQuantities,
    grandTotalCount,
    grandTotalQuantity,
  };
}

// ----------------------------------------------------------------------------
// Time Trend & Multidimensional Breakdown Helpers
// ----------------------------------------------------------------------------

export interface TimeTrendPoint {
  period: string;
  count: number;
  quantity: number;
}

export function computeDonationTrend(donations: Donation[]): TimeTrendPoint[] {
  const map: Record<string, { count: number; quantity: number; sortKey: string }> = {};
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (const d of donations) {
    const dt = new Date(d.created_at || d.pickup_date);
    if (isNaN(dt.getTime())) continue;
    const key = `${monthNames[dt.getMonth()]} ${dt.getFullYear()}`;
    const sortKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    if (!map[key]) {
      map[key] = { count: 0, quantity: 0, sortKey };
    }
    map[key].count++;
    map[key].quantity += Number(d.quantity) || 1;
  }

  const list = Object.entries(map).map(([period, v]) => ({
    period,
    count: v.count,
    quantity: v.quantity,
    sortKey: v.sortKey,
  }));

  list.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  return list.map(({ period, count, quantity }) => ({ period, count, quantity }));
}

export interface CategoryStatusBreakdown {
  category: string;
  total: number;
  pending: number;
  accepted: number;
  scheduled: number;
  completed: number;
  cancelled: number;
}

export function computeCategoryStatusDistribution(donations: Donation[]): CategoryStatusBreakdown[] {
  const map: Record<string, CategoryStatusBreakdown> = {};

  for (const d of donations) {
    const cat = (d.category || 'Uncategorized').trim();
    if (!map[cat]) {
      map[cat] = {
        category: cat,
        total: 0,
        pending: 0,
        accepted: 0,
        scheduled: 0,
        completed: 0,
        cancelled: 0,
      };
    }
    map[cat].total++;
    const st = d.status;
    if (st === 'PENDING') map[cat].pending++;
    else if (st === 'ACCEPTED') map[cat].accepted++;
    else if (st === 'SCHEDULED') map[cat].scheduled++;
    else if (st === 'COMPLETED') map[cat].completed++;
    else if (st === 'CANCELLED') map[cat].cancelled++;
  }

  return Object.values(map).sort((a, b) => b.total - a.total);
}

// ----------------------------------------------------------------------------
// 4. K-MEANS CLUSTERING (NGO ACTIVITY PROFILES)
// ----------------------------------------------------------------------------

export interface NGOActivityPoint {
  ngoId: string;
  orgName: string;
  city: string;
  category: string;
  // Features
  totalHandled: number;
  completedCount: number;
  completionRate: number; // 0 to 100
  totalQuantity: number;
  // Normalized feature vector [totalHandled, completionRate, totalQuantity]
  features: number[];
  assignedCluster: number;
}

export interface KMeansClusterSummary {
  clusterIndex: number;
  label: string;
  size: number;
  avgTotalHandled: number;
  avgCompletedCount: number;
  avgCompletionRate: number;
  avgTotalQuantity: number;
  centroid: number[];
  ngoNames: string[];
}

export interface KMeansResult {
  isApplicable: boolean;
  insufficientReason?: string;
  k: number;
  iterationsRun: number;
  clusters: KMeansClusterSummary[];
  points: NGOActivityPoint[];
  silhouetteScore: number | null;
  featuresUsed: string[];
}

export function runKMeansClustering(
  ngos: NGOProfile[],
  donations: Donation[],
  requestedK: number = 3
): KMeansResult {
  // Check sufficient data
  if (ngos.length < 2) {
    return {
      isApplicable: false,
      insufficientReason:
        'Insufficient data for reliable K-Means clustering. At least 2 registered NGOs are required to form meaningful activity clusters.',
      k: requestedK,
      iterationsRun: 0,
      clusters: [],
      points: [],
      silhouetteScore: null,
      featuresUsed: ['Total Handled', 'Completion Rate (%)', 'Total Quantity Handled'],
    };
  }

  // 1. Build NGO activity points
  const points: NGOActivityPoint[] = ngos.map((ngo) => {
    const handled = donations.filter((d) => d.accepted_ngo_id === ngo.id);
    const totalHandled = handled.length;
    const completed = handled.filter((d) => d.status === 'COMPLETED');
    const completedCount = completed.length;
    const completionRate = totalHandled > 0 ? Math.round((completedCount / totalHandled) * 100) : 0;
    const totalQuantity = handled.reduce((acc, d) => acc + (Number(d.quantity) || 1), 0);

    return {
      ngoId: ngo.id,
      orgName: ngo.org_name,
      city: ngo.city,
      category: ngo.category,
      totalHandled,
      completedCount,
      completionRate,
      totalQuantity,
      features: [totalHandled, completionRate, totalQuantity],
      assignedCluster: 0,
    };
  });

  // Verify non-zero variance
  const maxHandled = Math.max(...points.map((p) => p.totalHandled));
  const maxQuantity = Math.max(...points.map((p) => p.totalQuantity));

  // Determine actual K: cannot exceed number of points
  const k = Math.min(requestedK, points.length);
  if (k < 2) {
    return {
      isApplicable: false,
      insufficientReason:
        'Insufficient data variance. Cannot initialize 2 or more distinct centroids with the current NGO dataset.',
      k,
      iterationsRun: 0,
      clusters: [],
      points,
      silhouetteScore: null,
      featuresUsed: ['Total Handled', 'Completion Rate (%)', 'Total Quantity Handled'],
    };
  }

  // 2. Feature Normalization (Min-Max Scaling to [0, 1])
  const featureMins = [0, 0, 0];
  const featureMaxs = [
    Math.max(1, maxHandled),
    100, // completion rate is 0-100
    Math.max(1, maxQuantity),
  ];

  const normalizedPoints = points.map((p) => {
    const norm = [
      (p.features[0] - featureMins[0]) / (featureMaxs[0] - featureMins[0] || 1),
      (p.features[1] - featureMins[1]) / (featureMaxs[1] - featureMins[1] || 1),
      (p.features[2] - featureMins[2]) / (featureMaxs[2] - featureMins[2] || 1),
    ];
    return { ...p, normFeatures: norm };
  });

  // 3. Initialize K Centroids using deterministic spread
  const centroids: number[][] = [];
  // Sort points by handled count + quantity to distribute initial centroids nicely
  const sortedIndices = [...normalizedPoints]
    .map((p, idx) => ({ sum: p.totalHandled * 10 + p.totalQuantity, idx }))
    .sort((a, b) => a.sum - b.sum)
    .map((item) => item.idx);

  for (let i = 0; i < k; i++) {
    const pickIdx = sortedIndices[Math.floor((i / (k - 1 || 1)) * (sortedIndices.length - 1))];
    centroids.push([...normalizedPoints[pickIdx].normFeatures]);
  }

  // Helper Euclidean distance
  const euclidean = (v1: number[], v2: number[]) =>
    Math.sqrt(v1.reduce((sum, val, idx) => sum + Math.pow(val - (v2[idx] || 0), 2), 0));

  let iterationsRun = 0;
  const maxIterations = 20;
  let changed = true;

  while (changed && iterationsRun < maxIterations) {
    changed = false;
    iterationsRun++;

    // Assignment Step
    for (let i = 0; i < normalizedPoints.length; i++) {
      const p = normalizedPoints[i];
      let bestDist = Infinity;
      let bestCluster = 0;

      for (let c = 0; c < k; c++) {
        const dist = euclidean(p.normFeatures, centroids[c]);
        if (dist < bestDist) {
          bestDist = dist;
          bestCluster = c;
        }
      }

      if (points[i].assignedCluster !== bestCluster) {
        points[i].assignedCluster = bestCluster;
        changed = true;
      }
    }

    // Update Centroids Step
    for (let c = 0; c < k; c++) {
      const clusterPoints = normalizedPoints.filter((_, idx) => points[idx].assignedCluster === c);
      if (clusterPoints.length > 0) {
        for (let dim = 0; dim < 3; dim++) {
          const dimSum = clusterPoints.reduce((sum, p) => sum + p.normFeatures[dim], 0);
          centroids[c][dim] = dimSum / clusterPoints.length;
        }
      }
    }
  }

  // 4. Summarize Clusters & Derive Labels based strictly on calculated stats
  const clusters: KMeansClusterSummary[] = [];
  for (let c = 0; c < k; c++) {
    const clusterPts = points.filter((p) => p.assignedCluster === c);
    const size = clusterPts.length;

    const avgTotalHandled = size > 0 ? clusterPts.reduce((acc, p) => acc + p.totalHandled, 0) / size : 0;
    const avgCompletedCount = size > 0 ? clusterPts.reduce((acc, p) => acc + p.completedCount, 0) / size : 0;
    const avgCompletionRate = size > 0 ? clusterPts.reduce((acc, p) => acc + p.completionRate, 0) / size : 0;
    const avgTotalQuantity = size > 0 ? clusterPts.reduce((acc, p) => acc + p.totalQuantity, 0) / size : 0;

    clusters.push({
      clusterIndex: c,
      label: '', // calculated after sorting below
      size,
      avgTotalHandled: Math.round(avgTotalHandled * 10) / 10,
      avgCompletedCount: Math.round(avgCompletedCount * 10) / 10,
      avgCompletionRate: Math.round(avgCompletionRate * 10) / 10,
      avgTotalQuantity: Math.round(avgTotalQuantity * 10) / 10,
      centroid: centroids[c].map((v) => Math.round(v * 100) / 100),
      ngoNames: clusterPts.map((p) => p.orgName),
    });
  }

  // Order clusters by activity level (avgHandled) to assign meaningful labels
  const sortedClusters = [...clusters].sort((a, b) => b.avgTotalHandled - a.avgTotalHandled);
  const labelNames = ['High Activity Hubs', 'Moderate Fulfillment', 'Emerging / Low Activity', 'Dormant Partners'];
  sortedClusters.forEach((cl, rank) => {
    cl.label = labelNames[rank] || `Activity Tier ${rank + 1}`;
  });

  // 5. Calculate Silhouette Score
  let silhouetteScore: number | null = null;
  if (points.length > k && k > 1) {
    const silhouetteValues: number[] = [];

    for (let i = 0; i < normalizedPoints.length; i++) {
      const p = normalizedPoints[i];
      const ownCluster = points[i].assignedCluster;
      const ownClusterPoints = normalizedPoints.filter((_, idx) => points[idx].assignedCluster === ownCluster && idx !== i);

      if (ownClusterPoints.length === 0) {
        silhouetteValues.push(0);
        continue;
      }

      // a(i) = mean distance to all other points in own cluster
      const a = ownClusterPoints.reduce((sum, other) => sum + euclidean(p.normFeatures, other.normFeatures), 0) / ownClusterPoints.length;

      // b(i) = min mean distance to points in any other cluster
      let minOtherMeanDist = Infinity;
      for (let c = 0; c < k; c++) {
        if (c === ownCluster) continue;
        const otherPoints = normalizedPoints.filter((_, idx) => points[idx].assignedCluster === c);
        if (otherPoints.length > 0) {
          const meanDist = otherPoints.reduce((sum, other) => sum + euclidean(p.normFeatures, other.normFeatures), 0) / otherPoints.length;
          if (meanDist < minOtherMeanDist) minOtherMeanDist = meanDist;
        }
      }

      const b = isFinite(minOtherMeanDist) ? minOtherMeanDist : 0;
      const s = Math.max(a, b) === 0 ? 0 : (b - a) / Math.max(a, b);
      silhouetteValues.push(s);
    }

    if (silhouetteValues.length > 0) {
      const meanS = silhouetteValues.reduce((sum, val) => sum + val, 0) / silhouetteValues.length;
      silhouetteScore = Math.round(meanS * 100) / 100;
    }
  }

  return {
    isApplicable: true,
    k,
    iterationsRun,
    clusters: sortedClusters,
    points,
    silhouetteScore,
    featuresUsed: ['Total Handled', 'Completion Rate (%)', 'Total Quantity Handled'],
  };
}

// ----------------------------------------------------------------------------
// 5. HIERARCHICAL CLUSTERING (AGGLOMERATIVE DENDROGRAM)
// ----------------------------------------------------------------------------

export interface DendrogramMergeStep {
  step: number;
  clusterA: string;
  clusterB: string;
  distance: number;
  resultCluster: string;
  size: number;
}

export interface HierarchicalClusteringResult {
  isApplicable: boolean;
  insufficientReason?: string;
  mergeSteps: DendrogramMergeStep[];
  labels: string[];
  maxDistance: number;
}

export function runHierarchicalClustering(
  ngos: NGOProfile[],
  donations: Donation[]
): HierarchicalClusteringResult {
  if (ngos.length < 2) {
    return {
      isApplicable: false,
      insufficientReason:
        'Insufficient data for reliable hierarchical clustering. At least 2 active NGO profiles are required to construct an agglomerative distance matrix and dendrogram.',
      mergeSteps: [],
      labels: [],
      maxDistance: 0,
    };
  }

  // 1. Extract feature vectors per NGO
  const maxHandled = Math.max(
    1,
    ...ngos.map((ngo) => donations.filter((d) => d.accepted_ngo_id === ngo.id).length)
  );

  const initialClusters = ngos.map((ngo, idx) => {
    const handled = donations.filter((d) => d.accepted_ngo_id === ngo.id);
    const completed = handled.filter((d) => d.status === 'COMPLETED').length;
    const rate = handled.length > 0 ? completed / handled.length : 0;
    const qty = handled.reduce((acc, d) => acc + (Number(d.quantity) || 1), 0);

    return {
      id: `c_${idx}`,
      name: ngo.org_name,
      items: [idx],
      vector: [handled.length / maxHandled, rate, qty / (maxHandled * 5 || 1)],
    };
  });

  const euclidean = (v1: number[], v2: number[]) =>
    Math.sqrt(v1.reduce((sum, val, idx) => sum + Math.pow(val - (v2[idx] || 0), 2), 0));

  let currentClusters = [...initialClusters];
  const mergeSteps: DendrogramMergeStep[] = [];
  let stepCount = 0;
  let maxDistance = 0;

  // Agglomerative loop: Merge closest pair using average linkage until 1 root remains
  while (currentClusters.length > 1) {
    stepCount++;
    let minDist = Infinity;
    let bestI = 0;
    let bestJ = 1;

    for (let i = 0; i < currentClusters.length; i++) {
      for (let j = i + 1; j < currentClusters.length; j++) {
        const d = euclidean(currentClusters[i].vector, currentClusters[j].vector);
        if (d < minDist) {
          minDist = d;
          bestI = i;
          bestJ = j;
        }
      }
    }

    const cA = currentClusters[bestI];
    const cB = currentClusters[bestJ];
    const roundedDist = Math.round(minDist * 1000) / 1000;
    if (roundedDist > maxDistance) maxDistance = roundedDist;

    // Average vector of merged cluster
    const newItems = [...cA.items, ...cB.items];
    const newVector = cA.vector.map((val, idx) => (val * cA.items.length + cB.vector[idx] * cB.items.length) / newItems.length);
    const mergedCluster = {
      id: `merged_${stepCount}`,
      name: `${cA.name} + ${cB.name}`,
      items: newItems,
      vector: newVector,
    };

    mergeSteps.push({
      step: stepCount,
      clusterA: cA.name,
      clusterB: cB.name,
      distance: roundedDist,
      resultCluster: mergedCluster.name,
      size: newItems.length,
    });

    // Remove merged clusters and insert new one
    currentClusters = currentClusters.filter((_, idx) => idx !== bestI && idx !== bestJ);
    currentClusters.push(mergedCluster);
  }

  return {
    isApplicable: true,
    mergeSteps,
    labels: ngos.map((n) => n.org_name),
    maxDistance: Math.max(maxDistance, 0.1),
  };
}

// ----------------------------------------------------------------------------
// 6. APRIORI ASSOCIATION RULE MINING
// ----------------------------------------------------------------------------

export interface AssociationRule {
  antecedent: string[];
  consequent: string[];
  support: number; // 0 to 1
  confidence: number; // 0 to 1
  lift: number;
}

export interface FrequentItemset {
  items: string[];
  supportCount: number;
  support: number;
}

export interface AprioriResult {
  isApplicable: boolean;
  insufficientReason?: string;
  totalTransactions: number;
  minSupport: number;
  minConfidence: number;
  frequentItemsets: FrequentItemset[];
  rules: AssociationRule[];
}

export function runAprioriMining(
  donations: Donation[],
  minSupport: number = 0.15,
  minConfidence: number = 0.5
): AprioriResult {
  if (donations.length < 3) {
    return {
      isApplicable: false,
      insufficientReason:
        'Insufficient transactional data for reliable association-rule mining. At least 3 donation listings are required to extract frequent itemsets and calculate co-occurrence metrics.',
      totalTransactions: donations.length,
      minSupport,
      minConfidence,
      frequentItemsets: [],
      rules: [],
    };
  }

  // 1. Build transactional baskets from real donation attributes
  // Items describe: Category, Condition, City, and Status
  const transactions: string[][] = donations.map((d) => {
    const items = [
      `Category: ${d.category}`,
      `Condition: ${d.condition}`,
      `City: ${d.city}`,
      `Status: ${d.status}`,
    ];
    if (d.quantity > 2) {
      items.push('Volume: Bulk (3+)');
    } else {
      items.push('Volume: Standard (1-2)');
    }
    return Array.from(new Set(items));
  });

  const totalTransactions = transactions.length;

  // 2. Candidate 1-Itemsets
  const itemCounts: Record<string, number> = {};
  for (const basket of transactions) {
    for (const item of basket) {
      itemCounts[item] = (itemCounts[item] || 0) + 1;
    }
  }

  const frequent1: FrequentItemset[] = [];
  const frequent1Map: Record<string, number> = {};

  for (const [item, count] of Object.entries(itemCounts)) {
    const support = count / totalTransactions;
    if (support >= minSupport) {
      frequent1.push({ items: [item], supportCount: count, support: Math.round(support * 100) / 100 });
      frequent1Map[item] = support;
    }
  }

  // 3. Candidate 2-Itemsets
  const pairCounts: Record<string, number> = {};
  const validItems = frequent1.map((f) => f.items[0]);

  for (const basket of transactions) {
    const presentValid = basket.filter((it) => validItems.includes(it));
    for (let i = 0; i < presentValid.length; i++) {
      for (let j = i + 1; j < presentValid.length; j++) {
        // Enforce sorted pair key
        const pair = [presentValid[i], presentValid[j]].sort();
        const key = `${pair[0]} ||| ${pair[1]}`;
        pairCounts[key] = (pairCounts[key] || 0) + 1;
      }
    }
  }

  const frequent2: FrequentItemset[] = [];
  const frequent2Map: Record<string, number> = {};

  for (const [key, count] of Object.entries(pairCounts)) {
    const support = count / totalTransactions;
    if (support >= minSupport) {
      const items = key.split(' ||| ');
      frequent2.push({ items, supportCount: count, support: Math.round(support * 100) / 100 });
      frequent2Map[key] = support;
    }
  }

  // 4. Generate Association Rules (A -> B and B -> A from frequent 2-itemsets)
  const rules: AssociationRule[] = [];

  for (const f2 of frequent2) {
    const [itemA, itemB] = f2.items;
    const pairSupport = f2.support;

    // Rule 1: itemA -> itemB
    const suppA = frequent1Map[itemA] || 0.001;
    const confAtoB = pairSupport / suppA;
    const suppB = frequent1Map[itemB] || 0.001;
    const liftAtoB = confAtoB / suppB;

    if (confAtoB >= minConfidence) {
      rules.push({
        antecedent: [itemA],
        consequent: [itemB],
        support: pairSupport,
        confidence: Math.round(confAtoB * 100) / 100,
        lift: Math.round(liftAtoB * 100) / 100,
      });
    }

    // Rule 2: itemB -> itemA
    const confBtoA = pairSupport / suppB;
    const liftBtoA = confBtoA / suppA;

    if (confBtoA >= minConfidence) {
      rules.push({
        antecedent: [itemB],
        consequent: [itemA],
        support: pairSupport,
        confidence: Math.round(confBtoA * 100) / 100,
        lift: Math.round(liftBtoA * 100) / 100,
      });
    }
  }

  // Sort rules by Lift DESC, then Confidence DESC
  rules.sort((a, b) => b.lift - a.lift || b.confidence - a.confidence);

  return {
    isApplicable: true,
    totalTransactions,
    minSupport,
    minConfidence,
    frequentItemsets: [...frequent1, ...frequent2],
    rules,
  };
}

// ----------------------------------------------------------------------------
// 7. NGO ACTIVITY METRICS & DYNAMIC KEY INSIGHTS
// ----------------------------------------------------------------------------

export interface NGOActivityMetric {
  ngoId: string;
  orgName: string;
  city: string;
  category: string;
  totalHandled: number;
  completedCount: number;
  totalQuantity: number;
  completionRate: number;
}

export function computeNGOActivityMetrics(
  ngos: NGOProfile[],
  donations: Donation[]
): NGOActivityMetric[] {
  return ngos
    .map((ngo) => {
      const handled = donations.filter((d) => d.accepted_ngo_id === ngo.id);
      const totalHandled = handled.length;
      const completed = handled.filter((d) => d.status === 'COMPLETED');
      const completedCount = completed.length;
      const totalQuantity = handled.reduce((acc, d) => acc + (Number(d.quantity) || 1), 0);
      const completionRate = totalHandled > 0 ? Math.round((completedCount / totalHandled) * 100) : 0;

      return {
        ngoId: ngo.id,
        orgName: ngo.org_name,
        city: ngo.city,
        category: ngo.category,
        totalHandled,
        completedCount,
        totalQuantity,
        completionRate,
      };
    })
    .sort((a, b) => b.totalHandled - a.totalHandled || b.totalQuantity - a.totalQuantity);
}

export interface DynamicInsight {
  title: string;
  metric: string;
  description: string;
  category: 'volume' | 'geography' | 'lifecycle' | 'cluster' | 'mining';
}

export function generateKeyInsights(
  donations: Donation[],
  ngos: NGOProfile[],
  donors: UserProfile[],
  kmeans?: KMeansResult,
  apriori?: AprioriResult
): DynamicInsight[] {
  const insights: DynamicInsight[] = [];

  if (donations.length === 0) {
    return [
      {
        title: 'Dominant Donation Category',
        metric: 'No Data',
        description: 'No category data available.',
        category: 'volume',
      },
      {
        title: 'Donation Activity by City',
        metric: 'No Data',
        description: 'No city activity data recorded.',
        category: 'geography',
      },
      {
        title: 'Donation Lifecycle',
        metric: '0% Completed',
        description: 'No donation records available to calculate completion percentage.',
        category: 'lifecycle',
      },
      {
        title: 'NGO Activity',
        metric: '0 Handled',
        description: 'No donations have been assigned to partner NGOs yet.',
        category: 'cluster',
      },
    ];
  }

  // 1. Dominant Donation Category
  const catCounts: Record<string, number> = {};
  donations.forEach((d) => {
    if (d.category) {
      catCounts[d.category] = (catCounts[d.category] || 0) + 1;
    }
  });
  const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];
  if (topCat) {
    const pct = Math.round((topCat[1] / donations.length) * 100);
    insights.push({
      title: 'Dominant Donation Category',
      metric: `${topCat[0]} (${pct}%)`,
      description: `${topCat[0]} accounts for ${pct}% of recorded donations (${topCat[1]} of ${donations.length} listings).`,
      category: 'volume',
    });
  }

  // 2. Donation Activity by City
  const cityCounts: Record<string, number> = {};
  donations.forEach((d) => {
    if (d.city) {
      cityCounts[d.city] = (cityCounts[d.city] || 0) + 1;
    }
  });
  const topCity = Object.entries(cityCounts).sort((a, b) => b[1] - a[1])[0];
  if (topCity) {
    const pct = Math.round((topCity[1] / donations.length) * 100);
    insights.push({
      title: 'Donation Activity by City',
      metric: `${topCity[0]} (${topCity[1]} donations)`,
      description: `${topCity[0]} recorded the highest volume with ${topCity[1]} donations (${pct}% of platform total).`,
      category: 'geography',
    });
  }

  // 3. Donation Lifecycle
  const completedCount = donations.filter((d) => d.status === 'COMPLETED').length;
  const fulfillmentRate = Math.round((completedCount / donations.length) * 100);
  insights.push({
    title: 'Donation Lifecycle',
    metric: `${fulfillmentRate}% Completed`,
    description: `${completedCount} of ${donations.length} recorded donations have reached completed status (${fulfillmentRate}% completion rate).`,
    category: 'lifecycle',
  });

  // 4. NGO Activity
  const ngoMetrics = computeNGOActivityMetrics(ngos, donations);
  const activeNgo = ngoMetrics.find((m) => m.totalHandled > 0);
  if (activeNgo) {
    insights.push({
      title: 'NGO Activity',
      metric: `${activeNgo.orgName} (${activeNgo.totalHandled} handled)`,
      description: `${activeNgo.orgName} has handled ${activeNgo.totalHandled} donations with ${activeNgo.completedCount} marked completed.`,
      category: 'cluster',
    });
  } else {
    insights.push({
      title: 'NGO Activity',
      metric: '0 Handled',
      description: 'No donations have been assigned to registered partner NGOs yet in the database.',
      category: 'cluster',
    });
  }

  return insights;
}
