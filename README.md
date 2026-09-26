# Irrigation Decision Layer — Research Prototype

A static, GitHub Pages-ready portfolio demo showing how a **forecast → decision → action → outcome** research framework could be operationalised for collective irrigation management.

## What the demo shows

The site is organised around four work packages:

- **WP A — Decision Context:** define state, feasible actions, objectives, constraints and a current-practice baseline.
- **WP B — Predictive Information:** hold the state fixed and vary forecast information to see whether action, timing or intensity changes.
- **WP C — Decision Strategy:** hold state and forecast fixed and compare current practice, a simple forecast threshold, a risk-aware strategy and a toy minimax-regret strategy.
- **WP D — Software Layer:** return a traceable recommendation, explanation and machine-readable JSON response suitable for a shadow-mode prototype.

## Important scientific disclaimer

The **public irrigation context is real**, but all numerical thresholds, scenario states, loss functions and recommendations in the interactive laboratory are **synthetic and illustrative**.

This repository does **not** claim to reproduce the actual operating rules of Aquasys, A3P, OUGC Authion, the Chambre d’agriculture Pays de la Loire or any field partner.

A real WP D implementation should replace:
- illustrative thresholds with partner-validated rules;
- synthetic state variables with operational data;
- toy risk/loss functions with agreed performance criteria;
- generic actions with legally and operationally feasible actions;
- demo evaluation with historical replay, hindcast analysis and shadow-mode testing.

## Public context represented

The demo cites public sources describing:
- collective irrigation management in the Authion basin;
- annual irrigation-volume allocation through OUGC / PAR;
- the Aquasys **iryQua** collective irrigation software;
- the **A3P** project combining agronomic water-demand modelling, AI hydrological forecasting and satellite information.

The source links are shown directly on the site.

## Run locally

No dependencies are required.

Option 1: open `index.html` directly in a browser.

Option 2:
```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Publish with GitHub Pages

1. Create a new GitHub repository, for example `irrigation-decision-layer-demo`.
2. Upload the files from this folder to the repository root.
3. Commit and push.
4. In GitHub, open **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Select `main` and `/ (root)`, then save.
7. GitHub will provide the public Pages URL after deployment.

Because the project uses only HTML/CSS/JavaScript, no build step is required.

## Files

```text
index.html   # page structure and research narrative
styles.css   # responsive visual design
app.js       # interactive decision logic
README.md    # project documentation
.nojekyll    # tells GitHub Pages to serve the files as-is
```

## Suggested next development steps

1. Replace the synthetic baseline with a partner-validated decision tree.
2. Add imported hindcast cases (CSV/JSON).
3. Add a forecast calibration panel (reliability / CRPS / Brier) without treating skill as decision value.
4. Add replay mode: `historical state → current action → proposed action → outcome`.
5. Add a parameter/configuration file so the same interface can be reused for drinking-water shortage and low-flow support pilots.
