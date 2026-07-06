-- ============================================================================
-- DataStream Analytics: SQL Analysis Scripts
-- ============================================================================
-- This folder contains production-ready SQL queries for commercial analysis
-- All queries assume standard SQL syntax (PostgreSQL, MySQL, SQL Server compatible)
-- ============================================================================

-- SCRIPT 1: Data Cleaning & Validation
-- PURPOSE: Identify data quality issues before analysis
-- OUTPUT: Quality report with issues and recommendations

SELECT 
  'Completeness Check' as check_type,
  COUNT(*) as total_records,
  COUNT(CASE WHEN opportunity_value_usd IS NULL THEN 1 END) as null_values,
  ROUND(100.0 * COUNT(CASE WHEN opportunity_value_usd IS NOT NULL THEN 1 END) / COUNT(*), 1) as completeness_pct
FROM opportunities
UNION ALL
SELECT 
  'Date Logic Check',
  COUNT(*),
  COUNT(CASE WHEN closed_date < created_date THEN 1 END),
  ROUND(100.0 * COUNT(CASE WHEN closed_date >= created_date OR closed_date IS NULL THEN 1 END) / COUNT(*), 1)
FROM opportunities
UNION ALL
SELECT 
  'Foreign Key Validation - sales_rep_id',
  COUNT(*),
  COUNT(CASE WHEN sales_rep_id NOT IN (SELECT sales_rep_id FROM sales_reps) THEN 1 END),
  ROUND(100.0 * COUNT(CASE WHEN sales_rep_id IN (SELECT sales_rep_id FROM sales_reps) THEN 1 END) / COUNT(*), 1)
FROM opportunities;

-- ============================================================================
-- SCRIPT 2: Sales Funnel Analysis
-- PURPOSE: Understand conversion rates stage-by-stage
-- OUTPUT: Funnel waterfall showing leakage at each stage

WITH funnel_analysis AS (
  SELECT 
    DENSE_RANK() OVER (ORDER BY stage_order) as stage_seq,
    p.stage_id,
    p.stage_name,
    COUNT(*) as opportunities_count,
    COUNT(CASE WHEN o.is_won = 1 THEN 1 END) as won_count,
    SUM(CASE WHEN o.is_won = 1 THEN o.opportunity_value_usd ELSE 0 END) as won_value,
    AVG(CASE WHEN o.is_won = 1 OR o.is_lost = 1 THEN o.sales_cycle_days END) as avg_cycle_days
  FROM opportunities o
  JOIN pipeline_stages p ON o.stage_id = p.stage_id
  GROUP BY p.stage_id, p.stage_name, p.stage_order
  ORDER BY p.stage_order
)
SELECT 
  stage_name,
  opportunities_count,
  won_count,
  ROUND(100.0 * won_count / opportunities_count, 1) as win_rate_pct,
  won_value,
  LAG(opportunities_count) OVER (ORDER BY stage_seq) - opportunities_count as dropped_from_prev,
  ROUND(100.0 * (LAG(opportunities_count) OVER (ORDER BY stage_seq) - opportunities_count) / LAG(opportunities_count) OVER (ORDER BY stage_seq), 1) as dropout_rate_pct,
  ROUND(avg_cycle_days, 0) as avg_cycle_days
FROM funnel_analysis
ORDER BY stage_seq;

-- ============================================================================
-- SCRIPT 3: Revenue Leakage Analysis
-- PURPOSE: Identify where revenue exits (lost deals, stalled deals)
-- OUTPUT: Waterfall showing revenue movement through pipeline

SELECT 
  'Pipeline Entry' as status,
  COUNT(*) as opportunity_count,
  SUM(opportunity_value_usd) as value,
  SUM(weighted_pipeline_value) as weighted_value,
  NULL as avg_days_in_stage
FROM opportunities
WHERE created_date IS NOT NULL
UNION ALL
SELECT 
  'Won - Closed',
  COUNT(*),
  SUM(opportunity_value_usd),
  SUM(opportunity_value_usd),
  AVG(sales_cycle_days)
FROM opportunities
WHERE is_won = 1
UNION ALL
SELECT 
  'Lost - Closed',
  COUNT(*),
  0,
  0,
  AVG(sales_cycle_days)
FROM opportunities
WHERE is_lost = 1
UNION ALL
SELECT 
  'Stalled >90 days',
  COUNT(*),
  0,
  SUM(weighted_pipeline_value),
  AVG(days_in_stage)
FROM opportunities
WHERE is_won = 0 AND is_lost = 0 AND days_in_stage > 90
UNION ALL
SELECT 
  'Open & Active',
  COUNT(*),
  0,
  SUM(weighted_pipeline_value),
  AVG(days_in_stage)
FROM opportunities
WHERE is_won = 0 AND is_lost = 0 AND days_in_stage <= 90
ORDER BY opportunity_count DESC;

-- ============================================================================
-- SCRIPT 4: Sales Rep Performance Benchmarking
-- PURPOSE: Identify top/bottom performers and performance drivers
-- OUTPUT: Rep leaderboard with win rates, cycles, discovery correlation

SELECT 
  r.rep_name,
  r.sales_segment,
  COUNT(*) as total_opportunities,
  COUNT(CASE WHEN o.is_won = 1 THEN 1 END) as won,
  COUNT(CASE WHEN o.is_lost = 1 THEN 1 END) as lost,
  ROUND(100.0 * COUNT(CASE WHEN o.is_won = 1 THEN 1 END) / COUNT(*), 1) as win_rate_pct,
  ROUND(100.0 * COUNT(CASE WHEN o.is_lost = 1 THEN 1 END) / COUNT(*), 1) as loss_rate_pct,
  ROUND(SUM(CASE WHEN o.is_won = 1 THEN o.opportunity_value_usd ELSE 0 END) / NULLIF(COUNT(CASE WHEN o.is_won = 1 THEN 1 END), 0), 0) as avg_deal_size,
  ROUND(AVG(CASE WHEN o.is_won = 1 OR o.is_lost = 1 THEN o.sales_cycle_days END), 0) as avg_cycle_days,
  ROUND(SUM(CASE WHEN o.is_won = 1 THEN o.opportunity_value_usd ELSE 0 END), 0) as total_revenue,
  RANK() OVER (PARTITION BY r.sales_segment ORDER BY COUNT(CASE WHEN o.is_won = 1 THEN 1 END) * ROUND(100.0 * COUNT(CASE WHEN o.is_won = 1 THEN 1 END) / COUNT(*), 1) DESC) as performance_rank
FROM opportunities o
JOIN sales_reps r ON o.sales_rep_id = r.sales_rep_id
WHERE r.sales_segment IN ('Enterprise', 'Mid-Market')
GROUP BY o.sales_rep_id, r.rep_name, r.sales_segment, r.tenure_months
ORDER BY r.sales_segment, performance_rank;

-- ============================================================================
-- SCRIPT 5: Lead Source Analysis
-- PURPOSE: Identify most productive channels (ROI, win rate, deal quality)
-- OUTPUT: Channel comparison with quality metrics

SELECT 
  ls.source_name,
  ls.source_type,
  COUNT(*) as total_opps,
  COUNT(CASE WHEN o.is_won = 1 THEN 1 END) as won_count,
  ROUND(100.0 * COUNT(CASE WHEN o.is_won = 1 THEN 1 END) / COUNT(*), 1) as win_rate_pct,
  ROUND(SUM(CASE WHEN o.is_won = 1 THEN o.opportunity_value_usd ELSE 0 END), 0) as total_revenue,
  ROUND(SUM(CASE WHEN o.is_won = 1 THEN o.opportunity_value_usd ELSE 0 END) / NULLIF(COUNT(*), 0), 0) as revenue_per_activity,
  ROUND(AVG(CASE WHEN o.is_won = 1 THEN o.opportunity_value_usd ELSE NULL END), 0) as avg_deal_size,
  ROUND(AVG(CASE WHEN o.is_won = 1 OR o.is_lost = 1 THEN o.sales_cycle_days END), 0) as avg_cycle_days,
  ROUND(100.0 * COUNT(CASE WHEN o.loss_reason = 'Competitor' THEN 1 END) / NULLIF(COUNT(CASE WHEN o.is_lost = 1 THEN 1 END), 0), 1) as competitive_loss_rate_pct
FROM opportunities o
JOIN lead_sources ls ON o.lead_source_id = ls.lead_source_id
GROUP BY o.lead_source_id, ls.source_name, ls.source_type
ORDER BY revenue_per_activity DESC;

-- ============================================================================
-- SCRIPT 6: Industry Performance Analysis
-- PURPOSE: Identify high-performing and struggling verticals
-- OUTPUT: Industry scorecard with win rates, cycles, retention

SELECT 
  i.industry_name,
  i.target_market_segment,
  COUNT(DISTINCT o.account_id) as customer_count,
  COUNT(*) as total_opportunities,
  COUNT(CASE WHEN o.is_won = 1 THEN 1 END) as won_count,
  ROUND(100.0 * COUNT(CASE WHEN o.is_won = 1 THEN 1 END) / COUNT(*), 1) as win_rate_pct,
  ROUND(100.0 * COUNT(CASE WHEN o.loss_reason = 'Competitor' THEN 1 END) / NULLIF(COUNT(CASE WHEN o.is_lost = 1 THEN 1 END), 0), 1) as competitive_loss_rate_pct,
  ROUND(SUM(CASE WHEN o.is_won = 1 THEN o.opportunity_value_usd ELSE 0 END), 0) as total_revenue,
  ROUND(AVG(CASE WHEN o.is_won = 1 THEN o.opportunity_value_usd ELSE NULL END), 0) as avg_deal_size,
  ROUND(AVG(CASE WHEN o.is_won = 1 OR o.is_lost = 1 THEN o.sales_cycle_days END), 0) as avg_cycle_days,
  ROUND(AVG(a.net_revenue_retention_pct), 1) as avg_nrr_pct
FROM opportunities o
JOIN industries i ON o.industry_id = i.industry_id
JOIN accounts a ON o.account_id = a.account_id
GROUP BY o.industry_id, i.industry_name, i.target_market_segment
ORDER BY win_rate_pct DESC;

-- ============================================================================
-- SCRIPT 7: Forecast Accuracy Analysis
-- PURPOSE: Identify forecast reliability issues by rep, stage, industry
-- OUTPUT: Forecast vs. actual comparison

SELECT 
  r.rep_name,
  COUNT(*) as opportunities,
  ROUND(AVG(o.forecast_accuracy_variance_pct), 1) as avg_variance_pct,
  COUNT(CASE WHEN o.is_forecast_accurate = 1 THEN 1 END) as accurate_count,
  ROUND(100.0 * COUNT(CASE WHEN o.is_forecast_accurate = 1 THEN 1 END) / COUNT(*), 1) as accuracy_rate_pct,
  SUM(o.forecast_amount_usd) as total_forecast,
  SUM(CASE WHEN o.is_won = 1 THEN o.opportunity_value_usd ELSE 0 END) as actual_revenue,
  ROUND(SUM(o.forecast_amount_usd) - SUM(CASE WHEN o.is_won = 1 THEN o.opportunity_value_usd ELSE 0 END), 0) as forecast_variance_amount,
  ROUND(100.0 * (SUM(o.forecast_amount_usd) - SUM(CASE WHEN o.is_won = 1 THEN o.opportunity_value_usd ELSE 0 END)) / NULLIF(SUM(CASE WHEN o.is_won = 1 THEN o.opportunity_value_usd ELSE 0 END), 0), 1) as forecast_variance_pct
FROM opportunities o
JOIN sales_reps r ON o.sales_rep_id = r.sales_rep_id
WHERE closed_date IS NOT NULL
GROUP BY o.sales_rep_id, r.rep_name
ORDER BY accuracy_rate_pct DESC;

-- ============================================================================
-- SCRIPT 8: Opportunity Aging & At-Risk Revenue
-- PURPOSE: Identify stalled deals that need intervention
-- OUTPUT: Deals stuck >90 days with financial impact

SELECT 
  a.company_name,
  r.rep_name,
  i.industry_name,
  p.stage_name,
  o.opportunity_value_usd,
  o.weighted_pipeline_value,
  o.days_in_stage,
  CASE 
    WHEN o.days_in_stage > 180 THEN 'Critical (>6mo)'
    WHEN o.days_in_stage > 120 THEN 'High (>4mo)'
    WHEN o.days_in_stage > 90 THEN 'Medium (>3mo)'
    ELSE 'Watch (60-90 days)'
  END as risk_category,
  o.created_date,
  DATEDIFF(DAY, o.created_date, GETDATE()) as total_days_open
FROM opportunities o
JOIN accounts a ON o.account_id = a.account_id
JOIN sales_reps r ON o.sales_rep_id = r.sales_rep_id
JOIN industries i ON o.industry_id = i.industry_id
JOIN pipeline_stages p ON o.stage_id = p.stage_id
WHERE o.is_won = 0 AND o.is_lost = 0 AND o.days_in_stage > 90
ORDER BY o.weighted_pipeline_value DESC, o.days_in_stage DESC;

-- ============================================================================
-- KEY FINDINGS QUERIES (Copy-paste ready)
-- ============================================================================

-- Find proposal template impact
SELECT 
  proposal_template_version,
  COUNT(*) as total,
  COUNT(CASE WHEN is_won = 1 THEN 1 END) as won,
  ROUND(100.0 * COUNT(CASE WHEN is_won = 1 THEN 1 END) / COUNT(*), 1) as win_rate
FROM opportunities
WHERE stage_id = 5
GROUP BY proposal_template_version;

-- Find discovery call impact (top vs bottom performers)
SELECT 
  CASE WHEN sales_rep_id IN (1, 2) THEN 'Top Performers' ELSE 'Other' END as rep_group,
  COUNT(*) as opps,
  ROUND(100.0 * COUNT(CASE WHEN is_won = 1 THEN 1 END) / COUNT(*), 1) as win_rate,
  ROUND(100.0 * COUNT(CASE WHEN loss_reason = 'Competitor' THEN 1 END) / NULLIF(COUNT(CASE WHEN is_lost = 1 THEN 1 END), 0), 1) as competitive_loss_rate
FROM opportunities
GROUP BY rep_group;

-- Revenue at-risk summary
SELECT 
  SUM(weighted_pipeline_value) as total_at_risk,
  COUNT(*) as deal_count,
  ROUND(AVG(days_in_stage), 0) as avg_days_stalled,
  MIN(days_in_stage) as days_stalled_min,
  MAX(days_in_stage) as days_stalled_max
FROM opportunities
WHERE is_won = 0 AND is_lost = 0 AND days_in_stage > 90;

-- ============================================================================
-- END OF SQL ANALYSIS SCRIPTS
-- ============================================================================
