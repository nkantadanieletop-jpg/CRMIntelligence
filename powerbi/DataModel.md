# Power BI Data Model

## Overview

Star schema design optimized for sales analytics and business intelligence. All relationships are many-to-one from fact table (OPPORTUNITIES) to dimension tables.

## Schema Diagram

```
                    OPPORTUNITIES (Fact)
                   /    |      |      \    \
                  /     |      |       \    \
          ACCOUNTS  SALES_REPS  LEADS  INDUSTRIES  REGIONS
           (Dim)     (Dim)     (Dim)    (Dim)      (Dim)
```

## Table Relationships

### OPPORTUNITIES → ACCOUNTS
- **Type:** Many-to-One
- **Join Column:** account_id → account_id
- **Cardinality:** Many opportunities per account
- **Cross-filter:** Both (bidirectional)

### OPPORTUNITIES → SALES_REPS
- **Type:** Many-to-One
- **Join Column:** sales_rep_id → sales_rep_id
- **Cardinality:** Many opportunities per rep
- **Cross-filter:** Both

### OPPORTUNITIES → LEAD_SOURCES
- **Type:** Many-to-One
- **Join Column:** lead_source_id → lead_source_id
- **Cardinality:** Many opportunities per source
- **Cross-filter:** Both

### OPPORTUNITIES → INDUSTRIES
- **Type:** Many-to-One
- **Join Column:** industry_id → industry_id
- **Cardinality:** Many opportunities per industry
- **Cross-filter:** Both

### OPPORTUNITIES → REGIONS
- **Type:** Many-to-One
- **Join Column:** region_id → region_id
- **Cardinality:** Many opportunities per region
- **Cross-filter:** Both

### OPPORTUNITIES → PIPELINE_STAGES
- **Type:** Many-to-One
- **Join Column:** stage_id → stage_id
- **Cardinality:** Many opportunities per stage
- **Cross-filter:** Both

## Table Specifications

### OPPORTUNITIES (Fact Table)

**Purpose:** Transactional sales data; central fact table
**Record Count:** 3,587
**Granularity:** One row per opportunity
**Primary Key:** opportunity_id

**Key Columns for Measures:**
- opportunity_value_usd (currency, won deals only)
- weighted_pipeline_value (currency, open deals)
- is_won, is_lost (boolean flags)
- closed_date (for time-based analysis)
- sales_cycle_days, days_in_stage (for cycle analysis)
- forecast_amount_usd, forecast_accuracy_variance_pct (accuracy analysis)
- proposal_template_version (A/B test analysis)

### ACCOUNTS (Dimension)

**Purpose:** Customer master file
**Record Count:** 320
**Primary Key:** account_id

**Key Columns:**
- company_name (display)
- company_size (Large/Medium/Small)
- industry_id (FK for industry classification)
- region_id (FK for geographic analysis)
- customer_lifetime_value (numeric)
- existing_customer_flag (boolean)
- net_revenue_retention_pct (for existing customer quality)

### SALES_REPS (Dimension)

**Purpose:** Sales team roster
**Record Count:** 12 (9 AEs + 3 managers)
**Primary Key:** sales_rep_id

**Key Columns:**
- rep_name (display)
- sales_segment (Enterprise/Mid-Market/Management)
- tenure_months (numeric)
- quota_amount (currency)
- region_id (FK)
- manager_id (FK to self for hierarchy)

### LEAD_SOURCES (Dimension)

**Purpose:** Lead channel classification
**Record Count:** 4
**Primary Key:** lead_source_id

**Key Columns:**
- source_name (Inbound Marketing, Outbound SDR, Partner, Referral)
- source_type (Marketing/Sales/Partner/Customer)
- marketing_owned, sales_owned (boolean flags for attribution)

### INDUSTRIES (Dimension)

**Purpose:** Industry/vertical classification
**Record Count:** 8
**Primary Key:** industry_id

**Key Columns:**
- industry_name (display)
- sector (rollup classification)
- target_market_segment (Enterprise/Mid-Market)

### REGIONS (Dimension)

**Purpose:** Geographic territory
**Record Count:** 4
**Primary Key:** region_id

**Key Columns:**
- region_name (North America, Europe, APAC, Americas)
- code (NA, EU, AP, AM)
- country (for filtering)

### PIPELINE_STAGES (Dimension)

**Purpose:** Sales process stages
**Record Count:** 7
**Primary Key:** stage_id

**Key Columns:**
- stage_name (Lead → Close)
- stage_order (sequence 1-7)
- stage_weight_pct (0, 25, 50, 75, 100 for pipeline calculation)

## Power BI Setup Instructions

### Step 1: Import Data

1. Open Power BI Desktop
2. Get Data → CSV → Select all CSV files from `/data/` folder
3. Load tables:
   - opportunities
   - accounts
   - sales_reps
   - lead_sources
   - industries
   - regions
   - pipeline_stages

### Step 2: Create Relationships

1. Go to Model view
2. Create relationships as specified above (all many-to-one)
3. Set cross-filter direction to "Both" for all relationships
4. Verify no missing relationships

### Step 3: Configure Columns

**Data Types:**
- opportunity_id, account_id, sales_rep_id, etc. → Integer
- opportunity_value_usd, forecast_amount_usd → Currency
- created_date, closed_date → Date
- is_won, is_lost, existing_customer_flag → Boolean (0/1)
- Win rate %, accuracy rate % → Percentage

**Hidden Columns** (not for display):
- account_id, sales_rep_id, lead_source_id, etc. (FK keys)
- Use for relationships only

### Step 4: Create Measures

See `DAXMeasures.md` for all measure definitions. Key measures:

```dax
-- Revenue Measures
Total Won Revenue := SUM(opportunities[opportunity_value_usd])
Total Pipeline Value := SUM(opportunities[weighted_pipeline_value])

-- Performance Measures
Win Rate := DIVIDE(COUNTA(FILTER(opportunities, opportunities[is_won]=1)), COUNTA(opportunities))
Avg Sales Cycle := AVERAGE(opportunities[sales_cycle_days])

-- Pipeline Health
At Risk Revenue := SUM(FILTER(opportunities, opportunities[days_in_stage]>90 && opportunities[is_won]=0 && opportunities[is_lost]=0))
```

## Dashboard Design

See `DashboardSpecification.md` for 5-page dashboard layout with:
- Executive KPI page
- Sales funnel analysis
- Team performance leaderboard
- Pipeline health & aging
- Channel & industry deep-dives

## Data Refresh

**Recommended Cadence:** Daily (morning)

**Refresh Steps:**
1. Export updated CSVs from source CRM
2. Replace files in `/data/` folder
3. Power BI will auto-refresh in Desktop
4. Publish to Power BI Service for team access

## Performance Optimization

**Fact Table Partitioning** (optional):
- Partition opportunities by year (2022, 2023) for faster queries
- Significantly speeds up large dashboards

**Row-Level Security** (optional):
- Filter by sales_rep_id to show reps only their data
- Filter by region_id for regional managers

---

**Last Updated:** 2024  
**Model Type:** Star Schema  
**Status:** Production Ready
