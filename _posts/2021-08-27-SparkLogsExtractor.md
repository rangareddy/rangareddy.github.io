---
layout: post
title:  Spark Logs Extractor tool
categories: Spark
tags: Spark Utilities
author: Ranga Reddy
date: "2021-08-27 00:00:00 +0530"
---

* content
{:toc}

## Spark Logs Extractor

**Spark Logs Extractor** is a simple shell script tool used to collect the *Spark* **Application Logs** and **Event Logs** with the **compressed** format.

**Advantages:**

1. Spark logs will collect automatically without running any command.
2. After collecting logs, logs will be compressed into a single file.

## Usage

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

> Replace **application_id** with your **spark application id**.
