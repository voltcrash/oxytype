#!/bin/bash
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# Only run on ts/tsx/js/jsx files
if [[ "$FILE_PATH" != *.ts && "$FILE_PATH" != *.tsx && "$FILE_PATH" != *.js && "$FILE_PATH" != *.jsx ]]; then
  exit 0
fi

vp fmt "$FILE_PATH" >&2 || true
vp lint --type-aware --type-check --format agent "$FILE_PATH" >&2 || true

# Run matching test file if it exists
# Map frontend/src/ts/<path>/<file>.ts(x) -> frontend/__tests__/<path>/<file>.spec.ts(x)
if [[ "$FILE_PATH" == frontend/src/ts/* ]]; then
  REL="${FILE_PATH#frontend/src/ts/}"
  BASE="${REL%.*}"
  EXT="${REL##*.}"
  TEST_FILE="frontend/__tests__/${BASE}.spec.${EXT}"
  if [[ -f "$TEST_FILE" ]]; then
    vp test run "$TEST_FILE" >&2 || true
  fi
fi
