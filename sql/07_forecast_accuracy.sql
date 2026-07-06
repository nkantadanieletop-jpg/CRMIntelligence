-- QUERY: Forecast Accuracy Analysis
-- PURPOSE: Identify forecast reliability issues and systematic biases
-- TIME RANGE: Closed opportunities only

SELECT 
  r.rep_name,
  r.sales_segment,
  COUNT(*) as closed_opportunities,
  COUNT(CASE WHEN o.is_forecast_accurate = 1 THEN 1 END) as accurate_forecasts,
  ROUND(100.0 * COUNT(CASE WHEN o.is_forecast_accurate = 1 THEN 1 END) / COUNT(*), 1) as accuracy_rate_pct,
  ROUND(AVG(o.forecast_accuracy_variance_pct), 1) as avg_variance_pct,
  SUM(o.forecast_amount_usd) as total_forecast_value,
  SUM(CASE WHEN o.is_won = 1 THEN o.opportunity_value_usd ELSE 0 END) as actual_revenue,
  ROUND(SUM(o.forecast_amount_usd) - SUM(CASE WHEN o.is_won = 1 THEN o.opportunity_value_usd ELSE 0 END), 0) as forecast_variance_dollars,
  ROUND(100.0 * (SUM(o.forecast_amount_usd) - SUM(CASE WHEN o.is_won = 1 THEN o.opportunity_value_usd ELSE 0 END)) / NULLIF(SUM(CASE WHEN o.is_won = 1 THEN o.opportunity_value_usd ELSE 0 END), 0), 1) as forecast_variance_pct,
  RANK() OVER (ORDER BY COUNT(CASE WHEN o.is_forecast_accurate = 1 THEN 1 END) * 1.0 / COUNT(*) DESC) as accuracy_rank
FROM opportunities o
JOIN sales_reps r ON o.sales_rep_id = r.sales_rep_id
WHERE o.closed_date IS NOT NULL
GROUP BY o.sales_rep_id, r.rep_name, r.sales_segment
ORDER BY accuracy_rank;
