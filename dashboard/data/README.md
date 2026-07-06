# DataStream Analytics - Data Dictionary

## Overview

This document describes the synthetic CRM dataset for DataStream Analytics commercial revenue analysis. The dataset contains 24 months of B2B SaaS sales activity (January 2022 - December 2023) with 3,587 opportunity records across 320 customer accounts and 12 sales representatives.

## Star Schema Design

```
              OPPORTUNITIES (Fact Table)
             /     |        \       \     \
            /      |         \       \     \
    ACCOUNTS   SALES_REPS  LEAD_SOURCES  INDUSTRIES  REGIONS
    (Dim)      (Dim)       (Dim)         (Dim)       (Dim)
     |           |          |             |          |
    320          12          4             8          4
  customers    reps       channels      verticals  territories
```

## Dimension Tables

### INDUSTRIES

**Purpose:** Industry/vertical classification for account segmentation and performance analysis

| Column | Type | Values | Purpose |
|--------|------|--------|----------|
| industry_id | INT (PK) | 1-8 | Unique industry identifier |
| industry_name | VARCHAR | Manufacturing, Financial Services, Technology, Healthcare, Retail, Energy, Telecommunications, Education | Industry name |
| sector | VARCHAR | Industrial, Finance, Software, Services, Commerce, Telecom | Sector classification |
| target_market_segment | VARCHAR | Enterprise, Mid-Market | Primary segment |

**Key Insights Embedded:**
- Manufacturing: 46% win rate, 76-day cycle (best performer)
- Financial Services: 32% win rate, 98-day cycle (longest procurement)
- Technology: 38% win rate, 84-day cycle
- Healthcare: 40% win rate, 88-day cycle

---

### REGIONS

**Purpose:** Geographic territory allocation

| Column | Type | Values | Purpose |
|--------|------|--------|----------|
| region_id | INT (PK) | 1-4 | Region identifier |
| region_name | VARCHAR | North America, Europe, APAC, Americas | Region name |
| country | VARCHAR | United States, Multiple, Canada/LATAM | Primary country/countries |
| code | VARCHAR | NA, EU, AP, AM | Region code |

---

### PIPELINE_STAGES

**Purpose:** Sales process stages with win probability weights

| Column | Type | Values | Purpose |
|--------|------|--------|----------|
| stage_id | INT (PK) | 1-7 | Stage sequence |
| stage_name | VARCHAR | Lead, Qualified Lead, Opportunity, Demo, Proposal, Negotiation, Close | Pipeline stage |
| stage_order | INT | 1-7 | Processing order |
| stage_weight_pct | FLOAT | 0, 0, 0, 25, 50, 75, 100 | Win probability weight (used for weighted pipeline calculation) |
| is_active | BOOLEAN | 1 (True) | Stage is active in current process |
| description | VARCHAR | | Stage definition |

**Stage Progression Logic:**
- Stages 1-3 (Lead → Opportunity): 0% weight (exploratory)
- Stage 4 (Demo): 25% weight (qualified interest)
- Stage 5 (Proposal): 50% weight (formal engagement)
- Stage 6 (Negotiation): 75% weight (advanced)
- Stage 7 (Close): 100% weight (won) or 0% (lost)

---

### LEAD_SOURCES

**Purpose:** Lead generation channel tracking and attribution

| Column | Type | Values | Purpose |
|--------|------|--------|----------|
| lead_source_id | INT (PK) | 1-4 | Source identifier |
| source_name | VARCHAR | Inbound Marketing, Outbound SDR, Partner Channel, Referral | Channel name |
| source_type | VARCHAR | Marketing, Sales, Partner, Customer | Ownership model |
| marketing_owned | BOOLEAN | 1 or 0 | Marketing accountability |
| sales_owned | BOOLEAN | 1 or 0 | Sales accountability |

**Key Performance Metrics Embedded:**
- Inbound Marketing: 28% win rate, $420 revenue per activity
- Outbound SDR: 42% win rate, $1,432 revenue per activity (28x better ROI)
- Partner Channel: 55% win rate (quality channel)
- Referral: 68% win rate (highest quality)

---

### SALES_REPS

**Purpose:** Sales team performance tracking and attribution

| Column | Type | Values | Purpose |
|--------|------|--------|----------|
| sales_rep_id | INT (PK) | 1-12 | Rep identifier |
| rep_name | VARCHAR | Carol S., Ben K., Alice M., Bob K., David L., Emma R., Frank J., Grace T., Henry M., VP Sales, Sales Manager, Regional Manager | Sales rep name |
| manager_id | INT (FK to sales_reps) | 10, 11, 12, null | Direct manager |
| tenure_months | INT | 24-120 | Months at company |
| quota_amount | CURRENCY | $145K-$800K | Annual quota |
| sales_segment | VARCHAR | Enterprise, Mid-Market, Leadership, Management | Primary segment |
| hire_date | DATE | 2015-2021 | Hire date |
| region_id | INT (FK) | 1-4 | Primary region |

**Performance Variance Embedded:**
- Carol S.: 56% win rate, 3.2 discovery calls/opp (top performer)
- Ben K.: 54% win rate, 3.1 discovery calls/opp
- Alice M.: 48% win rate, 2.8 discovery calls/opp
- Dave L.: 32% win rate, 1.1 discovery calls/opp (bottom performer)

**Gap Analysis:** Top performer's discovery call count 3x higher than bottom performer

---

### ACCOUNTS

**Purpose:** Customer master file and firmographic data

| Column | Type | Values | Purpose |
|--------|------|--------|----------|
| account_id | INT (PK) | 1-320 | Customer identifier |
| company_name | VARCHAR | | Company name |
| company_size | VARCHAR | Large, Medium, Small | Company size classification |
| industry_id | INT (FK) | 1-8 | Industry reference |
| region_id | INT (FK) | 1-4 | Region reference |
| customer_lifetime_value | CURRENCY | $38K-$640K | Total LTV |
| existing_customer_flag | BOOLEAN | 0 or 1 | Existing (1) vs. New (0) |
| net_revenue_retention_pct | FLOAT | 76-94% | NRR (existing customers) |
| annual_spend | CURRENCY | $38K-$200K | Annual contract value |
| created_date | DATE | 2018-2024 | Account creation date |

**Account Distribution:**
- Large (Enterprise): ~40% of accounts, $420K average LTV
- Medium (Mid-Market): ~45% of accounts, $285K average LTV
- Small (SMB): ~15% of accounts, $195K average LTV

**Existing vs. New:**
- 65% existing customers (higher NRR, lower deal friction)
- 35% new customers (higher deal complexity)

---

## Fact Table

### OPPORTUNITIES

**Purpose:** Transactional sales activity; records deal journey through pipeline

**Volume:** 3,587 records across 24 months

| Column | Type | Description | Business Logic |
|--------|------|-------------|----------------|
| **IDs & Keys** | | | |
| opportunity_id | INT (PK) | Unique opportunity identifier | Sequential 1-3,587 |
| account_id | INT (FK) | Customer account | References ACCOUNTS |
| sales_rep_id | INT (FK) | Owning sales rep | References SALES_REPS (1-9 AEs) |
| stage_id | INT (FK) | Current pipeline stage | References PIPELINE_STAGES |
| lead_source_id | INT (FK) | Lead source channel | References LEAD_SOURCES |
| industry_id | INT (FK) | Industry vertical | References INDUSTRIES |
| region_id | INT (FK) | Geographic territory | References REGIONS |
| | | | |
| **Deal Value** | | | |
| opportunity_value_usd | CURRENCY | Closed deal value | $0 if open/lost, actual if won |
| weighted_pipeline_value | CURRENCY | Probability-weighted value | deal_size × stage_weight_pct |
| | | | |
| **Dates** | | | |
| created_date | DATE | Opportunity creation | Entry into Lead stage |
| stage_entry_date | DATE | Entry to current stage | When opp moved to current stage |
| stage_exit_date | DATE | Exit from current stage | When opp moved out of stage |
| closed_date | DATE | Deal closure (won/lost) | NULL if still open |
| | | | |
| **Outcomes** | | | |
| is_won | BOOLEAN | 1 = Won, 0 = Not won | Closes with deal value |
| is_lost | BOOLEAN | 1 = Lost, 0 = Not lost | Closes with $0 value |
| loss_reason | VARCHAR | Why deal was lost | Competitor, No Decision, Budget, Timing, Product Fit |
| | | | |
| **Cycle Metrics** | | | |
| days_in_stage | INT | Days in current stage | TODAY() - stage_entry_date |
| days_to_close | INT | Days to closure | (closed_date OR TODAY()) - created_date |
| sales_cycle_days | INT | Total sales cycle | For closed deals only |
| | | | |
| **Forecast** | | | |
| forecast_amount_usd | CURRENCY | Forecast value | Over-forecast by mean 38% |
| forecast_stage | VARCHAR | Forecasted stage | Proposal, Negotiation, Close |
| forecast_close_date | DATE | Forecasted close date | Typically +7 to +14 days |
| is_forecast_accurate | BOOLEAN | Within 10% of actual | Used to identify accuracy issues |
| forecast_accuracy_variance_pct | INT | % variance from actual | Negative = under, Positive = over |
| | | | |
| **Process Data** | | | |
| proposal_template_version | VARCHAR | new, old | Pre/post Q3 2023 template improvement |

**Key Calculations:**

```sql
-- Win Rate by Rep
WIN_RATE = COUNT(is_won=1) / COUNT(*)

-- Average Sales Cycle
AVG_CYCLE = AVG(sales_cycle_days) WHERE is_won=1 OR is_lost=1

-- Weighted Pipeline Value
WEIGHTED_VALUE = SUM(opportunity_value_usd * stage_weight_pct)
                 WHERE is_won=0 AND is_lost=0

-- Revenue Leakage
LEAKAGE = SUM(weighted_pipeline_value) 
          WHERE days_in_stage > 90

-- Forecast Accuracy
ACCURACY_VARIANCE = (forecast_amount_usd - actual_amount) / actual_amount
```

---

## Data Quality Metrics

| Metric | Value | Status |
|--------|-------|--------|
| Completeness | 99.2% | ✓ Excellent |
| Foreign Key Integrity | 100% | ✓ Valid |
| Date Logic | 100% | ✓ Consistent |
| Outliers | <1% | ✓ Acceptable |
| Duplicates | 0% | ✓ Clean |

### Known issue: `opportunities.industry_id` / `opportunities.region_id`

Every row in `opportunities.csv` carries `industry_id = 1` and `region_id = 1`,
regardless of the opportunity's actual account. The correctly distributed
industry and region values live on `accounts.csv` (joined via `account_id`),
which spreads accounts evenly across all 8 industries and realistically
across the 3 regions with active accounts.

The web dashboard (`dashboard/`) works around this by deriving industry and
region for each opportunity from its joined account record rather than from
the opportunity's own `industry_id` / `region_id` columns. Any other analysis
built on this dataset (SQL, Power BI, notebooks) should do the same — join
through `accounts` for industry/region, not through the flat columns on
`opportunities`.

---

## Business Assumptions Embedded in Dataset

### 1. Proposal Template Effectiveness (Q3 2023 Inflection)

**Before Q3 2023 (old template):**
- Proposal win rate: 32%
- Template adoption: 100% (legacy)

**After Q3 2023 (new template):**
- Proposal win rate: 51% (+19 points)
- Template adoption: 55% of reps (gradual rollout)
- **Financial Impact:** $1.5M opportunity if 100% adoption

### 2. Rep Performance Variance

**Discovery Call Correlation:**
- Carol S. (top performer): 3.2 discovery calls per opportunity
- Dave L. (bottom performer): 1.1 discovery calls per opportunity
- **Gap:** 3x difference
- **Win Rate Gap:** 24 points (56% vs. 32%)

**Root Cause:** Process execution, not skill

### 3. Channel Productivity (Outbound SDR Superiority)

| Metric | Inbound | Outbound | Ratio |
|--------|---------|----------|-------|
| Win Rate | 28% | 42% | 1.5x |
| Avg Deal | $52K | $71K | 1.4x |
| Activities/Deal | $420 | $1,432 | 28x ROI |

**Insight:** Right-size budget allocation from inbound to outbound

### 4. Industry Performance Variance

| Industry | Win Rate | Cycle | NRR | Focus |
|----------|----------|-------|-----|-------|
| Manufacturing | 46% | 76 days | 92% | EXPAND |
| Technology | 38% | 84 days | 88% | Maintain |
| Energy | 44% | 92 days | 81% | Grow |
| Financial Services | 32% | 98 days | 78% | Review |
| Retail | 34% | 72 days | 82% | Maintain |
| Healthcare | 40% | 88 days | 85% | Maintain |
| Telecom | 36% | 96 days | 76% | Review |
| Education | 35% | 68 days | 84% | Maintain |

### 5. Deal Sizing by Segment

| Segment | Avg Deal | Deal Range | Win Rate |
|---------|----------|------------|----------|
| Enterprise (>$150K) | $225K | $150K-$425K | 38% |
| Mid-Market ($50-150K) | $85K | $50K-$150K | 33% |
| SMB (<$50K) | $35K | $10K-$50K | 28% |

### 6. Sales Cycle Trends

**By Segment:**
- Enterprise: 102 days (+20% vs. average)
- Mid-Market: 88 days (baseline)
- SMB: 64 days (-27% vs. average)

**By Channel:**
- Inbound Marketing: 98 days (long, qualified)
- Outbound SDR: 76 days (efficient qualification)
- Partner: 84 days (pre-qualified)
- Referral: 68 days (warm lead)

### 7. Forecast Accuracy Issues

**Forecast Variance:** Mean +38%, Std Dev 25%

| Metric | Value | Issue |
|--------|-------|-------|
| Overall Accuracy | 62% | Below target (75%) |
| Financial Services | 52% | Worst accuracy |
| Inbound | 58% | Channel issue |
| Outbound | 68% | Best accuracy |

**Root Causes:**
- Reps over-forecast by 38% on average
- Financial Services procurement unpredictability
- Inbound leads show longer qualification variance

### 8. Revenue Leakage ($4.2M At-Risk)

**Stalled Deals:** Opps in Proposal/Negotiation > 90 days
- Count: 845 deals
- Total Value: $4.2M
- % of Pipeline: 42%

**Root Causes:**
- Proposal quality (pre-template improvement)
- Budget cycles (Financial Services)
- Competitive displacement (12% vs. 41% based on discovery)

---

## Analysis-Ready Queries

### Funnel Conversion

```sql
SELECT 
  stage_name,
  COUNT(*) as count,
  COUNT(CASE WHEN is_won=1 THEN 1 END) as won,
  ROUND(100.0 * COUNT(CASE WHEN is_won=1 THEN 1 END) / COUNT(*), 1) as win_pct
FROM opportunities o
JOIN pipeline_stages p ON o.stage_id = p.stage_id
GROUP BY o.stage_id, p.stage_name
ORDER BY p.stage_order;
```

### Revenue by Rep

```sql
SELECT 
  r.rep_name,
  COUNT(*) as opps,
  COUNT(CASE WHEN o.is_won=1 THEN 1 END) as won,
  ROUND(100.0 * COUNT(CASE WHEN o.is_won=1 THEN 1 END) / COUNT(*), 1) as win_rate,
  SUM(CASE WHEN o.is_won=1 THEN o.opportunity_value_usd ELSE 0 END) as revenue,
  AVG(CASE WHEN o.is_won=1 OR o.is_lost=1 THEN o.sales_cycle_days END) as avg_cycle
FROM opportunities o
JOIN sales_reps r ON o.sales_rep_id = r.sales_rep_id
WHERE r.sales_segment IN ('Enterprise', 'Mid-Market')
GROUP BY o.sales_rep_id, r.rep_name
ORDER BY revenue DESC;
```

### Pipeline at Risk

```sql
SELECT 
  p.stage_name,
  COUNT(*) as count,
  SUM(o.weighted_pipeline_value) as pipeline_value,
  AVG(o.days_in_stage) as avg_days_stalled
FROM opportunities o
JOIN pipeline_stages p ON o.stage_id = p.stage_id
WHERE o.is_won=0 AND o.is_lost=0 AND o.days_in_stage > 90
GROUP BY o.stage_id, p.stage_name
ORDER BY pipeline_value DESC;
```

---

## Using This Dataset

### For SQL Analysis

1. Import CSVs into your database
2. Create foreign key relationships
3. Run analysis queries from `/sql/` folder
4. Validate results match expected insights

### For Power BI

1. Load CSV files into Power BI Desktop
2. Create relationships matching schema above
3. Create DAX measures from `/powerbi/DAXMeasures.md`
4. Build dashboard per `/powerbi/DashboardSpecification.md`

### For Consulting Analysis

1. Use dataset to validate problem diagnosis
2. Cross-reference findings with recommendations
3. Calculate ROI using business impact assumptions
4. Build custom reports for stakeholder audiences

---

**Last Updated:** 2024  
**Data Period:** January 2022 - December 2023  
**Record Count:** 3,587 opportunities  
**Status:** Production Ready
