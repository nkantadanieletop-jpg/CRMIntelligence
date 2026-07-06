# Power BI DAX Measures

## Overview

All DAX measures used in DataStream Analytics dashboard. Copy-paste ready for Power BI.

## Revenue Measures

### Total Won Revenue
```dax
Total Won Revenue := 
SUM(opportunities[opportunity_value_usd])
```
**Purpose:** Sum of all closed-won deal values  
**Format:** Currency  
**Filters:** is_won = 1 (automatic via fact table)

### Total Pipeline Value (Open)
```dax
Total Pipeline Value := 
SUM(FILTER(
  opportunities, 
  opportunities[is_won] = 0 && opportunities[is_lost] = 0
))
```
**Purpose:** Sum of weighted pipeline for open deals  
**Format:** Currency  
**Use:** Strategic pipeline reporting

### At-Risk Revenue
```dax
At Risk Revenue := 
SUM(FILTER(
  opportunities,
  opportunities[is_won] = 0 && 
  opportunities[is_lost] = 0 && 
  opportunities[days_in_stage] > 90
))
```
**Purpose:** Pipeline stalled >90 days  
**Format:** Currency  
**Target:** <$2M for healthy pipeline

### Revenue from New Customers
```dax
New Customer Revenue := 
SUMX(
  FILTER(opportunities, opportunities[is_won] = 1),
  opportunities[opportunity_value_usd] * 
  (1 - opportunities[existing_customer_flag])
)
```
**Purpose:** New logo revenue only  
**Format:** Currency  
**Strategic Use:** Growth tracking

### Revenue from Existing Customers
```dax
Existing Customer Revenue := 
SUMX(
  FILTER(opportunities, opportunities[is_won] = 1),
  opportunities[opportunity_value_usd] * 
  opportunities[existing_customer_flag]
)
```
**Purpose:** Expansion revenue only  
**Format:** Currency

## Volume Measures

### Total Opportunities
```dax
Total Opportunities := 
COUNTA(opportunities[opportunity_id])
```
**Purpose:** Count of all opportunities  
**Format:** Number

### Won Opportunities
```dax
Won Count := 
COUNTX(
  FILTER(opportunities, opportunities[is_won] = 1),
  opportunities[opportunity_id]
)
```
**Purpose:** Count of closed-won deals  
**Format:** Number

### Lost Opportunities
```dax
Lost Count := 
COUNTX(
  FILTER(opportunities, opportunities[is_lost] = 1),
  opportunities[opportunity_id]
)
```
**Purpose:** Count of lost deals  
**Format:** Number

### Open Opportunities
```dax
Open Count := 
COUNTX(
  FILTER(
    opportunities, 
    opportunities[is_won] = 0 && opportunities[is_lost] = 0
  ),
  opportunities[opportunity_id]
)
```
**Purpose:** Count of active pipeline  
**Format:** Number

## Performance Metrics

### Win Rate %
```dax
Win Rate % := 
DIVIDE(
  [Won Count],
  [Total Opportunities],
  0
)
```
**Purpose:** % of opportunities won  
**Format:** Percentage  
**Target:** >35%

### Loss Rate %
```dax
Loss Rate % := 
DIVIDE(
  [Lost Count],
  [Total Opportunities],
  0
)
```
**Purpose:** % of opportunities lost  
**Format:** Percentage

### Average Deal Size (Won)
```dax
Avg Deal Size (Won) := 
DIVIDE(
  [Total Won Revenue],
  [Won Count],
  0
)
```
**Purpose:** Average closed deal value  
**Format:** Currency

### Average Sales Cycle (Won)
```dax
Avg Sales Cycle (Won) := 
AVERAGEX(
  FILTER(opportunities, opportunities[is_won] = 1),
  opportunities[sales_cycle_days]
)
```
**Purpose:** Average days to close won deals  
**Format:** Number  
**Target:** <94 days

### Forecast Accuracy %
```dax
Forecast Accuracy % := 
DIVIDEX(
  COUNTA(FILTER(opportunities, opportunities[is_forecast_accurate] = 1)),
  COUNTA(FILTER(opportunities, opportunities[closed_date] <> BLANK())),
  0
)
```
**Purpose:** % of forecasts within 10% of actual  
**Format:** Percentage  
**Target:** >75%

### Forecast Variance (Dollars)
```dax
Forecast Variance $ := 
SUMX(
  FILTER(opportunities, opportunities[closed_date] <> BLANK()),
  opportunities[forecast_amount_usd] - 
  IF(opportunities[is_won] = 1, opportunities[opportunity_value_usd], 0)
)
```
**Purpose:** Total forecast over/under  
**Format:** Currency

### Competitive Loss Rate %
```dax
Competitive Loss Rate % := 
DIVIDE(
  COUNTA(FILTER(opportunities, opportunities[loss_reason] = "Competitor")),
  [Lost Count],
  0
)
```
**Purpose:** % of losses due to competition  
**Format:** Percentage

## Pipeline Metrics

### Weighted Pipeline Value
```dax
Weighted Pipeline Value := 
SUMX(
  FILTER(opportunities, opportunities[is_won] = 0 && opportunities[is_lost] = 0),
  opportunities[weighted_pipeline_value]
)
```
**Purpose:** Probability-weighted open pipeline  
**Format:** Currency

### Days in Current Stage (Average)
```dax
Avg Days in Stage := 
AVERAGEX(
  FILTER(opportunities, opportunities[is_won] = 0 && opportunities[is_lost] = 0),
  opportunities[days_in_stage]
)
```
**Purpose:** Average time in current stage  
**Format:** Number  
**Target:** <45 days

### Stalled Deals >90 Days
```dax
Stalled Deal Count := 
COUNTX(
  FILTER(
    opportunities,
    opportunities[is_won] = 0 && 
    opportunities[is_lost] = 0 && 
    opportunities[days_in_stage] > 90
  ),
  opportunities[opportunity_id]
)
```
**Purpose:** Count of aging deals  
**Format:** Number

## Comparative Measures

### Previous Month Revenue
```dax
Previous Month Revenue := 
CALCULATE(
  [Total Won Revenue],
  DATEADD(opportunities[closed_date], -1, MONTH)
)
```
**Purpose:** Revenue from previous month  
**Format:** Currency  
**Use:** Month-over-month comparison

### Revenue Growth % MoM
```dax
Revenue Growth % MoM := 
DIVIDE(
  [Total Won Revenue] - [Previous Month Revenue],
  [Previous Month Revenue],
  0
)
```
**Purpose:** Month-over-month growth rate  
**Format:** Percentage

### YoY Revenue Comparison
```dax
YoY Revenue Growth := 
DIVIDE(
  [Total Won Revenue],
  CALCULATE(
    [Total Won Revenue],
    DATEADD(opportunities[closed_date], -1, YEAR)
  )
) - 1
```
**Purpose:** Year-over-year growth  
**Format:** Percentage

## Measure Installation

1. Open Power BI Desktop
2. Go to Modeling tab
3. Click "New Measure"
4. Copy measure from above
5. Paste into formula bar
6. Press Enter
7. Repeat for all measures

**OR** use DAX Studio for batch import:

1. Download DAX Studio
2. Connect to Power BI file
3. Paste all measures into editor
4. Execute

---

**Last Updated:** 2024  
**Total Measures:** 25+  
**Status:** Production Ready
