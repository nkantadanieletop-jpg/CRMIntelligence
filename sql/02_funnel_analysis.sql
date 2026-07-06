-- QUERY: Sales Funnel Analysis
-- PURPOSE: Stage-by-stage conversion analysis
-- TIME RANGE: Full dataset (Jan 2022 - Dec 2023)

WITH funnel_data AS (
  SELECT 
    p.stage_order,
    p.stage_name,
    COUNT(*) as stage_count,
    COUNT(CASE WHEN o.is_won = 1 THEN 1 END) as won_from_stage,
    COUNT(CASE WHEN o.is_lost = 1 THEN 1 END) as lost_from_stage,
    SUM(o.opportunity_value_usd) as stage_revenue,
    SUM(CASE WHEN o.is_won = 0 AND o.is_lost = 0 THEN o.weighted_pipeline_value ELSE 0 END) as stage_pipeline,
    ROUND(AVG(CASE WHEN o.is_won = 1 OR o.is_lost = 1 THEN o.sales_cycle_days END), 0) as avg_cycle_days
  FROM opportunities o
  LEFT JOIN pipeline_stages p ON o.stage_id = p.stage_id
  GROUP BY p.stage_order, p.stage_name
)
SELECT 
  stage_name,
  stage_count as opportunities_in_stage,
  won_from_stage as won_count,
  ROUND(100.0 * won_from_stage / stage_count, 1) as conversion_rate_pct,
  lost_from_stage as lost_count,
  ROUND(100.0 * lost_from_stage / NULLIF(stage_count, 0), 1) as loss_rate_pct,
  stage_revenue,
  stage_pipeline,
  LAG(stage_count) OVER (ORDER BY stage_order) - stage_count as pipeline_dropout,
  ROUND(100.0 * (LAG(stage_count) OVER (ORDER BY stage_order) - stage_count) / LAG(stage_count) OVER (ORDER BY stage_order), 1) as dropout_pct,
  avg_cycle_days
FROM funnel_data
ORDER BY stage_order;
