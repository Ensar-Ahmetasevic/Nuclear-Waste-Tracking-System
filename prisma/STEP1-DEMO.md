# Step 1 source example

Source: `Nuclear Waste Tracking System - Concept doc.pdf`, Step 1, September 11, 2026 version. Full example values are transcribed in `step1-example.cjs`.

Run `node scripts/import-step1-demo.cjs` from the project root while the local demo database is running (`npm run dev`). It imports into the local demo administrator's organization, using `.local/demo-credentials.json` and `NWTS_DEV_DB_PORT` (default 55438). It does not use an external DATABASE_URL and does not run automatically on startup.

The import creates a separate complete example and preserves previously edited demo records. All database inserts share one transaction. A receipt in `.local/step1-import-<port>-<organizationId>.json` records the resulting IDs; subsequent runs preserve the imported records, including user edits. Keep the receipt with the local database. If the shipment was deleted or a commit failed after the receipt was written, the importer stops for inspection instead of recreating records automatically.

| PDF reference | Data |
|---|---|
| Shipment 000025 | Transport GmbH; Jusuf Basic; 23 TS 5047 |
| Container Profile 00202 | 15; Zwischenlager Brokdorf; M01; Strengthened steel container |
| Container Profile 00322 | 12; Zwischenlager Ahaus; M02; Concrete container |

The PDF's M001/M002 summary labels are mapped to its detailed M01/M02 names. Source IDs are illustrative; the database generates its own IDs, recorded in the receipt. The placeholder date `xx.yy.cccc 12:00:52` is represented by **2026-09-11 12:00:52 Europe/Berlin** (10:00:52 UTC). The arrival is IN, with no exit time; profiles retain the default pending status.

Each waste profile's transport recommendation is represented by its linked Container Type, including material, volume in m³, carrying capacity in tons, footprint in m², radioactivity level, physical properties, and full description. Origins retain the source names, addresses, and origin descriptions. The two Container Profile records represent groups totaling 27 containers.

This import covers Step 1 example data only. It does not change account permissions or import the storage steps. Descriptions are concept examples, not validated operational guidance.
