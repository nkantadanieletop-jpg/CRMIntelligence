-- QUERY: Opportunity Aging Analysis
-- PURPOSE: Identify stalled deals requiring sales intervention
-- TIME RANGE: Open opportunities only

SELECT 
  a.company_name,
  a.industry_id,
  i.industry_name,
  r.rep_name,
  o.opportunity_value_usd,
  o.weighted_pipeline_value,
  p.stage_name,
  o.days_in_stage,
  CASE 
    WHEN o.days_in_stage > 180 THEN 'CRITICAL: 6+ months stalled'
    WHEN o.days_in_stage > 120 THEN 'HIGH: 4+ months stalled'
    WHEN o.days_in_stage > 90 THEN 'MEDIUM: 3+ months stalled'
    ELSE 'WATCH: 60-90 days'
  END as intervention_needed,
  DATEDIFF(DAY, o.created_date, GETDATE()) as total_days_open,
  o.created_date,
  o.stage_entry_date
FROM opportunities o
JOIN accounts a ON o.account_id = a.account_id
JOIN industries i ON o.industry_id = i.industry_id
JOIN sales_reps r ON o.sales_rep_id = r.sales_rep_id
JOIN pipeline_stages p ON o.stage_id = p.stage_id
WHERE o.is_won = 0 AND o.is_lost = 0 AND o.days_in_stage > 90
ORDER BY o.weighted_pipeline_value DESC, o.days_in_stage DESC;
