# Three-persona review: the three new posts

Reviewed: `2026-09-10-SparkTroubleshootingPlaybook.md`,
`2026-09-10-HudiIndexTypes.md`, `2026-09-10-XTableIncrementalSync.md`.
Every persona names at least one concrete weakness, with the disposition.

## Junior data engineer

**"I do not know which JVM is failing, so the playbook's first question stalls
me."** (playbook, `Architecture: how a JVM flag reaches the driver and the
executors`) The post tells me to find the side that threw, but not how to get
the two logs on YARN.
*Left as is.* `yarn logs -applicationId` is one command but opens a whole topic
(aggregation, retention, per-container files) that belongs in its own post. The
"What failure looks like" table gives the symptom-to-cause mapping without it.

**"`GLOBAL_RECORD_LEVEL_INDEX` versus `RECORD_LEVEL_INDEX` is a data-model
decision I am not qualified to make."** (Hudi, `The record-index split`)
*Fixed.* The section now states the consequence in terms of rows rather than
config: a global index moves the record when its partition value changes, a
non-global one leaves two live rows for one entity. That is checkable against a
schema without understanding indexes.

**"I cannot run the Hudi example; `trips_df` appears from nowhere."**
*Fixed.* The block now builds `trips_df` from a real read and aliases
`ingested_at` to `updated_at`, so it runs as pasted.

## Senior data engineer

**"`hoodie.datasource.write.precombine.field` is deprecated in 1.2.0 and the
post used it without saying so."** (Hudi)
*Fixed.* Verified against `HoodieWriteConfig` at `release-1.2.0`, where
`PRECOMBINE_FIELD_NAME` carries `@Deprecated`, and `HoodieTableConfig`, where
the table property is now `hoodie.table.ordering.fields`. The post keeps the
working key, comments why, and adds a paragraph on the rename, which reinforces
its own thesis.

**"The XTable run command references a jar that does not exist."**
*Fixed.* `xtable-utilities_2.12` returns 404 on Maven Central; only
`xtable-api`, `xtable-core_2.12`, `xtable-spark-runtime_2.12` and a few others
are published. The post now builds from the release tag and uses the path the
project's own `how-to` doc uses.

**"'Every ticket I have seen since 2022 was this' is a statistic nobody can
check."** (playbook)
*Fixed.* Rewritten to describe the shape of the failure rather than assert a
count, and the Log4j 2 behaviour is now stated as "does not error out, ignores
the unknown property, falls back to its normal configuration lookup", which is
what actually happens.

**"Row-group counts in the Parquet post are the only numbers I would trust
elsewhere in this set."**
*Accepted as the intended bar.* Every Parquet transcript is real output from
`parquet-cli` 1.18.0 run locally. No wall-clock timing appears in any of the
three posts; performance claims are mechanisms plus "measure on your own data".

## Data architect

**"The Hudi post described the write path and called it the architecture."**
*Fixed.* A read-path paragraph now separates tagging (`record_index`) from
query-side data skipping (`column_stats`, `partition_stats`) and states plainly
that enabling one does nothing for the other. That conflation is a common and
expensive misconception.

**"XTable's real cost is organisational and the post buried it."**
*Fixed in the conclusion.* The constraint is not inside XTable: incremental sync
works only while the source format retains history back to the last sync, so a
Hudi cleaner setting, an Iceberg `expire_snapshots` policy or a Delta `VACUUM`
schedule owned by another team silently decides whether your conversion is
cheap. The conclusion now names the two numbers to write down.

**"'When not to use' sections risk being decorative."**
*Partly accepted.* The Hudi one is concrete (append-only tables need no index at
all; small tables beat a record index once metadata write amplification is
counted). The XTable one now separates three distinct cases: a migration rather
than a conversion, writers on both sides, and an engine that already has a
native connector. The playbook's is the weakest, since "use `spark.sql.*`
instead" is a pointer rather than an argument, and it stays that way because the
alternative is a performance-tuning post.

## Outstanding: needs author verification

1. **The Kafka batch-size tool targets DStreams.** Its formula
   (`partitions x duration x maxRatePerPartition`, verified in the widget's own
   JS) is the Spark Streaming DStream model. The TL;DR now points at
   `maxOffsetsPerTrigger` for Structured Streaming, but the tool itself has not
   been reworked for it. Worth deciding whether to port or to label it legacy.
2. **The Spark Configuration Generator hardcodes five executor cores and a 10%
   overhead** (read from its JS). Both are conventions. If you have a preferred
   house rule, they are two constants.
3. **No Hudi example was executed.** Unlike the Parquet post, the Hudi and XTable
   posts are verified against source at the release tag but not run against a
   live table. Configs, defaults, enum values and method bodies were read from
   `release-1.2.0` and `0.4.0-incubating`; the code blocks are not transcripts.
4. **`assets/others/Ranga_Reddy_Data_Engineer.pdf` contains a personal phone
   number** and is served publicly. That is your call, but worth a look.
