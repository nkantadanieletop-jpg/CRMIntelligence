-- QUERY: Lead Source Analysis & ROI
-- PURPOSE: Evaluate channel productivity and deal quality by source
-- TIME RANGE: Full dataset

WITH channel_metrics AS (
  SELECT 
    ls.lead_source_id,
    ls.source_name,
    ls.source_type,
    COUNT(*) as total_activities,
    COUNT(CASE WHEN o.is_won = 1 THEN 1 END) as won_count,
    SUM(CASE WHEN o.is_won = 1 THEN o.opportunity_value_usd ELSE 0 END) as revenue_generated,
    AVG(CASE WHEN o.is_won = 1 THEN o.opportunity_value_usd ELSE NULL END) as avg_deal_size_won,
    AVG(CASE WHEN o.is_won = 1 OR o.is_lost = 1 THEN o.sales_cycle_days END) as avg_cycle_days,
    COUNT(CASE WHEN o.loss_reason = 'Competitor' THEN 1 END) as competitive_losses
  FROM opportunities o
  JOIN lead_sources ls ON o.lead_source_id = ls.lead_source_id
  GROUP BY ls.lead_source_id, ls.source_name, ls.source_type
)
SELECT 
  source_name,
  source_type,
  total_activities,
  won_count,
  ROUND(100.0 * won_count / total_activities, 1) as win_rate_pct,
  revenue_generated,
  ROUND(revenue_generated / total_activities, 0) as revenue_per_activity,
  ROUND(avg_deal_size_won, 0) as avg_deal_size,
  ROUND(avg_cycle_days, 0) as avg_cycle,
  ROUND(100.0 * competitive_losses / NULLIF(total_activities - won_count, 0), 1) as competitive_loss_rate_pct,
  RANK() OVER (ORDER BY revenue_generated / total_activities DESC) as roi_rank
FROM channel_metrics
ORDER BY roi_rank;
