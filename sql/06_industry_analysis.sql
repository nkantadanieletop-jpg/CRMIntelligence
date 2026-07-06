-- QUERY: Industry Performance Analysis
-- PURPOSE: Identify high-performing and struggling verticals
-- TIME RANGE: Full dataset

SELECT 
  i.industry_name,
  i.target_market_segment,
  COUNT(DISTINCT o.account_id) as customer_count,
  COUNT(*) as total_opportunities,
  COUNT(CASE WHEN o.is_won = 1 THEN 1 END) as won_count,
  ROUND(100.0 * COUNT(CASE WHEN o.is_won = 1 THEN 1 END) / COUNT(*), 1) as win_rate_pct,
  COUNT(CASE WHEN o.is_lost = 1 THEN 1 END) as lost_count,
  SUM(CASE WHEN o.is_won = 1 THEN o.opportunity_value_usd ELSE 0 END) as total_revenue,
  ROUND(AVG(CASE WHEN o.is_won = 1 THEN o.opportunity_value_usd ELSE NULL END), 0) as avg_deal_size,
  ROUND(AVG(CASE WHEN o.is_won = 1 OR o.is_lost = 1 THEN o.sales_cycle_days END), 0) as avg_cycle_days,
  COUNT(CASE WHEN o.loss_reason = 'Competitor' THEN 1 END) as competitive_losses,
  ROUND(100.0 * COUNT(CASE WHEN o.loss_reason = 'Competitor' THEN 1 END) / NULLIF(COUNT(CASE WHEN o.is_lost = 1 THEN 1 END), 0), 1) as competitive_loss_rate_pct,
  ROUND(AVG(a.net_revenue_retention_pct), 1) as avg_customer_nrr_pct,
  RANK() OVER (ORDER BY COUNT(CASE WHEN o.is_won = 1 THEN 1 END) * ROUND(100.0 * COUNT(CASE WHEN o.is_won = 1 THEN 1 END) / COUNT(*), 1) DESC) as overall_rank
FROM opportunities o
JOIN industries i ON o.industry_id = i.industry_id
JOIN accounts a ON o.account_id = a.account_id
GROUP BY o.industry_id, i.industry_name, i.target_market_segment
ORDER BY overall_rank;
