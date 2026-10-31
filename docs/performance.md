# Performance measurements

Set `RADON_METRICS_ENABLED=true` before starting Radon to collect bounded,
process-local measurements. Collection is off by default. The owner-only `/stats`
command shows the five series with the highest recent p95, and replies privately.

Measurements cover slash, context-menu and message command completion, Prisma
query latency, Prisma error events, and Solo Leveling redemption outcomes.
Command success means the handler completed without throwing; commands that
return an error reply normally still count as completed handlers. Redemption
events provide their own outcome and, with the redemption-service PR, known
failure categories. A database error is counted separately because Prisma query
events do not reliably associate a failed operation with a duration.

Counts, averages and maximums are since process start. Each p95 uses at most the
last 128 valid durations; it is a recent sample, not an all-time percentile.
Unknown and negative durations are counted without being treated as timings.
At most 128 series are stored. Each process/shard reports its own measurements;
there is no external metrics service or persistent history.

Only command names, fixed outcome categories, counts and timings are retained.
No user IDs, account codes, command arguments, MongoDB query text, or credentials
are stored in metrics. Enabling database timings asks Prisma to emit query
events, which has some overhead; leave it disabled unless measurements are useful.
