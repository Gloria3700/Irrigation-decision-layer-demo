# Irrigation Decision Layer — Research Prototype v2

A static GitHub Pages portfolio demo showing how a **forecast → decision → action → outcome** research framework can be operationalised for collective irrigation management.

## Research logic

The prototype separates two controlled experiments:

- **WP B — Information experiment:** hold the operational state and decision rule fixed; vary the forecast representation; observe whether the action or outcome changes.
- **WP C — Strategy experiment:** hold the operational state and forecast fixed; vary the decision strategy; compare the recommended action, synthetic consequences, robustness and complexity burden.

A key rule in v2 is that **the action is an output in WP C**. If two strategies recommend the same action, the demo assigns them the same physical management consequences. A more complex strategy therefore cannot claim a better physical outcome simply because it uses a more sophisticated algorithm; it must justify itself through a different action, better robustness, constraint satisfaction, stability, interpretability, or another operational benefit.

## What changed in v2

- Removed French operational terminology from the visible interface and replaced it with English descriptions.
- Clarified the difference between WP B and WP C experimental controls.
- Added a **Strategy Boundary Explorer** to WP C. Switching strategies changes the entire state–probability decision surface.
- Added markers showing where each strategy differs from current practice.
- Added current-state strategy cards with action, expected loss, worst-case regret and residual resource-risk metrics.
- Added an interactive consequence chart for expected loss, regret and residual risk.
- Added a **Complexity Gate** that compares an advanced method with the simple forecast-informed rule.
- Added a scenario consequence matrix for dry, normal and wet futures.
- Preserved the WP D shadow-mode / JSON service concept.

## Scientific disclaimer

The public Authion / A3P irrigation context is real, but all numerical thresholds, scenario states, risk tolerances, loss functions and recommendations in the interactive laboratory are **synthetic and illustrative**.

This repository does **not** claim to reproduce the actual operating rules of Aquasys, the Authion collective irrigation authority, the Pays de la Loire Chamber of Agriculture, A3P, or any field partner.

A real WP D implementation should replace:

- illustrative thresholds with partner-validated operating rules;
- synthetic state variables with operational data;
- toy risk/loss functions with agreed objectives, constraints and outcome metrics;
- generic actions with legally and operationally feasible actions;
- demo evaluation with historical replay, hindcast analysis and shadow-mode testing.

## Publish on GitHub Pages

Upload / replace these files in the repository root:

```text
index.html
styles.css
app.js
README.md
```

Then commit the changes. If GitHub Pages is already enabled for the `main` branch and root folder, it will redeploy automatically; you do not need to configure Pages again.
