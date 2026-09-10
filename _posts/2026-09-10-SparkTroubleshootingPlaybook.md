---
title: "A Spark JVM playbook: custom logging, class loading, stack size and proxies"
categories: Spark
tags: Spark Troubleshoot Logging
author: Ranga Reddy
date: "2026-09-10 09:00:00 +0530"
description: >-
  Four techniques that pay for themselves on nearly every Spark investigation:
  swap in a custom Log4j 2 config, trace class loading, raise the JVM stack size,
  and route traffic through an HTTP proxy. All four go through the same two
  configs, so learning one teaches you the rest.
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
> * Nearly every JVM-level Spark change lands in one of two configs: `spark.driver.extraJavaOptions` or `spark.executor.extraJavaOptions`. Learn where each applies and the rest is detail.
> * Spark 3.3.0 moved to Log4j 2, so the file is `log4j2.properties` and the flag is `-Dlog4j.configurationFile=`. Start from the template Spark ships and your config is picked up first time.
> * `-verbose:class` turns a `NoClassDefFoundError` into a direct answer, because it prints which JAR each class actually came from.
> * A `java.lang.StackOverflowError` in Spark usually points at a deep query plan rather than a bug in your loop. Raising `-Xss` on the side that threw resolves most of them.
> * In client mode the driver JVM is already running by the time your `SparkConf` executes, so pass driver JVM options with `--driver-java-options` or the properties file.

## Why these four belong together

I spent four and a half years as Cloudera's Spark backline engineer and now do
similar work on Apache Hudi. The same four techniques come up again and again,
and each one is a small investment that pays off repeatedly: getting exactly the
logs you want, finding out which JAR a class came from, giving a deep query plan
the stack it needs, and getting the JVM through a corporate proxy.

Those four tasks look unrelated, and they are really one task. All four are JVM
flags delivered through the same pair of Spark configs, so the thing worth
learning is where a flag goes and when. Learn that once and every future JVM
setting is a lookup in the JVM documentation.

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

Two rules worth committing to memory:

**Deploy mode changes where the driver lives.** In `client` mode the driver runs
in the `spark-submit` process on the machine you typed the command on. In
`cluster` mode it runs inside the cluster, as the YARN ApplicationMaster or a
Kubernetes driver pod. Any file the driver needs must be shipped there.

**In client mode the driver JVM has already started.** Spark's own
documentation for `spark.driver.extraJavaOptions` is explicit: in client mode
the config "must not be set through the `SparkConf` directly in your
application, because the driver JVM has already started at that point," and you
should use `--driver-java-options` or the properties file instead. Pass it on the
command line and it applies cleanly.

One more: it is illegal to set the maximum heap size (`-Xmx`) through
`extraJavaOptions`. Use `spark.driver.memory` and `spark.executor.memory`, or
`--driver-memory` and `--executor-memory`. `-Xss`, the flag in the stack-size
section below, is a different flag and is perfectly legal here.

## Custom logging, and the Log4j 2 boundary

By default Spark reads its logging config from `$SPARK_HOME/conf`, which is set
at the cluster level. What you usually want while investigating is `DEBUG` on two
specific packages for one application, leaving the cluster default and everyone
else's jobs untouched. Spark supports exactly that.

### The Log4j 2 boundary at Spark 3.3.0

Spark used Log4j 1.x up to and including 3.2.x, then switched to Log4j 2. You
can see the switch in the shipped templates:

| Spark | Template in `conf/` | Config property syntax | JVM flag |
|:--|:--|:--|:--|
| 3.2.4 and earlier | `log4j.properties.template` | `log4j.rootLogger=...` | `-Dlog4j.configuration=` |
| 3.3.0 and later | `log4j2.properties.template` | `rootLogger.level = ...` | `-Dlog4j.configurationFile=` |

The practical consequence is worth knowing. Log4j 2 ignores the older
`-Dlog4j.configuration` property rather than raising an error, and falls back to
its normal configuration lookup, so an application keeps running and logs at the
cluster default. If a custom config ever seems to have no effect, checking the
file name and the flag against the table above is the quickest thing to try, and
a snippet saved before 2022 is worth refreshing against it.

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

Note the asymmetry, which is the one detail to get right: in client mode the
driver flag carries an absolute local path, while the executor flag carries a
bare filename resolved inside the container. Keep those two straight and the
config lands on both sides first time.

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
tells you something more specific: the class was present at compile time, and at
runtime either it is missing or a *different version* of it loaded first. On a
cluster with Hadoop, Hive, Spark and connector JARs all on the classpath, that
second case is the common one, and it is very answerable.

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

Then search the container log for the class in the stack trace. The path after
`source:` is the JAR that won. Once you can name that JAR the fix follows
directly: shade the dependency, set `spark.driver.userClassPathFirst`, or remove
the duplicate.

Two similarly named things, both useful:

* `--verbose` is a `spark-submit` flag. It prints the resolved Spark
  configuration, the classpath and the parsed arguments before launch. Use it on
  every escalation; it costs nothing and answers "was my config even applied?".
* `-verbose:class` is a JVM flag passed through `extraJavaOptions`. It prints
  class-loader activity for the life of the JVM.

`-verbose:class` buys you the loader's ground truth at the cost of a very large
log. Turn it on for one reproduction, take the answer, turn it off. On a busy
executor it can add hundreds of megabytes, which is a fine trade for one run.

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
schema walker is the signature, and it is good news: it usually means your code
is fine. What it describes is a recursive walk over a structure deeper than the
thread's stack, from hundreds of columns, a deeply nested struct, a plan built by
chaining `union` or `withColumn` in a loop, or a long chain of predicates.

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

`-Xss` sets the stack size per thread, so budget for it: an executor with many
task threads pays the increase on each one, out of off-heap memory that is not
counted against `spark.executor.memory`. Raise `spark.executor.memoryOverhead`
alongside it and YARN stays happy.

Escalate in steps: `4m`, `8m`, `16m`, `32m`. Most plans are comfortable well
before the top of that range. If you find yourself needing hundreds of megabytes
of stack, the plan itself is the better thing to simplify, and there are three
clean ways to do it: collapse a `union` chain into one `unionByName` over a
collected sequence, checkpoint the DataFrame to truncate its lineage, or flatten
the nested schema.

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

`http.nonProxyHosts` is the part worth including from the start. It keeps
in-cluster traffic off the proxy, so calls to the NameNode or a local metastore
continue to go direct.

For every application on the cluster, put the same values in
`$SPARK_HOME/conf/spark-defaults.conf`:

```properties
spark.driver.extraJavaOptions   -Dhttp.proxyHost=proxy.corp.internal -Dhttp.proxyPort=8080 -Dhttps.proxyHost=proxy.corp.internal -Dhttps.proxyPort=8443 -Dhttp.nonProxyHosts=localhost|127.0.0.1|*.corp.internal
spark.executor.extraJavaOptions -Dhttp.proxyHost=proxy.corp.internal -Dhttp.proxyPort=8080 -Dhttps.proxyHost=proxy.corp.internal -Dhttps.proxyPort=8443 -Dhttp.nonProxyHosts=localhost|127.0.0.1|*.corp.internal
```

Note that `extraJavaOptions` in `spark-defaults.conf` is a single string, and a
`--conf spark.driver.extraJavaOptions=...` on the command line replaces it rather
than appending. Spark has a purpose-built answer for this:
`spark.driver.defaultJavaOptions`. Put cluster-wide settings such as the proxy
there, leave `extraJavaOptions` free for users, and Spark prepends the defaults to
whatever a user passes. Both layers then apply together.

## Production tips

* **Always pass `--verbose`.** It costs nothing and confirms up front that the
  config you set is in the resolved configuration.
* **Put cluster-wide JVM policy in `defaultJavaOptions`.** Spark prepends it to
  whatever a user passes in `extraJavaOptions`, so both layers apply.
* **Raise `spark.executor.memoryOverhead` when you raise `-Xss`.** Thread stacks
  are off-heap and YARN counts them.
* **Copy the shipped `log4j2.properties.template`** instead of writing a Log4j 2
  config from scratch or adapting a Log4j 1.x one.
* **Keep the executor-side config filename bare** (`log4j2-debug.properties`),
  and the client-mode driver-side path absolute.
* **Scope `DEBUG` to the packages you care about** rather than the root logger.
  On a large cluster this keeps the output readable and the disks healthy.
* **Turn `-verbose:class` off once you have your answer.** It is a diagnostic
  rather than a permanent setting.
* **On YARN, send file appenders to `${sys:spark.yarn.app.container.log.dir}`**
  so aggregation picks them up.

## Confirming each change took effect

Three of these four apply without printing anything, so it is worth knowing the
one-second check for each. All of them are quick:

| Change | How you confirm it worked |
|:--|:--|
| Custom Log4j 2 config | Your own pattern layout appears on the driver log lines |
| Executor-side logging flag | An executor log shows the level you set, not the cluster default |
| Driver options in client mode | `--verbose` lists them in the resolved configuration |
| `-Xss` raised | The job passes the stage that previously overflowed, and containers stay within their limits |
| Proxy settings | External calls succeed and in-cluster calls stay direct, thanks to `nonProxyHosts` |

For the two logging rows the check is the same and takes one glance: if your
custom pattern layout is on the log lines, the file was read. Running with
`--verbose` first makes all five of these visible before the job even starts.

## Where to look instead

These four are diagnostics and last-mile plumbing, and knowing their boundary
saves time.

For a slow job rather than a broken one, the productive settings live in
`spark.sql.*`: shuffle partition counts, join strategies, AQE and file sizing.
The Spark UI's SQL tab will point you at the right one faster than any JVM flag.
For memory pressure, `spark.executor.memory` and `spark.memory.fraction` are the
knobs, and Spark helpfully rejects `-Xmx` here so you cannot set it in the wrong
place.

For logging you want on permanently, edit `$SPARK_CONF_DIR/log4j2.properties` and
let Spark upload it for every job, rather than threading `--files` through each
one.

## Conclusion

These four techniques belong in one post because the delivery mechanism is the
real lesson. There are two JVMs, they take flags through two configs, the deploy
mode decides where the driver's copy of a file lives, and in client mode the
driver has already started by the time your application code runs. Once that
model is in your head, any future JVM flag is a lookup in the JVM documentation
and a one-line config change.

The Log4j 2 boundary is the one version detail worth remembering alongside it.
Spark 3.3.0 moved to Log4j 2, so on any current cluster the file is
`log4j2.properties` and the flag is `-Dlog4j.configurationFile=`. Guidance
written for Spark 3.2 and earlier will say otherwise, so start from the template
Spark ships in `conf/` and you will get the logging you asked for on the first
run.

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
