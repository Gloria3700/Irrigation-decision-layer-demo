
const $ = (id) => document.getElementById(id);
const state = {
  resource: 52,
  demand: 76,
  used: 68,
  prob: 62,
  spread: 18,
  horizon: 14,
  strategy: "simple"
};

const presets = {
  balanced: {resource:52, demand:76, used:68, prob:62, spread:18, horizon:14},
  boundary: {resource:58, demand:82, used:74, prob:57, spread:22, horizon:14},
  drought: {resource:24, demand:91, used:88, prob:86, spread:12, horizon:7},
  highprob: {resource:82, demand:55, used:42, prob:88, spread:14, horizon:14},
  moderate: {resource:43, demand:88, used:84, prob:48, spread:25, horizon:14}
};

const actionName = (r) => r === 0 ? "Maintain current abstraction" : `Reduce planned abstraction by ${r}%`;
const shortAction = (r) => r === 0 ? "Maintain" : `Reduce ${r}%`;

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
  else if (probability >= 75 && s.resource < 72) forecast = 20;
  else if (probability >= 55 && s.resource < 68) forecast = 10;
  return Math.max(base, forecast);
}

function riskScore(s){
  return 0.42*(100-s.resource) + 0.31*s.prob + 0.17*s.demand + 0.10*s.used;
}
function riskAction(s){
  const score = riskScore(s);
  let a = score >= 72 ? 30 : score >= 58 ? 20 : score >= 44 ? 10 : 0;
  return Math.max(a, baselineAction(s));
}

function robustAnalysis(s){
  const actions=[0,10,20,30];
  const p=s.prob/100, vuln=(100-s.resource)/100, demand=s.demand/100, used=s.used/100;
  const scenarios=[
    {name:"Dry", sev:Math.max(.72,.52+.5*p)},
    {name:"Normal", sev:.42+.18*p},
    {name:"Wet", sev:.16+.07*p}
  ];

  const losses={};
  actions.forEach(a=>{
    const r=a/100;
    losses[a]=scenarios.map(sc=>{
      const env = sc.sev * (0.55 + 0.9*vuln + 0.25*used) * (1 - 1.9*r) * 100;
      const crop = r * (0.55 + 1.0*demand) * 82;
      const intervention = r * 18;
      const rebound = Math.max(0, r-.2) * (1-sc.sev) * 28;
      return Math.max(0, env) + crop + intervention + rebound;
    });
  });
  const bestByScenario=scenarios.map((_,i)=>Math.min(...actions.map(a=>losses[a][i])));
  const maxRegret={};
  actions.forEach(a=>{
    const regrets=losses[a].map((v,i)=>v-bestByScenario[i]);
    maxRegret[a]=Math.max(...regrets);
  });
  const best=actions.reduce((a,b)=>maxRegret[a]<=maxRegret[b]?a:b);
  return {best, maxRegret, losses, scenarios};
}

function coarsenedProbability(p){
  if(p < 35) return 20;
  if(p < 65) return 50;
  return 80;
}
function deterministicPseudoProbability(s){
  // Intentionally simplified proxy to demonstrate loss of distributional information.
  return Math.max(0, Math.min(100, 50 + (50-s.resource)*0.7 + (s.demand-50)*0.12));
}
function fullEnsembleProbability(s){
  return Math.max(0, Math.min(100, s.prob + (s.spread-18)*0.22));
}

function selectedAction(s){
  if(s.strategy==="baseline") return baselineAction(s);
  if(s.strategy==="simple") return simpleAction(s);
  if(s.strategy==="risk") return riskAction(s);
  return robustAnalysis(s).best;
}

function riskBand(s){
  const score=riskScore(s);
  if(score>=70) return ["High risk","high"];
  if(score>=48) return ["Elevated risk","elevated"];
  return ["Low / moderate risk","low"];
}

function reasonFor(s,a){
  const base=baselineAction(s);
  const nearBoundary = s.resource>=38 && s.resource<=68 && s.prob>=40 && s.prob<=75;
  if(a===0 && s.prob>=75 && s.resource>72){
    return "Forecast probability is high, but current resource conditions remain far from the illustrative switching boundary, so the action does not change.";
  }
  if(a>=20 && s.resource<35){
    return "Current resource conditions are already strongly constrained, so the state itself drives a stronger reduction; forecast detail adds limited incremental value.";
  }
  if(nearBoundary && a>base){
    return "Forecast risk is near a switching boundary while current resource conditions still leave action flexibility; the predictive information changes the preferred response.";
  }
  if(a===base && s.prob>50){
    return "The forecast adds warning information, but under this illustrative strategy it does not change the action beyond the current-practice baseline.";
  }
  if(a>base){
    return "Predictive information increases the estimated decision risk enough to move the recommendation beyond the current-practice baseline.";
  }
  return "Current state and predictive information do not justify a stronger intervention under the selected illustrative strategy.";
}

function relevanceScore(s){
  const base=baselineAction(s);
  const exact=simpleAction(s);
  const dist=Math.abs(s.resource-58)+Math.abs(s.prob-58)*0.7;
  let score=Math.max(15, 90-dist);
  if(exact!==base) score=Math.max(score,72);
  if(s.resource<30 || s.resource>80) score=Math.min(score,42);
  return Math.round(Math.max(0,Math.min(100,score)));
}
function relevanceLabel(score){return score>=68?"High":score>=42?"Moderate":"Low";}

function renderInfoCards(){
  const entries=[
    {
      type:"State only",
      value:"No forecast",
      p:null,
      action:baselineAction(state),
      note:"Current-practice proxy. No predictive information enters the rule."
    },
    {
      type:"Deterministic proxy",
      value:`Median-like signal`,
      p:deterministicPseudoProbability(state),
      action:simpleAction(state,deterministicPseudoProbability(state)),
      note:"A single central forecast hides threshold-crossing probability and spread."
    },
    {
      type:"Coarsened probability",
      value:`${coarsenedProbability(state.prob)}% category`,
      p:coarsenedProbability(state.prob),
      action:simpleAction(state,coarsenedProbability(state.prob)),
      note:"Tests whether low/medium/high risk is enough without an exact probability."
    },
    {
      type:"Probabilistic / ensemble",
      value:`${Math.round(fullEnsembleProbability(state))}% + spread`,
      p:fullEnsembleProbability(state),
      action:simpleAction(state,fullEnsembleProbability(state)),
      note:"Uses event probability plus an uncertainty adjustment for demonstration."
    }
  ];
  $("infoCards").innerHTML=entries.map(e=>`
    <article class="info-card">
      <div class="type">${e.type}</div>
      <div class="value">${e.value}</div>
      <span class="action-pill ${e.action===0?'a0':e.action===10?'a10':e.action===20?'a20':'a30'}">${shortAction(e.action)}</span>
      <p>${e.note}</p>
    </article>
  `).join("");

  const base=entries[0].action;
  const prob=entries[3].action;
  const changed=base!==prob;
  $("relevanceHeadline").textContent=changed ?
    "Probabilistic information changes the action in this state." :
    "Richer information does not change the action in this state.";
  $("relevanceText").textContent=changed ?
    `Current practice suggests “${shortAction(base)}”, while the probabilistic representation suggests “${shortAction(prob)}”. This is exactly the kind of state WP B would flag as decision-relevant.` :
    `Both the state-only baseline and richer probabilistic representation recommend “${shortAction(base)}”. In this state, extra forecast detail may still improve awareness, but it is operationally redundant if the action and outcome remain unchanged.`;
  $("actionChangeBadge").textContent=changed?"action changes":"action unchanged";
}

function renderBoundary(){
  const map=$("boundaryMap");
  map.innerHTML="";
  const resources=[10,20,30,40,50,60,70,80,90,100];
  const probs=[100,90,80,70,60,50,40,30,20,10];
  let nearest={d:Infinity,cell:null};
  probs.forEach(p=>{
    resources.forEach(r=>{
      const temp={...state,resource:r,prob:p};
      const a=simpleAction(temp,p);
      const div=document.createElement("div");
      div.className=`boundary-cell ${a===0?'a0':a===10?'a10':a===20?'a20':'a30'}`;
      div.title=`Resource ${r}, probability ${p}% → ${shortAction(a)}`;
      const d=Math.abs(r-state.resource)+Math.abs(p-state.prob);
      if(d<nearest.d){nearest={d,cell:div}}
      map.appendChild(div);
    });
  });
  if(nearest.cell) nearest.cell.classList.add("current");
}

function renderStrategies(){
  const robust=robustAnalysis(state);
  const strategies=[
    ["Current practice",baselineAction(state),"State/threshold proxy only","Low"],
    ["Simple forecast threshold",simpleAction(state),"Event probability can move action across a threshold","Low–medium"],
    ["Risk-aware",riskAction(state),`Composite risk score = ${riskScore(state).toFixed(1)}`,"Medium"],
    ["Robust minimax regret",robust.best,"Chooses the action with the smallest worst-case regret across plausible futures","Higher"]
  ];
  $("strategyRows").innerHTML=strategies.map(([name,a,why,complex])=>`
    <tr>
      <td>${name}</td>
      <td class="${state.strategy && selectedAction(state)===a?'recommended':''}">${actionName(a)}</td>
      <td>${why}</td>
      <td>${complex}</td>
    </tr>
  `).join("");

  const vals=robust.maxRegret;
  const max=Math.max(...Object.values(vals),1);
  $("regretBars").innerHTML=[0,10,20,30].map(a=>`
    <div class="regret-row">
      <span>${shortAction(a)}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${(vals[a]/max*100).toFixed(1)}%"></div></div>
      <strong>${vals[a].toFixed(1)}</strong>
    </div>
  `).join("");

  const simple=simpleAction(state), rb=robust.best;
  $("critAction").textContent=simple===rb?"Same action":"Different action";
  $("critRobust").textContent=`Worst regret ${vals[rb].toFixed(1)}`;
  $("complexityHeadline").textContent=simple===rb ?
    "The robust method discovers no different action here." :
    "The robust method recommends a different action here.";
  $("complexityText").textContent=simple===rb ?
    `Both the simple forecast rule and minimax-regret strategy recommend “${shortAction(simple)}”. WP C would ask whether the extra complexity is justified if retrospective and shadow-mode outcomes are also similar.` :
    `The simple rule recommends “${shortAction(simple)}”, while minimax regret recommends “${shortAction(rb)}”. WP C would now test whether that difference produces a repeatable operational benefit, not merely a more complex calculation.`;
}

function renderDecision(){
  const a=selectedAction(state);
  const [band,bandKey]=riskBand(state);
  const rel=relevanceScore(state);
  const base=baselineAction(state);

  $("heroRisk").textContent=`${state.prob}%`;
  $("heroResource").textContent=`${state.resource} / 100`;
  $("heroDemand").textContent=`${state.demand} / 100`;
  $("heroUsed").textContent=`${state.used}%`;
  $("heroAction").textContent=shortAction(a);
  $("relevanceMeter").style.width=`${rel}%`;
  $("relevanceLabel").textContent=relevanceLabel(rel);

  $("riskBand").textContent=band;
  $("statusDot").style.background=bandKey==="high"?"var(--red)":bandKey==="elevated"?"var(--amber)":"var(--teal)";
  $("decisionAction").textContent=actionName(a);
  $("decisionReason").textContent=reasonFor(state,a);
  const strategyNames={
    baseline:"Current-practice proxy",
    simple:"Simple forecast-informed rule",
    risk:"Risk-aware rule",
    robust:"Robust minimax-regret strategy"
  };
  $("selectedStrategyName").textContent=strategyNames[state.strategy];
  $("review").textContent=state.horizon<=7?"2 days":state.horizon<=14?"3 days":"7 days";
  $("decisionRelevant").textContent=relevanceLabel(rel);
  $("confidenceNote").textContent=state.spread>=25?"Wide ensemble spread":state.spread>=12?"Uncertainty visible":"Relatively concentrated";

  const trace=[
    `Read current state: resource ${state.resource}/100, demand ${state.demand}/100, allocation used ${state.used}%.`,
    `Read predictive information: ${state.prob}% event probability over ${state.horizon} days, spread ${state.spread}.`,
    `${state.strategy==="baseline" ? "Apply current-practice proxy without forecast information." : state.strategy==="simple" ? "Apply probability threshold while preserving stronger baseline constraints." : state.strategy==="risk" ? `Compute composite risk score (${riskScore(state).toFixed(1)}).` : "Evaluate candidate actions under dry, normal and wet scenarios and minimize worst-case regret."}`,
    `Return: ${actionName(a)}${a!==base ? ` (baseline would be ${shortAction(base)})` : ""}.`
  ];
  $("trace").innerHTML=trace.map(t=>`<li>${t}</li>`).join("");

  const json={
    timestamp:"demo",
    pilot:"collective_irrigation",
    mode:"research_shadow",
    state:{
      resource_availability_index:state.resource,
      crop_water_demand_index:state.demand,
      annual_allocation_used_pct:state.used
    },
    forecast:{
      horizon_days:state.horizon,
      low_resource_probability_pct:state.prob,
      ensemble_spread_index:state.spread
    },
    decision:{
      strategy:state.strategy,
      recommended_abstraction_reduction_pct:a,
      action:actionName(a),
      decision_relevance:relevanceLabel(rel),
      review_in_days:state.horizon<=7?2:state.horizon<=14?3:7
    },
    explanation:reasonFor(state,a),
    disclaimer:"Synthetic research demonstration — not an operational irrigation recommendation."
  };
  $("jsonOutput").textContent=JSON.stringify(json,null,2);
  $("humanAction").textContent=actionName(a);
  $("whyList").innerHTML=[
    ["Current resource",`${state.resource}/100`],
    ["Crop demand",`${state.demand}/100`],
    ["Forecast risk",`${state.prob}% over ${state.horizon} days`],
    ["Decision effect",a===base?"Forecast does not exceed baseline action in this strategy":`Forecast/strategy moves action beyond baseline ${shortAction(base)}`]
  ].map(([k,v])=>`<div class="why-item"><b>${k}:</b> ${v}</div>`).join("");
}

function render(){
  $("resourceOut").textContent=state.resource;
  $("demandOut").textContent=state.demand;
  $("usedOut").textContent=`${state.used}%`;
  $("probOut").textContent=`${state.prob}%`;
  $("spreadOut").textContent=state.spread;
  renderDecision();
  renderInfoCards();
  renderBoundary();
  renderStrategies();
}

["resource","demand","used","prob","spread"].forEach(id=>{
  $(id).addEventListener("input",(e)=>{
    state[id]=Number(e.target.value);
    document.querySelectorAll(".preset").forEach(b=>b.classList.remove("active"));
    render();
  });
});
$("horizon").addEventListener("change",(e)=>{state.horizon=Number(e.target.value);render()});

document.querySelectorAll(".preset").forEach(btn=>{
  btn.addEventListener("click",()=>{
    Object.assign(state,presets[btn.dataset.preset]);
    ["resource","demand","used","prob","spread"].forEach(id=>$(id).value=state[id]);
    $("horizon").value=state.horizon;
    document.querySelectorAll(".preset").forEach(b=>b.classList.toggle("active",b===btn));
    render();
  });
});

document.querySelectorAll(".strategy-btn").forEach(btn=>{
  btn.addEventListener("click",()=>{
    state.strategy=btn.dataset.strategy;
    document.querySelectorAll(".strategy-btn").forEach(b=>b.classList.toggle("active",b===btn));
    render();
  });
});

$("copyJson").addEventListener("click",async()=>{
  try{
    await navigator.clipboard.writeText($("jsonOutput").textContent);
    $("copyJson").textContent="Copied";
    setTimeout(()=>$("copyJson").textContent="Copy JSON",1200);
  }catch(e){
    $("copyJson").textContent="Select JSON to copy";
  }
});

render();
