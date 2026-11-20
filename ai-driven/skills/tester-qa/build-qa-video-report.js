#!/usr/bin/env node
/**
 * QA video report generator for the tester-qa agent.
 *
 * Scans an e2e repo for Playwright test videos (test-results/.../video.webm
 * and playwright-report/data/*.webm), and produces ONE self-contained
 * HTML page with every video embedded as a base64 data URI. The page has
 * zero external dependencies: it plays from disk with no server, even if
 * test-results/ or the HTML report are later cleaned.
 *
 * Usage:
 *   node build-qa-video-report.js <e2eDir> [--out <output.html>]
 *
 * Output default: <e2eDir>/qa-video-report.html
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const args = process.argv.slice(2);
const e2eDir = path.resolve(args[0] && !args[0].startsWith("--") ? args[0] : ".");
let outPath = path.join(e2eDir, "qa-video-report.html");

const outIdx = args.indexOf("--out");
if (outIdx !== -1 && args[outIdx + 1]) {
  outPath = path.resolve(args[outIdx + 1]);
}

const roots = [
  path.join(e2eDir, "test-results"),
  path.join(e2eDir, "playwright-report", "data"),
];

// Collect every video with a stable identity (content hash) for dedup,
// since the same recording can appear in both test-results/ and the
// playwright-report/data/ copies.
function collectVideos(dir, acc, prefix) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectVideos(full, acc, prefix ? `${prefix} › ${entry.name}` : entry.name);
    } else if (/\.(webm|mp4|avi)$/i.test(entry.name)) {
      const buf = fs.readFileSync(full);
      if (buf.length === 0) continue;
      const hash = crypto.createHash("md5").update(buf).digest("hex");
      const existing = acc.find(v => v.hash === hash);
      if (existing) {
        // Prefer a nicer label if we walked into it via a test folder name
        if (!existing.label || existing.label === entry.name) existing.label = labelFor(prefix, entry.name);
      } else {
        acc.push({ hash, label: labelFor(prefix, entry.name), buf, ext: path.extname(entry.name).slice(1) });
      }
    }
  }
  return acc;
}

function labelFor(prefix, fileName) {
  const stem = fileName.replace(/\.(webm|mp4|avi)$/i, "");
  const raw = prefix ? `${prefix} - ${stem}` : stem;
  return raw
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const videos = collectVideos(roots[0], collectVideos(roots[1], [], ""), "");

if (videos.length === 0) {
  console.error("build-qa-video-report: no video found under:");
  roots.forEach(r => console.error("  - " + r));
  console.error("Run the Playwright replay first (configs use video: 'on').");
  process.exit(1);
}

const sections = videos
  .map(v => {
    const mime = v.ext === "mp4" ? "video/mp4" : v.ext === "avi" ? "video/x-msvideo" : "video/webm";
    return `  <section class="card">
    <h2>${esc(v.label)}</h2>
    <video controls preload="metadata">
      <source src="data:video/${mime.split("/")[1]};base64,${v.buf.toString("base64")}" type="${mime}">
      Your browser does not support the HTML5 video tag.
    </video>
  </section>`;
  })
  .join("\n");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QA Replay - ${esc(path.basename(e2eDir))}</title>
  <style>
    :root { color-scheme: dark; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      background: #0d1117;
      color: #e6edf3;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px 16px;
    }
    h1 { font-size: 22px; margin: 0 0 32px; }
    .card {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 12px;
      padding: 20px 24px 12px;
      width: 100%;
      max-width: 960px;
      margin-bottom: 24px;
    }
    h2 { font-size: 14px; font-weight: 500; color: #8b949e; margin: 0 0 12px; }
    video {
      width: 100%;
      border-radius: 8px;
      border: 1px solid #30363d;
      background: #0d1117;
      box-shadow: 0 8px 32px rgba(0,0,0,.5);
      outline: none;
      display: block;
    }
    p.meta { color: #8b949e; font-size: 12px; margin: -8px 0 24px; }
  </style>
</head>
<body>
  <h1>QA Replay - ${esc(path.basename(e2eDir))}</h1>
  <p class="meta">${videos.length} recorded replay${videos.length > 1 ? "s" : ""} - self-contained page, videos embedded</p>
${sections}
</body>
</html>
`;

fs.writeFileSync(outPath, html);
const size = (fs.statSync(outPath).size / 1024).toFixed(0);
console.log(`QA_VIDEO_REPORT: ${outPath} (${videos.length} video${videos.length > 1 ? "s" : ""}, ${size} KB)`);