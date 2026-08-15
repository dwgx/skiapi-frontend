/*
 * skiapi.dev — browser console banner.
 *
 * Served by Caddy at /console-banner.js and injected into the panel's HTML
 * by a `replace` directive in /etc/caddy/Caddyfile. The sub2api application
 * itself is never modified.
 *
 * It must be an external file, not an inline <script>: the app ships a strict
 * CSP (`script-src 'self' 'nonce-...'`) and Caddy cannot know the per-response
 * nonce, so an inline injection would be blocked by the browser. A same-origin
 * file is covered by 'self'.
 */
(function () {
  "use strict";

  // The page is a SPA; hot reloads and re-entry must not stack banners.
  if (window.__SKIAPI_CONSOLE_BANNER__) return;
  window.__SKIAPI_CONSOLE_BANNER__ = true;

  // line-height must stay tight (1.05): U+2588 glyphs are exactly one em tall,
  // so anything looser opens visible horizontal seams between the block rows.
  var MONO =
    "font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace;" +
    "line-height:1.05;font-size:12px";

  // Built from U+2588 FULL BLOCK only. An earlier version mixed in box-drawing
  // characters (╗ ═ ║ ╚), which are drawn as thin strokes on a different
  // baseline than the full block and made the wordmark look sheared and broken
  // at 12px. Every cell is two blocks wide so the 5x5 letterforms stay roughly
  // square against the ~2:1 aspect ratio of a monospace cell.
  var wordmark = [
    "",
    "  ████████  ██      ██  ██████████    ██████    ████████    ██████████",
    "██          ██    ██        ██      ██      ██  ██      ██      ██",
    "  ██████    ██████          ██      ██████████  ████████        ██",
    "        ██  ██    ██        ██      ██      ██  ██              ██",
    "████████    ██      ██  ██████████  ██      ██  ██          ██████████",
    "",
  ].join("\n");

  // Sampled from two lobe circles plus a triangle on a 25x13 grid. Coarser
  // grids flattened the tops of the lobes into straight edges.
  var heart = [
    "                    ████████              ████████",
    "                ████████████████      ████████████████",
    "              ████████████████████  ████████████████████",
    "              ██████████████████████████████████████████",
    "              ██████████████████████████████████████████",
    "              ██████████████████████████████████████████",
    "                ██████████████████████████████████████",
    "                    ██████████████████████████████",
    "                          ██████████████████",
    "                            ██████████████",
    "                              ██████████",
    "                                ██████",
    "",
  ].join("\n");

  var footer = "                          https://skiapi.dev\n";

  try {
    console.log(
      "%c" + wordmark + "%c" + heart + "%c" + footer,
      "color:#38bdf8;font-weight:700;" + MONO,
      "color:#fb7185;" + MONO,
      "color:#94a3b8;font-weight:600;" + MONO
    );
  } catch (err) {
    // A console that cannot style is still a console.
    console.log(wordmark + heart + footer);
  }
})();
