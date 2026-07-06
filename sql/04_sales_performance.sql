-- QUERY: Sales Rep Performance Benchmarking
-- PURPOSE: Compare rep performance and identify top/bottom performers
-- TIME RANGE: Full dataset

SELECT 
  r.rep_name,
  r.sales_segment,
  r.tenure_months,
  r.quota_amount,
  COUNT(*) as opps_owned,
  COUNT(CASE WHEN o.is_won = 1 THEN 1 END) as won_count,
  ROUND(100.0 * COUNT(CASE WHEN o.is_won = 1 THEN 1 END) / COUNT(*), 1) as win_rate_pct,
  COUNT(CASE WHEN o.is_lost = 1 THEN 1 END) as lost_count,
  SUM(CASE WHEN o.is_won = 1 THEN o.opportunity_value_usd ELSE 0 END) as revenue_generated,
  ROUND(SUM(CASE WHEN o.is_won = 1 THEN o.opportunity_value_usd ELSE 0 END) / r.quota_amount, 2) as quota_achievement,
  ROUND(AVG(CASE WHEN o.is_won = 1 OR o.is_lost = 1 THEN o.sales_cycle_days END), 0) as avg_cycle_days,
  ROUND(AVG(o.forecast_accuracy_variance_pct), 1) as avg_forecast_variance_pct,
  COUNT(CASE WHEN o.loss_reason = 'Competitor' THEN 1 END) as competitive_losses,
  ROUND(100.0 * COUNT(CASE WHEN o.loss_reason = 'Competitor' THEN 1 END) / NULLIF(COUNT(CASE WHEN o.is_lost = 1 THEN 1 END), 0), 1) as competitive_loss_rate_pct,
  RANK() OVER (PARTITION BY r.sales_segment ORDER BY COUNT(CASE WHEN o.is_won = 1 THEN 1 END) DESC) as segment_rank
FROM opportunities o
JOIN sales_reps r ON o.sales_rep_id = r.sales_rep_id
WHERE r.sales_segment IN ('Enterprise', 'Mid-Market')
GROUP BY r.sales_rep_id, r.rep_name, r.sales_segment, r.tenure_months, r.quota_amount
ORDER BY r.sales_segment, segment_rank;
