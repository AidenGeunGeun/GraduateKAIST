# KAIST Data Corpus

This directory stores the checked-in graduation requirement datasets and local scrape artifacts used by the planner.

- `requirements/` - human-maintained department requirement JSON files, registry metadata, schema, and source provenance.
- `SCRAPE-MANIFEST.json` - CAIS scrape provenance used to build the local course catalog database.
- `courses.db` - local SQLite course catalog generated from CAIS exports. Gitignored.
- `cais-raw/` - raw CAIS Excel exports used to rebuild `courses.db`. Gitignored.

The runtime app reads generated local data only and does not scrape KAIST systems at runtime.
