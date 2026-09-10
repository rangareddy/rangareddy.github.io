---
title: "Inspecting Parquet files from the command line with parquet-cli"
categories: Tools
tags: Tools Parquet
author: Ranga Reddy
date: "2023-01-12 00:00:00 +0530"
updated: "2026-09-10 10:00:00 +0530"
description: >-
  parquet-tools was deprecated in Parquet 1.12.0 and removed from the build in
  1.12.3. parquet-cli replaced it with a different command set. Here is the
  command-for-command migration, and the two rewrite behaviours that surprise
  people.
---

* content
{:toc}

> **TL;DR**
>
> * `parquet-tools` is gone. It was renamed to `parquet-tools-deprecated` in Parquet 1.12.0 and dropped from the root `pom.xml` in 1.12.3. `parquet-cli` is the maintained replacement.
> * The command set is not a rename. `rowcount`, `size`, `dump` and `merge` do not exist in `parquet-cli`; their work is done by `meta`, `column-size`, `pages` and `rewrite`.
> * `rewrite` is the one to learn. It merges files, prunes columns, masks columns and changes the compression codec, and it replaces the now-deprecated `prune` command.
> * Merging with `rewrite` concatenates row groups rather than coalescing them. Two 10-row files become one file with two row groups of 10, not one row group of 20.
> * `--prune-columns` updates the Parquet schema but leaves the stored `parquet.avro.schema` metadata alone, so an Avro-model reader still sees the pruned field and returns `null` for it.

## What changed, and how to tell

`parquet-tools` was the standard way to look inside a Parquet file for years. It
is no longer part of Apache Parquet. You can watch it leave by diffing the root
`pom.xml` across releases:

| Parquet release | Module in the root `pom.xml` |
|:--|:--|
| 1.11.2 | `parquet-tools` |
| 1.12.0 to 1.12.2 | `parquet-tools-deprecated` |
| 1.12.3 and later | not present |

The replacement, `parquet-cli`, has been in the build the whole time and is
still there in [1.18.0](https://github.com/apache/parquet-java/blob/apache-parquet-1.18.0/pom.xml).
The repository itself was also renamed: `apache/parquet-mr` is now
[`apache/parquet-java`](https://github.com/apache/parquet-java).

The old jar still exists on Maven Central, so a `parquet-tools-1.11.2.jar` you
downloaded in 2022 keeps working. It is also five years of bug fixes behind the
format, and it cannot read anything the format added since: no size statistics,
no geospatial statistics, no Parquet `variant` type. If you are inspecting files
written by a current Spark, Hudi or Iceberg, use `parquet-cli`.

This post is written against **Parquet 1.18.0** on Java 17. Every transcript
below is real output from that version.

## Getting parquet-cli

The published `parquet-cli` runtime jar deliberately does not bundle Hadoop, so
running it standalone needs a handful of jars on the classpath. There are two
sensible ways to deal with that.

### On a cluster, where Hadoop is already there

This is the easy case, and the one you will use most. `hadoop jar` puts the
whole Hadoop client classpath in front of you:

```bash
wget -O parquet-cli.jar \
  https://repo1.maven.org/maven2/org/apache/parquet/parquet-cli/1.18.0/parquet-cli-1.18.0-runtime.jar

hadoop jar parquet-cli.jar org.apache.parquet.cli.Main \
  meta hdfs:///warehouse/hr/employees/part-00000-8f3a1c92.parquet
```

The same jar reads cloud object storage, as long as the matching connector is on
the classpath:

```bash
hadoop jar parquet-cli.jar org.apache.parquet.cli.Main \
  meta s3a://lakehouse-prod/warehouse/hr/employees/part-00000-8f3a1c92.parquet
```

### On a laptop, with no Hadoop install

Fetch the runtime jar plus the shaded Hadoop client and the few libraries
`parquet-cli` expects to find. The logging binding matters more than it looks:
`parquet-cli` writes its output through SLF4J, so with no binding on the
classpath every command exits `0` and prints nothing at all.

```bash
mkdir -p ~/parquet-cli && cd ~/parquet-cli

BASE=https://repo1.maven.org/maven2
curl -sLO $BASE/org/apache/parquet/parquet-cli/1.18.0/parquet-cli-1.18.0-runtime.jar
curl -sLO $BASE/org/apache/hadoop/hadoop-client-api/3.4.1/hadoop-client-api-3.4.1.jar
curl -sLO $BASE/org/apache/hadoop/hadoop-client-runtime/3.4.1/hadoop-client-runtime-3.4.1.jar
curl -sLO $BASE/com/google/guava/guava/33.4.0-jre/guava-33.4.0-jre.jar
curl -sLO $BASE/com/google/guava/failureaccess/1.0.2/failureaccess-1.0.2.jar
curl -sLO $BASE/commons-logging/commons-logging/1.3.5/commons-logging-1.3.5.jar
curl -sLO $BASE/org/slf4j/slf4j-api/1.7.36/slf4j-api-1.7.36.jar
# Without an SLF4J binding, parquet-cli runs and prints nothing.
curl -sLO $BASE/org/slf4j/slf4j-reload4j/1.7.36/slf4j-reload4j-1.7.36.jar
curl -sLO $BASE/ch/qos/reload4j/reload4j/1.2.25/reload4j-1.2.25.jar

cat > log4j.properties <<'PROPS'
log4j.rootLogger=INFO, console
log4j.appender.console=org.apache.log4j.ConsoleAppender
log4j.appender.console.target=System.out
log4j.appender.console.layout=org.apache.log4j.PatternLayout
log4j.appender.console.layout.ConversionPattern=%m%n
PROPS

cat > parquet <<'SH'
#!/usr/bin/env bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec java -cp "$DIR/*:$DIR" org.apache.parquet.cli.Main "$@"
SH
chmod +x parquet
```

Every example from here on uses that `parquet` wrapper.

## Building a file to inspect

`parquet-cli` can create a Parquet file from CSV, which is convenient for
reproducing a problem. Supply an explicit Avro schema so the column types are
what you meant rather than what got inferred:

```bash
cat > employees.csv <<'CSV'
employee_id,first_name,last_name,email,phone_number,hire_date,salary,manager_id
1,Ranga,Reddy,rangareddy@yahoo.com,99509833,2007-06-21,2600,
2,Raja Sekhar,Reddy,raja@gmail.com,75050798,2008-01-13,2600,1
3,Vasundra,Reddy,vasu@gmail.com,91512344,2003-09-17,4400,1
4,Meena,P,meena@test.com,81535555,2004-02-17,13000,2
5,Manoj,Kumar,manu@rediff.com,60312366,2005-08-17,6000,3
6,Vinod,Kumar,vinod@zoho.com,71237777,2002-06-07,6500,3
7,Raja,Reddy,rajar@yahoo.co.in,91518888,2002-06-07,10000,4
8,Shiva,P,shiva@mymail.com,81512380,2002-06-07,12008,6
9,Reddy,Babu,babu@mail.com,91528181,2002-06-07,8300,7
10,Nishanth,Reddy,nish@nish.com,61512347,2003-06-17,24000,2
CSV

cat > employees.avsc <<'AVSC'
{
  "type": "record",
  "name": "employees",
  "namespace": "com.rangareddy.hr",
  "fields": [
    {"name": "employee_id",  "type": "int"},
    {"name": "first_name",   "type": "string"},
    {"name": "last_name",    "type": "string"},
    {"name": "email",        "type": "string"},
    {"name": "phone_number", "type": "long"},
    {"name": "hire_date",    "type": "string"},
    {"name": "salary",       "type": "int"},
    {"name": "manager_id",   "type": ["null", "int"], "default": null}
  ]
}
AVSC

./parquet convert-csv employees.csv -s employees.avsc -o employees.parquet --overwrite
```

The CSV reader does not parse Avro logical types from text, so a
`{"type":"int","logicalType":"date"}` field on a `2007-06-21` column fails with
`Field hire_date: value not a {"type":"int","logicalType":"date"}`. Keep dates as
`string` here, or convert from Avro or JSON instead of CSV.

## The command map

This is the table to keep. The left column is what you typed with
`parquet-tools`; the right column is what does that job now.

| `parquet-tools` | `parquet-cli` | Note |
|:--|:--|:--|
| `cat` | `cat` | Same idea, JSON output by default |
| `head -n N` | `head` / `cat -n N` | `head` defaults to 10 records, not 5 |
| `schema` | `schema` | Prints the Avro schema; `meta` prints the Parquet message type |
| `meta` | `meta` | Now also prints per-column stats and encodings |
| `rowcount` | `meta` | No dedicated command; read `count:` off the row groups |
| `size` | `column-size` / `size-stats` | Per-column bytes and ratio, or unencoded size statistics |
| `dump` | `pages`, `dictionary`, `footer`, `column-index` | Split into one command per structure |
| `merge` | `rewrite -i a,b -o out` | Takes a comma-separated input list |
| (none) | `prune` | Deprecated, removed in 2.0.0, use `rewrite --prune-columns` |
| (none) | `masking` / `rewrite --mask-mode` | Nullify column values in place |
| (none) | `bloom-filter`, `scan`, `check-stats`, `trans-compression`, `geospatial-stats` | Newer format features |

The full list is registered in
[`Main.java`](https://github.com/apache/parquet-java/blob/apache-parquet-1.18.0/parquet-cli/src/main/java/org/apache/parquet/cli/Main.java#L105-L128),
which is the authoritative answer to "does this version have that command".

## Reading data

`cat` prints records as JSON, one per line. `head` is the same command bound to a
10-record limit, and `-n` overrides it:

```bash
./parquet cat -n 2 employees.parquet
```

```
{"employee_id": 1, "first_name": "Ranga", "last_name": "Reddy", "email": "rangareddy@yahoo.com", "phone_number": 99509833, "hire_date": "2007-06-21", "salary": 2600, "manager_id": null}
{"employee_id": 2, "first_name": "Raja Sekhar", "last_name": "Reddy", "email": "raja@gmail.com", "phone_number": 75050798, "hire_date": "2008-01-13", "salary": 2600, "manager_id": 1}
```

Unlike `parquet-tools cat`, there is no separate `--json` flag, because JSON is
the only output format.

## Reading the schema

`schema` gives you the Avro view, which is what most downstream readers see:

```bash
./parquet schema employees.parquet
```

```
{
  "type" : "record",
  "name" : "employees",
  "namespace" : "com.rangareddy.hr",
  "fields" : [ {
    "name" : "employee_id",
    "type" : "int"
  }, {
    "name" : "first_name",
    "type" : "string"
  }, {
    "name" : "manager_id",
    "type" : [ "null", "int" ],
    "default" : null
  } ]
}
```

The Parquet message type is a different thing, and when you are debugging a
type-mismatch it is the one you want, because it shows physical types,
`required` versus `optional`, and the logical-type annotations. It comes out of
`meta`, covered next.

## meta: the one command to run first

`meta` replaces three old commands at once. It reports the writer, the key-value
metadata, the Parquet message type, and per-column statistics per row group:

```bash
./parquet meta employees.parquet
```

```
File path:  employees.parquet
Created by: parquet-mr version 1.18.0 (build 0209dfb48d153f2f3e49a9f12addebe15c0f1d77)
Properties:
  parquet.avro.schema: {"type":"record","name":"employees","namespace":"com.rangareddy.hr","fields":[...]}
    writer.model.name: avro
Schema:
message com.rangareddy.hr.employees {
  required int32 employee_id;
  required binary first_name (STRING);
  required binary last_name (STRING);
  required binary email (STRING);
  required int64 phone_number;
  required binary hire_date (STRING);
  required int32 salary;
  optional int32 manager_id;
}

Row group 0:  count: 10  89.50 B records  start: 4  total(compressed): 895 B total(uncompressed):882 B
--------------------------------------------------------------------------------
              type      encodings count     avg size   nulls   min / max
employee_id   INT32     G   _     10        6.70 B     0       "1" / "10"
first_name    BINARY    G   _     10        12.10 B    0       "Manoj" / "Vinod"
last_name     BINARY    G _ R     10        11.50 B    0       "Babu" / "Reddy"
email         BINARY    G   _     10        15.70 B    0       "babu@mail.com" / "vinod@zoho.com"
phone_number  INT64     G   _     10        9.60 B     0       "60312366" / "99509833"
hire_date     BINARY    G _ R     10        14.40 B    0       "2002-06-07" / "2008-01-13"
salary        INT32     G   _     10        8.20 B     0       "2600" / "24000"
manager_id    INT32     G _ R     10        11.30 B    1       "1" / "7"
```

Four things to read off this, in the order they usually matter:

**`Created by`** identifies the writer. On a mixed cluster this is how you find
out that half your files came from an old engine. Note that the string still
says `parquet-mr` even in 1.18.0, despite the repository rename.

**`count:` per row group** is the row count, so `meta` is also `rowcount`. Add
them up across row groups for the file total.

**The `min / max` column** is why predicate pushdown works or does not. If a
filter on `salary` is not pruning row groups, look here first: statistics that
are absent, or present but useless because the column is unsorted and every row
group spans the full range, explain it immediately.

**The `nulls` column** is a fast data-quality check. `manager_id` showing 1 null
across 10 rows matches the CEO having no manager.

The `encodings` column is compact: `G` is a dictionary-encoded column chunk,
`_` means no dictionary fallback, and `R` indicates RLE. Use `pages` when you
need the per-page detail.

## Architecture: row groups, column chunks and pages

Every command below reports on one level of the same three-level hierarchy, so
it is worth naming the levels before reading their output.

A Parquet file is a sequence of **row groups**, each a horizontal slice of the
rows. Within a row group, each column's values for those rows live in one
**column chunk**, which is the unit that gets its own encoding, compression and
min/max statistics. A column chunk is in turn a sequence of **pages**, which is
the smallest unit the reader decompresses.

That structure is what makes the tooling map onto commands the way it does:
`meta` reports the file and its row groups, `column-size` aggregates column
chunks, and `pages` opens a single column chunk. It is also why predicate
pushdown is a row-group-level and page-level decision: the engine compares your
filter against the statistics at those levels and skips whole chunks or pages it
can prove irrelevant.

`column-size` answers "which column is my file", which is the first question
when a table is unexpectedly large:

```bash
./parquet column-size employees.parquet
```

```
manager_id-> Size In Bytes: 113 Size In Ratio: 0.12625699
employee_id-> Size In Bytes: 67 Size In Ratio: 0.074860334
last_name-> Size In Bytes: 115 Size In Ratio: 0.12849163
phone_number-> Size In Bytes: 96 Size In Ratio: 0.10726257
hire_date-> Size In Bytes: 144 Size In Ratio: 0.16089386
salary-> Size In Bytes: 82 Size In Ratio: 0.09162011
first_name-> Size In Bytes: 121 Size In Ratio: 0.13519552
email-> Size In Bytes: 157 Size In Ratio: 0.17541899
```

Note the output is unordered, so sort it yourself on a wide table. On a real
fact table this is where you discover that one JSON blob column is 70% of your
storage.

`pages` drops to page level within a column chunk, which is where you go when
compression or encoding is the question:

```bash
./parquet pages employees.parquet -c salary
```

```
Column: salary
--------------------------------------------------------------------------------
  page   type  enc  count   avg size   size       rows     nulls   min / max
  0-0    data  G _  10      5.90 B     59 B
```

`size-stats` reports the Parquet size statistics added to the format more
recently, including the unencoded byte size and the repetition and definition
level histograms that let an engine estimate decode cost without reading the
data. Columns with no entry simply have no size statistics written:

```bash
./parquet size-stats employees.parquet
```

```
File path: employees.parquet

Row group 0
--------------------------------------------------------------------------------
column         unencoded bytes rep level histogram   def level histogram
[employee_id]  -               -                     -
[first_name]   61 B            -                     -
[last_name]    41 B            -                     -
[email]        150 B           -                     -
[phone_number] -               -                     -
[hire_date]    100 B           -                     -
[salary]       -               -                     -
[manager_id]   -               -                     -
```

## rewrite: merge, prune, mask, recompress

`rewrite` is the command worth real attention, because it is the only one that
writes data and because it absorbed several older tools. Its own help text is
explicit that `prune` is
[deprecated and will be removed in 2.0.0](https://github.com/apache/parquet-java/blob/apache-parquet-1.18.0/parquet-cli/src/main/java/org/apache/parquet/cli/commands/PruneColumnsCommand.java)
in favour of it.

Merging several files and switching the codec at the same time:

```bash
./parquet rewrite \
  -i employees.parquet,employees_b.parquet \
  -o employees_merged.parquet \
  -c ZSTD \
  --overwrite
```

### Merging does not coalesce row groups

Here is the first behaviour that catches people. Reading the merged file back:

```bash
./parquet meta employees_merged.parquet
```

```
Row group 0:  count: 10  87.00 B records  start: 4    total(compressed): 870 B total(uncompressed):880 B
Row group 1:  count: 10  87.00 B records  start: 874  total(compressed): 870 B total(uncompressed):880 B
```

Two 10-row inputs became one file with two row groups of 10 rows, not one row
group of 20. `rewrite` copies row groups; it does not re-chunk them. That is
what makes it fast, since it can copy column chunks without decoding them, and
it is also why it does not solve the small-files problem the way people expect.
Merging a thousand tiny files gives you one file with a thousand tiny row
groups, which reads almost as badly as a thousand files. If you need real
compaction, rewrite the data through an engine that will re-chunk it, or use your
table format's own compaction (Hudi clustering, Iceberg `rewrite_data_files`).

`rewrite` buys you a cheap physical merge at the cost of not improving row-group
sizing.

### Pruning leaves the Avro schema behind

The second surprise is worse, because it is silent. Prune a column and nullify
another:

```bash
./parquet rewrite \
  -i employees.parquet \
  -o employees_masked.parquet \
  --prune-columns phone_number \
  --mask-mode nullify --mask-columns manager_id \
  --overwrite
```

The Parquet message type is correctly pruned to seven columns:

```
message com.rangareddy.hr.employees {
  required int32 employee_id;
  required binary first_name (STRING);
  required binary last_name (STRING);
  required binary email (STRING);
  required binary hire_date (STRING);
  required int32 salary;
  optional int32 manager_id;
}
```

But the `parquet.avro.schema` entry in the file's key-value metadata still
declares `phone_number`, because `rewrite` copies that metadata through
untouched. An Avro-model reader trusts it, finds no column, and hands you a
`null`:

```bash
./parquet head -n 1 employees_masked.parquet
```

```
{"employee_id": 1, "first_name": "Ranga", "last_name": "Reddy", "email": "rangareddy@yahoo.com", "phone_number": null, "hire_date": "2007-06-21", "salary": 2600, "manager_id": null}
```

`phone_number` is physically gone, `column-size` lists only seven columns, and
yet reading the file returns the field as `null`. If you prune a column for a
GDPR deletion and then verify the result by reading it back with an Avro-based
reader, you will see the field and may conclude the prune failed. Verify with
`meta` or `column-size`, which read the Parquet schema, not with `cat`.

### Nullify only works on optional columns

Masking a `required` column fails outright rather than rewriting the schema:

```
java.io.IOException: Required column [email] cannot be nullified
	at org.apache.parquet.hadoop.rewrite.ParquetRewriter.processBlock(ParquetRewriter.java:533)
```

To scrub a non-nullable column you have to prune it, or rewrite the data through
an engine that can change `required` to `optional`.

## Production tips

* **Start with `meta`.** Writer, row counts, statistics and the message type in
  one command answer most questions.
* **Use `meta` for row counts**, and add the per-row-group `count:` values. There
  is no `rowcount`.
* **Sort `column-size` yourself.** The output order is not by size.
* **Check `min / max` in `meta` before blaming the engine** for a filter that is
  not pruning.
* **Do not treat `rewrite` as compaction.** It preserves row-group boundaries.
* **After `--prune-columns`, verify with `meta` or `column-size`,** never with
  `cat` or `head`, because the stale Avro schema will lie to you.
* **On a cluster, prefer `hadoop jar`** so the Hadoop and connector classpath is
  already correct.
* **Pin the version in your notes.** `Main.java` at the release tag is the only
  reliable list of which commands your jar has.

## When not to use parquet-cli

`parquet-cli` inspects files. It does not understand tables. If your data is a
Hudi, Iceberg or Delta table, the file you found under the table path is one
version of one file group, and reading it directly bypasses everything the table
format does: the timeline or snapshot that decides whether the file is live,
delete files and deletion vectors, log files pending compaction, and schema
evolution recorded at the table level. A `cat` of a Hudi Merge-on-Read base file
shows you pre-merge data and no log-file updates at all.

For table-level questions use the format's own tooling: Hudi's CLI and metadata
table, or Iceberg's metadata tables and `CALL` procedures. Reach for
`parquet-cli` when the question is genuinely about one file: is the statistic
there, what wrote it, why is this column so large.

## Conclusion

The migration from `parquet-tools` to `parquet-cli` is usually described as a
rename, and that framing is what wastes people's time. The command set is
genuinely different: four commands you probably used every week do not exist any
more, `dump` was split into four narrower commands, and one new command,
`rewrite`, absorbed both `merge` and `prune`. Learning `meta` and `rewrite`
covers most of what you used the old tool for.

The two `rewrite` behaviours in this post are worth remembering past this page,
because both are silent. Merging preserves row-group boundaries, so it will not
fix small files no matter how many you feed it. Pruning updates the Parquet
schema but not the Avro schema recorded beside it, so the safest verification of
a column removal is the one command that reads the physical schema rather than
the record model. Neither of these is a bug. Both are the consequence of
`rewrite` copying column chunks instead of decoding them, which is also why it is
fast.

If you came here from a search for `parquet-tools`, the jar on Maven Central
still runs and this post is not asking you to migrate today. It is asking you to
know that the tool is unmaintained, that it cannot see the statistics and types
the format has added since 2022, and that the file it silently reports nothing
about may be a file your current engine wrote.

## References

* [Apache Parquet Java on GitHub](https://github.com/apache/parquet-java), formerly `apache/parquet-mr`
* [`Main.java` at the 1.18.0 tag](https://github.com/apache/parquet-java/blob/apache-parquet-1.18.0/parquet-cli/src/main/java/org/apache/parquet/cli/Main.java#L105-L128), the registered command list for the release you are running
* [The 1.12.3 root `pom.xml`](https://github.com/apache/parquet-java/blob/apache-parquet-1.12.3/pom.xml), the release where the `parquet-tools` module disappears
* [`parquet-cli` on Maven Central](https://repo1.maven.org/maven2/org/apache/parquet/parquet-cli/) for the runtime jar
* [Parquet file format specification](https://parquet.apache.org/docs/file-format/) for row groups, column chunks, pages and statistics
