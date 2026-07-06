-- QUERY: Revenue Leakage Analysis
-- PURPOSE: Identify where revenue exits the sales funnel
-- TIME RANGE: Full dataset

SELECT 
  i.industry_name,
  r.rep_name,
  COUNT(*) as total_opps,
  COUNT(CASE WHEN o.is_won = 1 THEN 1 END) as won,
  COUNT(CASE WHEN o.is_lost = 1 THEN 1 END) as lost,
  COUNT(CASE WHEN o.is_won = 0 AND o.is_lost = 0 THEN 1 END) as stalled,
  ROUND(100.0 * COUNT(CASE WHEN o.is_won = 1 THEN 1 END) / COUNT(*), 1) as win_rate_pct,
  ROUND(100.0 * COUNT(CASE WHEN o.is_lost = 1 THEN 1 END) / COUNT(*), 1) as loss_rate_pct,
  SUM(o.opportunity_value_usd) as won_revenue,
  SUM(CASE WHEN o.is_won = 0 AND o.is_lost = 0 AND o.days_in_stage > 90 THEN o.weighted_pipeline_value ELSE 0 END) as at_risk_revenue,
  MAX(o.loss_reason) as top_loss_reason
FROM opportunities o
JOIN industries i ON o.industry_id = i.industry_id
JOIN sales_reps r ON o.sales_rep_id = r.sales_rep_id
GROUP BY o.industry_id, i.industry_name, o.sales_rep_id, r.rep_name
HAVING COUNT(*) >= 5
ORDER BY at_risk_revenue DESC;
