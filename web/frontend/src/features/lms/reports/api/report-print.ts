import { REPORT_SECTIONS } from "@/features/lms/reports/api/report-sections";
import type {
  ReportSection,
  ReportSummary,
  ReportTally,
} from "@/features/lms/reports/types/report-types";
import { asset } from "@/lib/asset";

interface PrintRow {
  label: string;
  value: number | string;
  now?: boolean;
  hint?: string;
}

function escape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function number(value: number | string): string {
  return typeof value === "number" ? value.toLocaleString() : String(value);
}

function figures(rows: PrintRow[]): string {
  if (rows.length === 0) return "";
  const cells = rows
    .map(
      (row) => `
        <div class="figure">
          <div class="figure-label">${escape(row.label)}</div>
          <div class="figure-value">${escape(number(row.value))}</div>
          ${row.hint ? `<div class="figure-hint">${escape(row.hint)}</div>` : ""}
          ${row.now ? `<div class="figure-now">As of now</div>` : ""}
        </div>`,
    )
    .join("");
  return `<div class="figures">${cells}</div>`;
}

function table(
  heading: string,
  unit: string,
  rows: ReportTally[],
  emptyMessage: string,
): string {
  if (!rows?.length) {
    return `
      <div class="block">
        <h3>${escape(heading)}</h3>
        <p class="empty">${escape(emptyMessage)}</p>
      </div>`;
  }
  const body = rows
    .map(
      (row) => `
        <tr>
          <td>${escape(row.label)}</td>
          <td class="num">${row.value.toLocaleString()}</td>
        </tr>`,
    )
    .join("");
  return `
    <div class="block">
      <h3>${escape(heading)}</h3>
      <table>
        <thead><tr><th>Name</th><th class="num">${escape(unit)}</th></tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>`;
}

function sectionBody(
  section: ReportSection,
  summary: ReportSummary,
): string {
  const { circulation: c, collection: col, patrons: p, referenceDesk: d } = summary;
  const r = summary.bookRequests;
  const pub = summary.publishing;
  const v = summary.visits;

  switch (section) {
    case "overview":
      return (
        figures([
          { label: "Borrowed", value: c.checkouts },
          { label: "Returned", value: c.returns },
          { label: "Renewed", value: c.renewals },
          { label: "Reserved", value: c.reservations },
          { label: "On loan", value: c.onLoanNow, now: true },
          { label: "Overdue", value: c.overdueNow, now: true },
          { label: "Titles held", value: col.titles, now: true },
          { label: "Copies held", value: col.copies, now: true },
          { label: "Titles added", value: col.added },
          {
            label: "Titles without copies",
            value: col.withoutCopies,
            now: true,
          },
          { label: "Patrons registered", value: p.registered },
          { label: "Patrons on the roll", value: p.total, now: true },
          { label: "Patrons verified", value: p.verified, now: true },
          { label: "Awaiting review", value: p.unverified, now: true },
          { label: "Conversations", value: d.conversations },
          { label: "Messages", value: d.messages },
          {
            label: "Average rating",
            value: d.rated === 0 ? "—" : d.averageRating.toFixed(1),
          },
          {
            label: "Expired unanswered",
            value: d.expired,
            hint: "Closed by the silence sweep. Included in Closed.",
          },
        ]) +
        figures([
          { label: "Book requests", value: r.total },
          { label: "Announcements", value: pub.announcements },
          { label: "News", value: pub.news },
          {
            label: "Visits",
            value: v.logging ? v.total : "Not recorded",
          },
        ])
      );

    case "circulation":
      return (
        figures([
          { label: "Borrowed", value: c.checkouts },
          { label: "Returned", value: c.returns },
          { label: "Renewed", value: c.renewals },
          { label: "Reserved", value: c.reservations },
          { label: "All transactions", value: c.transactions },
          { label: "On loan", value: c.onLoanNow, now: true },
          { label: "Overdue", value: c.overdueNow, now: true },
          { label: "Due today", value: c.dueTodayNow, now: true },
          { label: "Awaiting pickup", value: c.onHoldNow, now: true },
        ]) +
        table("Patron standing", "Patrons", p.standing, "Nobody has been verified to borrow yet.") +
        table("Most borrowed", "Check-outs", c.topTitles, "Nothing was borrowed in this period.") +
        table("Most active borrowers", "Check-outs", c.topBorrowers, "Nobody borrowed in this period.") +
        table("Reservation outcomes", "Reservations", c.reservationOutcomes, "No reservations were made in this period.")
      );

    case "collection":
      return (
        figures([
          { label: "Titles", value: col.titles, now: true },
          { label: "Copies", value: col.copies, now: true },
          { label: "Available", value: col.available, now: true },
          { label: "On loan", value: col.borrowed, now: true },
          { label: "Added", value: col.added },
          { label: "Titles archived", value: col.archived, now: true },
          { label: "Copies archived", value: col.archivedCopies, now: true },
          {
            label: "Titles without copies",
            value: col.withoutCopies,
            now: true,
            hint: "Findable in the OPAC, impossible to borrow.",
          },
          {
            label: "Share of the catalogue",
            value:
              col.titles === 0
                ? "—"
                : `${Math.round((col.withoutCopies / col.titles) * 100)}%`,
            now: true,
            hint: "How much of the catalogue has nothing on the shelf.",
          },
        ]) +
        table("By class code", "Titles", col.byClassCode, "Nothing catalogued yet.") +
        table("By material type", "Titles", col.byMaterialType, "Nothing catalogued yet.") +
        table("By section", "Copies", col.bySection, "No copies are assigned to a section.")
      );

    case "patrons":
      return (
        figures([
          { label: "Registered", value: p.registered },
          { label: "On the roll", value: p.total, now: true },
          { label: "Active", value: p.active, now: true },
          { label: "Archived", value: p.archived, now: true },
          { label: "Verified", value: p.verified, now: true },
          { label: "Awaiting review", value: p.unverified, now: true },
          { label: "Rejected", value: p.rejected, now: true },
        ]) +
        table("Residency", "Patrons", p.residency, "Nobody is registered yet.") +
        table("Pasig barangays", "Patrons", p.byBarangay, "No Pasig residents are registered yet.")
      );

    case "reference-desk":
      return (
        figures([
          { label: "Conversations", value: d.conversations },
          { label: "Messages", value: d.messages },
          { label: "From guests", value: d.fromGuests },
          { label: "From patrons", value: d.fromPatrons },
          { label: "Waiting", value: d.waiting },
          { label: "Active", value: d.active },
          { label: "Closed", value: d.closed },
          {
            label: "Expired",
            value: d.expired,
            hint: "Closed by the silence sweep. Included in Closed.",
          },
          {
            label: "Average rating",
            value: d.rated === 0 ? "—" : d.averageRating.toFixed(1),
          },
          { label: "Rated", value: d.rated },
          {
            label: "Not rated",
            value: Math.max(d.conversations - d.rated, 0),
            hint: "Rating is optional, and skipping it is a legitimate answer.",
          },
          { label: "Book requests", value: r.total },
          { label: "Under review", value: r.underReview },
          { label: "Approved", value: r.approved },
          { label: "Declined", value: r.declined },
          { label: "Announcements", value: pub.announcements },
          { label: "News", value: pub.news },
          { label: "Published", value: pub.published },
          { label: "Drafts", value: pub.drafts },
          { label: "Archived", value: pub.archived },
          {
            label: "Replies",
            value: pub.replies,
            hint: "Left on announcements written in this period.",
          },
        ]) +
        table("Ratings given", "Ratings", d.ratingSpread, "No conversation in this period has been rated.") +
        table("What they asked about", "Conversations", d.byConcern, "No conversations were opened in this period.") +
        table("Most requested books", "Times requested", r.topTitles, "No book requests in this period.")
      );

    case "visits":
      if (!v.logging) {
        return `<p class="empty">Visit logging is not running, so no door count exists for this period. This is not a count of zero — nothing is recording.</p>`;
      }
      return (
        figures([
          { label: "Visits", value: v.total },
          { label: "Unique visitors", value: v.uniqueVisitors },
          {
            label: "Busiest day",
            value: v.busiestDay ? v.busiestDay.date : "—",
            hint: v.busiestDay ? `${v.busiestDay.count} visits` : undefined,
          },
        ]) + table("By day", "Visits", v.byDay, "No visits were recorded in this period.")
      );

    default:
      return "";
  }
}

export function buildReportHtml(
  summary: ReportSummary,
  chosen: ReportSection[],
): string {
  const generated = new Date(summary.generatedAt).toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  });

  const body = REPORT_SECTIONS.filter((entry) => chosen.includes(entry.section))
    .map(
      (entry) => `
      <section class="report-section">
        <h2>${escape(entry.label)}</h2>
        <p class="section-intro">${escape(entry.print)}</p>
        ${sectionBody(entry.section, summary)}
      </section>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Pasig Knowledge Center Report — ${escape(summary.period.label)}</title>
    <style>
      /* A print stylesheet, so the measurements are in millimetres and the
         page breaks are declared rather than left to the browser. */
      @page { size: A4; margin: 18mm 16mm; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        color: #1b2733;
        font-size: 11pt;
        line-height: 1.45;
      }
      header { border-bottom: 3px solid #003067; padding-bottom: 10px; margin-bottom: 18px; }
      .masthead { display: flex; align-items: center; gap: 10px; margin: 0 0 2px; }
      .masthead img { height: 34px; width: auto; }
      h1 { font-size: 20pt; margin: 0; color: #003067; letter-spacing: -0.01em; }
      .period { font-size: 13pt; color: #003067; margin: 0 0 6px; }
      .meta { font-size: 9pt; color: #667; margin: 0; }

      /* Sections flow across pages; only the small units refuse to split.

         break-inside on the whole section was too blunt. A section that did
         not fit in what was left of a page jumped to the next one entire,
         leaving a third of a page blank behind it — and Collection, being the
         longest, did it every time. What actually has to stay together is much
         smaller: one figure tile, one table, and a heading with whatever
         follows it, which is what break-after on the headings buys. That still
         rules out the classic defect this was guarding against — a heading
         stranded at the foot of a page — without throwing away the rest of the
         sheet to do it. */
      .report-section { margin-bottom: 20px; }
      h2 {
        font-size: 13pt; color: #003067; margin: 0 0 2px;
        border-bottom: 1px solid #c9d6e4; padding-bottom: 3px;
        break-after: avoid;
      }
      .section-intro { font-size: 9pt; color: #667; margin: 0 0 10px; break-after: avoid; }
      h3 { font-size: 10.5pt; color: #003067; margin: 14px 0 5px; break-after: avoid; }

      .figures {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        margin-bottom: 10px;
      }
      .figure { border: 1px solid #d8e2ec; border-radius: 5px; padding: 7px 9px; break-inside: avoid; }
      .figure-label { font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.04em; color: #667; }
      .figure-value { font-size: 16pt; font-weight: 700; color: #003067; line-height: 1.15; }
      .figure-hint { font-size: 7.5pt; color: #778; line-height: 1.3; margin-top: 1px; }
      .figure-now { font-size: 7pt; text-transform: uppercase; letter-spacing: 0.06em; color: #a06a00; margin-top: 2px; }

      .block { break-inside: avoid; }
      table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
      th, td { border: 1px solid #d8e2ec; padding: 5px 8px; text-align: left; }
      th { background: #eef4fa; color: #003067; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.04em; }
      td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; width: 22%; }
      tbody tr:nth-child(even) { background: #f7fafd; }
      .empty { font-size: 9.5pt; color: #778; font-style: italic; margin: 4px 0 0; }

      footer {
        margin-top: 22px; padding-top: 8px; border-top: 1px solid #d8e2ec;
        font-size: 8pt; color: #778; display: flex; justify-content: space-between;
      }
    </style>
  </head>
  <body>
    <header>
      <div class="masthead">
        <!-- Base-resolved, and the print document is written into a same-origin
             iframe, so it resolves against the app the same way the navbar's
             copy does. Width and height are stated rather than left to the
             file: the frame prints on its own load event, and an image with no
             box reserved can otherwise be measured at zero and reflow the
             masthead after the sheet has been laid out. Empty alt because the
             name is set beside it in text. -->
        <img src="${asset("/assets/images/PKC_logo2.png")}" alt="" width="97" height="34" />
        <h1>Pasig Knowledge Center</h1>
      </div>
      <p class="period">${escape(summary.period.label)}</p>
      <p class="meta">
        Generated ${escape(generated)}.
        Figures marked &ldquo;as of now&rdquo; describe the library at that moment
        and do not change with the selected period.
      </p>
    </header>
    ${body}
    <footer>
      <span>ePasigLib &mdash; ${escape(summary.period.label)}</span>
      <span>${escape(generated)}</span>
    </footer>
  </body>
</html>`;
}
