---
layout: post
title: Enable Verbose class output for the Spark applications
categories: Spark
tags: Spark Troubleshoot
author: Ranga Reddy
date: "2021-10-21 00:00:00 +0530"
---

* content
{:toc}

## Spark Verbose

Spark has two JVM process i.e Driver and Executor. To print any JVM process information, JVM supports 3 types of verbose options i.e -verbose:class, -verbose:gc and -verbose:jni.

To enable the verbose class output we need to use `-verbose:class` option. This option will help us to find out any class loading errors like `ClassNotFoundException` and `NoClassDefFoundError`.

## Usage

To enable from spark side, we need to add the following two parameters:

```sh
--conf "spark.driver.extraJavaOptions=-verbose:class" \
--conf "spark.executor.extraJavaOptions=-verbose:class" \
```

**Note:**

1. `--verbose`      - Prints the verbose information like spark configuration.
1. `-verbose:class` - Prints the details about class loader activity.
