---
layout: post
title: Spark submit Proxy host/port configuration
categories: Spark
tags: Spark Proxy
author: Ranga Reddy
---

* content
{:toc}

By using Spark, if we want to connect with HTTP/HTTPS proxy, we must configure the proxy related settings in both **spark.driver.extraJavaOptions** and **spark.executor.extraJavaOptions** parameters.

**Syntax:**

`spark.driver.extraJavaOptions=-Dhttp.proxyHost=<HTTP_PROXY_HOST> -Dhttp.proxyPort=<HTTP_PORT> -Dhttps.proxyHost=<HTTPS_PROXY_HOST> -Dhttps.proxyPort=<HTTPS_PORT>`

`spark.executor.extraJavaOptions=-Dhttp.proxyHost=<HTTP_PROXY_HOST> -Dhttp.proxyPort=<HTTP_PORT> -Dhttps.proxyHost=<HTTPS_PROXY_HOST> -Dhttps.proxyPort=<HTTPS_PORT>`

**Example:**

1) spark-submit command line

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
  /usr/hdp/current/spark2-client/examples/jars/spark-examples_*.jar 10
```

2) spark-shell command line

```sh
spark-shell \
 --conf "spark.driver.extraJavaOptions=-Dhttp.proxyHost=myproxy.host.com -Dhttp.proxyPort=8080 -Dhttps.proxyHost=myproxy.host.com -Dhttps.proxyPort=8443" \
 --conf "spark.executor.extraJavaOptions=-Dhttp.proxyHost=myproxy.host.com -Dhttp.proxyPort=8080 -Dhttps.proxyHost=myproxy.host.com -Dhttps.proxyPort=8443" \
 --packages <some_packages>
```

3) pyspark command line

```sh
pyspark \
 --driver-java-options="-Dhttp.proxyHost=myproxy.host.com -Dhttp.proxyPort=8080 -Dhttps.proxyHost=myproxy.host.com -Dhttps.proxyPort=8443" \
 --conf "spark.executor.extraJavaOptions=-Dhttp.proxyHost=myproxy.host.com -Dhttp.proxyPort=8080 -Dhttps.proxyHost=myproxy.host.com -Dhttps.proxyPort=8443" \
 --packages <some_packages>
```

4) Above all 3 options are specific to single application. In order to configure proxy settings for all applications, we need to add/update the **spark.driver.extraJavaOptions** and **spark.executor.extraJavaOptions** parameters in `$SPARK_HOME/conf/spark-defaults.conf` file.

```sh
spark.driver.extraJavaOptions="-Dhttp.proxyHost=myproxy.host.com -Dhttp.proxyPort=8080 -Dhttps.proxyHost=myproxy.host.com -Dhttps.proxyPort=8443"
spark.executor.extraJavaOptions="-Dhttp.proxyHost=myproxy.host.com -Dhttp.proxyPort=8080 -Dhttps.proxyHost=myproxy.host.com -Dhttps.proxyPort=8443"
```
