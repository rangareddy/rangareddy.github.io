---
title: "Choosing an Apache Hudi index in 1.2.0, and the record-index rename nobody noticed"
categories: Hudi
tags: Hudi Lakehouse Indexing Spark
author: Ranga Reddy
date: "2026-09-10 10:00:00 +0530"
description: >-
  Hudi's index decides which file group an incoming record belongs to, and it is
  the single biggest lever on upsert cost. Hudi 1.2.0 ships ten index types,
  deprecated the one everyone was told to use, and split it into a global and a
  partition-scoped variant with different config keys and very different
  defaults.
---

* content
{:toc}

> **TL;DR**
>
> * The index answers one question on every write: for this record key, which file group already holds it? Get it wrong and every upsert degrades into a shuffle-heavy join against the table.
> * `hoodie.index.type` has no default value of its own. The Spark and Java clients fall back to `SIMPLE`, and Flink to `INMEMORY`, decided in code rather than in the config.
> * `RECORD_INDEX` is deprecated in 1.2.0. It split into `GLOBAL_RECORD_LEVEL_INDEX` (key unique table-wide) and `RECORD_LEVEL_INDEX` (key unique only within a partition, added in 1.1.0).
> * The two have separate enabling configs and wildly different file-group defaults: 10 to 10000 file groups for the global one, 1 to 10 for the partitioned one. Copying the global sizing onto a partitioned index over-provisions by three orders of magnitude.
> * The old key `hoodie.metadata.record.index.enable` still works, as a registered alternative to the new name. It will silently keep enabling the global index when you may have wanted the partitioned one.

## The question an index answers

An `upsert` into a Hudi table has to find out, for each incoming record, whether
that key already exists and if so which file group holds it. That lookup is
called tagging, and the index is what performs it. Everything downstream depends
on the answer: whether a record becomes an insert into a new file slice or an
update merged into an existing one, how much data gets rewritten, and how much
shuffle the write incurs.

The naive approach is a join. Read the record keys out of every file in the
table, join the incoming batch against them, and you have your answer. That is
essentially what `SIMPLE` does, and it is correct, predictable and expensive:
the cost scales with the size of the table, not the size of the batch. On a
table of a few hundred gigabytes with hourly micro-batches, you are reading the
entire table's keys every hour to write a few thousand records.

Every other index type in Hudi is a different bet on how to avoid that scan.

This post is written against **Hudi 1.2.0**, whose Spark bundles are published
for Spark 3.3 through 4.1. All configuration keys, defaults and enum values
below were read from the
[`release-1.2.0`](https://github.com/apache/hudi/tree/release-1.2.0) tag while
writing, because several of them changed in 1.1.0 and 1.2.0.

Prerequisites: Hudi's [indexing
documentation](https://hudi.apache.org/docs/indexing/) and the [metadata table
overview](https://hudi.apache.org/docs/metadata/). Two terms used throughout:
a **file group** is the unit of record locality in a Hudi table, identified by a
file ID, and a **file slice** is one version of a file group, a base file plus
any log files written against it.

## The ten index types in 1.2.0

`HoodieIndex.IndexType` is the authoritative list. In 1.2.0 it has ten values:

| Index type | Uniqueness scope | Lookup mechanism |
|:--|:--|:--|
| `INMEMORY` | partition | In-memory hash map (Spark, Java); Flink in-memory state |
| `BLOOM` | partition | Bloom filters built from record keys, optionally pruned by key ranges |
| `GLOBAL_BLOOM` | table | Same, enforced across all partitions |
| `SIMPLE` | partition | Join the batch against keys read from storage |
| `GLOBAL_SIMPLE` | table | Same, enforced across all partitions |
| `BUCKET` | partition | Hash the key to a bucket, so no lookup at all |
| `FLINK_STATE` | partition | Flink state backend; internal to the Flink writer |
| `RECORD_INDEX` | table | Key to location map in the metadata table. **Deprecated in 1.2.0** |
| `GLOBAL_RECORD_LEVEL_INDEX` | table | Replacement for `RECORD_INDEX` |
| `RECORD_LEVEL_INDEX` | partition | Partition path plus key maps to a location. New in 1.1.0 |

"Global" is the word that matters. A global index enforces that a record key is
unique across the whole table, which means it can also move a record between
partitions when its partition value changes. A non-global index only guarantees
uniqueness inside a partition, so the same key can legitimately exist in two
partitions and an update has to be told which one to target.

That distinction is not a performance detail. It changes what the table means.
If a customer row's `country` column is the partition field and the customer
moves country, a global index updates the existing record and deletes it from
the old partition; a non-global index writes a second copy and leaves you with
two live rows for one customer.

### There is no default in the config

`hoodie.index.type` is declared with `noDefaultValue()`. The default is chosen in
`HoodieIndexConfig.Builder#getDefaultIndexType` based on the engine:

```java
switch (engineType) {
  case SPARK:
  case JAVA:
    return HoodieIndex.IndexType.SIMPLE.name();
  case FLINK:
    return HoodieIndex.IndexType.INMEMORY.name();
  ...
}
```

So a Spark writer that never sets `hoodie.index.type` is running `SIMPLE`, the
one whose cost scales with table size. This is worth checking on any table
someone else configured, because it does not appear in the table properties as
an explicit choice; it is simply absent.

## Architecture: where the index sits on the write path

The metadata-table-backed indexes are the interesting ones, so it is worth being
concrete about where they live.

Hudi keeps an internal Hudi table inside your table, at
`<base_path>/.hoodie/metadata`, built from `HoodieTableMetaClient.METADATA_TABLE_FOLDER_PATH`.
It is a Merge-on-Read table, which is why it can absorb high-frequency updates
without rewriting everything, and it is enabled by default:
`hoodie.metadata.enable` has defaulted to `true` since 0.7.0.

Each kind of metadata lives in its own partition of that table, named by the
constants in `HoodieTableMetadataUtil`:

```
s3a://lakehouse-prod/warehouse/trips/
├── .hoodie/
│   ├── metadata/                       <- the internal metadata table
│   │   ├── files/                      <- partition to file listing
│   │   ├── column_stats/               <- per-column min/max per file
│   │   ├── bloom_filters/              <- bloom filters, for BLOOM lookups
│   │   ├── record_index/               <- record key -> file group
│   │   ├── partition_stats/
│   │   ├── expr_index_<name>/
│   │   └── secondary_index_<name>/
│   └── <instant files: .commit, .deltacommit, .clean, ...>
├── city_id=sf/
│   ├── 8f3a1c92-....parquet            <- base file of one file slice
│   └── .8f3a1c92-....log.1_0-...       <- log file, Merge-on-Read
└── city_id=nyc/
```

The `record_index` partition is a key-to-location map, sharded across file
groups whose IDs are prefixed `record-index-`. On the write path, tagging with a
record index is a point lookup into those file groups rather than a scan of the
data table. The cost scales with the size of the incoming batch, which is the
whole point.

The read path is worth separating out, because the metadata table serves queries
too and the two uses are often conflated. Tagging on the write path uses the
`record_index` partition. Query-side data skipping uses `column_stats` and
`partition_stats`, which let the engine prune file groups by column ranges
before reading any data. Enabling a record index therefore does nothing for
query performance, and enabling column stats does nothing for upsert cost. They
are separate partitions of the same table, enabled by separate configs.

The trade this makes: a record index buys batch-proportional tagging at the cost
of a second table to keep consistent. Every write to the data table also writes
to the metadata table, the metadata table needs its own compaction
(`hoodie.metadata.compact.max.delta.commits`), and the index has to be
bootstrapped over existing data before it is usable.

## The record-index split

This is the part that catches people upgrading, because the config key they know
still works and no longer means what they think.

In 0.14.0, Hudi added one record index, enabled with
`hoodie.metadata.record.index.enable`, and one index type, `RECORD_INDEX`. It was
global: keys unique across the table.

In 1.1.0 a partition-scoped variant arrived, and in 1.2.0 the original enum value
carries `@Deprecated` with the reason stated in its own description: use
`GLOBAL_RECORD_LEVEL_INDEX` for global uniqueness or `RECORD_LEVEL_INDEX` for
partition-level uniqueness. The configs were renamed to match, keeping the old
names as registered alternatives:

| Concern | Global record index | Partitioned record index |
|:--|:--|:--|
| Index type | `GLOBAL_RECORD_LEVEL_INDEX` | `RECORD_LEVEL_INDEX` |
| Enable config | `hoodie.metadata.global.record.level.index.enable` | `hoodie.metadata.record.level.index.enable` |
| Old alias | `hoodie.metadata.record.index.enable` | none |
| Default | `false` | `false` |
| Since | 0.14.0 | 1.1.0 |
| Min file groups | 10 | 1 |
| Max file groups | 10000 | 10 |
| Uniqueness | Record key, table-wide | Partition path plus record key |

Two things to take from that table.

**The old key is an alias for the global one.** `withAlternatives` means
`hoodie.metadata.record.index.enable=true` still resolves, and it resolves to
`GLOBAL_RECORD_LEVEL_INDEX`. If your keys are only unique per partition and you
carried that config forward from 0.14, you are running a global index and paying
for table-wide uniqueness enforcement you do not need.

**The file-group defaults differ by three orders of magnitude.** The global index
has to shard a map of every key in the table, so it defaults to a floor of 10
file groups and a ceiling of 10000. The partitioned index only maps keys within a
partition, so its defaults are 1 and 10. Copying
`hoodie.metadata.global.record.level.index.max.filegroup.count` onto a
partitioned index creates thousands of nearly empty file groups, each with its
own base and log files, and the metadata table's own compaction then has to
maintain all of them.

The record index is not the only thing renamed in this line of releases. The
write option `hoodie.datasource.write.precombine.field` is marked `@Deprecated`
in 1.2.0, and the table property it corresponds to is now
`hoodie.table.ordering.fields`, keeping `hoodie.table.precombine.field` as an
alias. The write option still works, because `DataSourceOptions.ORDERING_FIELDS`
resolves to it, so this is a rename to follow rather than a break to fix.

Sizing is driven by two more configs, both unchanged: file groups are capped at
`hoodie.metadata.record.index.max.filegroup.size` (default 1 GiB, because "large
file group takes longer to compact"), and the estimate of how many you need
multiplies the current record count by
`hoodie.metadata.record.index.growth.factor` (default `2.0`) to leave headroom.

### Enabling the partitioned record index

For a table whose keys are unique within a partition, on Spark 3.5:

```bash
spark-shell \
  --packages org.apache.hudi:hudi-spark3.5-bundle_2.12:1.2.0 \
  --conf spark.serializer=org.apache.spark.serializer.KryoSerializer \
  --conf spark.sql.extensions=org.apache.spark.sql.hudi.HoodieSparkSessionExtension \
  --conf spark.sql.catalog.spark_catalog=org.apache.spark.sql.hudi.catalog.HoodieCatalog
```

```python
from pyspark.sql import functions as F

base_path = "s3a://lakehouse-prod/warehouse/trips"
table_name = "trips"

trips_df = (spark.read.format("parquet")
    .load("s3a://lakehouse-prod/raw/trips/")
    .select("trip_id", "city_id", "rider_id", "fare_amount", "started_at",
            F.col("ingested_at").alias("updated_at")))

hudi_options = {
    "hoodie.table.name": table_name,
    "hoodie.datasource.write.table.name": table_name,
    "hoodie.datasource.write.recordkey.field": "trip_id",
    "hoodie.datasource.write.partitionpath.field": "city_id",
    # Deprecated in 1.2.0 but still the key the Spark datasource reads
    # (DataSourceOptions.ORDERING_FIELDS maps to it). The table property is now
    # hoodie.table.ordering.fields, with hoodie.table.precombine.field as its alias.
    "hoodie.datasource.write.precombine.field": "updated_at",
    "hoodie.datasource.write.operation": "upsert",
    "hoodie.datasource.write.table.type": "MERGE_ON_READ",

    # trip_id is unique per city, not across cities, so the partition-scoped
    # index is the correct one and the cheaper one.
    "hoodie.index.type": "RECORD_LEVEL_INDEX",
    "hoodie.metadata.enable": "true",
    "hoodie.metadata.record.level.index.enable": "true",

    # Defaults are 1 and 10. Raise the ceiling only once a partition's key map
    # actually approaches the 1 GiB per-file-group cap.
    "hoodie.metadata.record.level.index.max.filegroup.count": "10",
}

(trips_df.write.format("hudi")
    .options(**hudi_options)
    .mode("append")
    .save(base_path))
```

For a table where the key is a true primary key across the whole table, swap the
two index lines:

```python
hudi_options.update({
    "hoodie.index.type": "GLOBAL_RECORD_LEVEL_INDEX",
    "hoodie.metadata.global.record.level.index.enable": "true",
})
del hudi_options["hoodie.metadata.record.level.index.enable"]
```

Use the new key rather than `hoodie.metadata.record.index.enable`, even though
the old one resolves. The alias tells a future reader nothing about which of the
two indexes you meant.

## Choosing between the others

The record index is not always the answer. The three alternatives worth knowing:

**`BUCKET` does no lookup at all.** It hashes the key to a fixed number of
buckets and derives the file group from the hash, so tagging costs nothing and
there is no index to maintain or bootstrap. The price is that the bucket count is
part of your table's physical layout. `hoodie.bucket.index.num.buckets` sets it,
and `hoodie.bucket.index.hash.field` defaults to the record key field if you
leave it unset. Get the count wrong and every file group is either tiny or
enormous, with no incremental way out; `hoodie.index.bucket.engine` selects
between the simple engine and the consistent-hashing engine, and the latter
exists precisely so buckets can be split and merged
(`hoodie.bucket.index.split.threshold`, `hoodie.bucket.index.merge.threshold`)
rather than fixed forever. Bucket index buys free tagging at the cost of
committing to a partitioning of the key space up front.

**`BLOOM` prunes candidate files rather than scanning them.** Hudi writes a
bloom filter per file, then tests incoming keys against those filters and only
opens the files that might contain a match. `hoodie.bloom.index.prune.by.ranges`
(min/max key ranges) narrows it further, and
`hoodie.bloom.index.use.metadata` reads the filters from the metadata table's
`bloom_filters` partition instead of the data files' footers. It works well when
keys are roughly ordered, so ranges are narrow. It degrades badly with random
keys such as UUIDs, where every file's key range spans the whole space and no
file can be pruned.

**`SIMPLE` is the honest default.** It joins and it does not pretend otherwise.
For small tables, or batch jobs that rewrite most of the table anyway, it is
fine and has no index to go stale.

A rough decision order:

| If | Use |
|:--|:--|
| Keys are random, uniqueness is per partition | `RECORD_LEVEL_INDEX` |
| Keys are random, uniqueness is table-wide, partitions can change | `GLOBAL_RECORD_LEVEL_INDEX` |
| Very high write throughput, key space can be partitioned up front | `BUCKET` with the consistent-hashing engine |
| Keys are time-ordered or otherwise clustered | `BLOOM` |
| Small table, or you rewrite most of it every run | `SIMPLE` |

## What failure looks like

The failure modes here are mostly quiet, which is why they are worth naming.

| Symptom | Likely cause |
|:--|:--|
| Upsert time grows with table size, not batch size | No `hoodie.index.type` set, so `SIMPLE` |
| Duplicate keys across partitions after a partition value changed | Non-global index where a global one was needed |
| Metadata table compaction dominating write time | Too many record-index file groups, often global defaults on a partitioned index |
| Bloom index barely pruning anything | Random keys; the key ranges all overlap |
| Skewed file group sizes that never rebalance | `BUCKET` with the simple engine and a bucket count set too low |

For the first one, the check is direct: read the table's `hoodie.properties` and
the writer configs and confirm `hoodie.index.type` is set to something you chose.
For the third, list `<base_path>/.hoodie/metadata/record_index/` and count file
groups; a partitioned index with hundreds of them is misconfigured.

## When not to use a record index

If your writes are append-only, you do not need an index at all. Use
`hoodie.datasource.write.operation=insert` or `bulk_insert` and skip tagging
entirely. Paying for a record index on a table that never updates a key is pure
overhead: a second table to write, compact and clean, for a lookup whose answer
is always "not present".

If your table is small enough that reading all its keys is cheap, `SIMPLE` will
beat a record index once you count the metadata table's write amplification and
compaction cost. The record index earns its keep when the batch is small relative
to the table, which is the CDC and streaming-ingest shape, not the nightly
full-refresh shape.

And if you are on Flink, the engine default `INMEMORY` and `FLINK_STATE` exist
because the Flink writer holds the index in state; reaching for a Spark-oriented
index type there is usually the wrong move.

## Production tips

* **Set `hoodie.index.type` explicitly.** The absence of a value is a decision,
  and the decision is `SIMPLE`.
* **Decide global versus partition-scoped from your data model**, not from
  performance. It changes correctness when partition values mutate.
* **Prefer the 1.2.0 names** (`GLOBAL_RECORD_LEVEL_INDEX`,
  `RECORD_LEVEL_INDEX`) over `RECORD_INDEX`, which is deprecated.
* **Never copy `global.record.level.index.*` file-group counts onto
  `record.level.index.*`.** The defaults differ by 1000x for a reason.
* **Leave `hoodie.metadata.enable` on.** The metadata-backed indexes need it, and
  it defaults to `true`.
* **Tune the metadata table's own compaction** with
  `hoodie.metadata.compact.max.delta.commits` when write frequency is high; an
  uncompacted metadata table makes index lookups progressively slower.
* **If you choose `BUCKET`, choose the consistent-hashing engine** unless you are
  certain the key distribution and volume will not change.

## Conclusion

The index is the config that decides whether a Hudi table's upsert cost tracks
the batch or the table. That framing is more useful than any table of index
types, because it tells you what to measure: if write time grows as the table
grows while your batches stay the same size, the index is doing a scan
somewhere, and no amount of executor tuning will fix it.

The 1.2.0 rename is worth attention out of proportion to its size, because it is
the rare breaking change that does not break anything. `RECORD_INDEX` still
works, `hoodie.metadata.record.index.enable` still resolves, nothing warns, and
the table you get is a global index. For tables whose keys are unique per
partition, that is a table enforcing an invariant you never asked for, sharded
across a minimum of ten metadata file groups when one would do. The fix is two
config lines; noticing that you need it is the hard part.

If you are picking an index for a new table, the order in this post is a starting
point and not a substitute for measuring: the shape that matters is your batch
size relative to your table size, and your key distribution. Both are properties
of your data that no default can guess.

## References

* [Hudi indexing documentation](https://hudi.apache.org/docs/indexing/) for the conceptual overview and engine support
* [`HoodieIndex.java` at release-1.2.0](https://github.com/apache/hudi/blob/release-1.2.0/hudi-client/hudi-client-common/src/main/java/org/apache/hudi/index/HoodieIndex.java), the authoritative `IndexType` list and the deprecation note
* [`HoodieMetadataConfig.java` at release-1.2.0](https://github.com/apache/hudi/blob/release-1.2.0/hudi-common/src/main/java/org/apache/hudi/common/config/HoodieMetadataConfig.java) for the record-index keys, aliases and file-group defaults
* [`HoodieIndexConfig.java` at release-1.2.0](https://github.com/apache/hudi/blob/release-1.2.0/hudi-client/hudi-client-common/src/main/java/org/apache/hudi/config/HoodieIndexConfig.java) for `hoodie.index.type` and the per-engine default
* [Hudi metadata table documentation](https://hudi.apache.org/docs/metadata/) for the partitions under `.hoodie/metadata` and their compaction
