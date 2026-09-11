---
layout: page
title: Links
permalink: /links/
icon: link
type: page
description: >-
  The handful of pages I keep open while working on Spark, Hudi, Iceberg and the
  rest of the lakehouse stack.
---

* content
{:toc}

## About this page

A short list rather than a directory. These are the pages that answer most
day-to-day questions, plus the repositories worth opening when only the source
settles an argument.

Documentation URLs containing `latest` follow the current release. If you are on
an older line, change the version in the URL before trusting a default.

## Apache Spark

| Link | Why |
|:--|:--|
| [Spark website](https://spark.apache.org/) | Releases and news |
| [Documentation](https://spark.apache.org/docs/latest/) | Entry point for the version you are running |
| [Configuration reference](https://spark.apache.org/docs/latest/configuration.html) | Every property, its default and the version it appeared in |
| [Spark SQL guide](https://spark.apache.org/docs/latest/sql-programming-guide.html) | DataFrame and SQL semantics |
| [Structured Streaming guide](https://spark.apache.org/docs/latest/structured-streaming-programming-guide.html) | Triggers, watermarks and output modes |
| [SQL performance tuning](https://spark.apache.org/docs/latest/sql-performance-tuning.html) | AQE, join hints and partition coalescing |
| [apache/spark on GitHub](https://github.com/apache/spark) | Where a default is finally confirmed |

## Apache Hudi

| Link | Why |
|:--|:--|
| [Hudi website](https://hudi.apache.org/) | Releases and blog |
| [Overview](https://hudi.apache.org/docs/overview) | The timeline, file groups and file slices |
| [Table types](https://hudi.apache.org/docs/table_types) | Copy-on-Write versus Merge-on-Read, and the query types each supports |
| [Indexes](https://hudi.apache.org/docs/indexes) | Choosing between bloom, bucket, simple and the record-level indexes |
| [Configuration reference](https://hudi.apache.org/docs/configurations/) | Every `hoodie.*` key, with defaults and since-versions |
| [apache/hudi on GitHub](https://github.com/apache/hudi) | Config defaults and behaviour, at a release tag |

## Apache Iceberg

| Link | Why |
|:--|:--|
| [Iceberg website](https://iceberg.apache.org/) | Releases and the version support matrix |
| [Documentation](https://iceberg.apache.org/docs/latest/) | Entry point for the current release |
| [Table spec](https://iceberg.apache.org/spec/) | The format itself: manifests, snapshots, deletes and deletion vectors |
| [Spark getting started](https://iceberg.apache.org/docs/latest/spark-getting-started/) | The runtime coordinate and session extensions |
| [Spark procedures](https://iceberg.apache.org/docs/latest/spark-procedures/) | `rewrite_data_files`, `expire_snapshots` and the rest of the `CALL` surface |
| [apache/iceberg on GitHub](https://github.com/apache/iceberg) | The Spark and Scala support matrix lives in the build files |

## Other table formats

| Link | Why |
|:--|:--|
| [Apache XTable](https://xtable.apache.org/) | Exposing one table format as another by converting metadata |
| [Delta Lake documentation](https://docs.delta.io/latest/index.html) | Protocol, table features and maintenance |
| [Apache Paimon](https://paimon.apache.org/) | Streaming-first lakehouse format |

## File formats

| Link | Why |
|:--|:--|
| [Parquet documentation](https://parquet.apache.org/docs/) | File layout, encodings and statistics |
| [apache/parquet-java on GitHub](https://github.com/apache/parquet-java) | Formerly `parquet-mr`, and where `parquet-cli` lives |
| [Apache Avro documentation](https://avro.apache.org/docs/) | Schemas and schema resolution rules |

## Query engines and streaming

| Link | Why |
|:--|:--|
| [Trino documentation](https://trino.io/docs/current/) | Connector reference, including Hudi, Iceberg and Delta |
| [Kafka documentation](https://kafka.apache.org/documentation/) | Broker, producer and consumer configuration |
| [Flink documentation](https://nightlies.apache.org/flink/flink-docs-stable/) | Stable docs, including the table and SQL APIs |

## Platform

| Link | Why |
|:--|:--|
| [Apache Hadoop](https://hadoop.apache.org/) | HDFS and YARN, still underneath a lot of this |
| [Apache Hive](https://hive.apache.org/) | Metastore, which most catalogs still talk to |
| [Scala](https://www.scala-lang.org/) | The binary-compatibility rules that decide your artifact suffix |
