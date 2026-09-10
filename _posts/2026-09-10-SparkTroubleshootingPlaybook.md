---
title: "Spark JVM troubleshooting playbook: logging, class loading, stack size and proxies"
categories: Spark
tags: Spark Troubleshoot Logging
author: Ranga Reddy
date: "2026-09-10 09:00:00 +0530"
description: >-
  Four things you end up doing on nearly every Spark escalation: swap in a custom
  Log4j 2 config, trace class loading, raise the JVM stack size, and push traffic
  through an HTTP proxy. All of them go through the same two configs, and Spark
  3.3 quietly changed how the logging one works.
redirect_from:
  - /SparkCustomLogging/
  - /SparkStackOverflow/
  - /SparkVerbose/
  - /SparkSubmitProxyConfiguration/
  - /SparkPiExample/
  - /SparkLogsExtractor/
---

* content
{:toc}

> **TL;DR**
>
> * Nearly every JVM-level Spark fix lands in one of two configs: `spark.driver.extraJavaOptions` or `spark.executor.extraJavaOptions`. Learn where they apply and the rest is detail.
> * Spark 3.3.0 replaced Log4j 1.x with Log4j 2. The file is now `log4j2.properties` and the flag is `-Dlog4j.configurationFile=`, not `-Dlog4j.configuration=`. A pre-3.3 blog post copied forward silently gives you the default log level and no error.
> * `-verbose:class` is the fastest way to turn a `NoClassDefFoundError` into an answer, because it prints which JAR each class actually came from.
> * `java.lang.StackOverflowError` in Spark is usually a deep query plan, not a bug in your loop. Raise `-Xss` on the side that threw, and treat "still failing at 512m" as a code problem.
> * In client mode the driver JVM is already running by the time your `SparkConf` executes, so driver JVM options must come from `--driver-java-options` or the properties file.

## Why these four live in one post

I spent four and a half years as Cloudera's Spark backline engineer, and now do
the same job for Apache Hudi. The pattern that repeats is not exotic. Before
anyone can debug the interesting part of a failure, they need to see the logs
they want, find out which JAR a class came from, stop a plan from blowing the
stack, or get the JVM through a corporate proxy.

Those four tasks look unrelated. They are the same task. All four are JVM flags,
and all four go through the same pair of Spark configs, which means the thing
worth learning is not the individual flag but where the flag goes and when.

This post is written against **Spark 4.2.0** (Java 17, Scala 2.13.18, Hadoop
3.5.0 per its [`pom.xml`](https://github.com/apache/spark/blob/v4.2.0/pom.xml)).
Everything except the logging section applies unchanged back to Spark 2.x. The
logging section has a hard version boundary at 3.3.0, called out below.

Prerequisites: the Spark [configuration
reference](https://spark.apache.org/docs/latest/configuration.html) and, if you
are on YARN, [Running Spark on
YARN](https://spark.apache.org/docs/latest/running-on-yarn.html).

## Architecture: how a JVM flag reaches the driver and the executors

Spark runs your code in two kinds of JVM. The driver builds the plan and
schedules work. The executors run the tasks. A JVM flag affects exactly one of
them, so the first question on any of these problems is *which JVM is failing*.

| Config | Applies to | Set it with |
|:--|:--|:--|
| `spark.driver.extraJavaOptions` | The driver JVM | `--driver-java-options`, `--conf`, or `spark-defaults.conf` |
| `spark.executor.extraJavaOptions` | Every executor JVM | `--conf` or `spark-defaults.conf` |
| `spark.driver.defaultJavaOptions` | The driver JVM, prepended to the above | `spark-defaults.conf`, set by admins |
| `spark.executor.defaultJavaOptions` | Executor JVMs, prepended to the above | `spark-defaults.conf`, set by admins |

Two rules that cost people real time:

**Deploy mode changes where the driver lives.** In `client` mode the driver runs
in the `spark-submit` process on the machine you typed the command on. In
`cluster` mode it runs inside the cluster, as the YARN ApplicationMaster or a
Kubernetes driver pod. Any file the driver needs must be shipped there.

**In client mode the driver JVM has already started.** Spark's own
documentation for `spark.driver.extraJavaOptions` is explicit: in client mode
the config "must not be set through the `SparkConf` directly in your
application, because the driver JVM has already started at that point," and you
should use `--driver-java-options` or the properties file instead. Setting it
from inside your application in client mode is not an error. It simply does
nothing, which is worse.

One more: it is illegal to set the maximum heap size (`-Xmx`) through
`extraJavaOptions`. Use `spark.driver.memory` and `spark.executor.memory`, or
`--driver-memory` and `--executor-memory`. `-Xss`, the flag in the stack-size
section below, is a different flag and is perfectly legal here.

## Custom logging, and the Log4j 2 boundary

By default Spark reads its logging config from `$SPARK_HOME/conf`, which is set
at the cluster level. When you are chasing a problem you usually want `DEBUG` on
two packages for one application, without touching the cluster and without
drowning in everyone else's `DEBUG`.

### The version boundary that breaks copied examples

Spark used Log4j 1.x up to and including 3.2.x, then switched to Log4j 2. You
can see the switch in the shipped templates:

| Spark | Template in `conf/` | Config property syntax | JVM flag |
|:--|:--|:--|:--|
| 3.2.4 and earlier | `log4j.properties.template` | `log4j.rootLogger=...` | `-Dlog4j.configuration=` |
| 3.3.0 and later | `log4j2.properties.template` | `rootLogger.level = ...` | `-Dlog4j.configurationFile=` |

This matters more than a rename. If you hand a Log4j 2 runtime a Log4j 1.x
properties file, or point it at a file with the old `-Dlog4j.configuration`
flag, Log4j 2 does not fail. It falls back to its default configuration and logs
at the default level, so you get a working application and none of the logging
you asked for. Every "my custom log4j.properties is being ignored" ticket I have
seen since 2022 was this.

Spark 4.2.0 also ships `log4j2-json-layout.properties.template` and a
`spark.log.structuredLogging.enabled` config (default `false`) if you want JSON
logs rather than the pattern layout.

### Write the Log4j 2 config

Start from the shipped template rather than from memory, because the property
names are not guessable:

```bash
cp /opt/spark/conf/log4j2.properties.template /tmp/log4j2-debug.properties
```

Then set the levels you actually want. This raises the root logger to `DEBUG`,
turns Spark's SQL execution and Hudi client packages up, and keeps the noisy
third-party loggers down so the output stays readable:

```properties
rootLogger.level = debug
rootLogger.appenderRef.stdout.ref = console

appender.console.type = Console
appender.console.name = console
appender.console.target = SYSTEM_ERR
appender.console.layout.type = PatternLayout
# %ex rather than the implicit %xEx: the extended form resolves the JAR each
# stack frame came from, which is measurable overhead on a hot error path.
appender.console.layout.pattern = %d{yy/MM/dd HH:mm:ss} %p %c{1}: %m%n%ex

# The two packages under investigation.
logger.sqlexec.name = org.apache.spark.sql.execution
logger.sqlexec.level = debug

logger.hudiclient.name = org.apache.hudi.client
logger.hudiclient.level = debug

# Third-party loggers that make DEBUG unusable if left at the root level.
logger.jetty.name = org.sparkproject.jetty
logger.jetty.level = warn

logger.parquet.name = org.apache.parquet
logger.parquet.level = error

logger.hmshandler.name = org.apache.hadoop.hive.metastore.RetryingHMSHandler
logger.hmshandler.level = fatal
```

### Ship it to the driver and the executors

The file has to exist on every JVM that reads it. `--files` uploads it and
places it in each container's working directory, which is why the flag value on
the executor side is a bare filename with no path.

Cluster mode, where the driver is also a container:

```bash
spark-submit \
  --master yarn \
  --deploy-mode cluster \
  --files /tmp/log4j2-debug.properties \
  --conf spark.driver.extraJavaOptions="-Dlog4j.configurationFile=log4j2-debug.properties" \
  --conf spark.executor.extraJavaOptions="-Dlog4j.configurationFile=log4j2-debug.properties" \
  --class com.rangareddy.pipeline.TripsIngest \
  s3a://lakehouse-prod/artifacts/trips-ingest-2.4.1.jar \
  --input s3a://lakehouse-prod/raw/trips/ \
  --table s3a://lakehouse-prod/warehouse/trips/
```

Client mode, where the driver reads the file straight off local disk and only
the executors need the upload:

```bash
spark-submit \
  --master yarn \
  --deploy-mode client \
  --files /tmp/log4j2-debug.properties \
  --driver-java-options "-Dlog4j.configurationFile=/tmp/log4j2-debug.properties" \
  --conf spark.executor.extraJavaOptions="-Dlog4j.configurationFile=log4j2-debug.properties" \
  --class com.rangareddy.pipeline.TripsIngest \
  s3a://lakehouse-prod/artifacts/trips-ingest-2.4.1.jar \
  --input s3a://lakehouse-prod/raw/trips/ \
  --table s3a://lakehouse-prod/warehouse/trips/
```

Note the asymmetry. The driver flag in client mode carries an absolute local
path; the executor flag carries a filename resolved inside the container. Using
the absolute path on the executor side is the second most common version of this
mistake, and it fails the same silent way.

### Different levels on driver and executors

Sometimes you want `DEBUG` on the driver, where planning happens, and `WARN` on
two thousand executors, because `DEBUG` across all of them will fill the disk.
Ship two files and point each side at its own:

```bash
spark-submit \
  --master yarn \
  --deploy-mode cluster \
  --files /tmp/log4j2-driver.properties,/tmp/log4j2-executor.properties \
  --conf spark.driver.extraJavaOptions="-Dlog4j.configurationFile=log4j2-driver.properties" \
  --conf spark.executor.extraJavaOptions="-Dlog4j.configurationFile=log4j2-executor.properties" \
  --class com.rangareddy.pipeline.TripsIngest \
  s3a://lakehouse-prod/artifacts/trips-ingest-2.4.1.jar
```

On YARN, if you switch to a file appender, write it under YARN's own log
directory so log aggregation still collects it and a long-running streaming job
does not fill the local disk:

```properties
appender.file_appender.fileName = ${sys:spark.yarn.app.container.log.dir}/spark.log
```

## Tracing class loading with -verbose:class

`ClassNotFoundException` tells you a class was absent. `NoClassDefFoundError`
usually tells you something worse: the class was present at compile time, and at
runtime either it is missing or a *different version* of it loaded first. On a
cluster with Hadoop, Hive, Spark and connector JARs all on the classpath, that
second case is the normal one.

`-verbose:class` is a JVM flag, not a Spark one. It makes the JVM print every
class it loads and the source it loaded from, which turns the guess into a
lookup:

```bash
spark-submit \
  --master yarn \
  --deploy-mode cluster \
  --conf spark.driver.extraJavaOptions="-verbose:class" \
  --conf spark.executor.extraJavaOptions="-verbose:class" \
  --class com.rangareddy.pipeline.TripsIngest \
  s3a://lakehouse-prod/artifacts/trips-ingest-2.4.1.jar
```

Then search the container log for the class in the stack trace. You are looking
for the path after `source:`, which is the JAR that won. When the answer is
"a JAR I did not expect," you have a dependency conflict, and the fix is
shading, `spark.driver.userClassPathFirst`, or removing the duplicate, not more
logging.

Do not confuse the two similarly named things:

* `--verbose` is a `spark-submit` flag. It prints the resolved Spark
  configuration, the classpath and the parsed arguments before launch. Use it on
  every escalation; it costs nothing and answers "was my config even applied?".
* `-verbose:class` is a JVM flag passed through `extraJavaOptions`. It prints
  class-loader activity for the life of the JVM.

`-verbose:class` buys you the loader's ground truth at the cost of a very large
log. Turn it on for one reproduction, get the answer, turn it off. On a busy
executor it can add hundreds of megabytes.

## java.lang.StackOverflowError

The failure looks like this, on either the driver or an executor:

```
java.lang.StackOverflowError
  at scala.collection.immutable.List.foreach(List.scala:431)
  at org.apache.spark.sql.catalyst.trees.TreeNode.mapChildren(TreeNode.scala:...)
  at org.apache.spark.sql.catalyst.trees.TreeNode.mapChildren(TreeNode.scala:...)
  at org.apache.spark.sql.catalyst.trees.TreeNode.mapChildren(TreeNode.scala:...)
```

A wall of repeating frames from `TreeNode`, `Catalyst`, or an Avro or Parquet
schema walker is the signature. It is almost never an infinite loop in your
code. It is a recursive walk over a structure deeper than the thread's stack:
hundreds of columns, a deeply nested struct, a plan built by chaining `union` or
`withColumn` in a loop, or a query with a very long chain of predicates.

Find the side that threw it first. A stack trace in the driver log means the
driver's plan walk overflowed, and the knob is the driver's. A trace in an
executor log means the knob is the executor's. If the logs do not make it
obvious, set both:

```bash
spark-submit \
  --master yarn \
  --deploy-mode cluster \
  --conf spark.driver.extraJavaOptions="-Xss4m" \
  --conf spark.executor.extraJavaOptions="-Xss4m" \
  --class com.rangareddy.pipeline.TripsIngest \
  s3a://lakehouse-prod/artifacts/trips-ingest-2.4.1.jar
```

`-Xss` sets the stack size per thread, so it is not free: an executor with many
task threads pays the increase on each one, out of off-heap memory the JVM does
not count against `spark.executor.memory`. If you raise `-Xss` substantially on
a container with a tight `spark.executor.memoryOverhead`, expect YARN to start
killing containers for exceeding their memory limit. Raise the overhead with it.

Escalate in steps: `4m`, `8m`, `16m`, `32m`. If you are still overflowing at a
few hundred megabytes of stack, stop tuning. Recursion depth that large means
the plan itself is pathological, and the fix is in the code: break the `union`
chain into a single `unionByName` over a collected sequence, checkpoint the
DataFrame to truncate the lineage, or flatten the nested schema.

## Routing Spark through an HTTP proxy

When executors have to reach an external endpoint, a schema registry, a cloud
metadata service, a REST catalog, and the network only allows it through a
proxy, the proxy settings are standard JVM system properties. Spark has no
config of its own for them, which is why they go through `extraJavaOptions`.

Per application:

```bash
spark-submit \
  --master yarn \
  --deploy-mode cluster \
  --conf spark.driver.extraJavaOptions="-Dhttp.proxyHost=proxy.corp.internal -Dhttp.proxyPort=8080 -Dhttps.proxyHost=proxy.corp.internal -Dhttps.proxyPort=8443 -Dhttp.nonProxyHosts=localhost|127.0.0.1|*.corp.internal" \
  --conf spark.executor.extraJavaOptions="-Dhttp.proxyHost=proxy.corp.internal -Dhttp.proxyPort=8080 -Dhttps.proxyHost=proxy.corp.internal -Dhttps.proxyPort=8443 -Dhttp.nonProxyHosts=localhost|127.0.0.1|*.corp.internal" \
  --class com.rangareddy.pipeline.TripsIngest \
  s3a://lakehouse-prod/artifacts/trips-ingest-2.4.1.jar
```

`http.nonProxyHosts` is the part people leave out and then spend an afternoon
on. Without it, in-cluster traffic gets sent to the proxy too, and calls to the
NameNode or a local metastore fail in ways that look nothing like a proxy
problem.

For every application on the cluster, put the same values in
`$SPARK_HOME/conf/spark-defaults.conf`:

```properties
spark.driver.extraJavaOptions   -Dhttp.proxyHost=proxy.corp.internal -Dhttp.proxyPort=8080 -Dhttps.proxyHost=proxy.corp.internal -Dhttps.proxyPort=8443 -Dhttp.nonProxyHosts=localhost|127.0.0.1|*.corp.internal
spark.executor.extraJavaOptions -Dhttp.proxyHost=proxy.corp.internal -Dhttp.proxyPort=8080 -Dhttps.proxyHost=proxy.corp.internal -Dhttps.proxyPort=8443 -Dhttp.nonProxyHosts=localhost|127.0.0.1|*.corp.internal
```

Note that `extraJavaOptions` in `spark-defaults.conf` is a single string, and a
`--conf spark.driver.extraJavaOptions=...` on the command line **replaces** it
rather than appending to it. This is exactly what `spark.driver.defaultJavaOptions`
exists for: put the cluster-wide proxy settings there, leave `extraJavaOptions`
free for users, and Spark prepends the defaults to whatever the user passes.
Setting cluster-wide policy in `extraJavaOptions` means the first developer who
needs `-verbose:class` silently drops your proxy config.

## Production tips

* **Always pass `--verbose`.** Before debugging behaviour, confirm the config
  you think you set is in the resolved configuration it prints.
* **Put cluster-wide JVM policy in `defaultJavaOptions`, not `extraJavaOptions`.**
  Otherwise any user `--conf` silently overwrites it.
* **Raise `spark.executor.memoryOverhead` when you raise `-Xss`.** Thread stacks
  are off-heap and YARN counts them.
* **Copy the shipped `log4j2.properties.template`** instead of writing a Log4j 2
  config from scratch or adapting a Log4j 1.x one.
* **Keep the executor-side config filename bare** (`log4j2-debug.properties`),
  and the client-mode driver-side path absolute.
* **Scope `DEBUG` to packages, never the root logger, on a large cluster.** Root
  `DEBUG` across a few thousand executors is a disk-space incident.
* **Turn `-verbose:class` off after the reproduction.** It is a diagnostic, not
  a setting.
* **On YARN, send file appenders to `${sys:spark.yarn.app.container.log.dir}`**
  so aggregation picks them up.

## What failure looks like

The frustrating property these share is that three of the four fail *silently*
when you get them wrong:

| Mistake | Symptom |
|:--|:--|
| Log4j 1.x file or `-Dlog4j.configuration=` on Spark 3.3+ | Application runs, logging is unchanged, no error anywhere |
| Absolute path in the executor-side logging flag | Executors log at the default level, driver looks correct |
| Driver options set from `SparkConf` in client mode | Config appears in the UI, flag never reached the JVM |
| `-Xss` raised without raising memory overhead | `Container killed by YARN for exceeding memory limits` |
| Proxy set without `nonProxyHosts` | Timeouts talking to in-cluster services, not to the internet |

For the logging ones, the check is a single line in the driver log: if your
custom pattern layout is not on the log lines, the file was never read.

## When not to reach for these

These are diagnostics and last-mile plumbing, not tuning. If your problem is a
slow job rather than a broken one, `extraJavaOptions` is the wrong place to be
looking: shuffle partition counts, join strategies, AQE settings and file sizing
live in `spark.sql.*`, and the Spark UI's SQL tab will tell you more than any JVM
flag. If your problem is memory pressure, `spark.executor.memory` and
`spark.memory.fraction` are the knobs, and `-Xmx` here is rejected outright.

If you need cluster-wide logging permanently changed, change
`$SPARK_CONF_DIR/log4j2.properties` and let Spark upload it, rather than
threading `--files` through every job.

## Conclusion

The reason these four problems belong in one post is that solving any of them
individually teaches you almost nothing, while understanding the delivery
mechanism solves the whole class. There are two JVMs, they take flags through
two configs, the deploy mode decides where the driver's copy of a file has to
live, and the client-mode driver has already started by the time your
application code runs. Once that model is in your head, the specific flag is
whatever the JVM documentation says it is.

The version boundary is worth internalizing separately, because it is the one
that will cost you an afternoon on somebody else's cluster. Spark 3.3.0 moved to
Log4j 2, and Log4j 2 responds to a stale config by quietly using its defaults.
Anything you read about Spark logging that says `log4j.properties` or
`-Dlog4j.configuration` was written for Spark 3.2 or earlier, and following it on
a current cluster produces an application that runs fine and tells you nothing.
That includes the earlier version of this post.

Next, if you are sizing the JVMs rather than instrumenting them, the
[Spark Configuration Generator]({{ '/SparkConfigurationGenerator/' | relative_url }})
turns a node count, core count and memory-per-node into executor settings, and
the [Spark Submit Command Formatter]({{ '/SparkSubmitFormatter/' | relative_url }})
will break a command like the ones above into an editable table.

## References

* [Spark configuration reference](https://spark.apache.org/docs/latest/configuration.html) for `extraJavaOptions`, `defaultJavaOptions` and the client-mode caveat
* [Running Spark on YARN](https://spark.apache.org/docs/latest/running-on-yarn.html) for custom Log4j 2 configs and `spark.yarn.app.container.log.dir`
* [The `log4j2.properties.template` shipped in Spark 4.2.0](https://github.com/apache/spark/blob/v4.2.0/conf/log4j2.properties.template), the right starting point for a custom config
* [Log4j 2 properties-file syntax](https://logging.apache.org/log4j/2.x/manual/configuration.html) for the appender and logger property names
* [Java HTTP proxy system properties](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/net/doc-files/net-properties.html) for `http.proxyHost`, `https.proxyPort` and `nonProxyHosts`
