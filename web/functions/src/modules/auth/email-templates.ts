import * as nodemailer from "nodemailer";

export const LOGO_URL =
  "https://firebasestorage.googleapis.com/v0/b/epasiglib.firebasestorage.app/o/others%2FPasigLibrary_Logo.png?alt=media&token=eda5ac1b-278a-4ca2-8f70-b1693054e6bc";

export const FAVICON_URL =
  "https://firebasestorage.googleapis.com/v0/b/epasiglib.firebasestorage.app/o/others%2FPasig_City_Seal_Logo.png?alt=media&token=39fde09f-d7e2-4a09-a4ef-d2345b55e138";

export interface SmtpConfig {
  email: string;
  password: string;
}

export function createTransporter(config: SmtpConfig) {
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: config.email, pass: config.password },
  });
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const shell = (title: string, favicon: boolean, body: string) => `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      ${favicon ? `<link rel="icon" type="image/png" href="${FAVICON_URL}" />` : ""}
      <title>${escapeHtml(title)}</title>
    </head>
    <body style="margin:0;padding:0;background:#f3f7fb;font-family:'Segoe UI',Arial;">
      <table role="presentation" width="100%" style="border-collapse:collapse;">
        <tr>
          <td align="center" style="padding:24px;">
            <table role="presentation" width="720" style="
              width:100%;
              max-width:960px;
              border-collapse:collapse;
              background:#ffffff;
              border:6px solid #000000;
              border-radius:18px;
              overflow:hidden;
            ">
              <tr>
                <td style="background:#002248;padding:34px 0 26px;border-top-left-radius:12px;border-top-right-radius:12px;"></td>
              </tr>
              <tr>
                <td style="text-align:center;padding-top:16px;padding-bottom:12px;">
                  <div style="display:inline-block;background:#ffffff;padding:16px 26px;border-radius:8px;box-shadow:0 4px 10px rgba(0,0,0,0.06);margin-top:4px;">
                    <img src="${LOGO_URL}" alt="ePasig Library" width="180" style="display:block;" />
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding:0 40px;">
                  <hr style="border:none;border-top:4px solid #002248;width:85%;margin:18px auto 8px;" />
                </td>
              </tr>
              ${body}
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
`;

const footerRow = (note: string) => `
  <tr>
    <td style="background:#fafcff;padding:24px;text-align:center;font-size:13px;color:#666;">
      <p style="margin:0;">${note}</p>
      <p style="margin:10px 0 0;">
        ePasig Library &bull;
        <a href="https://epasiglibrary.com" style="color:#002248;text-decoration:none;">Visit our site</a>
      </p>
    </td>
  </tr>
`;

export function renderResultPage(options: {
  title: string;
  heading: string;
  lines: string[];
  footerNote?: string;
}): string {
  const paragraphs = options.lines
    .map(
      (line) =>
        `<p style="margin:0 0 12px;font-size:17px;">${line}</p>`,
    )
    .join("");

  return shell(
    options.title,
    true,
    `
      <tr>
        <td style="padding:40px 48px;text-align:center;color:#000;font-size:17px;line-height:1.6;">
          <h1 style="margin:0 0 16px;font-size:26px;font-weight:700;">${escapeHtml(options.heading)}</h1>
          ${paragraphs}
        </td>
      </tr>
      ${footerRow(options.footerNote || "If you did not expect this email, you may ignore it.")}
    `,
  );
}

export function renderCodeEmail(options: {
  title: string;
  heading: string;
  lines: string[];
  code: string;
  note?: string;
  footerNote?: string;
}): string {
  const paragraphs = options.lines
    .map(
      (line) =>
        `<p style="margin:0 0 12px;font-size:16px;color:#333;">${line}</p>`,
    )
    .join("");

  return shell(
    options.title,
    false,
    `
      <tr>
        <td style="padding:40px 48px;text-align:center;color:#000;font-size:17px;line-height:1.6;">
          <p style="margin:0 0 20px;font-size:22px;font-weight:600;">${escapeHtml(options.heading)}</p>
          ${paragraphs}
          <div style="
            display:inline-block;
            background:#f0f4f9;
            border:2px dashed #002248;
            border-radius:12px;
            padding:20px 40px;
            margin:10px 0 24px;
          ">
            <p style="
              margin:0;
              font-size:42px;
              font-weight:700;
              letter-spacing:8px;
              color:#002248;
              font-family:'Courier New',monospace;
            ">${escapeHtml(options.code)}</p>
          </div>
          <p style="margin:0 0 8px;font-size:14px;color:#666;">
            ${options.note || "For security, never share this code with anyone."}
          </p>
        </td>
      </tr>
      ${footerRow(options.footerNote || "If you didn't request this, you can safely ignore this email.")}
    `,
  );
}

export function renderActionEmail(options: {
  title: string;
  heading: string;
  lines: string[];
  buttonLabel: string;
  buttonLink: string;
  note?: string;
  footerNote?: string;
}): string {
  const paragraphs = options.lines
    .map((line) => `<p style="margin:0 0 20px;font-size:17px;">${line}</p>`)
    .join("");

  return `${shell(
    options.title,
    false,
    `
      <tr>
        <td style="padding:40px 48px;text-align:center;color:#000;font-size:17px;line-height:1.6;">
          <p style="margin:0 0 20px;font-size:22px;font-weight:600;">${escapeHtml(options.heading)}</p>
          ${paragraphs}
          <a href="${options.buttonLink}" target="_blank" rel="noopener noreferrer"
            style="
              display:inline-block;
              padding:14px 40px;
              background:#002248;
              color:#ffffff;
              text-decoration:none;
              font-size:17px;
              border-radius:6px;
              font-weight:700;
            ">
            ${escapeHtml(options.buttonLabel)}
          </a>
          <p style="margin-top:32px;font-size:14px;color:#555;">
            ${options.note || "This link expires in 5 minutes."}
          </p>
        </td>
      </tr>
      ${footerRow(options.footerNote || "If you didn't request this, you can safely ignore this email.")}
    `,
  )}`;
}
