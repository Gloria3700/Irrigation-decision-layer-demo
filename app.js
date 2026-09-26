const $ = (id) => document.getElementById(id);

const state = {
  resource: 52,
  demand: 76,
  used: 68,
  prob: 62,
  spread: 18,
  horizon: 14,
  strategy: "simple",
  mapStrategy: "simple",
  metric: "expected",
  candidate: "robust"
};

const presets = {
  balanced: {resource:52, demand:76, used:68, prob:62, spread:18, horizon:14},
  boundary: {resource:58, demand:82, used:74, prob:57, spread:22, horizon:14},
  drought: {resource:24, demand:91, used:88, prob:86, spread:12, horizon:7},
  highprob: {resource:82, demand:55, used:42, prob:88, spread:14, horizon:14},
  moderate: {resource:43, demand:88, used:84, prob:48, spread:25, horizon:14}
};

const actions = [0, 10, 20, 30];
const strategyNames = {
  baseline:"Current practice",
  simple:"Simple threshold",
  risk:"Risk-aware",
  robust:"Robust minimax regret"
};
const complexityLevel = {baseline:"Low", simple:"Low–medium", risk:"Medium", robust:"Higher"};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const actionName = (r) => r === 0 ? "Maintain current abstraction" : `Reduce planned abstraction by ${r}%`;
const shortAction = (r) => r === 0 ? "Maintain" : `Reduce ${r}%`;
const actionClass = (r) => r === 0 ? "a0" : r === 10 ? "a10" : r === 20 ? "a20" : "a30";

function baselineAction(s){
  if (s.resource < 25) return 30;
  if (s.resource < 40 || s.used > 92) return 20;
  if (s.resource < 50 || s.used > 84) return 10;
  return 0;
}

function simpleAction(s, probability = s.prob){
  const base = baselineAction(s);
  let forecast = 0;
  if (s.resource < 25) forecast = 30;
  else if (probability >= 80 && s.resource < 75) forecast = 20;
  else if (probability >= 55 && s.resource < 68) forecast = 10;
  return Math.max(base, forecast);
}

function residualRisk(s, action){
  const p = s.prob / 100;
  const vulnerability = (100 - s.resource) / 100;
  const demand = s.demand / 100;
  const used = s.used / 100;
  const raw = 0.45*p + 0.35*vulnerability + 0.10*demand + 0.10*used;
  return clamp(raw * (1 - 1.3*(action/100)), 0, 1);
}

function riskAction(s){
  const base = baselineAction(s);
  const tolerance = 0.50;
  for (const a of actions){
    if (a >= base && residualRisk(s, a) <= tolerance) return a;
  }
  return 30;
}

function scenarioModel(s, action){
  const r = action / 100;
  const p = s.prob / 100;
  const vulnerability = (100 - s.resource) / 100;
  const demand = s.demand / 100;
  const used = s.used / 100;

  const severities = [
    clamp(0.68 + 0.28*p + 0.24*vulnerability, 0, 1),
    clamp(0.30 + 0.30*p + 0.18*vulnerability, 0, 1),
    clamp(0.08 + 0.10*p + 0.05*vulnerability, 0, 1)
  ];
  const names = ["Dry", "Normal", "Wet"];
  const rows = severities.map((severity, i) => {
    const resourceLoss = Math.max(0, severity * (0.50 + 1.35*vulnerability + 0.22*used) * (1 - 2.0*r) * 78);
    const cropLoss = r * (0.55 + 1.05*demand) * 80;
    const interventionCost = r * 10;
    return {
      name:names[i],
      resourceLoss,
      cropLoss,
      interventionCost,
      total:resourceLoss + cropLoss + interventionCost
    };
  });
  return rows;
}

function scenarioWeights(s){
  const p = s.prob / 100;
  const dry = clamp(0.12 + 0.66*p, 0.12, 0.78);
  const wet = clamp(0.10 + 0.35*(1-p), 0.08, 0.38);
  const normal = Math.max(0, 1 - dry - wet);
  return [dry, normal, wet];
}

function expectedLossForAction(s, action){
  const rows = scenarioModel(s, action);
  const weights = scenarioWeights(s);
  return rows.reduce((sum, row, i) => sum + row.total * weights[i], 0);
}

function regretAnalysis(s){
  const losses = Object.fromEntries(actions.map(a => [a, scenarioModel(s, a).map(x => x.total)]));
  const bestByScenario = [0,1,2].map(i => Math.min(...actions.map(a => losses[a][i])));
  const maxRegret = {};
  actions.forEach(a => {
    maxRegret[a] = Math.max(...losses[a].map((v,i) => v - bestByScenario[i]));
  });
  const bestAction = actions.reduce((best, a) => maxRegret[a] < maxRegret[best] ? a : best, actions[0]);
  return {losses, bestByScenario, maxRegret, bestAction};
}

function robustAction(s){ return regretAnalysis(s).bestAction; }

function strategyAction(strategy, s){
  if (strategy === "baseline") return baselineAction(s);
  if (strategy === "simple") return simpleAction(s);
  if (strategy === "risk") return riskAction(s);
  return robustAction(s);
}

function strategyMetrics(strategy, s){
  const action = strategyAction(strategy, s);
  const expected = expectedLossForAction(s, action);
  const regret = regretAnalysis(s).maxRegret[action];
  const risk = residualRisk(s, action) * 100;
  return {strategy, action, expected, regret, risk, complexity:complexityLevel[strategy]};
}

function coarsenedProbability(p){
  if (p < 35) return 20;
  if (p < 65) return 50;
  return 80;
}

function deterministicPseudoProbability(s){
  return clamp(50 + (50-s.resource)*0.7 + (s.demand-50)*0.12, 0, 100);
}

function fullEnsembleProbability(s){
  return clamp(s.prob + (s.spread-18)*0.22, 0, 100);
}

function riskScore(s){
  return 0.42*(100-s.resource) + 0.31*s.prob + 0.17*s.demand + 0.10*s.used;
}

function riskBand(s){
  const score = riskScore(s);
  if (score >= 70) return ["High risk", "high"];
  if (score >= 48) return ["Elevated risk", "elevated"];
  return ["Low / moderate risk", "low"];
}

function relevanceScore(s){
  const base = baselineAction(s);
  const informed = simpleAction(s);
  const dist = Math.abs(s.resource-58) + Math.abs(s.prob-58)*0.7;
  let score = Math.max(15, 90-dist);
  if (informed !== base) score = Math.max(score, 72);
  if (s.resource < 30 || s.resource > 80) score = Math.min(score, 42);
  return Math.round(clamp(score,0,100));
}
function relevanceLabel(score){ return score >= 68 ? "High" : score >= 42 ? "Moderate" : "Low"; }

function reasonFor(s, strategy, action){
  const base = baselineAction(s);
  if (strategy === "baseline") return "The current-practice proxy uses the operational state only; forecast information is not allowed to change the action.";
  if (strategy === "risk"){
    const before = residualRisk(s, base)*100;
    const after = residualRisk(s, action)*100;
    return action > base
      ? `The risk-aware rule increases intervention until the synthetic residual resource-risk index falls below the 50% tolerance (${before.toFixed(0)}% → ${after.toFixed(0)}%).`
      : `The current-practice action already satisfies the synthetic 50% risk tolerance, so no stronger intervention is added.`;
  }
  if (strategy === "robust"){
    const r = regretAnalysis(s);
    return `The robust rule selects ${shortAction(action)} because it has the smallest worst-case regret (${r.maxRegret[action].toFixed(1)} synthetic loss units) across dry, normal and wet futures.`;
  }
  if (action > base) return "The forecast moves the recommendation beyond current practice because the state is close enough to a switching boundary for predictive information to matter.";
  if (s.prob >= 75 && s.resource > 75) return "Event probability is high, but current resource availability is far from the illustrative intervention boundary, so the simple rule does not change the action.";
  return "The forecast adds warning information, but it does not move the simple decision rule beyond the current-practice action in this state.";
}

function renderDecision(){
  const action = strategyAction(state.strategy, state);
  const [band, bandKey] = riskBand(state);
  const rel = relevanceScore(state);
  const base = baselineAction(state);

  $("heroRisk").textContent = `${state.prob}%`;
  $("heroResource").textContent = `${state.resource} / 100`;
  $("heroDemand").textContent = `${state.demand} / 100`;
  $("heroUsed").textContent = `${state.used}%`;
  $("heroAction").textContent = shortAction(action);
  $("relevanceMeter").style.width = `${rel}%`;
  $("relevanceLabel").textContent = relevanceLabel(rel);

  $("riskBand").textContent = band;
  $("statusDot").style.background = bandKey === "high" ? "var(--red)" : bandKey === "elevated" ? "var(--amber)" : "var(--teal)";
  $("decisionAction").textContent = actionName(action);
  $("decisionReason").textContent = reasonFor(state, state.strategy, action);
  $("selectedStrategyName").textContent = strategyNames[state.strategy];
  $("review").textContent = state.horizon <= 7 ? "2 days" : state.horizon <= 14 ? "3 days" : "7 days";
  $("decisionRelevant").textContent = relevanceLabel(rel);
  $("confidenceNote").textContent = state.spread >= 25 ? "Wide ensemble spread" : state.spread >= 12 ? "Uncertainty visible" : "Relatively concentrated";

  const trace = [
    `Read state: resource ${state.resource}/100, demand ${state.demand}/100, allocation used ${state.used}%.`,
    `Read forecast: ${state.prob}% low-resource probability over ${state.horizon} days, spread ${state.spread}.`,
    state.strategy === "baseline" ? "Apply state-only current-practice proxy." : state.strategy === "simple" ? "Apply a simple probability threshold while preserving stronger state constraints." : state.strategy === "risk" ? "Choose the least restrictive action that satisfies the synthetic risk-tolerance rule." : "Compare candidate actions across dry, normal and wet futures and minimize worst-case regret.",
    `Return: ${actionName(action)}${action !== base ? ` (current-practice proxy: ${shortAction(base)})` : ""}.`
  ];
  $("trace").innerHTML = trace.map(t => `<li>${t}</li>`).join("");

  const response = {
    timestamp:"demo",
    pilot:"collective_irrigation",
    mode:"research_shadow",
    state:{resource_availability_index:state.resource,crop_water_demand_index:state.demand,annual_allocation_used_pct:state.used},
    forecast:{horizon_days:state.horizon,low_resource_probability_pct:state.prob,ensemble_spread_index:state.spread},
    decision:{strategy:state.strategy,recommended_abstraction_reduction_pct:action,action:actionName(action),decision_relevance:relevanceLabel(rel),review_in_days:state.horizon<=7?2:state.horizon<=14?3:7},
    diagnostics:{expected_loss:Number(expectedLossForAction(state,action).toFixed(2)),worst_case_regret:Number(regretAnalysis(state).maxRegret[action].toFixed(2)),residual_resource_risk_pct:Number((residualRisk(state,action)*100).toFixed(1))},
    explanation:reasonFor(state,state.strategy,action),
    disclaimer:"Synthetic research demonstration — not an operational irrigation recommendation."
  };
  $("jsonOutput").textContent = JSON.stringify(response,null,2);
  $("humanAction").textContent = actionName(action);
  $("whyList").innerHTML = [
    ["Current resource",`${state.resource}/100`],["Crop demand",`${state.demand}/100`],["Forecast risk",`${state.prob}% over ${state.horizon} days`],["Strategy effect",action===base?"No action change versus current-practice proxy":`Action changes from ${shortAction(base)} to ${shortAction(action)}`]
  ].map(([k,v]) => `<div class="why-item"><b>${k}:</b> ${v}</div>`).join("");
}

function renderInfoCards(){
  const entries = [
    {type:"State only",value:"No forecast",p:null,action:baselineAction(state),note:"Current-practice proxy. No predictive information enters the rule."},
    {type:"Deterministic proxy",value:"Median-like signal",p:deterministicPseudoProbability(state),action:simpleAction(state,deterministicPseudoProbability(state)),note:"A single central forecast hides threshold-crossing probability and distribution width."},
    {type:"Coarsened probability",value:`${coarsenedProbability(state.prob)}% category`,p:coarsenedProbability(state.prob),action:simpleAction(state,coarsenedProbability(state.prob)),note:"Tests whether a low / medium / high category is enough without an exact probability."},
    {type:"Probabilistic / ensemble",value:`${Math.round(fullEnsembleProbability(state))}% + spread`,p:fullEnsembleProbability(state),action:simpleAction(state,fullEnsembleProbability(state)),note:"Uses event probability plus an uncertainty adjustment for demonstration."}
  ];
  $("infoCards").innerHTML = entries.map(e => `<article class="info-card"><div class="type">${e.type}</div><div class="value">${e.value}</div><span class="action-pill ${actionClass(e.action)}">${shortAction(e.action)}</span><p>${e.note}</p></article>`).join("");

  const base = entries[0].action;
  const rich = entries[3].action;
  const changed = base !== rich;
  $("relevanceHeadline").textContent = changed ? "Probabilistic information changes the action in this state." : "Richer information does not change the action in this state.";
  $("relevanceText").textContent = changed
    ? `The state-only baseline suggests “${shortAction(base)}”, while the probabilistic representation suggests “${shortAction(rich)}”. WP B would flag this state as decision-relevant and then test whether the changed action improves outcomes.`
    : `Both the state-only baseline and richer probabilistic representation recommend “${shortAction(base)}”. Extra forecast detail may improve awareness, but it is operationally redundant here if action and outcome remain unchanged.`;
  $("actionChangeBadge").textContent = changed ? "action changes" : "action unchanged";
}

function buildMap(containerId, strategy, markDifferences){
  const map = $(containerId);
  map.innerHTML = "";
  const resources = [10,20,30,40,50,60,70,80,90,100];
  const probs = [100,90,80,70,60,50,40,30,20,10];
  let nearest = {d:Infinity,cell:null};
  let changed = 0;
  let total = 0;

  probs.forEach(p => resources.forEach(r => {
    const temp = {...state, resource:r, prob:p};
    const a = strategyAction(strategy,temp);
    const b = baselineAction(temp);
    const div = document.createElement("div");
    div.className = `boundary-cell ${actionClass(a)}`;
    if (markDifferences && a !== b){ div.classList.add("changed"); changed += 1; }
    total += 1;
    div.title = `Resource ${r}, probability ${p}% → ${shortAction(a)}${a!==b?` (current practice: ${shortAction(b)})`:""}`;
    const d = Math.abs(r-state.resource) + Math.abs(p-state.prob);
    if (d < nearest.d) nearest = {d,cell:div};
    map.appendChild(div);
  }));
  if (nearest.cell) nearest.cell.classList.add("current");
  return {changed,total};
}

function renderWPBMap(){ buildMap("boundaryMap","simple",false); }

function renderStrategyCards(){
  const order = ["baseline","simple","risk","robust"];
  $("strategyCards").innerHTML = order.map(key => {
    const m = strategyMetrics(key,state);
    return `<article class="strategy-card"><div class="strategy-name">${strategyNames[key]}</div><div class="strategy-action">${shortAction(m.action)}</div><div class="strategy-meta"><div><span>Expected loss</span><strong>${m.expected.toFixed(1)}</strong></div><div><span>Worst regret</span><strong>${m.regret.toFixed(1)}</strong></div><div><span>Residual risk</span><strong>${m.risk.toFixed(0)}%</strong></div><div><span>Complexity</span><strong>${m.complexity}</strong></div></div></article>`;
  }).join("");
}

function renderStrategyMap(){
  const {changed,total} = buildMap("strategyBoundaryMap",state.mapStrategy,true);
  $("mapStrategyName").textContent = strategyNames[state.mapStrategy];
  $("mapDifferenceRate").textContent = state.mapStrategy === "baseline" ? "0%" : `${Math.round(changed/total*100)}%`;
  $("mapCurrentAction").textContent = shortAction(strategyAction(state.mapStrategy,state));
}

function metricValue(strategy, metric){
  const m = strategyMetrics(strategy,state);
  if (metric === "regret") return m.regret;
  if (metric === "risk") return m.risk;
  return m.expected;
}

function renderOutcomeBars(){
  const order = ["baseline","simple","risk","robust"];
  const values = order.map(k => metricValue(k,state.metric));
  const max = Math.max(...values,1);
  $("strategyOutcomeBars").innerHTML = order.map((key,i) => {
    const m = strategyMetrics(key,state);
    return `<div class="outcome-row"><span class="label">${strategyNames[key]}<br><small>${shortAction(m.action)}</small></span><div class="outcome-track"><div class="outcome-fill" style="width:${Math.max(3,values[i]/max*100).toFixed(1)}%"></div></div><strong class="outcome-value">${values[i].toFixed(1)}${state.metric==='risk'?'%':''}</strong></div>`;
  }).join("");

  const notes = {
    expected:"Expected management loss combines synthetic resource-deficit loss, crop-restriction loss and intervention cost across dry / normal / wet futures. Same action = same physical loss.",
    regret:"Worst-case regret measures how far each chosen action can be from the best action after the future is revealed. Lower is better.",
    risk:"Residual resource-risk index is a synthetic constraint diagnostic. The risk-aware strategy targets a 50% tolerance in this demo."
  };
  $("metricNote").textContent = notes[state.metric];
}

function pctChange(candidate, reference){
  if (reference === 0) return 0;
  return (candidate-reference)/reference*100;
}

function renderComplexityGate(){
  const ref = strategyMetrics("simple",state);
  const cand = strategyMetrics(state.candidate,state);
  const actionDiff = cand.action !== ref.action;
  const expChange = pctChange(cand.expected,ref.expected);
  const regretChange = pctChange(cand.regret,ref.regret);
  const refPass = ref.risk <= 50;
  const candPass = cand.risk <= 50;

  $("critAction").textContent = actionDiff ? `${shortAction(ref.action)} → ${shortAction(cand.action)}` : `Same (${shortAction(ref.action)})`;
  $("critExpected").textContent = `${expChange>0?"+":""}${expChange.toFixed(1)}%`;
  $("critRegret").textContent = `${regretChange>0?"+":""}${regretChange.toFixed(1)}%`;
  $("critRisk").textContent = `${refPass?"Simple passes":"Simple fails"} · ${candPass?"Candidate passes":"Candidate fails"}`;

  let verdict = "No clear evidence that extra complexity is needed in this state.";
  let cls = "caution";
  let detail = "";

  if (!actionDiff){
    detail = `The ${strategyNames[state.candidate]} strategy and the simple rule choose the same action. Because the physical action is identical, this prototype gives them the same management outcome. The advanced method therefore needs another defensible benefit—such as constraint handling, robustness across nearby states, or more stable recommendations—to justify its added burden.`;
  } else if (state.candidate === "risk" && !refPass && candPass){
    verdict = "Extra complexity may be justified by a binding risk constraint.";
    cls = "good";
    detail = `The risk-aware strategy changes the action and is the first candidate here to satisfy the synthetic 50% residual-risk tolerance. WP C would next test whether this benefit persists under sensitivity analysis and whether the rule remains explainable to operators.`;
  } else if (state.candidate === "robust" && cand.regret < ref.regret*0.9){
    verdict = "Extra complexity may be justified by lower worst-case regret.";
    cls = "good";
    detail = `The robust strategy changes the action and reduces worst-case regret by ${Math.abs(regretChange).toFixed(1)}% relative to the simple rule. WP C would still require stability, interpretability and repeatable benefit before retaining it.`;
  } else if (cand.expected < ref.expected*0.95){
    verdict = "Extra complexity may be justified by improved expected outcomes.";
    cls = "good";
    detail = `The candidate changes the action and lowers synthetic expected management loss by ${Math.abs(expChange).toFixed(1)}%. The next step is to test whether that gain survives alternative thresholds, weights and forecast errors.`;
  } else {
    detail = `The candidate changes the action, but the current synthetic metrics do not show a strong enough improvement to justify more complexity automatically. WP C should treat “different” and “better” as separate tests.`;
  }

  const box = $("complexityVerdict");
  box.className = `complexity-verdict ${cls}`;
  box.innerHTML = `<strong>${verdict}</strong><span>Compared with the simple forecast-informed rule.</span>`;
  $("complexityText").textContent = detail;
}

function renderScenarioMatrix(){
  const order = ["baseline","simple","risk","robust"];
  const rows = order.map(key => {
    const a = strategyAction(key,state);
    const sc = scenarioModel(state,a);
    return {key,a,sc};
  });
  $("scenarioMatrix").innerHTML = `<table class="scenario-table"><thead><tr><th>Strategy / action</th><th>Dry</th><th>Normal</th><th>Wet</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${strategyNames[r.key]} · <span class="same-action">${shortAction(r.a)}</span></td>${r.sc.map(x=>`<td>${x.total.toFixed(1)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

function renderWPC(){
  renderStrategyCards();
  renderStrategyMap();
  renderOutcomeBars();
  renderComplexityGate();
  renderScenarioMatrix();
}

function render(){
  $("resourceOut").textContent = state.resource;
  $("demandOut").textContent = state.demand;
  $("usedOut").textContent = `${state.used}%`;
  $("probOut").textContent = `${state.prob}%`;
  $("spreadOut").textContent = state.spread;
  renderDecision();
  renderInfoCards();
  renderWPBMap();
  renderWPC();
}

["resource","demand","used","prob","spread"].forEach(id => {
  $(id).addEventListener("input", e => {
    state[id] = Number(e.target.value);
    document.querySelectorAll(".preset").forEach(b => b.classList.remove("active"));
    render();
  });
});
$("horizon").addEventListener("change", e => { state.horizon = Number(e.target.value); render(); });

document.querySelectorAll(".preset").forEach(btn => btn.addEventListener("click", () => {
  Object.assign(state,presets[btn.dataset.preset]);
  ["resource","demand","used","prob","spread"].forEach(id => $(id).value = state[id]);
  $("horizon").value = state.horizon;
  document.querySelectorAll(".preset").forEach(b => b.classList.toggle("active",b===btn));
  render();
}));

document.querySelectorAll(".strategy-btn").forEach(btn => btn.addEventListener("click", () => {
  state.strategy = btn.dataset.strategy;
  document.querySelectorAll(".strategy-btn").forEach(b => b.classList.toggle("active",b===btn));
  renderDecision();
}));

document.querySelectorAll(".map-strategy-btn").forEach(btn => btn.addEventListener("click", () => {
  state.mapStrategy = btn.dataset.mapStrategy;
  document.querySelectorAll(".map-strategy-btn").forEach(b => b.classList.toggle("active",b===btn));
  renderStrategyMap();
}));

document.querySelectorAll(".metric-btn").forEach(btn => btn.addEventListener("click", () => {
  state.metric = btn.dataset.metric;
  document.querySelectorAll(".metric-btn").forEach(b => b.classList.toggle("active",b===btn));
  renderOutcomeBars();
}));

document.querySelectorAll(".candidate-btn").forEach(btn => btn.addEventListener("click", () => {
  state.candidate = btn.dataset.candidate;
  document.querySelectorAll(".candidate-btn").forEach(b => b.classList.toggle("active",b===btn));
  renderComplexityGate();
}));

$("copyJson").addEventListener("click", async () => {
  try{
    await navigator.clipboard.writeText($("jsonOutput").textContent);
    $("copyJson").textContent = "Copied";
    setTimeout(() => $("copyJson").textContent = "Copy JSON",1200);
  }catch(e){ $("copyJson").textContent = "Select JSON to copy"; }
});

render();
