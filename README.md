# Irrigation Decision Layer — Research Demonstrator v3.0

A static GitHub Pages-ready research demonstrator showing how a **forecast → decision → action → outcome** framework can be operationalised for collective irrigation management under hydrological uncertainty.

## What this project is

This repository is an **interactive research demonstrator of the WP A–D experimental logic**. It is designed to show how the research proposal can move from an abstract methodology to a transparent, testable decision workflow.

It is **not**:
- an Aquasys product;
- an actual Authion operating rule;
- a validated irrigation recommendation system;
- the final WP D software implementation.

The public irrigation context is real, while all interactive scenario values, thresholds, loss functions and recommendations are synthetic and illustrative.

## RP alignment

### WP A — Decision context + replayable baseline
The site now makes explicit:
- who decides;
- the current operational state;
- feasible actions;
- objectives and constraints;
- update frequency;
- relevant outcomes;
- an illustrative replayable current-practice baseline.

The baseline is clearly labelled as synthetic and unvalidated. A real PhD baseline would be reconstructed from documents, records, data and partner discussions, then checked against historical cases and partner review.

### WP B — Controlled information experiment
The state, feasible actions and decision rule are held fixed while forecast information changes.

The demonstrator compares:
- no forecast;
- a central / deterministic proxy;
- a coarsened probability;
- probabilistic / ensemble information.

A decision-boundary map shows where the same forecast-informed rule changes action. A separate panel explicitly distinguishes **forecast quality** from **decision value** and does not invent CRPS, Brier or calibration scores without data.

### WP C — Strategy comparison + complexity test
The state and forecast are held fixed while the strategy changes:
- replayable current practice;
- simple forecast threshold;
- illustrative chance-constrained rule;
- robust minimax-regret rule.

The site includes:
- strategy-specific decision surfaces;
- matched consequence comparison;
- a partner-agreed-tolerance concept for the chance constraint;
- a strict complexity gate: **action must change AND a partner-relevant outcome must improve** before the complex method clears the first RP gate;
- scenario replay;
- sensitivity / robustness checks;
- interpretable simplification through a fitted two-threshold surrogate rule.

### WP D — Conceptual decision-service architecture
The browser interface exposes:
- current state;
- forecast inputs;
- strategy choice;
- assumptions;
- a recommended action;
- diagnostic outputs;
- an explanation;
- a machine-readable JSON response.

The RP ultimately proposes modular Python components and software testing. This browser version illustrates the architecture and traceability only.

## Scientific disclaimer

All thresholds, probability tolerances, scenario severities, loss functions and resulting actions in the interactive demo are **synthetic**.

A real pilot should replace or validate:
- synthetic state variables with operational variables;
- illustrative thresholds with reconstructed and partner-reviewed rules;
- generic actions with feasible actions;
- toy loss functions with agreed operational outcome measures;
- simulated cases with historical, hindcast, reconstructed or justified simulated cases;
- browser logic with tested modular software components.

Synthetic cases can test how a rule behaves; they cannot establish how often a situation occurred in practice or demonstrate observed operational benefit.

## Run locally

No dependencies are required.

Open `index.html` directly, or run:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Publish with GitHub Pages

Upload these files to the root of the existing repository:

```text
index.html
styles.css
app.js
README.md
```

Then keep GitHub Pages configured as:

```text
Source: Deploy from a branch
Branch: main
Folder: / (root)
```

When replacing an older version, upload `index.html`, `styles.css` and `app.js` together. The v3.0 HTML uses cache-busting query strings so the updated CSS and JavaScript should load cleanly after deployment.

## Public context links used in the site

The website links directly to public pages describing:
- Authion collective irrigation management;
- Aquasys A3P;
- Aquasys iryQua;
- the official Authion collective water-allocation framework.

These sources motivate the context only; they do not supply the synthetic decision rules used in the interactive laboratory.
