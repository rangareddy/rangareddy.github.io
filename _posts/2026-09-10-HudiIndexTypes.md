---
title: "How to choose the right Apache Hudi index in 1.2.0"
categories: Hudi
tags: Hudi Lakehouse Indexing Spark
author: Ranga Reddy
date: "2026-09-10 10:00:00 +0530"
description: >-
  Hudi's index decides which file group an incoming record belongs to, which
  makes it the single biggest lever you have on upsert cost. Hudi 1.2.0 gives you
  ten index types to choose from, including a new partition-scoped record index
  that is cheaper than the global one for most partitioned tables.
---

* content
{:toc}

> **TL;DR**
>
> * The index answers one question on every write: for this record key, which file group already holds it? Choosing well is what keeps upsert cost proportional to your batch instead of your table.
> * `hoodie.index.type` has no default value of its own. The Spark and Java clients fall back to `SIMPLE`, and Flink to `INMEMORY`, decided in code rather than in the config.
> * 1.2.0 gives the record index two clearer names: `GLOBAL_RECORD_LEVEL_INDEX` for keys unique table-wide, and `RECORD_LEVEL_INDEX` for keys unique within a partition (added in 1.1.0). `RECORD_INDEX` is the older name for the global one.
> * Each has its own enabling config and its own sizing defaults, tuned to what it stores: 10 to 10000 file groups for the global index, 1 to 10 for the partitioned one. Take the defaults and both are sized sensibly out of the box.
> * The old key `hoodie.metadata.record.index.enable` still works as a registered alias, so upgrades are safe. It maps to the global index, so switch to the new names when you want the partitioned one.

## The question an index answers

An `upsert` into a Hudi table has to find out, for each incoming record, whether
that key already exists and if so which file group holds it. That lookup is
called tagging, and the index is what performs it. Everything downstream depends
on the answer: whether a record becomes an insert into a new file slice or an
update merged into an existing one, how much data gets rewritten, and how much
shuffle the write incurs.

The straightforward approach is a join. Read the record keys out of every file
in the table, join the incoming batch against them, and you have your answer.
That is essentially what `SIMPLE` does, and it is correct, predictable and easy
to reason about. Its cost tracks the size of the table rather than the size of
the batch, which suits full-refresh jobs well and small-batch ingestion less so.

Each of the other index types is a different strategy for skipping that scan,
and Hudi gives you enough of them that one will match your key distribution.

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

That distinction is a data-model decision rather than a performance one, and it
is easy to check against your schema. If a customer row's `country` column is
the partition field and the customer moves country, a global index updates the
existing record and removes it from the old partition, giving you one live row.
A non-global index treats the two partitions independently, which is the right
behaviour when the same key legitimately appears in several partitions.

### Set the index type explicitly

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

So a Spark writer that never sets `hoodie.index.type` is running `SIMPLE`.
That is a reasonable starting point, and setting the key explicitly is a small
change that makes the choice visible to the next person reading the config.

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

The upgrade path here is smooth by design: the key you already know keeps
working. It is worth a minute to understand what it maps to, because 1.2.0 gives
you a cheaper option for partitioned tables.

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
`GLOBAL_RECORD_LEVEL_INDEX`, so nothing breaks on upgrade. If your keys are only
unique per partition, moving to `RECORD_LEVEL_INDEX` is a two-line change that
buys you a smaller index and less metadata to maintain.

**The file-group defaults are matched to what each index stores.** The global
index shards a map of every key in the table, so it defaults to a floor of 10
file groups and a ceiling of 10000. The partitioned index maps keys within a
partition, so its defaults are 1 and 10. Let each index use its own defaults and
the sizing takes care of itself; carrying the global counts across to the
partitioned index is the one thing worth avoiding, since it creates far more file
groups than the data needs.

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

Prefer the new key over `hoodie.metadata.record.index.enable`, even though the
old one resolves. The explicit name tells the next reader which of the two
indexes you meant.

## The other four worth knowing

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
`bloom_filters` partition instead of the data files' footers. It shines when
keys are roughly ordered, since narrow ranges let it skip most files. With
random keys such as UUIDs the ranges overlap and there is less to prune, which is
where the record index takes over.

**`SIMPLE` is the dependable default.** It joins, and it has no index to
bootstrap or keep in step with the data. For small tables, or batch jobs that
rewrite most of the table anyway, that simplicity is worth more than a faster
lookup.

A rough decision order:

| If | Use |
|:--|:--|
| Keys are random, uniqueness is per partition | `RECORD_LEVEL_INDEX` |
| Keys are random, uniqueness is table-wide, partitions can change | `GLOBAL_RECORD_LEVEL_INDEX` |
| Very high write throughput, key space can be partitioned up front | `BUCKET` with the consistent-hashing engine |
| Keys are time-ordered or otherwise clustered | `BLOOM` |
| Small table, or you rewrite most of it every run | `SIMPLE` |

## How to confirm your index is doing its job

A well-matched index is easy to confirm, and each signal points at a specific
adjustment if you want one.

| What you observe | What it tells you |
|:--|:--|
| Upsert time tracks batch size, not table size | The index is doing point lookups. This is the goal |
| Upsert time tracks table size | `hoodie.index.type` is probably unset, so `SIMPLE` is in use |
| One live row per key after a partition value changes | A global index is in play, as intended for a table-wide key |
| Several rows per key across partitions | A non-global index, correct when keys repeat per partition |
| Metadata compaction is a small share of write time | Record-index file groups are sized well |
| Bloom index pruning most files | Your keys are ordered enough for range pruning to pay off |

Two quick checks are worth building into a review. Read the table's
`hoodie.properties` together with the writer configs and confirm
`hoodie.index.type` is a value you chose. Then list
`<base_path>/.hoodie/metadata/record_index/` and count file groups: a handful for
a partitioned index and tens to hundreds for a global one on a large table is the
shape you want.

## When a simpler choice wins

Part of choosing well is recognising when you need less machinery.

Append-only writes need no index at all. Use
`hoodie.datasource.write.operation=insert` or `bulk_insert`, skip tagging
entirely, and you avoid maintaining a second table for a lookup whose answer is
always "not present".

If your table is small enough that reading all its keys is cheap, `SIMPLE` comes
out ahead once you count the metadata table's write amplification and compaction.
The record index earns its keep when the batch is small relative to the table,
which is the CDC and streaming-ingest shape rather than the nightly full-refresh
shape.

On Flink, `INMEMORY` and `FLINK_STATE` are the engine defaults because the Flink
writer already holds the index in its state backend, so you get fast tagging
without configuring anything.

## Production tips

* **Set `hoodie.index.type` explicitly.** An absent value still resolves to
  `SIMPLE`, so writing it down makes the choice visible.
* **Decide global versus partition-scoped from your data model**, not from
  performance. Your schema already tells you which one is right.
* **Prefer the 1.2.0 names** (`GLOBAL_RECORD_LEVEL_INDEX`,
  `RECORD_LEVEL_INDEX`) over `RECORD_INDEX`, which is deprecated.
* **Let each record index keep its own file-group defaults.** They are tuned to
  what each one stores, so the sizing is right out of the box.
* **Leave `hoodie.metadata.enable` on.** The metadata-backed indexes need it, and
  it defaults to `true`.
* **Tune the metadata table's own compaction** with
  `hoodie.metadata.compact.max.delta.commits` when write frequency is high, to
  keep index lookups fast.
* **If you choose `BUCKET`, prefer the consistent-hashing engine.** It lets
  buckets split and merge as your volume grows.

## Conclusion

The index is the config that decides whether a Hudi table's upsert cost tracks
the batch or the table, and that framing is more useful than any list of index
types. It tells you exactly what to watch: as long as write time stays flat while
your table grows, the index is doing its job, and you can spend your tuning
attention elsewhere.

The 1.2.0 naming is a genuine improvement worth adopting. `RECORD_INDEX` and
`hoodie.metadata.record.index.enable` keep working, so upgrades are uneventful,
and the new pair of names makes the choice explicit: `GLOBAL_RECORD_LEVEL_INDEX`
when a key identifies a row across the whole table, `RECORD_LEVEL_INDEX` when it
identifies a row within a partition. Partitioned tables get the cheaper index and
a much smaller metadata footprint for the cost of two config lines.

Treat the decision order in this post as a good starting point and then measure
on your own data. The two properties that decide the answer, your batch size
relative to your table size and how your keys are distributed, are things you can
observe directly, which makes this one of the more tractable tuning decisions
Hudi asks you to make.

## References

* [Hudi indexing documentation](https://hudi.apache.org/docs/indexing/) for the conceptual overview and engine support
* [`HoodieIndex.java` at release-1.2.0](https://github.com/apache/hudi/blob/release-1.2.0/hudi-client/hudi-client-common/src/main/java/org/apache/hudi/index/HoodieIndex.java), the authoritative `IndexType` list and the deprecation note
* [`HoodieMetadataConfig.java` at release-1.2.0](https://github.com/apache/hudi/blob/release-1.2.0/hudi-common/src/main/java/org/apache/hudi/common/config/HoodieMetadataConfig.java) for the record-index keys, aliases and file-group defaults
* [`HoodieIndexConfig.java` at release-1.2.0](https://github.com/apache/hudi/blob/release-1.2.0/hudi-client/hudi-client-common/src/main/java/org/apache/hudi/config/HoodieIndexConfig.java) for `hoodie.index.type` and the per-engine default
* [Hudi metadata table documentation](https://hudi.apache.org/docs/metadata/) for the partitions under `.hoodie/metadata` and their compaction
