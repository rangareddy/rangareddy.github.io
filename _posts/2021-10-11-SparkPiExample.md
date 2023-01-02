---
layout: post
title: SparkPi Example
categories: Spark
tags: Spark Example
author: Ranga Reddy
---

* content
{:toc}

## SparkPi example using local

**Client mode:**

```sh
$SPARK_HOME/bin/spark-submit \
    --class org.apache.spark.examples.SparkPi \
    --master yarn \
    --deploy-mode client \
    --num-executors 1 \
    --driver-memory 512m \
    --executor-memory 512m \
    --executor-cores 2 \
    $SPARK_HOME/examples/jars/spark-examples_*.jar 1000
```

**Cluster mode:**

```sh
$SPARK_HOME/bin/spark-submit \
    --class org.apache.spark.examples.SparkPi \
    --master yarn \
    --deploy-mode cluster \
    --num-executors 1 \
    --driver-memory 512m \
    --executor-memory 512m \
    --executor-cores 2 \
    $SPARK_HOME/examples/jars/spark-examples_*.jar 1000
```

## SparkPi example using HDP

**Client mode:**

```sh
spark-submit \
  --class org.apache.spark.examples.SparkPi \
  --master yarn \
  --deploy-mode client \
  --num-executors 1 \
  --driver-memory 512m \
  --executor-memory 512m \
  --executor-cores 1 \
  /usr/hdp/current/spark2-client/examples/jars/spark-examples_*.jar 10
```

**Cluster mode:**

```sh
spark-submit \
  --class org.apache.spark.examples.SparkPi \
  --master yarn \
  --deploy-mode cluster \
  --num-executors 1 \
  --driver-memory 512m \
  --executor-memory 512m \
  --executor-cores 1 \
  /usr/hdp/current/spark2-client/examples/jars/spark-examples_*.jar 10
```

## SparkPi example using CDH

**Client mode:**

```sh
spark-submit \
  --class org.apache.spark.examples.SparkPi \
  --master yarn \
  --deploy-mode client \
  --num-executors 1 \
  --driver-memory 512m \
  --executor-memory 512m \
  --executor-cores 1 \
  /opt/cloudera/parcels/CDH/lib/spark/examples/jars/spark-examples_*.jar 10
```

**Cluster mode:**

```sh
spark-submit \
  --class org.apache.spark.examples.SparkPi \
  --master yarn \
  --deploy-mode cluster \
  --num-executors 1 \
  --driver-memory 512m \
  --executor-memory 512m \
  --executor-cores 1 \
  /opt/cloudera/parcels/CDH/lib/spark/examples/jars/spark-examples_*.jar 10
```

## Spark2 - SparkPi example using CDP

**Client mode:**

```sh
spark-submit \
  --class org.apache.spark.examples.SparkPi \
  --master yarn \
  --deploy-mode client \
  --num-executors 1 \
  --driver-memory 512m \
  --executor-memory 512m \
  --executor-cores 1 \
  /opt/cloudera/parcels/CDH/lib/spark/examples/jars/spark-example*.jar 10
```

**Cluster mode:**

```sh
spark-submit \
  --class org.apache.spark.examples.SparkPi \
  --master yarn \
  --deploy-mode cluster \
  --num-executors 1 \
  --driver-memory 512m \
  --executor-memory 512m \
  --executor-cores 1 \
  /opt/cloudera/parcels/CDH/lib/spark/examples/jars/spark-example*.jar 10
```

## Spark3 - SparkPi example using CDP

**Client mode:**

```sh
spark3-submit \
  --class org.apache.spark.examples.SparkPi \
  --master yarn \
  --deploy-mode client \
  --num-executors 1 \
  --driver-memory 512m \
  --executor-memory 512m \
  --executor-cores 1 \
  /opt/cloudera/parcels/SPARK3/lib/spark3/examples/jars/spark-example*.jar 10
```

**Cluster mode:**

```sh
spark3-submit \
  --class org.apache.spark.examples.SparkPi \
  --master yarn \
  --deploy-mode cluster \
  --num-executors 1 \
  --driver-memory 512m \
  --executor-memory 512m \
  --executor-cores 1 \
  /opt/cloudera/parcels/SPARK3/lib/spark3/examples/jars/spark-example*.jar 10
```
