---
layout: post
title:  Spark with custom logging
categories: Spark
tags: Spark Utilities Logging
author: Ranga Reddy
date: "2021-09-20 00:00:00 +0530"
---

* content
{:toc}

## Spark Custom Logging

By default, Spark uses **$SPARK_HOME/conf/log4j.properties** file to configure *log4j* and this log4j configuration set at cluster level. Sometimes you need to troubleshoot or fix the performance issues then you need to customize the logs. This blog post will help how to customize the Spark logs for both driver and executor.

## Usage

The following are steps to customize the logs:

### 1. Specify the single custom `log4j.properties` for driver and executors

**Step1:** Copy the `log4.properties` to temporary directory for example `/tmp`

```sh
cp $SPARK_HOME/conf/log4.properties /tmp
```

**Step2:** Update the `log4j.properties` file

> In the following properties, i have modified logging level from INFO to DEBUG mode.

```sh
vi /tmp/log4j.properties
```

```properties
log4j.rootLogger=${root.logger}
root.logger=DEBUG,console
log4j.appender.console=org.apache.log4j.ConsoleAppender
log4j.appender.console.target=System.err
log4j.appender.console.layout=org.apache.log4j.PatternLayout
log4j.appender.console.layout.ConversionPattern=%d{yy/MM/dd HH:mm:ss} %p %c{2}: %m%n
shell.log.level=WARN
log4j.logger.org.spark-project.jetty=WARN
log4j.logger.org.spark-project.jetty.util.component.AbstractLifeCycle=ERROR
log4j.logger.org.apache.spark.repl.SparkIMain$exprTyper=INFO
log4j.logger.org.apache.spark.repl.SparkILoop$SparkILoopInterpreter=INFO
log4j.logger.org.apache.parquet=ERROR
log4j.logger.org.apache.hadoop.hive.metastore.RetryingHMSHandler=FATAL
log4j.logger.org.apache.hadoop.hive.ql.exec.FunctionRegistry=ERROR
log4j.logger.org.apache.spark.repl.Main=${shell.log.level}
log4j.logger.org.apache.spark.api.python.PythonGatewayServer=${shell.log.level}
```

**Step3:** Run the Spark Application

**Client mode**

```sh
spark-submit \
  --verbose \
  --master yarn \
  --deploy-mode client \
  --files /tmp/log4j.properties#log4j.properties \
  --driver-java-options "-Dlog4j.configuration=/tmp/log4j.properties" \
  --conf spark.executor.extraJavaOptions="-Dlog4j.configuration=log4j.properties" \
  --class org.apache.spark.examples.SparkPi \
  /opt/cloudera/parcels/CDH/lib/spark/examples/jars/spark-example*.jar 10
```

**Cluster mode**

```sh
spark-submit \
  --verbose \
  --master yarn \
  --deploy-mode cluster \
  --files /tmp/log4j.properties#log4j.properties \
  --conf spark.driver.extraJavaOptions="-Dlog4j.configuration=log4j.properties" \
  --conf spark.executor.extraJavaOptions="-Dlog4j.configuration=log4j.properties" \
  --class org.apache.spark.examples.SparkPi \
  /opt/cloudera/parcels/CDH/lib/spark/examples/jars/spark-example*.jar 10
```

### 2. Specify the different custom `log4j.properties` for driver and executors

**Step1:** For driver, create the seperate `log4j.properties` file say `log4j_driver.properties` and update the configuration

```sh
cp $SPARK_HOME/conf/log4.properties /tmp/log4j_driver.properties
```

**Step2:** For executor, create the seperate `log4j.properties` file say `log4j_executor.properties` and update the configuration

```sh
cp $SPARK_HOME/conf/log4.properties /tmp/log4j_executor.properties
```

**Step3:** Run the Spark Application

**Client mode**

```sh
spark-submit \
  --verbose \
  --master yarn \
  --deploy-mode client \
  --files /tmp/log4j_driver.properties,/tmp/log4j_executor.properties \
  --driver-java-options "-Dlog4j.configuration=/tmp/log4j_driver.properties" \
  --conf spark.executor.extraJavaOptions="-Dlog4j.configuration=log4j_executor.properties" \
  --class org.apache.spark.examples.SparkPi \
  /opt/cloudera/parcels/CDH/lib/spark/examples/jars/spark-example*.jar 10
```

**Cluster mode**

```sh
spark-submit \
  --verbose \
  --master yarn \
  --deploy-mode cluster \
  --files /tmp/log4j_driver.properties,/tmp/log4j_executor.properties \
  --conf spark.driver.extraJavaOptions="-Dlog4j.configuration=log4j_driver.properties" \
  --conf spark.executor.extraJavaOptions="-Dlog4j.configuration=log4j_executor.properties" \
  --class org.apache.spark.examples.SparkPi \
  /opt/cloudera/parcels/CDH/lib/spark/examples/jars/spark-example*.jar 10
```
