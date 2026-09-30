import React, { useState, useMemo } from 'react';
import {
  Layers,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  RefreshCw,
  Filter,
  SlidersHorizontal,
  TrendingUp,
  BarChart3,
  Calendar,
  RotateCcw,
  Check,
  Table as TableIcon,
} from 'lucide-react';
import { Donation } from '../../types';
import {
  OLAPDimension,
  OLAPGranularity,
  OLAPMeasure,
  getOLAPDimensionValue,
} from '../../lib/dwmAnalytics';

interface OLAPExplorerProps {
  donations: Donation[];
}

type OperationType = 'none' | 'rollup' | 'drilldown' | 'slice' | 'dice' | 'pivot';

const DIMENSION_LABELS: Record<OLAPDimension | 'none', string> = {
  city: 'City',
  category: 'Category',
  status: 'Status',
  date: 'Date',
  ngo: 'NGO',
  none: 'None',
};

const PALETTE = [
  '#059669', // Emerald
  '#2563eb', // Blue
  '#d97706', // Amber
  '#7c3aed', // Purple
  '#0891b2', // Cyan
  '#db2777', // Pink
  '#ea580c', // Orange
  '#4b5563', // Slate
  '#14b8a6', // Teal
  '#6366f1', // Indigo
];

export const OLAPExplorer: React.FC<OLAPExplorerProps> = ({ donations }) => {
  // Step 1: Measure
  const [measure, setMeasure] = useState<OLAPMeasure>('count');

  // Step 2: Main Dimension
  const [mainDimension, setMainDimension] = useState<OLAPDimension>('city');

  // Step 3: Second Dimension ('none' or OLAPDimension)
  const [secondDimension, setSecondDimension] = useState<OLAPDimension | 'none'>('category');

  // Temporal Granularity for Roll-up and Drill-down
  const [dateGranularity, setDateGranularity] = useState<OLAPGranularity>('month');

  // Active OLAP Operation
  const [activeOperation, setActiveOperation] = useState<OperationType>('none');
  const [operationFeedback, setOperationFeedback] = useState<string | null>(null);

  // Slice Filter: single dimension + single value
  const [sliceDimension, setSliceDimension] = useState<OLAPDimension>('city');
  const [sliceValue, setSliceValue] = useState<string>('');

  // Dice Filters: multi-dimension filters
  const [diceCity, setDiceCity] = useState<string>('');
  const [diceCategory, setDiceCategory] = useState<string>('');
  const [diceStatus, setDiceStatus] = useState<string>('');
  const [diceNgo, setDiceNgo] = useState<string>('');

  // About OLAP toggle
  const [aboutExpanded, setAboutExpanded] = useState<boolean>(false);

  // Extract unique dimension values from real dataset
  const uniqueCities = useMemo(() => {
    return Array.from(new Set(donations.map((d) => (d.city || '').trim())))
      .filter(Boolean)
      .sort();
  }, [donations]);

  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(donations.map((d) => (d.category || '').trim())))
      .filter(Boolean)
      .sort();
  }, [donations]);

  const uniqueStatuses = useMemo(() => {
    return Array.from(new Set(donations.map((d) => (d.status || '').trim())))
      .filter(Boolean)
      .sort();
  }, [donations]);

  const uniqueNGOs = useMemo(() => {
    return Array.from(
      new Set(
        donations.map((d) =>
          (d.ngo?.org_name || (d.accepted_ngo_id ? 'Assigned Partner' : 'Unassigned')).trim()
        )
      )
    )
      .filter(Boolean)
      .sort();
  }, [donations]);

  // Values available for the selected Slice dimension
  const availableSliceValues = useMemo(() => {
    if (sliceDimension === 'city') return uniqueCities;
    if (sliceDimension === 'category') return uniqueCategories;
    if (sliceDimension === 'status') return uniqueStatuses;
    if (sliceDimension === 'ngo') return uniqueNGOs;
    if (sliceDimension === 'date') {
      return Array.from(
        new Set(
          donations
            .map((d) => getOLAPDimensionValue(d, 'date', dateGranularity))
            .filter(Boolean)
        )
      ).sort();
    }
    return [];
  }, [sliceDimension, uniqueCities, uniqueCategories, uniqueStatuses, uniqueNGOs, donations, dateGranularity]);

  // Handle Main Dimension change (prevent identical second dimension)
  const handleMainDimensionChange = (newDim: OLAPDimension) => {
    setMainDimension(newDim);
    if (secondDimension === newDim) {
      setSecondDimension('none');
    }
  };

  // --------------------------------------------------------------------------
  // OLAP Operations Handlers
  // --------------------------------------------------------------------------
  const handleSelectOperation = (op: OperationType) => {
    if (activeOperation === op) {
      setActiveOperation('none');
      setOperationFeedback(null);
      return;
    }

    setActiveOperation(op);

    if (op === 'rollup') {
      // Roll-up: Day -> Month -> Year
      if (dateGranularity === 'day') {
        setDateGranularity('month');
        setOperationFeedback('Rolled up the data to a higher level (Daily donations → Monthly donations).');
      } else if (dateGranularity === 'month') {
        setDateGranularity('year');
        setOperationFeedback('Rolled up the data to a higher level (Monthly donations → Yearly donations).');
      } else {
        setOperationFeedback('Data is already at the highest temporal aggregation level (Yearly donations).');
      }
    } else if (op === 'drilldown') {
      // Drill-down: Year -> Month -> Day
      if (dateGranularity === 'year') {
        setDateGranularity('month');
        setOperationFeedback('Drilled down to a more detailed level (Yearly donations → Monthly donations).');
      } else if (dateGranularity === 'month') {
        setDateGranularity('day');
        setOperationFeedback('Drilled down to a more detailed level (Monthly donations → Daily transactions).');
      } else {
        setOperationFeedback('Data is already at the most granular temporal level (Daily transactions).');
      }
    } else if (op === 'pivot') {
      handlePivot();
    } else if (op === 'slice') {
      setOperationFeedback(
        sliceValue
          ? `Slice applied: ${DIMENSION_LABELS[sliceDimension]} = ${sliceValue}`
          : 'Choose a dimension and select one value to apply Slice filter.'
      );
    } else if (op === 'dice') {
      const activeDiceCount = [diceCity, diceCategory, diceStatus, diceNgo].filter(Boolean).length;
      setOperationFeedback(
        activeDiceCount > 0
          ? `Dice applied: ${activeDiceCount} active filter${activeDiceCount > 1 ? 's' : ''}.`
          : 'Select filters below to apply Dice multidimensional sub-cube filtering.'
      );
    }
  };

  const handlePivot = () => {
    if (secondDimension === 'none') {
      // If second dimension is None, select a complementary dimension and swap
      const candidates: OLAPDimension[] = ['category', 'city', 'status', 'date', 'ngo'];
      const alt = candidates.find((c) => c !== mainDimension) || 'category';
      setMainDimension(alt);
      setSecondDimension(mainDimension);
      setOperationFeedback(`Pivoted the analysis: Now comparing ${DIMENSION_LABELS[alt]} × ${DIMENSION_LABELS[mainDimension]}.`);
    } else {
      const oldMain = mainDimension;
      const oldSecond = secondDimension;
      setMainDimension(oldSecond);
      setSecondDimension(oldMain);
      setOperationFeedback(`Pivoted the analysis to view the same data from another perspective (${DIMENSION_LABELS[oldSecond]} × ${DIMENSION_LABELS[oldMain]}).`);
    }
  };

  const handleResetFilters = () => {
    setActiveOperation('none');
    setOperationFeedback(null);
    setSliceValue('');
    setDiceCity('');
    setDiceCategory('');
    setDiceStatus('');
    setDiceNgo('');
    setDateGranularity('month');
  };

  // --------------------------------------------------------------------------
  // In-Memory Filtered Dataset
  // --------------------------------------------------------------------------
  const filteredDonations = useMemo(() => {
    let result = donations;

    // Apply Slice Filter (only if slice is active and a value is selected)
    if (activeOperation === 'slice' && sliceValue) {
      result = result.filter((d) => {
        const val = getOLAPDimensionValue(d, sliceDimension, dateGranularity);
        return val === sliceValue;
      });
    }

    // Apply Dice Filter (only if dice is active and at least one filter is set)
    if (activeOperation === 'dice') {
      if (diceCity) {
        result = result.filter((d) => (d.city || 'Unspecified').trim() === diceCity);
      }
      if (diceCategory) {
        result = result.filter((d) => (d.category || 'Uncategorized').trim() === diceCategory);
      }
      if (diceStatus) {
        result = result.filter((d) => (d.status || 'UNKNOWN').trim() === diceStatus);
      }
      if (diceNgo) {
        result = result.filter((d) => {
          const ngoName = (d.ngo?.org_name || (d.accepted_ngo_id ? 'Assigned Partner' : 'Unassigned')).trim();
          return ngoName === diceNgo;
        });
      }
    }

    return result;
  }, [donations, activeOperation, sliceDimension, sliceValue, diceCity, diceCategory, diceStatus, diceNgo, dateGranularity]);

  // --------------------------------------------------------------------------
  // Dynamic Current Analysis Sentence
  // --------------------------------------------------------------------------
  const currentAnalysisSentence = useMemo(() => {
    const measureStr = measure === 'count' ? 'Donation Count' : 'Total Donation Quantity';
    const mainStr = DIMENSION_LABELS[mainDimension];
    if (secondDimension !== 'none') {
      const secondStr = DIMENSION_LABELS[secondDimension];
      return `Showing ${measureStr} by ${mainStr} and ${secondStr}`;
    }
    return `Showing ${measureStr} by ${mainStr}`;
  }, [measure, mainDimension, secondDimension]);

  // Dynamic Chart Title
  const dynamicChartTitle = useMemo(() => {
    const measureStr = measure === 'count' ? 'Donation Count' : 'Donation Quantity';
    const mainStr = DIMENSION_LABELS[mainDimension];
    if (mainDimension === 'date') {
      const granLabel = dateGranularity === 'day' ? 'Day' : dateGranularity === 'year' ? 'Year' : 'Month';
      return `${measureStr} by ${granLabel}`;
    }
    if (secondDimension !== 'none') {
      const secondStr = DIMENSION_LABELS[secondDimension];
      return `${measureStr} by ${mainStr} and ${secondStr}`;
    }
    return `${measureStr} by ${mainStr}`;
  }, [measure, mainDimension, secondDimension, dateGranularity]);

  // --------------------------------------------------------------------------
  // Aggregation Computations
  // --------------------------------------------------------------------------
  // 1. Single Dimension Aggregation (when secondDimension === 'none')
  const singleDimensionData = useMemo(() => {
    if (secondDimension !== 'none') return null;

    const map: Record<string, { count: number; quantity: number }> = {};
    let totalCount = 0;
    let totalQuantity = 0;

    for (const d of filteredDonations) {
      const val = getOLAPDimensionValue(d, mainDimension, dateGranularity);
      if (!map[val]) {
        map[val] = { count: 0, quantity: 0 };
      }
      map[val].count += 1;
      map[val].quantity += Number(d.quantity) || 1;
      totalCount += 1;
      totalQuantity += Number(d.quantity) || 1;
    }

    const items = Object.entries(map).map(([key, data]) => ({
      key,
      count: data.count,
      quantity: data.quantity,
      val: measure === 'count' ? data.count : data.quantity,
    }));

    // If date, sort chronologically; otherwise sort descending by value
    if (mainDimension === 'date') {
      items.sort((a, b) => a.key.localeCompare(b.key));
    } else {
      items.sort((a, b) => b.val - a.val);
    }

    const grandTotal = measure === 'count' ? totalCount : totalQuantity;

    return {
      items,
      totalCount,
      totalQuantity,
      grandTotal,
      maxVal: items.length > 0 ? Math.max(...items.map((i) => i.val)) : 1,
    };
  }, [filteredDonations, mainDimension, secondDimension, dateGranularity, measure]);

  // 2. Multidimensional Cross-Tabulation Matrix (when secondDimension !== 'none')
  const multiDimensionData = useMemo(() => {
    if (secondDimension === 'none') return null;

    const rowSet = new Set<string>();
    const colSet = new Set<string>();
    const matrix: Record<string, Record<string, { count: number; quantity: number }>> = {};

    for (const d of filteredDonations) {
      const r = getOLAPDimensionValue(d, mainDimension, dateGranularity);
      const c = getOLAPDimensionValue(d, secondDimension, dateGranularity);

      rowSet.add(r);
      colSet.add(c);

      if (!matrix[r]) matrix[r] = {};
      if (!matrix[r][c]) matrix[r][c] = { count: 0, quantity: 0 };

      matrix[r][c].count += 1;
      matrix[r][c].quantity += Number(d.quantity) || 1;
    }

    const rows = Array.from(rowSet).sort();
    const cols = Array.from(colSet).sort();

    const rowTotals: Record<string, number> = {};
    const colTotals: Record<string, number> = {};
    let grandTotal = 0;

    for (const r of rows) {
      rowTotals[r] = 0;
      for (const c of cols) {
        const cell = matrix[r]?.[c] || { count: 0, quantity: 0 };
        const val = measure === 'count' ? cell.count : cell.quantity;
        rowTotals[r] += val;
        colTotals[c] = (colTotals[c] || 0) + val;
        grandTotal += val;
      }
    }

    const maxRowTotal = rows.length > 0 ? Math.max(...rows.map((r) => rowTotals[r] || 0)) : 1;

    return {
      rows,
      cols,
      matrix,
      rowTotals,
      colTotals,
      grandTotal,
      maxRowTotal,
    };
  }, [filteredDonations, mainDimension, secondDimension, dateGranularity, measure]);

  // Summary info for Current Analysis Summary card
  const summaryFilterText = useMemo(() => {
    if (activeOperation === 'slice' && sliceValue) {
      return `${DIMENSION_LABELS[sliceDimension]}: ${sliceValue}`;
    }
    if (activeOperation === 'dice') {
      const filters = [
        diceCity && `City: ${diceCity}`,
        diceCategory && `Cat: ${diceCategory}`,
        diceStatus && `Status: ${diceStatus}`,
        diceNgo && `NGO: ${diceNgo}`,
      ].filter(Boolean);
      return filters.length > 0 ? filters.join(', ') : 'None selected';
    }
    return 'None';
  }, [activeOperation, sliceDimension, sliceValue, diceCity, diceCategory, diceStatus, diceNgo]);

  const summaryOperationText = useMemo(() => {
    switch (activeOperation) {
      case 'rollup':
        return `Roll-up (${dateGranularity.toUpperCase()})`;
      case 'drilldown':
        return `Drill-down (${dateGranularity.toUpperCase()})`;
      case 'slice':
        return 'Slice';
      case 'dice':
        return 'Dice';
      case 'pivot':
        return 'Pivot';
      default:
        return 'Standard';
    }
  }, [activeOperation, dateGranularity]);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 text-xs font-semibold uppercase tracking-wider mb-2">
          <Layers className="w-3.5 h-3.5" />
          <span>Multidimensional Data Analysis</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          OLAP Explorer
        </h2>
        <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
          Explore donation data across different dimensions such as city, category, date and status.
        </p>
      </div>

      {/* Guided Controls Card: Step 1, Step 2, Step 3 */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* STEP 1: What do you want to measure? */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                1. What do you want to measure?
              </label>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                Measure
              </span>
            </div>
            <select
              value={measure}
              onChange={(e) => setMeasure(e.target.value as OLAPMeasure)}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white text-slate-900 shadow-2xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
            >
              <option value="count">Donation Count</option>
              <option value="quantity">Total Donation Quantity</option>
            </select>
            <p className="text-[11px] text-slate-500">
              Choose the value you want to analyze.
            </p>
          </div>

          {/* STEP 2: Choose the main dimension */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                2. Analyze by
              </label>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                Main Dimension
              </span>
            </div>
            <select
              value={mainDimension}
              onChange={(e) => handleMainDimensionChange(e.target.value as OLAPDimension)}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white text-slate-900 shadow-2xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
            >
              <option value="city">City</option>
              <option value="category">Category</option>
              <option value="status">Status</option>
              <option value="date">Date</option>
              <option value="ngo">NGO</option>
            </select>
            <p className="text-[11px] text-slate-500">
              Choose the main dimension you want to compare.
            </p>
          </div>

          {/* STEP 3: Optional second dimension */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                3. Break down by
              </label>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200">
                Second Dimension
              </span>
            </div>
            <select
              value={secondDimension}
              onChange={(e) => setSecondDimension(e.target.value as OLAPDimension | 'none')}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white text-slate-900 shadow-2xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
            >
              <option value="none">None (Single Dimension)</option>
              {mainDimension !== 'city' && <option value="city">City</option>}
              {mainDimension !== 'category' && <option value="category">Category</option>}
              {mainDimension !== 'status' && <option value="status">Status</option>}
              {mainDimension !== 'date' && <option value="date">Date</option>}
              {mainDimension !== 'ngo' && <option value="ngo">NGO</option>}
            </select>
            <p className="text-[11px] text-slate-500">
              Break down by a second dimension to create a matrix.
            </p>
          </div>
        </div>

        {/* Dynamic Current Analysis Sentence */}
        <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 text-xs text-emerald-950 font-bold">
            <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{currentAnalysisSentence}</span>
          </div>
          <span className="text-[11px] font-mono text-emerald-800 font-semibold hidden sm:inline-block">
            {filteredDonations.length} matching records
          </span>
        </div>
      </div>

      {/* Explore the Data — OLAP Operations */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
              <span>Explore the Data</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select an OLAP operation to summarize, drill down, filter, or pivot the dataset.
            </p>
          </div>

          {(activeOperation !== 'none' || sliceValue || diceCity || diceCategory || diceStatus || diceNgo) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* 5 Simple Operation Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {/* Roll-up */}
          <button
            type="button"
            onClick={() => handleSelectOperation('rollup')}
            className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
              activeOperation === 'rollup'
                ? 'bg-blue-50/80 border-blue-400 text-blue-950 shadow-2xs'
                : 'bg-white border-slate-200 hover:bg-slate-50/80 text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">Roll-up</span>
              <ChevronUp className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-[10px] text-slate-500 mt-1">Summarize to higher level</span>
          </button>

          {/* Drill-down */}
          <button
            type="button"
            onClick={() => handleSelectOperation('drilldown')}
            className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
              activeOperation === 'drilldown'
                ? 'bg-indigo-50/80 border-indigo-400 text-indigo-950 shadow-2xs'
                : 'bg-white border-slate-200 hover:bg-slate-50/80 text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">Drill-down</span>
              <ChevronDown className="w-4 h-4 text-indigo-600" />
            </div>
            <span className="text-[10px] text-slate-500 mt-1">View detailed level</span>
          </button>

          {/* Slice */}
          <button
            type="button"
            onClick={() => handleSelectOperation('slice')}
            className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
              activeOperation === 'slice'
                ? 'bg-emerald-50/80 border-emerald-400 text-emerald-950 shadow-2xs'
                : 'bg-white border-slate-200 hover:bg-slate-50/80 text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">Slice</span>
              <Filter className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-[10px] text-slate-500 mt-1">Filter by 1 value</span>
          </button>

          {/* Dice */}
          <button
            type="button"
            onClick={() => handleSelectOperation('dice')}
            className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
              activeOperation === 'dice'
                ? 'bg-amber-50/80 border-amber-400 text-amber-950 shadow-2xs'
                : 'bg-white border-slate-200 hover:bg-slate-50/80 text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">Dice</span>
              <TableIcon className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-[10px] text-slate-500 mt-1">Multiple filters</span>
          </button>

          {/* Pivot */}
          <button
            type="button"
            onClick={() => handleSelectOperation('pivot')}
            className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
              activeOperation === 'pivot'
                ? 'bg-purple-50/80 border-purple-400 text-purple-950 shadow-2xs'
                : 'bg-white border-slate-200 hover:bg-slate-50/80 text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">Pivot</span>
              <RefreshCw className="w-4 h-4 text-purple-600" />
            </div>
            <span className="text-[10px] text-slate-500 mt-1">Swap rows & cols</span>
          </button>
        </div>

        {/* Operation Interactive Control Panels */}

        {/* 1. ROLL-UP PANEL */}
        {activeOperation === 'rollup' && (
          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wide">
                  Roll-up: Summarize to a higher level
                </h4>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  Roll-up moves along the time hierarchy: Day → Month → Year.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-blue-900">Summarize by:</span>
                <select
                  value={dateGranularity}
                  onChange={(e) => {
                    const g = e.target.value as OLAPGranularity;
                    setDateGranularity(g);
                    setOperationFeedback(`Rolled up the data to ${g.toUpperCase()} level.`);
                  }}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-blue-300 bg-white text-blue-950 shadow-2xs cursor-pointer"
                >
                  <option value="day">Day</option>
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                </select>
              </div>
            </div>

            {operationFeedback && (
              <div className="text-xs text-blue-900 bg-white/80 p-2.5 rounded-lg border border-blue-200/70 font-medium">
                {operationFeedback}
              </div>
            )}
          </div>
        )}

        {/* 2. DRILL-DOWN PANEL */}
        {activeOperation === 'drilldown' && (
          <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wide">
                  Drill-down: Show more detailed information
                </h4>
                <p className="text-[11px] text-indigo-700 mt-0.5">
                  Drill-down navigates from broad totals down to specific timeframes: Year → Month → Day.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-indigo-900">Detailed level:</span>
                <select
                  value={dateGranularity}
                  onChange={(e) => {
                    const g = e.target.value as OLAPGranularity;
                    setDateGranularity(g);
                    setOperationFeedback(`Drilled down to ${g.toUpperCase()} level.`);
                  }}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-indigo-300 bg-white text-indigo-950 shadow-2xs cursor-pointer"
                >
                  <option value="year">Year</option>
                  <option value="month">Month</option>
                  <option value="day">Day</option>
                </select>
              </div>
            </div>

            {operationFeedback && (
              <div className="text-xs text-indigo-900 bg-white/80 p-2.5 rounded-lg border border-indigo-200/70 font-medium">
                {operationFeedback}
              </div>
            )}
          </div>
        )}

        {/* 3. SLICE PANEL */}
        {activeOperation === 'slice' && (
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-3">
            <div>
              <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                Slice: Select one value
              </h4>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Slice filters the analysis to one selected dimension value.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-bold text-emerald-900 block mb-1">
                  Choose Dimension:
                </label>
                <select
                  value={sliceDimension}
                  onChange={(e) => {
                    setSliceDimension(e.target.value as OLAPDimension);
                    setSliceValue('');
                  }}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-emerald-300 bg-white text-slate-800 shadow-2xs cursor-pointer"
                >
                  <option value="city">City</option>
                  <option value="category">Category</option>
                  <option value="status">Status</option>
                  <option value="ngo">NGO</option>
                  <option value="date">Date</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-emerald-900 block mb-1">
                  Select Value ({DIMENSION_LABELS[sliceDimension]}):
                </label>
                <select
                  value={sliceValue}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSliceValue(val);
                    if (val) {
                      setOperationFeedback(`Slice applied: ${DIMENSION_LABELS[sliceDimension]} = ${val}`);
                    } else {
                      setOperationFeedback('Cleared slice filter.');
                    }
                  }}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-emerald-300 bg-white text-slate-800 shadow-2xs cursor-pointer"
                >
                  <option value="">-- All {DIMENSION_LABELS[sliceDimension]} Values --</option>
                  {availableSliceValues.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {sliceValue ? (
              <div className="text-xs font-bold text-emerald-900 bg-white p-2.5 rounded-lg border border-emerald-300/80 flex items-center justify-between">
                <span>Slice applied: {DIMENSION_LABELS[sliceDimension]} = {sliceValue}</span>
                <button
                  type="button"
                  onClick={() => setSliceValue('')}
                  className="text-[11px] font-normal text-emerald-700 hover:text-emerald-900 underline"
                >
                  Clear Slice
                </button>
              </div>
            ) : (
              <div className="text-xs text-emerald-800 italic">
                Select a specific value above to filter the table and chart.
              </div>
            )}
          </div>
        )}

        {/* 4. DICE PANEL */}
        {activeOperation === 'dice' && (
          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                  Dice: Filter the data
                </h4>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Dice filters the data using multiple dimensions.
                </p>
              </div>
              {(diceCity || diceCategory || diceStatus || diceNgo) && (
                <button
                  type="button"
                  onClick={() => {
                    setDiceCity('');
                    setDiceCategory('');
                    setDiceStatus('');
                    setDiceNgo('');
                    setOperationFeedback('Cleared all dice filters.');
                  }}
                  className="text-xs font-bold text-amber-800 hover:text-amber-950 underline"
                >
                  Reset Dice Filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
              {/* City filter */}
              <div>
                <label className="text-[11px] font-bold text-amber-900 block mb-1">
                  City:
                </label>
                <select
                  value={diceCity}
                  onChange={(e) => setDiceCity(e.target.value)}
                  className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white text-slate-800 cursor-pointer"
                >
                  <option value="">All Cities</option>
                  {uniqueCities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category filter */}
              <div>
                <label className="text-[11px] font-bold text-amber-900 block mb-1">
                  Category:
                </label>
                <select
                  value={diceCategory}
                  onChange={(e) => setDiceCategory(e.target.value)}
                  className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white text-slate-800 cursor-pointer"
                >
                  <option value="">All Categories</option>
                  {uniqueCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status filter */}
              <div>
                <label className="text-[11px] font-bold text-amber-900 block mb-1">
                  Status:
                </label>
                <select
                  value={diceStatus}
                  onChange={(e) => setDiceStatus(e.target.value)}
                  className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white text-slate-800 cursor-pointer"
                >
                  <option value="">All Statuses</option>
                  {uniqueStatuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* NGO filter */}
              <div>
                <label className="text-[11px] font-bold text-amber-900 block mb-1">
                  NGO:
                </label>
                <select
                  value={diceNgo}
                  onChange={(e) => setDiceNgo(e.target.value)}
                  className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white text-slate-800 cursor-pointer"
                >
                  <option value="">All NGOs</option>
                  {uniqueNGOs.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-xs font-bold text-amber-900 bg-white p-2.5 rounded-lg border border-amber-300/80">
              Dice applied: {[diceCity, diceCategory, diceStatus, diceNgo].filter(Boolean).length} filters active.
            </div>
          </div>
        )}

        {/* 5. PIVOT PANEL */}
        {activeOperation === 'pivot' && (
          <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wide">
                  Pivot: Swap rows and columns
                </h4>
                <p className="text-[11px] text-purple-700 mt-0.5">
                  Pivoting changes the orientation of the analysis to view the data from another perspective.
                </p>
              </div>

              <button
                type="button"
                onClick={handlePivot}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-purple-700 text-white hover:bg-purple-800 text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Pivot Analysis</span>
              </button>
            </div>

            {operationFeedback && (
              <div className="text-xs text-purple-900 bg-white/80 p-2.5 rounded-lg border border-purple-200 font-medium">
                {operationFeedback}
              </div>
            )}
          </div>
        )}
      </div>

      {/* CURRENT ANALYSIS SUMMARY CARD */}
      <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-sm">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
          CURRENT ANALYSIS
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-[11px] text-slate-400 block font-normal">Measure:</span>
            <span className="font-bold text-emerald-400 font-mono">
              {measure === 'count' ? 'Donation Count' : 'Total Donation Quantity'}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block font-normal">Dimensions:</span>
            <span className="font-bold text-white font-mono">
              {DIMENSION_LABELS[mainDimension]}
              {secondDimension !== 'none' ? ` × ${DIMENSION_LABELS[secondDimension]}` : ''}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block font-normal">Operation:</span>
            <span className="font-bold text-indigo-300 font-mono">
              {summaryOperationText}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block font-normal">Filter:</span>
            <span className="font-bold text-amber-300 font-mono truncate block" title={summaryFilterText}>
              {summaryFilterText}
            </span>
          </div>
        </div>
      </div>

      {/* ANALYSIS RESULT SECTION: Table + Chart */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            <span>Analysis Result</span>
          </h3>
          <span className="text-xs font-mono font-bold text-slate-500">
            {filteredDonations.length} records analyzed
          </span>
        </div>

        {/* 1. RESULT TABLE */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Result Table
            </h4>
            <span className="text-xs font-mono font-semibold text-slate-500">
              Grand Total: {secondDimension === 'none' ? singleDimensionData?.grandTotal : multiDimensionData?.grandTotal}{' '}
              {measure === 'count' ? 'listings' : 'units'}
            </span>
          </div>

          {filteredDonations.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Insufficient data for this analysis. No donation records matched your filters.
            </div>
          ) : secondDimension === 'none' && singleDimensionData ? (
            /* Single Dimension Table */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200/80">
                  <tr>
                    <th className="py-2.5 px-4">{DIMENSION_LABELS[mainDimension]}</th>
                    <th className="py-2.5 px-4 text-right">
                      {measure === 'count' ? 'Donation Count' : 'Total Quantity'}
                    </th>
                    <th className="py-2.5 px-4 text-right">% of Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {singleDimensionData.items.map((item) => {
                    const pct = singleDimensionData.grandTotal > 0
                      ? Math.round((item.val / singleDimensionData.grandTotal) * 100)
                      : 0;
                    return (
                      <tr key={item.key} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-4 font-bold text-slate-900">{item.key}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-800">
                          {item.val}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-500">
                          {pct}%
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-slate-100/80 font-bold border-t-2 border-slate-200">
                    <td className="py-2.5 px-4 uppercase text-slate-800">Total</td>
                    <td className="py-2.5 px-4 text-right font-mono font-black text-emerald-950">
                      {singleDimensionData.grandTotal}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-700">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : multiDimensionData ? (
            /* Multi-Dimension Cross-Tabulation Table */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200/80">
                  <tr>
                    <th className="py-2.5 px-4 font-mono text-emerald-900">
                      {DIMENSION_LABELS[mainDimension]} \ {DIMENSION_LABELS[secondDimension]}
                    </th>
                    {multiDimensionData.cols.map((col) => (
                      <th key={col} className="py-2.5 px-4 text-center">
                        {col}
                      </th>
                    ))}
                    <th className="py-2.5 px-4 text-right bg-slate-100/80">Row Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {multiDimensionData.rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={multiDimensionData.cols.length + 2}
                        className="py-6 text-center text-slate-400"
                      >
                        Insufficient data for this analysis.
                      </td>
                    </tr>
                  ) : (
                    multiDimensionData.rows.map((row) => (
                      <tr key={row} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-4 font-bold text-slate-900">{row}</td>
                        {multiDimensionData.cols.map((col) => {
                          const cell = multiDimensionData.matrix[row]?.[col] || { count: 0, quantity: 0 };
                          const val = measure === 'count' ? cell.count : cell.quantity;
                          return (
                            <td key={col} className="py-2.5 px-4 text-center">
                              {val > 0 ? (
                                <span className="inline-block px-2 py-0.5 rounded font-bold font-mono text-xs bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                                  {val}
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-2.5 px-4 text-right font-bold font-mono bg-slate-50 text-slate-900">
                          {multiDimensionData.rowTotals[row] || 0}
                        </td>
                      </tr>
                    ))
                  )}
                  <tr className="bg-slate-100/80 font-bold border-t-2 border-slate-200">
                    <td className="py-2.5 px-4 uppercase text-slate-700">Column Total</td>
                    {multiDimensionData.cols.map((col) => (
                      <td key={col} className="py-2.5 px-4 text-center font-mono text-slate-900">
                        {multiDimensionData.colTotals[col] || 0}
                      </td>
                    ))}
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-950 font-black">
                      {multiDimensionData.grandTotal}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        {/* 2. RESULT CHART */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                <span>{dynamicChartTitle}</span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Dynamic visualization representing the active analysis
              </p>
            </div>

            {/* Legend for two dimensions */}
            {secondDimension !== 'none' && multiDimensionData && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {multiDimensionData.cols.map((col, idx) => (
                  <div key={col} className="flex items-center space-x-1.5 font-medium text-slate-600">
                    <span
                      className="w-2.5 h-2.5 rounded-xs shrink-0"
                      style={{ backgroundColor: PALETTE[idx % PALETTE.length] }}
                    />
                    <span>{col}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {filteredDonations.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Insufficient data for this analysis.
            </div>
          ) : mainDimension === 'date' && singleDimensionData && singleDimensionData.items.length > 1 ? (
            /* Line Chart for Date Timeline Analysis */
            <div className="w-full overflow-x-auto pt-2">
              {(() => {
                const items = singleDimensionData.items;
                const svgWidth = 800;
                const svgHeight = 240;
                const pLeft = 50;
                const pRight = 35;
                const pTop = 25;
                const pBottom = 40;
                const iWidth = svgWidth - pLeft - pRight;
                const iHeight = svgHeight - pTop - pBottom;
                const maxVal = Math.max(...items.map((i) => i.val), 5);

                const getX = (idx: number) => pLeft + (idx / (items.length - 1)) * iWidth;
                const getY = (val: number) => pTop + iHeight - (val / maxVal) * iHeight;

                const pointsStr = items.map((it, idx) => `${getX(idx)},${getY(it.val)}`).join(' ');
                const areaPath = `M ${getX(0)},${pTop + iHeight} L ${pointsStr} L ${getX(items.length - 1)},${pTop + iHeight} Z`;
                const linePath = `M ${pointsStr.replace(/ /g, ' L ')}`;

                return (
                  <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-56 sm:h-64 select-none font-sans">
                    <defs>
                      <linearGradient id="olapLineGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Gridlines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                      const y = pTop + iHeight * (1 - ratio);
                      const val = Math.round(maxVal * ratio);
                      return (
                        <g key={ratio}>
                          <line x1={pLeft} y1={y} x2={svgWidth - pRight} y2={y} stroke="#f1f5f9" strokeDasharray="4 4" />
                          <text x={pLeft - 8} y={y + 3} textAnchor="end" className="text-[10px] fill-slate-400 font-mono">
                            {val}
                          </text>
                        </g>
                      );
                    })}

                    <path d={areaPath} fill="url(#olapLineGrad)" />
                    <path d={linePath} fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                    {items.map((it, idx) => {
                      const x = getX(idx);
                      const y = getY(it.val);
                      return (
                        <g key={it.key} className="cursor-pointer">
                          <circle cx={x} cy={y} r={4} fill="#ffffff" stroke="#059669" strokeWidth={2} />
                          <text x={x} y={pTop + iHeight + 18} textAnchor="middle" className="text-[10px] fill-slate-500 font-medium">
                            {it.key}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                );
              })()}
            </div>
          ) : secondDimension !== 'none' && multiDimensionData ? (
            /* Stacked Bar Chart for 2 Dimensions */
            <div className="space-y-3 pt-2">
              {multiDimensionData.rows.map((row) => {
                const rowTotal = multiDimensionData.rowTotals[row] || 0;
                return (
                  <div key={row} className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-slate-800">{row}</span>
                      <span className="font-mono text-slate-500">
                        {rowTotal} {measure === 'count' ? 'listings' : 'units'}
                      </span>
                    </div>

                    <div className="h-5 w-full bg-slate-100 rounded-md overflow-hidden flex shadow-2xs">
                      {multiDimensionData.cols.map((col, cIdx) => {
                        const cell = multiDimensionData.matrix[row]?.[col] || { count: 0, quantity: 0 };
                        const val = measure === 'count' ? cell.count : cell.quantity;
                        if (val === 0) return null;
                        const widthPct = (val / multiDimensionData.maxRowTotal) * 100;
                        return (
                          <div
                            key={col}
                            style={{
                              width: `${widthPct}%`,
                              backgroundColor: PALETTE[cIdx % PALETTE.length],
                            }}
                            title={`${row} / ${col}: ${val}`}
                            className="h-full transition-all duration-300 hover:brightness-110 cursor-pointer flex items-center justify-center text-[10px] text-white font-mono font-bold px-1 overflow-hidden"
                          >
                            {widthPct > 6 && val}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : singleDimensionData ? (
            /* Bar Chart for Single Dimension */
            <div className="space-y-3 pt-2">
              {singleDimensionData.items.map((item, idx) => {
                const barWidth = Math.round((item.val / singleDimensionData.maxVal) * 100);
                const pct = singleDimensionData.grandTotal > 0
                  ? Math.round((item.val / singleDimensionData.grandTotal) * 100)
                  : 0;
                return (
                  <div key={item.key} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-800">{item.key}</span>
                      <div className="flex items-center space-x-2 font-mono">
                        <span className="font-bold text-slate-900">{item.val}</span>
                        <span className="text-[11px] text-slate-400">({pct}%)</span>
                      </div>
                    </div>
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-linear-to-r from-emerald-600 to-teal-500 rounded-full transition-all duration-500"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      {/* Expandable "About OLAP" Reference */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
        <button
          type="button"
          onClick={() => setAboutExpanded(!aboutExpanded)}
          className="w-full flex items-center justify-between text-left text-xs font-bold text-slate-900 cursor-pointer"
        >
          <span className="flex items-center space-x-2">
            <HelpCircle className="w-4 h-4 text-emerald-600" />
            <span>About OLAP</span>
          </span>
          {aboutExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {aboutExpanded && (
          <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600 space-y-2.5 leading-relaxed">
            <p className="font-medium text-slate-800">
              OLAP (Online Analytical Processing) allows donation data to be analyzed from multiple dimensions.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="font-bold text-slate-900 block">Roll-up:</span>
                <span className="text-slate-600">Summarizes data at a higher level.</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="font-bold text-slate-900 block">Drill-down:</span>
                <span className="text-slate-600">Shows more detailed data.</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="font-bold text-slate-900 block">Slice:</span>
                <span className="text-slate-600">Filters the analysis using one dimension value.</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="font-bold text-slate-900 block">Dice:</span>
                <span className="text-slate-600">Filters the analysis using multiple dimensions.</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 sm:col-span-2">
                <span className="font-bold text-slate-900 block">Pivot:</span>
                <span className="text-slate-600">Changes the orientation of the analysis.</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
