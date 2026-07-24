#!/usr/bin/env node

/**
 * Post-build script to fix asset paths for GitHub Pages deployment at /LobiImo/
 * This converts root-relative paths (/) to base-relative paths (/LobiImo/)
 */

const fs = require("fs");
const path = require("path");

const basePath = "/LobiImo";
const buildDir = path.join(__dirname, "../web-build");
const indexPath = path.join(buildDir, "index.html");

if (!fs.existsSync(indexPath)) {
  console.warn(`⚠️  ${indexPath} not found. Skipping path fix.`);
  process.exit(0);
}

let html = fs.readFileSync(indexPath, "utf-8");

// Fix root-relative paths: / -> /LobiImo/
// Match href="/" or src="/" patterns but exclude protocol-relative URLs
html = html.replace(/(?<!:)(href|src)="\/(?!\/)/g, `$1="${basePath}/`);

fs.writeFileSync(indexPath, html, "utf-8");
console.log(`✅ Fixed asset paths for GitHub Pages at ${basePath}`);
