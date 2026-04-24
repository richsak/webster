#!/usr/bin/env bun

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

export const ROOT = resolve(import.meta.dir, "..");
export const SECONDARY_SITE_DIR = join(ROOT, "site", "secondary");
export const SECONDARY_SUBSTRATES = ["saas-alpha", "local-service-alpha"] as const;

export type SecondarySubstrate = (typeof SECONDARY_SUBSTRATES)[number];

type AudienceType = "B2B SaaS operators" | "local-service homeowners";

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

export function main(): void {
  writeSecondarySites();
  console.log("Seeded secondary substrate landing pages.");
}

if (import.meta.main) {
  main();
}
