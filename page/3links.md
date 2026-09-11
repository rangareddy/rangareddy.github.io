---
layout: page
title: Links
permalink: /links/
icon: link
type: page
description: >-
  The documentation, specs and source I actually keep open while working on
  Spark, Hudi, Iceberg and the rest of the lakehouse stack.
---

* content
{:toc}

## About this page

These are the pages I keep coming back to, rather than a directory of everything
that exists. Where a project has both a narrative guide and a reference, both are
listed, because the two answer different questions. Where the source is the only
authoritative answer, the repository is listed too.

Every link here was checked at the last update to this page.

## Apache Spark

The docs are versioned, and `latest` follows the current release. If you are on
an older line, switch the version in the URL before trusting a default.

| Link | Why |
|:--|:--|
| [Spark website](https://spark.apache.org/) | Releases and news |
| [Documentation index](https://spark.apache.org/docs/latest/) | Entry point for the version you are running |
| [Configuration reference](https://spark.apache.org/docs/latest/configuration.html) | Every property, its default and the version it appeared in |
| [Spark SQL guide](https://spark.apache.org/docs/latest/sql-programming-guide.html) | DataFrame and SQL semantics |
| [Structured Streaming guide](https://spark.apache.org/docs/latest/structured-streaming-programming-guide.html) | Triggers, watermarks and output modes |
| [Tuning guide](https://spark.apache.org/docs/latest/tuning.html) | Serialization, memory and parallelism |
| [SQL performance tuning](https://spark.apache.org/docs/latest/sql-performance-tuning.html) | AQE, join hints and partition coalescing |
| [Running on YARN](https://spark.apache.org/docs/latest/running-on-yarn.html) | Container sizing, log aggregation, custom Log4j 2 configs |
| [Running on Kubernetes](https://spark.apache.org/docs/latest/running-on-kubernetes.html) | Pod templates, volumes and the driver service |
| [Web UI guide](https://spark.apache.org/docs/latest/web-ui.html) | What each tab is actually telling you |
| [apache/spark on GitHub](https://github.com/apache/spark) | The only place a default is truly confirmed |
| [SPARK on JIRA](https://issues.apache.org/jira/projects/SPARK/issues) | Search before assuming you found a new bug |

## Apache Hudi

| Link | Why |
|:--|:--|
| [Hudi website](https://hudi.apache.org/) | Releases and blog |
| [Overview](https://hudi.apache.org/docs/overview) | The timeline, file groups and file slices |
| [Table types](https://hudi.apache.org/docs/table_types) | Copy-on-Write versus Merge-on-Read, and the query types each supports |
| [Indexes](https://hudi.apache.org/docs/indexes) | Choosing between bloom, bucket, simple and the record-level indexes |
| [Compaction](https://hudi.apache.org/docs/compaction/) | Inline versus async, and the strategies |
| [Clustering](https://hudi.apache.org/docs/clustering/) | Re-sorting and file sizing without changing the data |
| [Metadata table](https://hudi.apache.org/docs/metadata/) | File listings, column stats and the index partitions |
| [Concurrency control](https://hudi.apache.org/docs/concurrency_control/) | Optimistic concurrency and multi-writer setups |
| [Configuration reference](https://hudi.apache.org/docs/configurations/) | Every `hoodie.*` key, with defaults and since-versions |
| [Hudi Streamer](https://hudi.apache.org/docs/hoodie_streaming_ingestion) | Managed ingestion, formerly DeltaStreamer |
| [apache/hudi on GitHub](https://github.com/apache/hudi) | Config defaults and behaviour, at a release tag |
| [HUDI on JIRA](https://issues.apache.org/jira/projects/HUDI/issues) | Existing reports and RFCs |
| [Get involved](https://hudi.apache.org/community/get-involved) | Mailing lists and Slack, for questions the docs do not answer |

## Apache Iceberg

| Link | Why |
|:--|:--|
| [Iceberg website](https://iceberg.apache.org/) | Releases and the version support matrix |
| [Documentation](https://iceberg.apache.org/docs/latest/) | Entry point for the current release |
| [Table spec](https://iceberg.apache.org/spec/) | The format itself: manifests, snapshots, deletes and deletion vectors |
| [Spark getting started](https://iceberg.apache.org/docs/latest/spark-getting-started/) | The runtime coordinate and session extensions |
| [Spark configuration](https://iceberg.apache.org/docs/latest/spark-configuration/) | Catalog properties, and `SparkCatalog` versus `SparkSessionCatalog` |
| [Spark procedures](https://iceberg.apache.org/docs/latest/spark-procedures/) | `rewrite_data_files`, `expire_snapshots` and the rest of the `CALL` surface |
| [Maintenance](https://iceberg.apache.org/docs/latest/maintenance/) | Snapshot expiry, orphan files and compaction |
| [Partitioning](https://iceberg.apache.org/docs/latest/partitioning/) | Hidden partitioning and partition evolution |
| [apache/iceberg on GitHub](https://github.com/apache/iceberg) | The support matrix lives in each release's build files |

## Interoperability and other table formats

| Link | Why |
|:--|:--|
| [Apache XTable](https://xtable.apache.org/) | Exposing one table format as another by converting metadata |
| [XTable how-to](https://xtable.apache.org/docs/how-to) | The dataset config and the sync modes |
| [apache/incubator-xtable on GitHub](https://github.com/apache/incubator-xtable) | Where the per-format sync logic lives |
| [Delta Lake](https://delta.io/) | Project home |
| [Delta Lake documentation](https://docs.delta.io/latest/index.html) | Protocol, table features and maintenance |
| [delta-io/delta on GitHub](https://github.com/delta-io/delta) | Source and protocol specs |
| [Apache Paimon](https://paimon.apache.org/) | Streaming-first lakehouse format |
| [Project Nessie](https://projectnessie.org/) | Git-style branching and tagging for lakehouse catalogs |

## File formats

| Link | Why |
|:--|:--|
| [Apache Parquet](https://parquet.apache.org/) | Project home |
| [Parquet documentation](https://parquet.apache.org/docs/) | File layout, encodings and statistics |
| [apache/parquet-java on GitHub](https://github.com/apache/parquet-java) | Formerly `parquet-mr`, and where `parquet-cli` lives |
| [Apache Avro documentation](https://avro.apache.org/docs/) | Schemas and schema resolution rules |
| [Apache ORC](https://orc.apache.org/) | The other columnar format you will meet in Hive estates |

## Query engines and streaming

| Link | Why |
|:--|:--|
| [Trino](https://trino.io/) | Project home |
| [Trino documentation](https://trino.io/docs/current/) | Connector reference, including Hudi, Iceberg and Delta |
| [Apache Kafka](https://kafka.apache.org/) | Project home |
| [Kafka documentation](https://kafka.apache.org/documentation/) | Broker, producer and consumer configuration |
| [Apache Flink](https://flink.apache.org/) | Project home |
| [Flink documentation](https://nightlies.apache.org/flink/flink-docs-stable/) | Stable docs, including the table and SQL APIs |

## Platform and languages

| Link | Why |
|:--|:--|
| [Apache Hadoop](https://hadoop.apache.org/) | HDFS and YARN, still underneath a lot of this |
| [Apache Hive](https://hive.apache.org/) | Metastore, which most catalogs still talk to |
| [Apache HBase](https://hbase.apache.org/) | Wide-column store for low-latency lookups |
| [Apache Airflow](https://airflow.apache.org/) | Orchestration for the pipelines above |
| [Scala](https://www.scala-lang.org/) | Language docs, and the binary-compatibility rules that decide your artifact suffix |
| [Java 17 documentation](https://docs.oracle.com/en/java/javase/17/) | The JVM baseline for current Spark |
| [The Hadoop Ecosystem Table](https://hadoopecosystemtable.github.io/) | A map of the wider ecosystem, useful for orientation |
