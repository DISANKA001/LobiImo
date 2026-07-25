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
const notFoundPath = path.join(buildDir, "404.html");

if (!fs.existsSync(indexPath)) {
  console.warn(`⚠️  ${indexPath} not found. Skipping path fix.`);
  process.exit(0);
}

// Ensure 404.html exists for GitHub Pages SPA routing
const notFoundHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>LobiImo - Redirecting</title>
  <script>
    // Capture the path that wasn't found and redirect to index.html
    // This allows Expo Router to handle the route correctly
    const path = location.pathname;
    const basePath = "${basePath}";
    // Remove the basePath prefix to get the actual path
    const actualPath = path.startsWith(basePath + "/") 
      ? path.slice(basePath.length + 1) // Remove 'basePath/'
      : path;
    
    // Store the path in sessionStorage
    sessionStorage.redirect = actualPath;
    
    // Redirect to index.html at the root
    location.href = basePath + "/";
  </script>
</head>
<body>
  <p>Redirecting...</p>
</body>
</html>`;

if (!fs.existsSync(notFoundPath)) {
  fs.writeFileSync(notFoundPath, notFoundHTML, "utf-8");
  console.log(`✅ Created 404.html for GitHub Pages SPA routing`);
}

let html = fs.readFileSync(indexPath, "utf-8");

// Fix root-relative paths: / -> /LobiImo/
// Match href="/" or src="/" patterns but exclude protocol-relative URLs
html = html.replace(/(?<!:)(href|src)="\/(?!\/)/g, `$1="${basePath}/`);

// Add runtime patch for Expo Router + GitHub Pages basePath support
// This handles 404 redirects from GitHub Pages
const routerPatch = `
  <script>
    var redirect = sessionStorage.redirect;
    if (redirect) {
      delete sessionStorage.redirect;
      var basePath = "${basePath}";
      var pathToRestore = basePath + "/" + redirect.replace(/^\\//, "");
      if (location.pathname !== pathToRestore) {
        history.replaceState(null, null, pathToRestore);
      }
    }
    if (typeof window !== "undefined" && !window.__EXPO_ROUTER_BASEPATH__) {
      window.__EXPO_ROUTER_BASEPATH__ = "${basePath}";
    }
  </script>
`;

// Insert the patch before the closing body tag
html = html.replace(
  /<\/body>/i,
  routerPatch + '</body>'
);

// Add base href for GitHub Pages subdirectory support
if (!html.includes('<base href="' + basePath + '/">')) {
  html = html.replace(
    /<\/head>/i,
    `  <base href="${basePath}/">
</head>`
  );
}

fs.writeFileSync(indexPath, html, "utf-8");
console.log(`✅ Fixed asset paths for GitHub Pages at ${basePath}`);
