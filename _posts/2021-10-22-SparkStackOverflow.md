---
layout: post
title: How to fix java.lang.StackOverflowError in Apache Spark?
categories: Spark
tags: Spark Troubleshoot Error
author: Ranga Reddy
---

* content
{:toc}

While running Spark application with huge data or more number columns we can see `java.lang.StackOverflowError`. To solve this issue we need to increase the stack size.

First we need to identify where the StackOverflowError is occurred in driver side or executor side. If issue is occurred in driver side then we need to set the stack size using 'spark.driver.extraJavaOptions'. If issue is occurred in executor side then we need to set the stack size using 'spark.executor.extraJavaOptions'. If you dont know where to set, then set the  stack size at both driver and executor side.

```sh
--conf spark.driver.extraJavaOptions="-Xss4m"
--conf spark.executor.extraJavaOptions="-Xss4m"
```

If issue is not fixed then we need to increase the stack size like 4m, 8m, 16m, 32m etc. After increasing the some level of stack size for example 1024m issue is still persists then leak is happen at code level. In order to fix the issue, we need to solve the leak at code.
