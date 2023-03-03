---
layout: post
title: Linux Useful Commands
categories: Linux
tags: Miscellaneous Linux
author: Ranga Reddy
date: "2023-03-03 00:00:00 +0530"
---

* content
{:toc}

# Linux Commands

## Kill the all processes in Linux

### 1. Finding the process id

**Syntax:**

```sh
ps aux | grep <process_name>
```

The aux options are as follows:

* a = show processes for all users
* u = display the process’s user/owner
* x = also show processes not attached to a terminal

**Example:**

```sh
ps aux | grep java | grep -v grep
```

**Sample Output:**

```sh
livy       76620  0.1  0.7 4123864 162124 ?      Sl   Mar01   2:51 /usr/lib/jvm/java-11-openjdk-11.0.17.0.8-2.el7_9.x86_64/bin/java -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPa
th=/tmp/livy_livy-LIVY_SERVER-e75484af0f16d6e5808d3b5e09cec82b_pid76620.hprof -XX:OnOutOfMemoryError=/opt/cloudera/cm-agent/service/common/killparent.sh -Xmx67108864 -Dsun.securi
ty.krb5.disableReferrals=true -Djdk.tls.ephemeralDHKeySize=2048 -cp /opt/cloudera/parcels/CDH-7.1.7-1.cdh7.1.7.p1000.24102687/lib/livy2/jars/*:/var/run/cloudera-scm-agent/process
/1546345579-livy-LIVY_SERVER/livy-conf:/var/run/cloudera-scm-agent/process/1546345579-livy-LIVY_SERVER/spark-conf:/var/run/cloudera-scm-agent/process/1546345579-livy-LIVY_SERVER/
spark-conf/yarn-conf: org.apache.livy.server.LivyServer
```

### 2. Killing the process 

There are two commands used to kill a process:

1. kill – Kill a process by ID
2. killall – Kill a process by name

#### **1. Kill the process using ProcessID**

**Syntax:**

```sh
kill SIGNAL PID
```

**Example:**

```sh
kill -9 76620
```

#### 2. Kill the process using ProcessName

**Syntax:**

```sh
killall SIGNAL ProcessName
```

**Example:**

```sh
killall -9 chrome
```

### All steps in single line

```sh
ps -ef | grep java | grep -v grep | awk '{print $2}' | xargs kill
```

