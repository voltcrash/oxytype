-- Read-only audit: include disabled keys and never print keys or stored hashes.
-- unsupported_hashes must be zero before deploying SHA-256-only verification.
SELECT
  count(*) AS total_keys,
  coalesce(sum(CASE WHEN enabled = 0 THEN 1 ELSE 0 END), 0) AS disabled_keys,
  coalesce(sum(CASE WHEN NOT (
    hash GLOB 'sha256:*'
    AND length(hash) = 71
    AND substr(hash, 8) NOT GLOB '*[^0-9a-f]*'
  ) THEN 1 ELSE 0 END), 0) AS unsupported_hashes
FROM ape_keys;
