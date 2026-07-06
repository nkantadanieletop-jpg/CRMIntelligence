# Power BI Dashboard Specification

## Overview

5-page interactive dashboard for DataStream Analytics commercial revenue analysis. Designed for sales leadership, CFO, and revenue operations audiences.

## Page 1: Executive Dashboard (KPIs)

### Purpose
High-level business health snapshot for C-suite review

### Layout

**Top Row - Key Metrics (Cards)**
```
[Total Won Revenue]    [Total Pipeline]    [Win Rate %]    [Avg Sales Cycle]
[$8.2M]                [$12.1M]            [34%]           [94 days]
```

**Second Row - Charts**

- **Revenue Trend (Line Chart)**
  - X-axis: Month (Jan 2022 - Dec 2023)
  - Y-axis: Won Revenue (cumulative)
  - Shows: Steady growth, Q3 2023 inflection from template change
  - Target Line: $11.1M baseline

- **Win Rate by Month (Column Chart)**
  - X-axis: Month
  - Y-axis: Win Rate %
  - Shows: Improvement post-Q3 2023
  - Benchmark: 34% overall average

**Third Row - Status Metrics**

- **At-Risk Revenue (Big Number)**
  - $4.2M (from stalled deals >90 days)
  - Format: Red color if >$3M, yellow if $2-3M, green if <$2M
  - Action: Click to drill into aging pipeline

- **Forecast Accuracy (Gauge Chart)**
  - Current: 62%
  - Target: 75%
  - Color: Red zone <70%, yellow 70-75%, green >75%

**Action Buttons**
- Drill-through to Sales Team Performance
- Drill-through to Pipeline Health
- Drill-through to Industry Deep-Dive

---

## Page 2: Sales Funnel

### Purpose
Understand pipeline conversion and leakage at each stage

### Layout

**Funnel Chart (Main Visual)**
```
Lead             3,587 opps  → 100%
Qualified Lead   2,890 opps  → 80%  (dropout: 20%)
Opportunity      2,105 opps  → 59%  (dropout: 27%)
Demo             1,580 opps  → 44%  (dropout: 25%)
Proposal          945 opps  → 26%  (dropout: 40%)  ← LEAKAGE
Negotiation      486 opps  → 14%  (dropout: 49%)  ← LEAKAGE
Close (Won)      289 opps  → 8%   (won 67%)
Close (Lost)     197 opps  → 5.5% (lost 33%)
```

**Side Panel - Stage Details Table**
| Stage | Count | Won | Loss | Avg Days | Conversion |
|-------|-------|-----|------|----------|------------|
| Lead | 3,587 | 289 | 197 | - | 8% |
| ... | ... | ... | ... | ... | ... |

**Insights Panel**
- Red Alert: "Proposal stage has 40% dropout. Win rate only 51% (old: 32%)"
- Action: "Accelerate proposal template adoption"
- Opportunity: "+$1.5M if achieve 70% win rate"

**Interactivity**
- Click stage → Shows deals in that stage
- Click loss reason filter → Updates funnel
- Timeline slider → Filter by date range

---

## Page 3: Sales Team Performance

### Purpose
Benchmark sales rep performance; identify top/bottom performers and coaching gaps

### Layout

**Rep Leaderboard (Table)**
| Rank | Rep Name | Segment | Opps | Won | Win % | Revenue | Avg Cycle | Forecast Acc | Comp Loss % |
|------|----------|---------|------|-----|-------|---------|-----------|-------------|-----------|
| 1 | Carol S. | Enterprise | 245 | 137 | 56% | $2.1M | 88 days | 72% | 8% |
| 2 | Ben K. | Enterprise | 238 | 128 | 54% | $2.0M | 91 days | 70% | 10% |
| ... | ... | ... | ... | ... | ... | ... | ... | ... | ... |

**Key Features:**
- Sortable by: Win %, Revenue, Quota %, Forecast Accuracy
- Color coding: Green (top 33%), Yellow (mid 33%), Red (bottom 33%)
- Column headers are links:
  - Click "Rep Name" → Drill-through to individual rep dashboard
  - Click "Win %" → Shows winning opportunity characteristics
  - Click "Forecast Acc" → Shows forecast variance pattern

**Comparison Chart**
- X-axis: Sales Rep
- Y-axis: Win Rate % (left), Revenue (right)
- Two series: Win Rate (bars), Revenue (line)
- Shows: Top performer (Carol S.) 56% win vs. bottom (Dave L.) 32% win

**Segment Tabs**
- Toggle: Enterprise / Mid-Market / All
- Shows segment-specific benchmarks

**Insights**
- "Discovery call correlation: Top reps avg 3.2 calls/opp vs. bottom reps 1.1"
- "Opportunity: +$800K if bottom quartile matches top quartile performance"

---

## Page 4: Pipeline Health & Aging

### Purpose
Monitor at-risk revenue; prioritize sales intervention

### Layout

**At-Risk Pipeline Waterfall**
```
Total Open Pipeline           $12.1M
├─ Active (<45 days)          $4.2M  (35%) ✓ Healthy
├─ Watch (45-90 days)         $3.8M  (31%) ⚠ Monitor
├─ Stalled (90-180 days)      $2.8M  (23%) ⚠ High Priority
└─ Critical (>180 days)       $1.3M  (11%) 🔴 Immediate Action
```

**Aging by Stage Table**
| Stage | Count | Value | Avg Days | % >90 Days | Top Deal |
|-------|-------|-------|----------|-----------|----------|
| Proposal | 385 | $3.2M | 78 days | 32% | ABC Manufacturing - $285K |
| Negotiation | 461 | $4.1M | 92 days | 58% | XYZ Finance - $425K |

**Stalled Deal List** (Drillable)
- Company Name
- Rep Owner
- Value
- Days Stalled
- Current Stage
- Last Activity
- Next Steps

**Risk Category Breakdown (Pie Chart)**
- Critical >6mo: $1.3M (11%)
- High 4-6mo: $2.8M (23%)
- Medium 3-4mo: $3.2M (26%)
- Watch 60-90 days: $4.8M (40%)

**Interactivity**
- Click deal → Shows full opportunity details
- Click Rep → Filters to that rep's stalled deals
- Click Industry → Filters to that vertical's aging

---

## Page 5: Channel & Industry Analysis

### Purpose
Compare channel productivity and industry performance; guide resource allocation

### Layout

**Channel Comparison (Side-by-side)**

| Channel | Source Type | Activities | Win % | Revenue | Rev/Activity | Avg Cycle |
|---------|------------|-----------|-------|---------|--------------|----------|
| Outbound SDR | Sales | 1,245 | 42% | $4.2M | $1,432 | 76 days |
| Inbound Marketing | Marketing | 892 | 28% | $1.8M | $420 | 98 days |
| Partner | Partner | 346 | 55% | $2.1M | $1,890 | 84 days |
| Referral | Customer | 104 | 68% | $1.8M | $2,485 | 68 days |

**Channel Performance Chart**
- X-axis: Win Rate %
- Y-axis: Revenue per Activity
- Bubble size: Total Revenue
- Quadrants: High Performance (top-right) to Low Performance (bottom-left)
- Insight: Outbound SDR is "efficient middle", Referral is premium

**Industry Scorecard**

| Industry | Segment | Customers | Win % | Avg Deal | Revenue | Comp Loss % | NRR % | Trend |
|----------|---------|-----------|-------|----------|---------|------------|-------|-------|
| Manufacturing | Enterprise | 38 | 46% | $68K | $2.1M | 9% | 92% | ↑ GROW |
| Technology | Mid-Market | 42 | 38% | $71K | $1.8M | 14% | 88% | → Hold |
| Financial Services | Enterprise | 35 | 32% | $105K | $1.4M | 31% | 78% | ↓ REVIEW |
| Healthcare | Enterprise | 28 | 40% | $90K | $1.2M | 18% | 85% | → Hold |
| Retail | Mid-Market | 31 | 34% | $52K | $0.8M | 22% | 82% | → Hold |
| Energy | Enterprise | 22 | 44% | $98K | $1.1M | 16% | 81% | → Hold |
| Telecom | Enterprise | 18 | 36% | $115K | $0.9M | 26% | 76% | ↓ REVIEW |
| Education | Mid-Market | 17 | 35% | $45K | $0.3M | 20% | 84% | ↑ Pilot |

**Industry Performance Chart (Clustered)**
- X-axis: Win Rate %
- Y-axis: Average Deal Size
- Bubble size: Total Revenue
- Color: NRR (green >85%, yellow 80-85%, red <80%)
- Labels: Industry names
- Story: Manufacturing (best), Financial Services (challenged)

**Action Matrix**
```
High Win % / High Deal Size  → EXPAND
  Manufacturing, Energy

High Win % / Low Deal Size   → UPSELL
  Technology, Education

Low Win % / High Deal Size   → IMPROVE
  Financial Services, Telecom

Low Win % / Low Deal Size    → REVIEW
  Retail
```

---

## Drill-Through Actions

### From Executive to Sales Rep
- **Action:** Click rep name → Opens rep-specific dashboard
- **Shows:** Individual win rate trend, rep's top/lost deals, forecast accuracy

### From Funnel to Stage Details
- **Action:** Click stage → Filters entire dashboard to that stage
- **Shows:** All deals in stage, cycle time distribution, loss reasons

### From At-Risk to Deal Details
- **Action:** Click stalled deal → Shows full deal card
- **Shows:** Company, value, stage, days stalled, next steps, contact info

### From Channel to Rep Breakdown
- **Action:** Click channel → Shows reps using that channel
- **Shows:** Which reps are most productive with each channel

---

## Slicers (Global Filters)

All pages have these filter options:

1. **Date Range** (slider)
   - Default: Last 12 months
   - Impact: All visuals update

2. **Sales Segment** (buttons)
   - Enterprise / Mid-Market / All

3. **Region** (dropdown)
   - North America / Europe / APAC / Americas / All

4. **Sales Rep** (dropdown)
   - Individual reps or "All"

5. **Industry** (multi-select)
   - Select verticals to compare

---

## Mobile Optimization

- All pages responsive to phone/tablet
- Touch-friendly buttons
- Limited visuals per page for mobile

## Refresh Schedule

- **Development:** Manual refresh as data updates
- **Production:** Scheduled daily refresh (6am UTC)
- **Users:** View latest data each morning

---

**Last Updated:** 2024  
**Pages:** 5  
**Status:** Production Ready
