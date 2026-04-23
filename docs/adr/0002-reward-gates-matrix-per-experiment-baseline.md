# Reward + validation-gate matrix with per-experiment baselines

**Status**: accepted (2026-04-23, locked by Richie)

Webster's promotion and rollback logic separates **reward** (one maximized number: unified page CTA CTR) from **validation gates** (independent vetoes: brand-voice, bounce ceiling, scroll floor, time-on-page floor, token efficiency, heatmap sanity). A seven-outcome decision matrix keyed on reward-delta × gate-status replaces the single-p-value-threshold approach. Each experiment becomes its own commit on the PR branch with an `Experiment-Id:` trailer (per-experiment baseline), enabling surgical `git revert` rollback without regressing co-shipped winners.

## Considered options

- **Single-gate p<0.05 threshold** (80/100, prior pick) — simpler but conflates reward with validation; taxes obvious p<0.01 wins with a 2-week wait; no promotion lane when reward is flat but a validation gate improves.
- **Full-page baseline reset on any rollback** (55/100) — git-native and simple, but incompatible with parallel experiments: rolling back one hurt experiment erases all co-shipped winners.
- **Section-level baseline with synthetic `section-regions.json`** (70/100) — achieves per-region granularity via an explicit DOM-to-file mapping layer. Per-experiment commits achieve the same end without the mapping layer because each commit IS the section-touch.

## Consequences

- **New promotion lanes**: the council can ship on gate-win alone (reward holds, gates improve) — previously no lane existed for this case. Also ships on fast-track (p<0.01 one-week) instead of forcing a 2-week wait on obvious wins.
- **Parallel experiments become first-class**: 3 commits per PR, each tagged with `Experiment-Id:`, each with independent promotion/rollback decisions. Apply-worker's commit discipline enforces this.
- **`history/baselines.jsonl` schema is per-experiment**, not per-week. Planner and rollback code read per-experiment rows with status ∈ {`promoted`, `archived-gate-fail`, `rolled-back`, `skipped-<reason>`}.
- **Cross-experiment page-CTR gate** (new): prevents the pathological "each experiment wins its section but users are confused by the sum of simultaneous changes." Page-level reward must not regress at p<0.05 across all shipped experiments in a week.
- **Reversal cost**: high. Switching to single-commit-per-PR + single-gate threshold post-L11 would require rewriting the promotion engine, apply-worker commit discipline, and the baselines schema. Material but not irreversible.

## References

- `context/DOMAIN-MODEL.md` → "Reward, gates, and promotion logic", "Skip contract", and "Demo arc (4-week mock)" sections
- Q4, Q6, Q8, Q9 grill-me decisions (2026-04-23)
- ADR-0001 (planner as Managed Agent) — upstream decision
