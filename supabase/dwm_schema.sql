-- ============================================================================
-- HELPING HANDS - DATA WAREHOUSING & MINING (DWM) STAR SCHEMA
-- Academic Curriculum Star Schema with OLAP Operations
-- ============================================================================

-- Drop schema if exists for clean staging
CREATE SCHEMA IF NOT EXISTS dwm;

-- ============================================================================
-- 1. DIMENSION TABLES
-- ============================================================================

-- DIMENSION 1: DIM_DATE
CREATE TABLE IF NOT EXISTS dwm.dim_date (
    date_key INT PRIMARY KEY,                 -- Format: YYYYMMDD (e.g., 20260921)
    full_date DATE NOT NULL,
    day_of_month INT NOT NULL,
    day_name VARCHAR(15) NOT NULL,
    day_of_week INT NOT NULL,
    week_of_year INT NOT NULL,
    month_number INT NOT NULL,
    month_name VARCHAR(15) NOT NULL,
    quarter_number INT NOT NULL,
    quarter_name VARCHAR(5) NOT NULL,         -- 'Q1', 'Q2', etc.
    year INT NOT NULL,
    is_weekend BOOLEAN NOT NULL
);

-- DIMENSION 2: DIM_USER (DONORS)
CREATE TABLE IF NOT EXISTS dwm.dim_user (
    user_key SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,                    -- Natural key from operational public.profiles
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(30),
    city VARCHAR(80) NOT NULL,
    donor_tier VARCHAR(20) DEFAULT 'Regular', -- 'Bronze', 'Silver', 'Gold', 'Champion'
    registration_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- DIMENSION 3: DIM_NGO
CREATE TABLE IF NOT EXISTS dwm.dim_ngo (
    ngo_key SERIAL PRIMARY KEY,
    ngo_id UUID NOT NULL,                     -- Natural key from operational public.ngos
    org_name VARCHAR(150) NOT NULL,
    darpan_id VARCHAR(50) NOT NULL,
    contact_person VARCHAR(100),
    city VARCHAR(80) NOT NULL,
    primary_category VARCHAR(50) NOT NULL,
    accreditation_status VARCHAR(20) DEFAULT 'Verified'
);

-- DIMENSION 4: DIM_CATEGORY
CREATE TABLE IF NOT EXISTS dwm.dim_category (
    category_key SERIAL PRIMARY KEY,
    category_name VARCHAR(50) NOT NULL,       -- Clothes, Books, Food, Electronics, Toys, Medical, Furniture
    department VARCHAR(50) NOT NULL,          -- Essentials, Educational, Nutrition, Durable
    urgency_level VARCHAR(20) NOT NULL        -- Standard, High, Immediate
);

-- DIMENSION 5: DIM_LOCATION
CREATE TABLE IF NOT EXISTS dwm.dim_location (
    location_key SERIAL PRIMARY KEY,
    city VARCHAR(80) NOT NULL,
    state VARCHAR(80) NOT NULL,
    country VARCHAR(50) DEFAULT 'India',
    region VARCHAR(30) NOT NULL               -- North, South, East, West, Central
);

-- DIMENSION 6: DIM_STATUS
CREATE TABLE IF NOT EXISTS dwm.dim_status (
    status_key SERIAL PRIMARY KEY,
    status_code VARCHAR(30) NOT NULL,         -- PENDING, ACCEPTED, SCHEDULED, COMPLETED, CANCELLED
    is_terminal BOOLEAN NOT NULL,
    is_fulfilled BOOLEAN NOT NULL
);

-- ============================================================================
-- 2. FACT TABLE: FACT_DONATION
-- ============================================================================
CREATE TABLE IF NOT EXISTS dwm.fact_donation (
    fact_id BIGSERIAL PRIMARY KEY,
    donation_id UUID NOT NULL,                -- Natural key
    donor_key INT REFERENCES dwm.dim_user(user_key),
    ngo_key INT REFERENCES dwm.dim_ngo(ngo_key),
    date_key INT REFERENCES dwm.dim_date(date_key),
    category_key INT REFERENCES dwm.dim_category(category_key),
    location_key INT REFERENCES dwm.dim_location(location_key),
    status_key INT REFERENCES dwm.dim_status(status_key),
    
    -- Numerical Measures / Additive Metrics
    quantity INT NOT NULL DEFAULT 1,
    lead_time_hours NUMERIC(8,2),             -- Hours between creation and acceptance
    completion_time_hours NUMERIC(8,2),       -- Hours between acceptance and completion
    donor_rating INT CHECK (donor_rating BETWEEN 1 AND 5),
    donation_count INT DEFAULT 1              -- Fact line counter for simple additive aggregation
);

-- Indexes on foreign keys for star query optimization
CREATE INDEX IF NOT EXISTS idx_fact_date ON dwm.fact_donation(date_key);
CREATE INDEX IF NOT EXISTS idx_fact_donor ON dwm.fact_donation(donor_key);
CREATE INDEX IF NOT EXISTS idx_fact_ngo ON dwm.fact_donation(ngo_key);
CREATE INDEX IF NOT EXISTS idx_fact_cat ON dwm.fact_donation(category_key);
CREATE INDEX IF NOT EXISTS idx_fact_loc ON dwm.fact_donation(location_key);
CREATE INDEX IF NOT EXISTS idx_fact_status ON dwm.fact_donation(status_key);

-- ============================================================================
-- 3. OLAP OPERATION SQL QUERIES (COLLEGE CURRICULUM REQUIREMENT)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- OPERATION 1: ROLL-UP (Aggregation to higher dimensional levels)
-- Aggregates total donated items climbing the hierarchy:
-- Day -> Month -> Quarter -> Year
-- ----------------------------------------------------------------------------
-- ROLL-UP BY TIME HIERARCHY
SELECT 
    d.year,
    d.quarter_name,
    d.month_name,
    SUM(f.quantity) AS total_items_donated,
    COUNT(f.fact_id) AS total_donations,
    ROUND(AVG(f.donor_rating), 2) AS avg_rating
FROM dwm.fact_donation f
JOIN dwm.dim_date d ON f.date_key = d.date_key
GROUP BY ROLLUP (d.year, d.quarter_name, d.month_name)
ORDER BY d.year NULLS FIRST, d.quarter_name NULLS FIRST, d.month_name NULLS FIRST;

-- ROLL-UP BY GEOGRAPHIC HIERARCHY
SELECT 
    l.region,
    l.state,
    l.city,
    SUM(f.quantity) AS total_items,
    COUNT(f.fact_id) AS total_transactions
FROM dwm.fact_donation f
JOIN dwm.dim_location l ON f.location_key = l.location_key
GROUP BY ROLLUP (l.region, l.state, l.city);


-- ----------------------------------------------------------------------------
-- OPERATION 2: DRILL-DOWN (Navigating from high-level summary to fine detail)
-- Starting from Year level and drilling down into specific Categories & Cities
-- ----------------------------------------------------------------------------
SELECT 
    d.year,
    c.category_name,
    l.city,
    s.status_code,
    SUM(f.quantity) AS total_quantity,
    ROUND(AVG(f.lead_time_hours), 1) AS avg_acceptance_lead_time_hrs,
    ROUND(AVG(f.donor_rating), 2) AS avg_donor_rating
FROM dwm.fact_donation f
JOIN dwm.dim_date d ON f.date_key = d.date_key
JOIN dwm.dim_category c ON f.category_key = c.category_key
JOIN dwm.dim_location l ON f.location_key = l.location_key
JOIN dwm.dim_status s ON f.status_key = s.status_key
WHERE d.year = 2026
GROUP BY d.year, c.category_name, l.city, s.status_code
ORDER BY c.category_name, total_quantity DESC;


-- ----------------------------------------------------------------------------
-- OPERATION 3: SLICE (Selecting a single dimension slice of the data cube)
-- Example: Slice the data cube strictly where category is 'Clothes'
-- ----------------------------------------------------------------------------
SELECT 
    d.month_name,
    l.city,
    n.org_name AS receiving_ngo,
    SUM(f.quantity) AS clothes_donated_count,
    ROUND(AVG(f.completion_time_hours), 1) AS avg_completion_hours
FROM dwm.fact_donation f
JOIN dwm.dim_category c ON f.category_key = c.category_key
JOIN dwm.dim_date d ON f.date_key = d.date_key
JOIN dwm.dim_location l ON f.location_key = l.location_key
LEFT JOIN dwm.dim_ngo n ON f.ngo_key = n.ngo_key
WHERE c.category_name = 'Clothes'  -- SLICE CONDITION
GROUP BY d.month_name, l.city, n.org_name
ORDER BY clothes_donated_count DESC;


-- ----------------------------------------------------------------------------
-- OPERATION 4: DICE (Selecting a sub-cube by filtering on 2 or more dimensions)
-- Example: 
-- 1. Location in ('Mumbai', 'Pune')
-- 2. Category in ('Books', 'Electronics')
-- 3. Date in Quarter 'Q3'
-- ----------------------------------------------------------------------------
SELECT 
    l.city,
    c.category_name,
    d.month_name,
    s.status_code,
    COUNT(f.fact_id) AS total_donations,
    SUM(f.quantity) AS items_count,
    ROUND(AVG(f.donor_rating), 2) AS satisfaction_score
FROM dwm.fact_donation f
JOIN dwm.dim_location l ON f.location_key = l.location_key
JOIN dwm.dim_category c ON f.category_key = c.category_key
JOIN dwm.dim_date d ON f.date_key = d.date_key
JOIN dwm.dim_status s ON f.status_key = s.status_key
WHERE l.city IN ('Mumbai', 'Pune')                  -- DICE DIMENSION 1
  AND c.category_name IN ('Books', 'Electronics')   -- DICE DIMENSION 2
  AND d.quarter_name = 'Q3'                         -- DICE DIMENSION 3
GROUP BY l.city, c.category_name, d.month_name, s.status_code;


-- ----------------------------------------------------------------------------
-- OPERATION 5: PIVOT (Cross-tabulation: rotating axes)
-- Matrix view: Categories as columns across Cities as rows
-- ----------------------------------------------------------------------------
SELECT 
    l.city,
    SUM(CASE WHEN c.category_name = 'Clothes' THEN f.quantity ELSE 0 END) AS clothes_qty,
    SUM(CASE WHEN c.category_name = 'Food' THEN f.quantity ELSE 0 END) AS food_qty,
    SUM(CASE WHEN c.category_name = 'Books' THEN f.quantity ELSE 0 END) AS books_qty,
    SUM(CASE WHEN c.category_name = 'Electronics' THEN f.quantity ELSE 0 END) AS electronics_qty,
    SUM(CASE WHEN c.category_name = 'Toys' THEN f.quantity ELSE 0 END) AS toys_qty,
    SUM(CASE WHEN c.category_name = 'Medical' THEN f.quantity ELSE 0 END) AS medical_qty,
    SUM(f.quantity) AS grand_total_items
FROM dwm.fact_donation f
JOIN dwm.dim_location l ON f.location_key = l.location_key
JOIN dwm.dim_category c ON f.category_key = c.category_key
GROUP BY l.city
ORDER BY grand_total_items DESC;
