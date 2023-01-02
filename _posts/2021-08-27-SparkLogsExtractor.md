---
layout: post
title:  Spark Logs Extractor
categories: Spark
tags: Spark Utilities
author: Ranga Reddy
---

* content
{:toc}

**Spark Logs Extractor** is a simple shell script tool used to collect the **Spark Application** and **Event Logs** with the **compressed** format.

**Note:** As of now by using this tool, we can collect the Spark logs in **HDP, CDH** and **CDP** clusters only.

**Advantages:**

1. Spark logs will collect automatically without running any command.
2. After collecting logs, logs will be compressed into a single file.

The following are steps to use this tool:

**Step1:**

Download the **spark_logs_extractor.sh** script to any location and give the **execute** permission.

```sh
wget https://raw.githubusercontent.com/rangareddy/spark-logs-extractor/main/spark_logs_extractor.sh
chmod +x spark_logs_extractor.sh
```

**Step2:**

While Runing the **spark_logs_extractor.sh** script, provide the **application_id**.

```sh
sh spark_logs_extractor.sh <application_id>
```

**Note:** Replace **application_id** with your **spark application id**.
