# Reviewed Interpretation Database

- This directory is the Wave 2 authoritative interpretation layer for `AE`, `ME`, `CS`, and `EE`.
- The reviewed JSON files encode department/program/admission-year slices for the 2019-2025 scope only.
- Rule provenance is text-first: each rule set cites official bulletin `교과목이수요건` and `교과목일람표` slot keys plus exact page excerpts.
- `runtimeSupportStatus` is intentionally still `common-only` in this wave because the transcript analyzer is not yet wired to consume the reviewed rule layer.
- The legacy prototype files in `references/kaist-data/raw/program-requirements.raw.json` and `references/kaist-data/overrides/program-overrides.json` remain for audit history only; they are no longer pipeline authority.
