/**
 * app.js — DataStream Analytics Revenue Operations Dashboard
 *
 * Everything on this page is computed from the CSVs in ./data at load time.
 * There are no hardcoded metrics: KPIs, charts, the leaderboard, and the
 * insight sentences are all derived from the currently filtered opportunity
 * set. The CSV schema is read by header name (via csv.js), so column order
 * in the source files does not matter.
 */

(function () {
  "use strict";

  const DATA_DIR = "data/";

  const FILES = {
    opportunities: "opportunities.csv",
    accounts: "accounts.csv",
    industries: "industries.csv",
    regions: "regions.csv",
    leadSources: "lead_sources.csv",
    salesReps: "sales_reps.csv",
    stages: "pipeline_stages.csv",
  };

  // ---------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------

  const $ = (sel) => document.querySelector(sel);
  const $all = (sel) => Array.from(document.querySelectorAll(sel));

  const num = (v, fallback = 0) => {
    if (v === null || v === undefined || v === "") return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const bool01 = (v) => num(v, 0) === 1;

  const fmtUSD = (n, opts = {}) => {
    if (!Number.isFinite(n)) return "—";
    const { compact = true } = opts;
    if (compact) {
      const abs = Math.abs(n);
      if (abs >= 1_000_000) return "$" + (n / 1_000_000).toFixed(2) + "M";
      if (abs >= 1_000) return "$" + (n / 1_000).toFixed(1) + "K";
    }
    return "$" + Math.round(n).toLocaleString("en-US");
  };

  const fmtNum = (n) => (Number.isFinite(n) ? Math.round(n).toLocaleString("en-US") : "—");
  const fmtPct = (n, digits = 1) => (Number.isFinite(n) ? n.toFixed(digits) + "%" : "—");
  const fmtDate = (d) => {
    if (!d) return "—";
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  function indexBy(rows, key) {
    const map = new Map();
    rows.forEach((r) => map.set(String(r[key]), r));
    return map;
  }

  function groupSum(rows, keyFn, valueFn) {
    const map = new Map();
    rows.forEach((r) => {
      const k = keyFn(r);
      const v = valueFn(r);
      map.set(k, (map.get(k) || 0) + v);
    });
    return map;
  }

  // ---------------------------------------------------------------------
  // Design tokens for charts (kept in sync with style.css palette)
  // ---------------------------------------------------------------------

  const PALETTE = {
    ink: "#101827",
    slate: "#48546b",
    muted: "#8b96ab",
    grid: "#e6e9f0",
    accent: "#c46b3e", // clay
    accent2: "#2f6f5e", // deep teal
    gold: "#c9a24b",
    series: ["#2f6f5e", "#c46b3e", "#3a5a8c", "#c9a24b", "#8a4f6b", "#5b7553", "#9c5b3c", "#3f7f8f"],
  };

  Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
  Chart.defaults.color = PALETTE.slate;
  Chart.defaults.borderColor = PALETTE.grid;

  // ---------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------

  const state = {
    raw: null, // joined, enriched opportunity rows (immutable after load)
    filtered: [], // after global filter bar
    filters: { region: "", industry: "", source: "", rep: "" },
    charts: {},
    explorer: { page: 1, pageSize: 15, sort: "value_desc", search: "", stage: "", outcome: "" },
    stageOrder: [], // [{id, name, order, weight}]
  };

  // ---------------------------------------------------------------------
  // Data loading + join
  // ---------------------------------------------------------------------

  async function loadAll() {
    const entries = Object.entries(FILES);
    const results = await Promise.all(
      entries.map(([, filename]) => CSVUtil.fetchCSV(DATA_DIR + filename))
    );
    const dataset = {};
    entries.forEach(([key], i) => (dataset[key] = results[i]));
    return dataset;
  }

  function buildJoinedOpportunities(ds) {
    const accountsById = indexBy(ds.accounts, "account_id");
    const industriesById = indexBy(ds.industries, "industry_id");
    const regionsById = indexBy(ds.regions, "region_id");
    const sourcesById = indexBy(ds.leadSources, "lead_source_id");
    const repsById = indexBy(ds.salesReps, "sales_rep_id");
    const stagesById = indexBy(ds.stages, "stage_id");

    const joined = ds.opportunities.map((o) => {
      const account = accountsById.get(String(o.account_id));
      // NOTE: opportunities.csv carries its own industry_id / region_id columns,
      // but every row in the source file resolves to the same value (id "1").
      // The account record for each opportunity carries the real, correctly
      // distributed industry/region, so we derive industry and region from
      // the joined account rather than the opportunity's own (flat) columns.
      const industryIdForJoin = account ? account.industry_id : o.industry_id;
      const regionIdForJoin = account ? account.region_id : o.region_id;
      const industry = industriesById.get(String(industryIdForJoin));
      const region = regionsById.get(String(regionIdForJoin));
      const source = sourcesById.get(String(o.lead_source_id));
      const rep = repsById.get(String(o.sales_rep_id));
      const stage = stagesById.get(String(o.stage_id));

      const isWon = bool01(o.is_won);
      const isLost = bool01(o.is_lost);
      const isOpen = !isWon && !isLost;

      return {
        id: o.opportunity_id,
        accountId: o.account_id,
        accountName: account ? account.company_name : `Account ${o.account_id}`,
        companySize: account ? account.company_size : "",
        repId: o.sales_rep_id,
        repName: rep ? rep.rep_name : `Rep ${o.sales_rep_id}`,
        repSegment: rep ? rep.sales_segment : "",
        repQuota: rep ? num(rep.quota_amount) : 0,
        stageId: o.stage_id,
        stageName: stage ? stage.stage_name : `Stage ${o.stage_id}`,
        stageOrder: stage ? num(stage.stage_order) : num(o.stage_id),
        stageWeightPct: stage ? num(stage.stage_weight_pct) : 0,
        industryId: industryIdForJoin,
        industryName: industry ? industry.industry_name : `Industry ${industryIdForJoin}`,
        sector: industry ? industry.sector : "",
        regionId: regionIdForJoin,
        regionName: region ? region.region_name : `Region ${regionIdForJoin}`,
        sourceId: o.lead_source_id,
        sourceName: source ? source.source_name : `Source ${o.lead_source_id}`,
        sourceType: source ? source.source_type : "",
        value: num(o.opportunity_value_usd),
        weightedValue: num(o.weighted_pipeline_value),
        createdDate: o.created_date,
        stageEntryDate: o.stage_entry_date,
        stageExitDate: o.stage_exit_date,
        closedDate: o.closed_date,
        isWon,
        isLost,
        isOpen,
        lossReason: o.loss_reason,
        daysInStage: num(o.days_in_stage),
        daysToClose: num(o.days_to_close),
        salesCycleDays: num(o.sales_cycle_days),
        forecastAmount: num(o.forecast_amount_usd),
        forecastStage: o.forecast_stage,
        isForecastAccurate: bool01(o.is_forecast_accurate),
      };
    });

    return joined;
  }

  // ---------------------------------------------------------------------
  // Filtering
  // ---------------------------------------------------------------------

  function applyGlobalFilters() {
    const { region, industry, source, rep } = state.filters;
    state.filtered = state.raw.filter((o) => {
      if (region && o.regionName !== region) return false;
      if (industry && o.industryName !== industry) return false;
      if (source && o.sourceName !== source) return false;
      if (rep && o.repName !== rep) return false;
      return true;
    });
  }

  function populateFilterOptions() {
    const uniq = (fn) => Array.from(new Set(state.raw.map(fn))).filter(Boolean).sort();

    fillSelect($("#filterRegion"), uniq((o) => o.regionName), "All regions");
    fillSelect($("#filterIndustry"), uniq((o) => o.industryName), "All industries");
    fillSelect($("#filterSource"), uniq((o) => o.sourceName), "All sources");
    fillSelect($("#filterRep"), uniq((o) => o.repName), "All reps");

    const stageNames = state.stageOrder.map((s) => s.name);
    fillSelect($("#explorerStageFilter"), stageNames, "All stages");
  }

  function fillSelect(selectEl, values, placeholder) {
    const current = selectEl.value;
    selectEl.innerHTML = "";
    const optAll = document.createElement("option");
    optAll.value = "";
    optAll.textContent = placeholder;
    selectEl.appendChild(optAll);
    values.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      selectEl.appendChild(opt);
    });
    if (values.includes(current)) selectEl.value = current;
  }

  function wireFilterEvents() {
    $("#filterRegion").addEventListener("change", (e) => {
      state.filters.region = e.target.value;
      onFiltersChanged();
    });
    $("#filterIndustry").addEventListener("change", (e) => {
      state.filters.industry = e.target.value;
      onFiltersChanged();
    });
    $("#filterSource").addEventListener("change", (e) => {
      state.filters.source = e.target.value;
      onFiltersChanged();
    });
    $("#filterRep").addEventListener("change", (e) => {
      state.filters.rep = e.target.value;
      onFiltersChanged();
    });
    $("#resetFilters").addEventListener("click", () => {
      state.filters = { region: "", industry: "", source: "", rep: "" };
      ["#filterRegion", "#filterIndustry", "#filterSource", "#filterRep"].forEach((sel) => {
        $(sel).value = "";
      });
      onFiltersChanged();
    });
  }

  function onFiltersChanged() {
    applyGlobalFilters();
    updateFilterStatus();
    renderAll();
  }

  function updateFilterStatus() {
    const active = Object.values(state.filters).filter(Boolean).length;
    const el = $("#filterStatus");
    if (active === 0) {
      el.textContent = `Showing all ${fmtNum(state.raw.length)} opportunities`;
    } else {
      el.textContent = `${fmtNum(state.filtered.length)} of ${fmtNum(state.raw.length)} opportunities match ${active} filter${active > 1 ? "s" : ""}`;
    }
  }

  // ---------------------------------------------------------------------
  // KPI computation
  // ---------------------------------------------------------------------

  function computeKPIs(rows) {
    const total = rows.length;
    const won = rows.filter((o) => o.isWon);
    const lost = rows.filter((o) => o.isLost);
    const open = rows.filter((o) => o.isOpen);

    const openPipelineValue = open.reduce((s, o) => s + o.value, 0);
    const closedWonRevenue = won.reduce((s, o) => s + o.value, 0);
    const decided = won.length + lost.length;
    const winRate = decided > 0 ? (won.length / decided) * 100 : 0;
    const avgDealSize = won.length > 0 ? closedWonRevenue / won.length : 0;
    const avgCycle = won.length > 0 ? won.reduce((s, o) => s + o.salesCycleDays, 0) / won.length : 0;
    const weightedOpenPipeline = open.reduce((s, o) => s + o.weightedValue, 0);

    return {
      total,
      wonCount: won.length,
      lostCount: lost.length,
      openCount: open.length,
      openPipelineValue,
      weightedOpenPipeline,
      closedWonRevenue,
      winRate,
      avgDealSize,
      avgCycle,
    };
  }

  function renderKPIs(k) {
    const cards = [
      {
        label: "Total opportunities",
        value: fmtNum(k.total),
        sub: `${fmtNum(k.openCount)} open · ${fmtNum(k.wonCount)} won · ${fmtNum(k.lostCount)} lost`,
        accent: "neutral",
      },
      {
        label: "Open pipeline",
        value: fmtUSD(k.openPipelineValue),
        sub: `${fmtUSD(k.weightedOpenPipeline)} weighted by stage`,
        accent: "amber",
      },
      {
        label: "Closed-won revenue",
        value: fmtUSD(k.closedWonRevenue),
        sub: `${fmtNum(k.wonCount)} deals closed won`,
        accent: "teal",
      },
      {
        label: "Win rate",
        value: fmtPct(k.winRate),
        sub: `of ${fmtNum(k.wonCount + k.lostCount)} decided opportunities`,
        accent: k.winRate >= 40 ? "teal" : "clay",
      },
      {
        label: "Average deal size",
        value: fmtUSD(k.avgDealSize),
        sub: "mean value of closed-won deals",
        accent: "neutral",
      },
      {
        label: "Average sales cycle",
        value: Number.isFinite(k.avgCycle) ? `${k.avgCycle.toFixed(0)} days` : "—",
        sub: "create-to-close, won deals",
        accent: "neutral",
      },
    ];

    $("#kpiGrid").innerHTML = cards
      .map(
        (c) => `
      <div class="kpi-card kpi-${c.accent}">
        <span class="kpi-label">${c.label}</span>
        <span class="kpi-value">${c.value}</span>
        <span class="kpi-sub">${c.sub}</span>
      </div>`
      )
      .join("");
  }

  // ---------------------------------------------------------------------
  // Charts
  // ---------------------------------------------------------------------

  function destroyChart(key) {
    if (state.charts[key]) {
      state.charts[key].destroy();
      delete state.charts[key];
    }
  }

  function renderFunnelChart(rows) {
    const byStage = new Map(state.stageOrder.map((s) => [s.name, 0]));
    rows.forEach((o) => {
      byStage.set(o.stageName, (byStage.get(o.stageName) || 0) + 1);
    });
    const labels = state.stageOrder.map((s) => s.name);
    const data = labels.map((l) => byStage.get(l) || 0);
    const maxVal = Math.max(...data, 1);

    destroyChart("funnel");
    const ctx = $("#funnelChart");
    state.charts.funnel = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Opportunities",
            data,
            backgroundColor: labels.map((_, i) => PALETTE.series[i % PALETTE.series.length]),
            borderRadius: 6,
            maxBarThickness: 46,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${fmtNum(ctx.raw)} opportunities`,
            },
          },
        },
        scales: {
          x: { beginAtZero: true, max: maxVal * 1.1, grid: { color: PALETTE.grid }, ticks: { precision: 0 } },
          y: { grid: { display: false } },
        },
      },
    });
  }

  function renderStageRevenueChart(rows) {
    const openByStage = new Map(state.stageOrder.map((s) => [s.name, 0]));
    const wonByStage = new Map(state.stageOrder.map((s) => [s.name, 0]));
    rows.forEach((o) => {
      if (o.isOpen) openByStage.set(o.stageName, (openByStage.get(o.stageName) || 0) + o.value);
      if (o.isWon) wonByStage.set(o.stageName, (wonByStage.get(o.stageName) || 0) + o.value);
    });
    const labels = state.stageOrder.map((s) => {
  const map = {
    "Lead": "Lead",
    "Qualified Lead": "Qual.",
    "Opportunity": "Opp.",
    "Demo": "Demo",
    "Proposal": "Prop.",
    "Negotiation": "Neg.",
    "Close": "Close"
  };

  return map[s.name] || s.name;
});

    destroyChart("stageRevenue");
    const ctx = $("#stageRevenueChart");
    state.charts.stageRevenue = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Open value",
            data: labels.map((l) => openByStage.get(l) || 0),
            backgroundColor: PALETTE.gold,
            borderRadius: 4,
            stack: "rev",
          },
          {
            label: "Closed-won value",
            data: labels.map((l) => wonByStage.get(l) || 0),
            backgroundColor: PALETTE.accent2,
            borderRadius: 4,
            stack: "rev",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { boxWidth: 12, padding: 16 } },
          tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmtUSD(ctx.raw)}` } },
        },
        scales: {
          x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: false, font: { size: 11 } } },
          y: { grid: { color: PALETTE.grid }, ticks: { callback: (v) => fmtUSD(v) } },
        },
      },
    });
  }

  function renderBreakdownChart(canvasId, chartKey, rows, keyFn) {
    const wonMap = groupSum(
      rows.filter((o) => o.isWon),
      keyFn,
      (o) => o.value
    );
    const sorted = Array.from(wonMap.entries()).sort((a, b) => b[1] - a[1]);
    const labels = sorted.map((s) => s[0]);
    const data = sorted.map((s) => s[1]);

    destroyChart(chartKey);
    const ctx = $(canvasId);
    state.charts[chartKey] = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Closed-won revenue",
            data,
            backgroundColor: labels.map((_, i) => PALETTE.series[i % PALETTE.series.length]),
            borderRadius: 6,
            maxBarThickness: 40,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => fmtUSD(ctx.raw) } },
        },
        scales: {
          x: { grid: { color: PALETTE.grid }, ticks: { callback: (v) => fmtUSD(v) } },
          y: { grid: { display: false } },
        },
      },
    });
  }

  function renderSourceChart(rows) {
    const bySource = new Map();
    rows.forEach((o) => {
      if (!bySource.has(o.sourceName)) bySource.set(o.sourceName, { won: 0, lost: 0, revenue: 0 });
      const entry = bySource.get(o.sourceName);
      if (o.isWon) {
        entry.won += 1;
        entry.revenue += o.value;
      }
      if (o.isLost) entry.lost += 1;
    });
    const labels = Array.from(bySource.keys()).sort((a, b) => bySource.get(b).revenue - bySource.get(a).revenue);
    const revenue = labels.map((l) => bySource.get(l).revenue);
    const winRate = labels.map((l) => {
      const e = bySource.get(l);
      const decided = e.won + e.lost;
      return decided > 0 ? (e.won / decided) * 100 : 0;
    });

    destroyChart("source");
    const ctx = $("#sourceChart");
    state.charts.source = new Chart(ctx, {
      data: {
        labels,
        datasets: [
          {
            type: "bar",
            label: "Closed-won revenue",
            data: revenue,
            backgroundColor: PALETTE.accent,
            borderRadius: 6,
            yAxisID: "y",
            order: 2,
          },
          {
            type: "line",
            label: "Win rate",
            data: winRate,
            borderColor: PALETTE.ink,
            backgroundColor: PALETTE.ink,
            yAxisID: "y1",
            tension: 0.35,
            pointRadius: 4,
            pointBackgroundColor: PALETTE.ink,
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { boxWidth: 12, padding: 16 } },
          tooltip: {
            callbacks: {
              label: (ctx) =>
                ctx.dataset.label === "Win rate"
                  ? `Win rate: ${ctx.raw.toFixed(1)}%`
                  : `Closed-won revenue: ${fmtUSD(ctx.raw)}`,
            },
          },
        },
        scales: {
          x: { grid: { display: false } },
          y: { position: "left", grid: { color: PALETTE.grid }, ticks: { callback: (v) => fmtUSD(v) } },
          y1: {
            position: "right",
            grid: { display: false },
            min: 0,
            max: 100,
            ticks: { callback: (v) => v + "%" },
          },
        },
      },
    });
  }

  // ---------------------------------------------------------------------
  // Leaderboard
  // ---------------------------------------------------------------------

  function renderLeaderboard(rows) {
    const byRep = new Map();
    rows.forEach((o) => {
      if (!byRep.has(o.repId)) {
        byRep.set(o.repId, {
          name: o.repName,
          segment: o.repSegment,
          quota: o.repQuota,
          won: 0,
          lost: 0,
          revenue: 0,
        });
      }
      const entry = byRep.get(o.repId);
      if (o.isWon) {
        entry.won += 1;
        entry.revenue += o.value;
      }
      if (o.isLost) entry.lost += 1;
    });

    const ranked = Array.from(byRep.values())
      .filter((r) => r.won + r.lost + (r.quota ? 1 : 1) >= 0) // keep all reps present in filtered rows
      .sort((a, b) => b.revenue - a.revenue);

    const body = $("#leaderboardBody");

    if (ranked.length === 0) {
      body.innerHTML = `<tr><td colspan="7" class="empty-cell">No opportunities match the current filters.</td></tr>`;
      return;
    }

    // sales_reps.csv quota_amount is calibrated to a scale far below the
    // actual deal values in opportunities.csv (fewer than half the reps'
    // combined annual quotas would be needed to explain even a fraction of
    // total closed-won revenue). A quota-attainment percentage computed
    // against that figure would be misleading, so instead we show each
    // rep's share of total closed-won revenue among the ranked reps ---
    // a metric that stays meaningful regardless of the quota data's scale.
    const totalRankedRevenue = ranked.reduce((s, r) => s + r.revenue, 0);

    body.innerHTML = ranked
      .map((r, i) => {
        const decided = r.won + r.lost;
        const winRate = decided > 0 ? (r.won / decided) * 100 : 0;
        const revenueShare = totalRankedRevenue > 0 ? (r.revenue / totalRankedRevenue) * 100 : null;
        const rankBadge = i < 3 ? `rank-${i + 1}` : "";
        return `
        <tr>
          <td><span class="rank-badge ${rankBadge}">${i + 1}</span></td>
          <td class="cell-strong">${escapeHTML(r.name)}</td>
          <td><span class="tag">${escapeHTML(r.segment || "—")}</span></td>
          <td class="num cell-strong">${fmtUSD(r.revenue)}</td>
          <td class="num">${fmtNum(r.won)}</td>
          <td class="num">${fmtPct(winRate)}</td>
          <td class="num">${revenueShare === null ? "—" : fmtPct(revenueShare)}</td>
        </tr>`;
      })
      .join("");
  }

  // ---------------------------------------------------------------------
  // Executive insights (auto-generated)
  // ---------------------------------------------------------------------

  function renderInsights(rows, k) {
    const insights = [];

    // Best / worst industry by win rate (min sample size)
    const byIndustry = new Map();
    rows.forEach((o) => {
      if (!byIndustry.has(o.industryName)) byIndustry.set(o.industryName, { won: 0, lost: 0, revenue: 0 });
      const e = byIndustry.get(o.industryName);
      if (o.isWon) {
        e.won++;
        e.revenue += o.value;
      }
      if (o.isLost) e.lost++;
    });
    const industryStats = Array.from(byIndustry.entries())
      .map(([name, e]) => ({ name, ...e, decided: e.won + e.lost, winRate: e.won + e.lost > 0 ? (e.won / (e.won + e.lost)) * 100 : null }))
      .filter((e) => e.decided >= 5);

    if (industryStats.length > 0) {
      const best = [...industryStats].sort((a, b) => b.winRate - a.winRate)[0];
      const worst = [...industryStats].sort((a, b) => a.winRate - b.winRate)[0];
      if (best) {
        insights.push(
          `<strong>${escapeHTML(best.name)}</strong> converts best at <strong>${fmtPct(best.winRate)}</strong> win rate across ${fmtNum(best.decided)} decided deals.`
        );
      }
      if (worst && worst.name !== best.name) {
        insights.push(
          `<strong>${escapeHTML(worst.name)}</strong> lags at <strong>${fmtPct(worst.winRate)}</strong> win rate &mdash; a focus area for enablement or qualification.`
        );
      }
    }

    // Lead source ROI framing
    const bySource = new Map();
    rows.forEach((o) => {
      if (!bySource.has(o.sourceName)) bySource.set(o.sourceName, { won: 0, lost: 0, revenue: 0 });
      const e = bySource.get(o.sourceName);
      if (o.isWon) {
        e.won++;
        e.revenue += o.value;
      }
      if (o.isLost) e.lost++;
    });
    const sourceStats = Array.from(bySource.entries())
      .map(([name, e]) => ({ name, ...e, decided: e.won + e.lost, winRate: e.won + e.lost > 0 ? (e.won / (e.won + e.lost)) * 100 : null }))
      .filter((e) => e.decided >= 5);
    if (sourceStats.length > 0) {
      const topSource = [...sourceStats].sort((a, b) => b.revenue - a.revenue)[0];
      const topWinRateSource = [...sourceStats].sort((a, b) => b.winRate - a.winRate)[0];
      insights.push(
        `<strong>${escapeHTML(topSource.name)}</strong> drives the most closed-won revenue in view: <strong>${fmtUSD(topSource.revenue)}</strong>.`
      );
      if (topWinRateSource.name !== topSource.name) {
        insights.push(
          `<strong>${escapeHTML(topWinRateSource.name)}</strong> converts most efficiently at <strong>${fmtPct(topWinRateSource.winRate)}</strong> win rate.`
        );
      }
    }

    // Stalled / aging pipeline
    const stalled = rows.filter((o) => o.isOpen && o.daysInStage >= 90);
    if (stalled.length > 0) {
      const stalledValue = stalled.reduce((s, o) => s + o.value, 0);
      insights.push(
        `<strong>${fmtNum(stalled.length)} open opportunities</strong> worth <strong>${fmtUSD(stalledValue)}</strong> have sat in their current stage for 90+ days.`
      );
    }

    // Loss reason concentration
    const lostRows = rows.filter((o) => o.isLost && o.lossReason);
    if (lostRows.length > 0) {
      const byReason = groupSum(lostRows, (o) => o.lossReason, () => 1);
      const topReason = Array.from(byReason.entries()).sort((a, b) => b[1] - a[1])[0];
      const pct = (topReason[1] / lostRows.length) * 100;
      insights.push(
        `<strong>${escapeHTML(topReason[0])}</strong> is the top loss reason, accounting for <strong>${fmtPct(pct)}</strong> of lost deals in view.`
      );
    }

    // Rep spread
    const byRep = new Map();
    rows.forEach((o) => {
      if (!byRep.has(o.repName)) byRep.set(o.repName, { won: 0, lost: 0 });
      const e = byRep.get(o.repName);
      if (o.isWon) e.won++;
      if (o.isLost) e.lost++;
    });
    const repStats = Array.from(byRep.entries())
      .map(([name, e]) => ({ name, decided: e.won + e.lost, winRate: e.won + e.lost > 0 ? (e.won / (e.won + e.lost)) * 100 : null }))
      .filter((e) => e.decided >= 8 && e.winRate !== null);
    if (repStats.length >= 2) {
      const sortedReps = [...repStats].sort((a, b) => b.winRate - a.winRate);
      const top = sortedReps[0];
      const bottom = sortedReps[sortedReps.length - 1];
      if (top.name !== bottom.name) {
        insights.push(
          `Win rate spans from <strong>${fmtPct(top.winRate)}</strong> (${escapeHTML(top.name)}) to <strong>${fmtPct(bottom.winRate)}</strong> (${escapeHTML(bottom.name)}) among qualifying reps &mdash; a coaching signal, not necessarily a skill gap.`
        );
      }
    }

    // Overall cycle / win rate framing
    if (Number.isFinite(k.avgCycle) && k.avgCycle > 0) {
      insights.push(
        `Average sales cycle for won deals in view is <strong>${k.avgCycle.toFixed(0)} days</strong>, with an overall win rate of <strong>${fmtPct(k.winRate)}</strong>.`
      );
    }

    const list = $("#insightsList");
    if (insights.length === 0) {
      list.innerHTML = `<li class="insight-empty">Not enough decided opportunities in the current filter to generate insights.</li>`;
      return;
    }
    list.innerHTML = insights.map((html) => `<li>${html}</li>`).join("");
  }

  // ---------------------------------------------------------------------
  // Opportunity explorer
  // ---------------------------------------------------------------------

  function escapeHTML(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function outcomeLabel(o) {
    if (o.isWon) return "won";
    if (o.isLost) return "lost";
    return "open";
  }

  function getExplorerRows() {
    const { search, stage, outcome, sort } = state.explorer;
    let rows = state.filtered;

    if (stage) rows = rows.filter((o) => o.stageName === stage);
    if (outcome) rows = rows.filter((o) => outcomeLabel(o) === outcome);

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((o) =>
        [o.id, o.accountName, o.repName, o.industryName, o.regionName, o.sourceName, o.stageName]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }

    const sorters = {
      value_desc: (a, b) => b.value - a.value,
      value_asc: (a, b) => a.value - b.value,
      date_desc: (a, b) => new Date(b.createdDate) - new Date(a.createdDate),
      date_asc: (a, b) => new Date(a.createdDate) - new Date(b.createdDate),
      cycle_desc: (a, b) => b.salesCycleDays - a.salesCycleDays,
      cycle_asc: (a, b) => a.salesCycleDays - b.salesCycleDays,
    };
    rows = [...rows].sort(sorters[sort] || sorters.value_desc);
    return rows;
  }

  function renderExplorer() {
    const rows = getExplorerRows();
    const { page, pageSize } = state.explorer;
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    const clampedPage = Math.min(page, totalPages);
    state.explorer.page = clampedPage;

    const start = (clampedPage - 1) * pageSize;
    const pageRows = rows.slice(start, start + pageSize);

    $("#explorerCount").textContent = `${fmtNum(rows.length)} matching opportunities`;

    const body = $("#explorerBody");
    if (pageRows.length === 0) {
      body.innerHTML = `<tr><td colspan="11" class="empty-cell">No opportunities match your search and filters.</td></tr>`;
    } else {
      body.innerHTML = pageRows
        .map((o) => {
          const outcome = outcomeLabel(o);
          return `
          <tr>
            <td class="mono">#${escapeHTML(o.id)}</td>
            <td class="cell-strong">${escapeHTML(o.accountName)}</td>
            <td>${escapeHTML(o.repName)}</td>
            <td>${escapeHTML(o.stageName)}</td>
            <td>${escapeHTML(o.industryName)}</td>
            <td>${escapeHTML(o.regionName)}</td>
            <td>${escapeHTML(o.sourceName)}</td>
            <td class="num mono">${fmtUSD(o.value, { compact: false })}</td>
            <td><span class="outcome-badge outcome-${outcome}">${outcome}</span></td>
            <td>${fmtDate(o.createdDate)}</td>
            <td class="num">${fmtNum(o.salesCycleDays)}</td>
          </tr>`;
        })
        .join("");
    }

    $("#explorerPageInfo").textContent = `Page ${clampedPage} of ${totalPages}`;
    $("#explorerPrev").disabled = clampedPage <= 1;
    $("#explorerNext").disabled = clampedPage >= totalPages;
  }

  function wireExplorerEvents() {
    let searchTimer = null;
    $("#explorerSearch").addEventListener("input", (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.explorer.search = e.target.value;
        state.explorer.page = 1;
        renderExplorer();
      }, 150);
    });
    $("#explorerStageFilter").addEventListener("change", (e) => {
      state.explorer.stage = e.target.value;
      state.explorer.page = 1;
      renderExplorer();
    });
    $("#explorerOutcomeFilter").addEventListener("change", (e) => {
      state.explorer.outcome = e.target.value;
      state.explorer.page = 1;
      renderExplorer();
    });
    $("#explorerSort").addEventListener("change", (e) => {
      state.explorer.sort = e.target.value;
      renderExplorer();
    });
    $("#explorerPrev").addEventListener("click", () => {
      state.explorer.page = Math.max(1, state.explorer.page - 1);
      renderExplorer();
    });
    $("#explorerNext").addEventListener("click", () => {
      state.explorer.page = state.explorer.page + 1;
      renderExplorer();
    });
  }

  // ---------------------------------------------------------------------
  // Top-level render
  // ---------------------------------------------------------------------

  function renderAll() {
    const rows = state.filtered;
    const k = computeKPIs(rows);
    renderKPIs(k);
    renderInsights(rows, k);
    renderFunnelChart(rows);
    renderStageRevenueChart(rows);
    renderBreakdownChart("#industryChart", "industry", rows, (o) => o.industryName);
    renderBreakdownChart("#regionChart", "region", rows, (o) => o.regionName);
    renderSourceChart(rows);
    renderLeaderboard(rows);
    state.explorer.page = 1;
    renderExplorer();
  }

  function renderHeaderMeta() {
    $("#recordCount").textContent = fmtNum(state.raw.length);
    const dates = state.raw.map((o) => new Date(o.createdDate)).filter((d) => !isNaN(d));
    if (dates.length) {
      const min = new Date(Math.min(...dates));
      const max = new Date(Math.max(...dates));
      $("#dataWindow").textContent = `${fmtDate(min)} – ${fmtDate(max)}`;
    }
  }

  // ---------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------

  async function init() {
  const loading = $("#loadingState");
  const dashboard = $("#dashboardContent");
  const error = $("#errorState");
  const errorDetail = $("#errorDetail");

  let ds;

  // -----------------------------
  // PHASE 1: LOAD CSV FILES
  // -----------------------------
  try {
    ds = await loadAll();
  } catch (err) {
    console.error("LOAD ERROR:", err);

    loading.hidden = true;
    error.hidden = false;
    errorDetail.textContent =
      "CSV LOAD ERROR:\n" + (err.stack || err.message || String(err));

    $("#app").setAttribute("aria-busy", "false");
    return;
  }

  // -----------------------------
  // PHASE 2: BUILD + RENDER
  // -----------------------------
  try {
    state.stageOrder = ds.stages
      .slice()
      .sort((a, b) => num(a.stage_order) - num(b.stage_order))
      .map((s) => ({
        id: s.stage_id,
        name: s.stage_name,
        order: num(s.stage_order),
        weight: num(s.stage_weight_pct),
      }));

    state.raw = buildJoinedOpportunities(ds);
    state.filtered = state.raw;

    populateFilterOptions();
    wireFilterEvents();
    wireExplorerEvents();

    renderHeaderMeta();
    updateFilterStatus();
    renderAll();

    loading.hidden = true;
    dashboard.hidden = false;
    $("#app").setAttribute("aria-busy", "false");
  } catch (err) {
    console.error("RENDER ERROR:", err);

    loading.hidden = true;
    error.hidden = false;
    errorDetail.textContent =
      "RENDER ERROR:\n" + (err.stack || err.message || String(err));

    $("#app").setAttribute("aria-busy", "false");
  }
}

  document.addEventListener("DOMContentLoaded", init);
})();
