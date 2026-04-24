#!/usr/bin/env bun

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

export const ROOT = resolve(import.meta.dir, "..");
export const SECONDARY_SITE_DIR = join(ROOT, "site", "secondary");
export const SECONDARY_HISTORY_DIR = join(ROOT, "history", "secondary-arc");
export const SECONDARY_SUBSTRATES = ["saas-alpha", "local-service-alpha"] as const;
export const SECONDARY_RUNS = ["onboard", "week-1", "week-2"] as const;

export type SecondarySubstrate = (typeof SECONDARY_SUBSTRATES)[number];
export type SecondaryRun = (typeof SECONDARY_RUNS)[number];
export type ExperimentKind = "text" | "component" | "asset" | "css";
export type OutcomeLane =
  | "promote-fast-track"
  | "promote-fallback"
  | "promote-gate-win"
  | "archive-gate-fail"
  | "auto-rollback"
  | "hold";

type AudienceType = "B2B SaaS operators" | "local-service homeowners";
type VerdictClassification = "improved" | "hurt" | "neutral";

interface SecondarySubstrateFixture {
  substrate: SecondarySubstrate;
  businessName: string;
  eyebrow: string;
  headline: string;
  subheadline: string;
  primaryCta: string;
  secondaryCta: string;
  proof: string[];
  sections: {
    title: string;
    body: string;
  }[];
  audience: AudienceType;
}

interface SecondaryIssue {
  exp_id: string;
  kind: ExperimentKind;
  target_files: string[];
  proposed_change: string;
  rationale: string;
  expected_outcome_lane: OutcomeLane;
}

export interface SecondaryDecisionJSON {
  substrate: SecondarySubstrate;
  run: SecondaryRun;
  selected_issues: Omit<SecondaryIssue, "rationale">[];
  reasoning: string;
  monitor_signal: string;
}

export interface SecondaryVerdictJSON {
  substrate: SecondarySubstrate;
  run: SecondaryRun;
  experiments: {
    exp_id: string;
    kind: ExperimentKind;
    reward_delta_pct: number;
    p_value: number;
    classification: VerdictClassification;
    outcome: OutcomeLane;
  }[];
}

export interface SecondaryApplyLogJSON {
  substrate: SecondarySubstrate;
  run: SecondaryRun;
  applied: boolean;
  touched_files: string[];
  skipped: { exp_id: string; reason: string }[];
  notes: string;
}

interface SecondaryRunFixture {
  substrate: SecondarySubstrate;
  run: SecondaryRun;
  experiments: (SecondaryIssue & {
    reward_delta_pct: number;
    p_value: number;
    classification: VerdictClassification;
    outcome: OutcomeLane;
    applied: boolean;
    skipReason?: string;
  })[];
  reasoning: string;
  monitorSignal: string;
  applyNotes: string;
}

export const SECONDARY_FIXTURES: readonly SecondarySubstrateFixture[] = [
  {
    substrate: "saas-alpha",
    businessName: "LedgerPilot",
    eyebrow: "Revenue operations for lean B2B teams",
    headline: "Close the month with fewer spreadsheets and cleaner forecasts.",
    subheadline:
      "LedgerPilot gives finance and sales leaders one deterministic workspace for pipeline hygiene, invoice follow-up, and board-ready reporting.",
    primaryCta: "Book a 20-minute workflow audit",
    secondaryCta: "View the sample forecast",
    proof: ["14-day setup", "SOC 2-ready workflows", "No-code CRM sync"],
    sections: [
      {
        title: "Forecast confidence",
        body: "Spot stale opportunities, missing renewal dates, and late invoices before they distort the weekly revenue call.",
      },
      {
        title: "Operator-friendly automation",
        body: "Use simple rules to assign follow-ups, flag risk, and keep account owners moving without custom engineering work.",
      },
      {
        title: "Executive-ready exports",
        body: "Generate a clean monthly narrative that explains what changed, why it changed, and where the team should focus next.",
      },
    ],
    audience: "B2B SaaS operators",
  },
  {
    substrate: "local-service-alpha",
    businessName: "Northstar Home Care",
    eyebrow: "Premium exterior cleaning for busy homeowners",
    headline: "Make the outside of your home look cared for before the weekend.",
    subheadline:
      "Northstar Home Care schedules pressure washing, gutter clearing, and window detailing with upfront quotes and tidy crews.",
    primaryCta: "Get a same-day quote",
    secondaryCta: "See seasonal packages",
    proof: ["Licensed and insured", "Text updates on arrival", "Satisfaction check before payment"],
    sections: [
      {
        title: "Fast curb-appeal wins",
        body: "Refresh siding, walkways, and entry areas in one visit so your home feels guest-ready without a multi-week project.",
      },
      {
        title: "Clear scheduling",
        body: "Choose morning or afternoon arrival windows and receive a concise prep checklist before the crew arrives.",
      },
      {
        title: "Careful crews",
        body: "Technicians protect landscaping, photograph completed work, and review the result with you before closing the job.",
      },
    ],
    audience: "local-service homeowners",
  },
] as const;

export const SECONDARY_RUN_FIXTURES: readonly SecondaryRunFixture[] = [
  {
    substrate: "saas-alpha",
    run: "onboard",
    experiments: [
      {
        exp_id: "saas-onboard-hero-clarity",
        kind: "text",
        target_files: ["site/secondary/saas-alpha/index.html"],
        proposed_change: "Clarify that the product replaces spreadsheet-heavy month-end workflows.",
        rationale:
          "Cold-start SaaS visitors need to understand the operational pain before evaluating features.",
        expected_outcome_lane: "promote-fast-track",
        reward_delta_pct: 8.4,
        p_value: 0.006,
        classification: "improved",
        outcome: "promote-fast-track",
        applied: true,
      },
      {
        exp_id: "saas-onboard-proof-stack",
        kind: "component",
        target_files: ["site/secondary/saas-alpha/index.html"],
        proposed_change: "Move setup, security, and CRM-sync proof points beside the hero CTA.",
        rationale: "B2B buyers need risk-reduction proof before they commit to a workflow audit.",
        expected_outcome_lane: "promote-gate-win",
        reward_delta_pct: 5.9,
        p_value: 0.009,
        classification: "improved",
        outcome: "promote-gate-win",
        applied: true,
      },
    ],
    reasoning:
      "Onboard run explores broad message clarity and trust proof before narrowing into lifecycle-specific experiments.",
    monitorSignal:
      "Baseline SaaS traffic shows high CTA hesitation from spreadsheet-replacement queries.",
    applyNotes: "Applied both onboarding experiments to the synthetic SaaS fixture.",
  },
  {
    substrate: "saas-alpha",
    run: "week-1",
    experiments: [
      {
        exp_id: "saas-w1-audit-cta",
        kind: "text",
        target_files: ["site/secondary/saas-alpha/index.html"],
        proposed_change:
          "Change the primary CTA toward a low-friction workflow audit instead of a sales demo.",
        rationale:
          "Operators with month-end pain respond better to diagnostic language than vendor-demo language.",
        expected_outcome_lane: "promote-fallback",
        reward_delta_pct: 3.7,
        p_value: 0.018,
        classification: "neutral",
        outcome: "promote-fallback",
        applied: true,
      },
      {
        exp_id: "saas-w1-export-card",
        kind: "component",
        target_files: ["site/secondary/saas-alpha/index.html"],
        proposed_change:
          "Add an executive-ready exports card that explains board-report narrative output.",
        rationale:
          "Finance leaders need to see downstream executive value, not only operational cleanup.",
        expected_outcome_lane: "hold",
        reward_delta_pct: 1.1,
        p_value: 0.21,
        classification: "neutral",
        outcome: "hold",
        applied: true,
      },
    ],
    reasoning:
      "Week 1 narrows into CTA intent and executive reporting proof after onboard clarity gains stabilized.",
    monitorSignal:
      "Audit CTA clicks rose, but exports-card engagement did not clear the promotion gate.",
    applyNotes:
      "Applied CTA copy and held the export-card treatment for another observation window.",
  },
  {
    substrate: "saas-alpha",
    run: "week-2",
    experiments: [
      {
        exp_id: "saas-w2-security-badge",
        kind: "asset",
        target_files: ["site/secondary/saas-alpha/index.html"],
        proposed_change: "Add a local inline security badge treatment near the proof stack.",
        rationale:
          "SOC 2-ready language needs a visual trust anchor without loading remote assets.",
        expected_outcome_lane: "archive-gate-fail",
        reward_delta_pct: 2.9,
        p_value: 0.031,
        classification: "neutral",
        outcome: "archive-gate-fail",
        applied: false,
        skipReason: "Trust treatment missed the p<0.01 promotion gate.",
      },
      {
        exp_id: "saas-w2-density-tune",
        kind: "css",
        target_files: ["site/secondary/saas-alpha/index.html"],
        proposed_change:
          "Reduce hero text density on narrow screens while preserving proof visibility.",
        rationale:
          "Mobile SaaS visitors showed scroll hesitation when the first screen felt text-heavy.",
        expected_outcome_lane: "promote-gate-win",
        reward_delta_pct: 6.2,
        p_value: 0.007,
        classification: "improved",
        outcome: "promote-gate-win",
        applied: true,
      },
    ],
    reasoning:
      "Week 2 compares a trust-asset idea against a mobile density tune and promotes only the statistically clean win.",
    monitorSignal:
      "Mobile scroll depth improved after density tuning; security badge lift stayed below gate confidence.",
    applyNotes:
      "Applied the CSS density tune and skipped the security badge after the gate failure.",
  },
  {
    substrate: "local-service-alpha",
    run: "onboard",
    experiments: [
      {
        exp_id: "local-onboard-urgency-copy",
        kind: "text",
        target_files: ["site/secondary/local-service-alpha/index.html"],
        proposed_change:
          "Frame the hero around weekend-readiness instead of generic exterior cleaning.",
        rationale:
          "Homeowners searching locally often have a near-term hosting or curb-appeal trigger.",
        expected_outcome_lane: "promote-fast-track",
        reward_delta_pct: 9.1,
        p_value: 0.004,
        classification: "improved",
        outcome: "promote-fast-track",
        applied: true,
      },
      {
        exp_id: "local-onboard-quote-proof",
        kind: "component",
        target_files: ["site/secondary/local-service-alpha/index.html"],
        proposed_change:
          "Surface license, arrival-text, and satisfaction-check proof before service details.",
        rationale:
          "Local-service buyers need safety and reliability proof before requesting a same-day quote.",
        expected_outcome_lane: "promote-gate-win",
        reward_delta_pct: 6.8,
        p_value: 0.008,
        classification: "improved",
        outcome: "promote-gate-win",
        applied: true,
      },
    ],
    reasoning:
      "Onboard run tests urgency and trust basics for a homeowner purchase path with higher appointment anxiety.",
    monitorSignal:
      "Baseline local traffic showed strong service intent but drop-off before the quote CTA.",
    applyNotes: "Applied urgency copy and quote-trust proof to the local-service fixture.",
  },
  {
    substrate: "local-service-alpha",
    run: "week-1",
    experiments: [
      {
        exp_id: "local-w1-seasonal-packages",
        kind: "text",
        target_files: ["site/secondary/local-service-alpha/index.html"],
        proposed_change:
          "Make seasonal packages the secondary CTA for homeowners comparing bundled work.",
        rationale:
          "Package-aware visitors may not be ready for a quote until they understand service scope.",
        expected_outcome_lane: "hold",
        reward_delta_pct: 1.4,
        p_value: 0.19,
        classification: "neutral",
        outcome: "hold",
        applied: true,
      },
      {
        exp_id: "local-w1-arrival-window",
        kind: "component",
        target_files: ["site/secondary/local-service-alpha/index.html"],
        proposed_change:
          "Add morning-or-afternoon arrival-window language to reduce scheduling uncertainty.",
        rationale: "Appointment predictability is a conversion blocker for busy homeowners.",
        expected_outcome_lane: "promote-fallback",
        reward_delta_pct: 4.2,
        p_value: 0.015,
        classification: "neutral",
        outcome: "promote-fallback",
        applied: true,
      },
    ],
    reasoning:
      "Week 1 compares scope-education copy with a scheduling-risk reducer after trust basics improved quote starts.",
    monitorSignal:
      "Scheduling language improved quote-form starts; seasonal package exploration remained inconclusive.",
    applyNotes: "Applied both local-service treatments while marking package copy as a hold lane.",
  },
  {
    substrate: "local-service-alpha",
    run: "week-2",
    experiments: [
      {
        exp_id: "local-w2-photo-proof",
        kind: "asset",
        target_files: ["site/secondary/local-service-alpha/index.html"],
        proposed_change: "Add a local before-after proof placeholder using inline CSS shapes only.",
        rationale:
          "Photo-like proof can increase confidence, but fake imagery must remain clearly synthetic.",
        expected_outcome_lane: "auto-rollback",
        reward_delta_pct: -6.5,
        p_value: 0.005,
        classification: "hurt",
        outcome: "auto-rollback",
        applied: false,
        skipReason: "Synthetic visual proof increased mistrust and triggered rollback.",
      },
      {
        exp_id: "local-w2-crew-care",
        kind: "text",
        target_files: ["site/secondary/local-service-alpha/index.html"],
        proposed_change:
          "Emphasize landscaping protection and completion review in the careful-crews card.",
        rationale: "Homeowners hesitate when they worry about property damage or rushed crews.",
        expected_outcome_lane: "promote-gate-win",
        reward_delta_pct: 7.3,
        p_value: 0.006,
        classification: "improved",
        outcome: "promote-gate-win",
        applied: true,
      },
    ],
    reasoning:
      "Week 2 rejects synthetic visual proof when it harms trust and promotes crew-care reassurance instead.",
    monitorSignal:
      "Rollback lane triggered for photo-proof placeholder; crew-care copy improved quote completion.",
    applyNotes: "Rolled back photo-proof placeholder and applied crew-care reassurance copy.",
  },
] as const;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function renderSecondaryLandingPage(fixture: SecondarySubstrateFixture): string {
  const proofItems = fixture.proof
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("\n          ");
  const sectionCards = fixture.sections
    .map(
      (section) => `<article class="card">
            <h2>${escapeHtml(section.title)}</h2>
            <p>${escapeHtml(section.body)}</p>
          </article>`,
    )
    .join("\n          ");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(fixture.businessName)} | Webster Secondary Substrate</title>
    <meta
      name="description"
      content="Synthetic ${escapeHtml(fixture.audience)} landing page fixture for Webster Pair Alpha demos."
    />
    <style>
      :root {
        color-scheme: light;
        --ink: #182230;
        --muted: #52606d;
        --paper: #f8fafc;
        --panel: #ffffff;
        --brand: #2357d9;
        --brand-dark: #163a96;
        --line: #d8e0ea;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        background: var(--paper);
        color: var(--ink);
        font-family:
          Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        line-height: 1.6;
      }

      main {
        width: min(1120px, calc(100% - 32px));
        margin: 0 auto;
        padding: 56px 0;
      }

      .hero {
        display: grid;
        grid-template-columns: minmax(0, 1.3fr) minmax(280px, 0.7fr);
        gap: 32px;
        align-items: stretch;
      }

      .panel {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 28px;
        padding: 32px;
        box-shadow: 0 24px 80px rgb(24 34 48 / 8%);
      }

      .eyebrow {
        margin: 0 0 12px;
        color: var(--brand-dark);
        font-size: 0.82rem;
        font-weight: 800;
        letter-spacing: 0.11em;
        text-transform: uppercase;
      }

      h1 {
        margin: 0;
        max-width: 780px;
        font-size: clamp(2.4rem, 6vw, 5.2rem);
        line-height: 0.95;
        letter-spacing: -0.06em;
      }

      .subheadline {
        max-width: 720px;
        margin: 24px 0 0;
        color: var(--muted);
        font-size: 1.18rem;
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 14px;
        margin-top: 32px;
      }

      .button {
        display: inline-flex;
        min-height: 48px;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        padding: 0 20px;
        font-weight: 800;
        text-decoration: none;
      }

      .button.primary {
        background: var(--brand);
        color: #ffffff;
      }

      .button.secondary {
        border: 1px solid var(--line);
        color: var(--ink);
      }

      .proof {
        display: grid;
        gap: 12px;
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .proof li {
        border-radius: 18px;
        background: #eef4ff;
        padding: 14px 16px;
        color: var(--brand-dark);
        font-weight: 800;
      }

      .cards {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 18px;
        margin-top: 28px;
      }

      .card h2 {
        margin: 0 0 10px;
        font-size: 1.1rem;
      }

      .card p {
        margin: 0;
        color: var(--muted);
      }

      @media (max-width: 780px) {
        main {
          padding: 32px 0;
        }

        .hero,
        .cards {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero" aria-label="${escapeHtml(fixture.businessName)} landing page">
        <div class="panel">
          <p class="eyebrow">${escapeHtml(fixture.eyebrow)}</p>
          <h1>${escapeHtml(fixture.headline)}</h1>
          <p class="subheadline">${escapeHtml(fixture.subheadline)}</p>
          <div class="actions" aria-label="Primary actions">
            <a class="button primary" href="#contact">${escapeHtml(fixture.primaryCta)}</a>
            <a class="button secondary" href="#proof">${escapeHtml(fixture.secondaryCta)}</a>
          </div>
        </div>
        <aside class="panel" id="proof" aria-label="Proof points">
          <ul class="proof">
          ${proofItems}
          </ul>
        </aside>
      </section>
      <section class="cards" aria-label="Service highlights">
          ${sectionCards}
      </section>
      <section class="panel" id="contact" aria-label="Contact summary" style="margin-top: 28px;">
        <p class="eyebrow">Deterministic Webster fixture</p>
        <p>This standalone HTML page contains no remote scripts, stylesheets, images, or network-fetching code.</p>
      </section>
    </main>
  </body>
</html>
`;
}

export function writeSecondarySites(): void {
  rmSync(SECONDARY_SITE_DIR, { recursive: true, force: true });

  for (const fixture of SECONDARY_FIXTURES) {
    const substrateDir = join(SECONDARY_SITE_DIR, fixture.substrate);

    mkdirSync(substrateDir, { recursive: true });
    writeFileSync(join(substrateDir, "index.html"), renderSecondaryLandingPage(fixture));
  }
}

function renderProposal(runFixture: SecondaryRunFixture): string {
  const experimentBlocks = runFixture.experiments
    .map(
      (experiment) => `### ${experiment.exp_id}

- Kind: ${experiment.kind}
- Target files: ${experiment.target_files.join(", ")}
- Proposed change: ${experiment.proposed_change}
- Rationale: ${experiment.rationale}
- Expected outcome lane: ${experiment.expected_outcome_lane}`,
    )
    .join("\n\n");

  return `# ${runFixture.substrate} ${runFixture.run} proposal

${experimentBlocks}
`;
}

function buildDecision(runFixture: SecondaryRunFixture): SecondaryDecisionJSON {
  return {
    substrate: runFixture.substrate,
    run: runFixture.run,
    selected_issues: runFixture.experiments.map((experiment) => ({
      exp_id: experiment.exp_id,
      kind: experiment.kind,
      target_files: experiment.target_files,
      proposed_change: experiment.proposed_change,
      expected_outcome_lane: experiment.expected_outcome_lane,
    })),
    reasoning: runFixture.reasoning,
    monitor_signal: runFixture.monitorSignal,
  };
}

function buildVerdict(runFixture: SecondaryRunFixture): SecondaryVerdictJSON {
  return {
    substrate: runFixture.substrate,
    run: runFixture.run,
    experiments: runFixture.experiments.map((experiment) => ({
      exp_id: experiment.exp_id,
      kind: experiment.kind,
      reward_delta_pct: experiment.reward_delta_pct,
      p_value: experiment.p_value,
      classification: experiment.classification,
      outcome: experiment.outcome,
    })),
  };
}

function buildApplyLog(runFixture: SecondaryRunFixture): SecondaryApplyLogJSON {
  const touchedFiles = [
    ...new Set(
      runFixture.experiments.flatMap((experiment) =>
        experiment.applied ? experiment.target_files : [],
      ),
    ),
  ];

  return {
    substrate: runFixture.substrate,
    run: runFixture.run,
    applied: runFixture.experiments.some((experiment) => experiment.applied),
    touched_files: touchedFiles,
    skipped: runFixture.experiments
      .filter((experiment) => !experiment.applied)
      .map((experiment) => ({
        exp_id: experiment.exp_id,
        reason: experiment.skipReason ?? "Experiment was not applied for this mock run.",
      })),
    notes: runFixture.applyNotes,
  };
}

export function writeSecondaryHistory(): void {
  rmSync(SECONDARY_HISTORY_DIR, { recursive: true, force: true });

  for (const runFixture of SECONDARY_RUN_FIXTURES) {
    const runDir = join(SECONDARY_HISTORY_DIR, runFixture.substrate, runFixture.run);

    mkdirSync(runDir, { recursive: true });
    writeFileSync(join(runDir, "proposal.md"), renderProposal(runFixture));
    writeFileSync(
      join(runDir, "decision.json"),
      `${JSON.stringify(buildDecision(runFixture), null, 2)}\n`,
    );
    writeFileSync(
      join(runDir, "verdict.json"),
      `${JSON.stringify(buildVerdict(runFixture), null, 2)}\n`,
    );
    writeFileSync(
      join(runDir, "apply-log.json"),
      `${JSON.stringify(buildApplyLog(runFixture), null, 2)}\n`,
    );
  }
}

export function main(): void {
  writeSecondarySites();
  writeSecondaryHistory();
  console.log("Seeded secondary substrate landing pages and mock run artifacts.");
}

if (import.meta.main) {
  main();
}
