# Poochho (पूछो, ಕೇಳಿ): ask your data, offline

An offline-first PWA that answers questions about a dataset in English, Hindi or Kannada, with a chart, a bubble map or a table. It reads questions with [Sarvam's](https://www.sarvam.ai) models when it has a key and a connection, and with a small built-in parser when it does not. Everything else (the data, the query engine, the charts) runs on the device, so with no network it still works.

It is a proof of work for the kind of frontend described in Sarvam's "Frontend Engineer, Chanakya" posting: dashboards for enterprise users in constrained environments ("offline-first, low-bandwidth, limited hardware"), with a natural-language access layer and a geospatial view. It is not affiliated with Sarvam and the data is synthetic.

## Try it

```bash
npm install
npm run dev        # http://localhost:5188
npm test           # 60 unit tests
npm run build && npm run preview
npm run e2e        # real-Chrome test of the offline behaviour (needs `preview` running)
```

Click any example. To use Sarvam, open Settings and paste an API key; it stays in the tab's session storage and is sent only to `api.sarvam.ai`.

## How a question is answered

```
question ──► saved plan on this device? ──yes──► run it
                │no
                ▼
        key set and online? ──yes──► Sarvam reads it ──► validate ──► save plan ──► run it
                │no, or Sarvam failed
                ▼
        offline parser (EN / HI / KN) ──► run it
                │nothing recognised
                ▼
        offline: queue it, answer it when back online      online: say how to proceed
```

- **A closed query language.** Whatever reads the question must produce a `QueryPlan` (metric, grouping, filters, sort, limit). The model's reply is untrusted, so it is parsed and checked against that shape: an invented district or an out-of-range date is rejected, never run. No generated code is ever executed.
- **Columnar data.** The 24,000 synthetic complaints are parallel typed arrays, so a query is one pass over a few contiguous buffers.
- **Charts are React + SVG/HTML with D3 for the math** (`d3-scale`, `d3-shape`, `d3-array` only, not all of D3). The map has no basemap tiles, so it draws identically with no network. The line and map views load on first use.
- **Offline.** A small hand-written service worker (`src/sw.ts`) precaches the whole app (13 files, 245 kB). Interpreted questions are cached in IndexedDB, so a question Sarvam answered once works offline later. Questions nothing offline can read are queued in IndexedDB and answered when the connection returns.
- **Accessibility.** Every chart has a table view with the same numbers, charts carry text alternatives, the app has visible focus, respects reduced motion and dark mode, and `/` focuses the question box.

## Measured

From `npm run e2e`, in headless Chrome against the production build. Chrome's "slow 4G" preset is 150 ms round trip, 1.6 Mbit/s down.

| What | Result |
|---|---|
| Initial download (JS + CSS, gzip) | 73 kB |
| First load on throttled slow 4G: question box usable | about 0.75 s |
| First load on throttled slow 4G: first chart drawn | about 0.9 s |
| Reload with the network cut | app loads, question answered |
| One query over 24,000 rows | under 1 ms |

These are one machine and a simulated network. They show how the design behaves, not how a real low-end device will. Testing on one is the next step.

Offline parser coverage is tested on 17 English, Hindi (Devanagari and romanised) and Kannada phrasings, and it is deliberately small: a fixed vocabulary, not language understanding.

## Honest limits

- **The Sarvam path has only been tested against a mock.** I wrote it from Sarvam's published API reference (`POST /v1/chat/completions`, JSON mode, `sarvam-105b-conversations`), and the unit and end-to-end tests use a stand-in server. It has not run against a live key. If a field differs, the failure shows as a notice and the offline parser answers instead.
- **Synthetic data, approximate geography.** District positions are approximate and there is no state outline.
- **Not done yet:** voice input (Sarvam's speech models), WebSocket live updates, vector map tiles for connected use, WebGL for very large point sets, and packaging as a desktop app.

## Layout

| Path | Role |
|---|---|
| `src/data/` | District and category metadata, seeded synthetic data generator |
| `src/query/` | Plan types, validation, executor, offline parser, the ask decision tree |
| `src/sarvam/client.ts` | Prompt, request, reply parsing |
| `src/offline/storage.ts` | IndexedDB plan cache and offline queue |
| `src/components/` | Charts, map, table, answer card, settings |
| `src/sw.ts` | Service worker |
| `scripts/` | `e2e.mjs` offline test, `shots.mjs` screenshots, `make-icons.mjs` |
