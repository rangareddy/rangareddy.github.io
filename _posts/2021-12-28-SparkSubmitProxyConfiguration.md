---
layout: post
title: Spark submit Proxy host/port configuration
categories: Spark
tags: Spark Proxy
author: Ranga Reddy
date: "2021-12-28 00:00:00 +0530"
---

* content
{:toc}

## Spark Proxy Configuration

By using Spark, if we want to connect with HTTP/HTTPS proxy, we must configure the proxy related settings in both **spark.driver.extraJavaOptions** and **spark.executor.extraJavaOptions** parameters.

**Syntax:**

`spark.driver.extraJavaOptions=-Dhttp.proxyHost=<HTTP_PROXY_HOST> -Dhttp.proxyPort=<HTTP_PORT> -Dhttps.proxyHost=<HTTPS_PROXY_HOST> -Dhttps.proxyPort=<HTTPS_PORT>`

`spark.executor.extraJavaOptions=-Dhttp.proxyHost=<HTTP_PROXY_HOST> -Dhttp.proxyPort=<HTTP_PORT> -Dhttps.proxyHost=<HTTPS_PROXY_HOST> -Dhttps.proxyPort=<HTTPS_PORT>`

## Usage

### 1. Setting the proxy configurations at application level

```sh
spark-submit \
  --class org.apache.spark.examples.SparkPi \
  --master yarn \
  --deploy-mode cluster \
  --num-executors 1 \
  --driver-memory 512m \
  --executor-memory 512m \
  --executor-cores 1 \
  --conf "spark.driver.extraJavaOptions=-Dhttp.proxyHost=myproxy.host.com -Dhttp.proxyPort=8080 -Dhttps.proxyHost=myproxy.host.com -Dhttps.proxyPort=8443" \
  --conf "spark.executor.extraJavaOptions=-Dhttp.proxyHost=myproxy.host.com -Dhttp.proxyPort=8080 -Dhttps.proxyHost=myproxy.host.com -Dhttps.proxyPort=8443" \
  $SPARK_HOME/examples/jars/spark-examples_*.jar 10
```

### 2. Setting the proxy configurations at cluster level

In order to configure proxy settings for all applications, we need to add/update the **spark.driver.extraJavaOptions** and **spark.executor.extraJavaOptions** parameters in `$SPARK_HOME/conf/spark-defaults.conf` file.

```sh
spark.driver.extraJavaOptions="-Dhttp.proxyHost=myproxy.host.com -Dhttp.proxyPort=8080 -Dhttps.proxyHost=myproxy.host.com -Dhttps.proxyPort=8443"
spark.executor.extraJavaOptions="-Dhttp.proxyHost=myproxy.host.com -Dhttp.proxyPort=8080 -Dhttps.proxyHost=myproxy.host.com -Dhttps.proxyPort=8443"
```
