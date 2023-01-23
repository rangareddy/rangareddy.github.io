---
layout: post
title: Parquet Tools
categories: Tools
tags: Tools Parquet
author: Ranga Reddy
date: "2023-01-12 00:00:00 +0530"
---

* content
{:toc}

## Introduction 

**parquet-tool** is a simple **java based tool** to extract the `data` and `metadata` (file metadata, column (chunk) metadata and page header metadata) from a Parquet file(s). We can extract the parquet file information from **local or S3/HDFS**.

## parquet-tools jar

There are two ways we can get the parquet-tools.jar

* Download the parquet-tools.jar (or)
* Build the parquet-tools.jar

### Download the parquet-tools jar

The easiest way to download the parquet-tools jar is from maven central repo.

**Example:**

```sh
wget -O parquet-tools.jar https://repo1.maven.org/maven2/org/apache/parquet/parquet-tools/1.11.2/parquet-tools-1.11.2.jar
```

### Build the parquet-tools jar

Another way to get the parquet tool jar is building from the source code.

> Thrift server needs to be installed before building the maven project.

```sh
git clone https://github.com/apache/parquet-mr.git
cd parquet-mr
git checkout apache-parquet-1.11.2
cd parquet-tools/
mvn clean package -Plocal
cp target/parquet-tools-1.11.2.jar parquet-tools.jar
```

> `-Plocal` adds the required dependencies to the classpath.

## Usage

### Using `java` command

```sh
java -jar parquet-tools.jar <COMMAND> [option...] <input>
```

> In order to use java command with the parquet-tool, we need to add additional libraries to the classpath. For example

```sh
java -cp commons-cli.jar:commons-collections.jar:commons-configuration.jar:commons-io.jar:commons-lang.jar:commons-logging.jar:guava.jar:hadoop-core.jar:jackson-core.jar:jackson-core-asl.jar:jackson-databind.jar:jackson-mapper-asl.jar:parquet-format-*-incubating.jar:parquet-hadoop-*.jar -jar parquet-tools.jar
```

### Using `hadoop` command

```sh
hadoop jar parquet-tools.jar <COMMAND> [option...] <input>
```

#### Help

> `parquet-tools.jar` print help when invoked without parameters or with "-help" or "--h" parameter:

```sh
hadoop jar parquet-tools.jar --help
```

To print the help of a specific command use the following syntax:

```sh
hadoop jar parquet-tools.jar <COMMAND> --help
```

## Commands

**Commands:**

| Name     | Description                                                           |
| -------- | --------------------------------------------------------------------- |
| cat      | Prints out content for a given parquet file                           |
| dump     | Prints out row groups and metadata for a given parquet file           |
| head     | Prints out the first n records for a given parquet file               |
| help     | Prints this message or the help of the given subcommand(s)            |
| merge    | Merges multiple Parquet files into one Parquet file                   |
| meta     | Prints out metadata for a given parquet file                          |
| rowcount | Prints the count of rows in Parquet file(s)                           |
| schema   | Prints out the schema for a given parquet file                        |
| size     | Prints the size of Parquet file(s) 								   |

**Generic options:**

| Name       | Description                             |
| ---------- | --------------------------------------- |
| --debug    | Enable debug output.                    |
| -h,--help  | Show this help string.                  |
| --no-color | Disable color output even if supported. |

> To run it on hadoop, you should use "hadoop jar" instead of "java jar"

### `cat` command

Prints the content of a Parquet file. The output contains only the data, no metadata is displayed

**Usage:**

```sh
hadoop jar parquet-tools.jar cat [option...] <input>
```

where option is one of:

```sh
       --debug     Enable debug output
    -h,--help      Show this help string
    -j,--json      Show records in JSON format.
       --no-color  Disable color output even if supported
```

where `<input>` is the parquet file to print to stdout

**Example:**

```sh
$ hadoop jar parquet-tools.jar cat hdfs://localhost:8020/employees.parquet
```

```sh
2023-01-17 11:34:34,451 INFO hadoop.InternalParquetRecordReader: RecordReader initialized will read a total of 10 records.
2023-01-17 11:34:34,452 INFO hadoop.InternalParquetRecordReader: at row 0. reading next block
2023-01-17 11:34:34,487 INFO hadoop.InternalParquetRecordReader: block read in memory in 35 ms. row count = 10
email = rangareddy@yahoo.com
employee_id = 1
first_name = Ranga
hire_date = 21-Jun-07
last_name = Reddy
phone_number = 99509833
salary = 2600

email = raja@gmail.com
employee_id = 2
first_name = Raja Sekhar
hire_date = 13-Jan-08
last_name = Reddy
manager_id = 1
phone_number = 75050798
salary = 2600
...........
```

Print the content in json format.

```sh
hadoop jar parquet-tools.jar cat --json hdfs://localhost:8020/employees.parquet
```

```sh
2023-01-18 04:17:47,118 INFO hadoop.InternalParquetRecordReader: RecordReader initialized will read a total of 10 records.
2023-01-18 04:17:47,118 INFO hadoop.InternalParquetRecordReader: at row 0. reading next block
2023-01-18 04:17:47,149 INFO hadoop.InternalParquetRecordReader: block read in memory in 31 ms. row count = 10
{"email":"rangareddy@yahoo.com","employee_id":1,"first_name":"Ranga","hire_date":"21-Jun-07","last_name":"Reddy","phone_number":99509833,"salary":2600}
{"email":"raja@gmail.com","employee_id":2,"first_name":"Raja Sekhar","hire_date":"13-Jan-08","last_name":"Reddy","manager_id":1,"phone_number":75050798,"salary":2600}
{"email":"vasu@gmail.com","employee_id":3,"first_name":"Vasundra","hire_date":"17-Sep-03","last_name":"Reddy","manager_id":1,"phone_number":91512344,"salary":4400}
{"email":"meena@test.com","employee_id":4,"first_name":"Meena","hire_date":"17-Feb-04","last_name":"P","manager_id":2,"phone_number":81535555,"salary":13000}
{"email":"manu@rediff.com","employee_id":5,"first_name":"Manoj","hire_date":"17-Aug-05","last_name":"Kumar","manager_id":3,"phone_number":60312366,"salary":6000}
{"email":"vinod@zoho.com","employee_id":6,"first_name":"Vinod","hire_date":"07-Jun-02","last_name":"Kumar","manager_id":3,"phone_number":71237777,"salary":6500}
{"email":"rajar@yahoo.co.in","employee_id":7,"first_name":"Raja","hire_date":"07-Jun-02","last_name":"Reddy","manager_id":4,"phone_number":91518888,"salary":10000}
{"email":"shiva@mymail.com","employee_id":8,"first_name":"Shiva","hire_date":"07-Jun-02","last_name":"P","manager_id":6,"phone_number":81512380,"salary":12008}
{"email":"babu@mail.com","employee_id":9,"first_name":"Reddy","hire_date":"07-Jun-02","last_name":"Babu","manager_id":7,"phone_number":91528181,"salary":8300}
{"email":"nish@nish.com","employee_id":10,"first_name":"Nishanth","hire_date":"17-Jun-03","last_name":"Reddy","manager_id":2,"phone_number":61512347,"salary":24000}
```

### `head` command

Prints the first `n` record of the Parquet file (default: 5)

**Usage:**

```sh
hadoop jar parquet-tools.jar head [option...] <input>
```

where option is one of:

```sh
       --debug          Enable debug output
    -h,--help           Show this help string
    -n,--records <arg>  The number of records to show (default: 5)
       --no-color       Disable color output even if supported
```

where `<input>` is the parquet file to print to stdout

**Example:**

```sh
$ hadoop jar parquet-tools.jar head hdfs://localhost:8020/employees.parquet
```

```sh
2023-01-17 11:36:14,668 INFO hadoop.InternalParquetRecordReader: RecordReader initialized will read a total of 10 records.
2023-01-17 11:36:14,668 INFO hadoop.InternalParquetRecordReader: at row 0. reading next block
2023-01-17 11:36:14,699 INFO hadoop.InternalParquetRecordReader: block read in memory in 31 ms. row count = 10
email = rangareddy@yahoo.com
employee_id = 1
first_name = Ranga
hire_date = 21-Jun-07
last_name = Reddy
phone_number = 99509833
salary = 2600

email = raja@gmail.com
employee_id = 2
first_name = Raja Sekhar
hire_date = 13-Jan-08
last_name = Reddy
manager_id = 1
phone_number = 75050798
salary = 2600

email = vasu@gmail.com
employee_id = 3
first_name = Vasundra
hire_date = 17-Sep-03
last_name = Reddy
manager_id = 1
phone_number = 91512344
salary = 4400

email = meena@test.com
employee_id = 4
first_name = Meena
hire_date = 17-Feb-04
last_name = P
manager_id = 2
phone_number = 81535555
salary = 13000

email = manu@rediff.com
employee_id = 5
first_name = Manoj
hire_date = 17-Aug-05
last_name = Kumar
manager_id = 3
phone_number = 60312366
salary = 6000
```

Print the top 2 records

```sh
$ hadoop jar parquet-tools.jar head -n 2 hdfs://localhost:8020/employees.parquet
```

```sh
2023-01-17 11:37:15,303 INFO hadoop.InternalParquetRecordReader: RecordReader initialized will read a total of 10 records.
2023-01-17 11:37:15,303 INFO hadoop.InternalParquetRecordReader: at row 0. reading next block
2023-01-17 11:37:15,330 INFO hadoop.InternalParquetRecordReader: block read in memory in 26 ms. row count = 10
email = rangareddy@yahoo.com
employee_id = 1
first_name = Ranga
hire_date = 21-Jun-07
last_name = Reddy
phone_number = 99509833
salary = 2600

email = raja@gmail.com
employee_id = 2
first_name = Raja Sekhar
hire_date = 13-Jan-08
last_name = Reddy
manager_id = 1
phone_number = 75050798
salary = 2600
```

### `schema` command

Prints the schema of Parquet file(s)

**Usage:**

```sh
hadoop jar parquet-tools.jar schema [option...] <input>
```

where option is one of:

```sh
    -d,--detailed      Show detailed information about the schema.
       --debug         Enable debug output
    -h,--help          Show this help string
       --no-color      Disable color output even if supported
    -o,--originalType  Print logical types in OriginalType representation.
```

where `<input>` is the parquet file containing the schema to show

**Example:**

```sh
$ hadoop jar parquet-tools.jar schema hdfs://localhost:8020/employees.parquet
```

```sh
message spark_schema {
  optional binary email (STRING);
  optional int64 employee_id;
  optional binary first_name (STRING);
  optional binary hire_date (STRING);
  optional binary last_name (STRING);
  optional int64 manager_id;
  optional int64 phone_number;
  optional int64 salary;
}
```

### `meta` command

Prints the metadata of Parquet file(s)

**Usage:**

```sh
hadoop jar parquet-tools.jar meta [option...] <input>
```

where option is one of:

```sh
       --debug         Enable debug output
    -h,--help          Show this help string
       --no-color      Disable color output even if supported
    -o,--originalType  Print logical types in OriginalType representation.
```

where `<input>` is the parquet file to print to stdout

**Example:**

```sh
$ hadoop jar parquet-tools.jar meta hdfs://localhost:8020/employees.parquet
```

```sh
2023-01-17 11:38:51,086 INFO hadoop.ParquetFileReader: Initiating action with parallelism: 5
2023-01-17 11:38:51,089 INFO hadoop.ParquetFileReader: reading another 1 footers
2023-01-17 11:38:51,092 INFO hadoop.ParquetFileReader: Initiating action with parallelism: 5
file:         hdfs://localhost:8020/employees.parquet 
creator:      parquet-mr version 1.10.99.7.1.7.1000-141 (build 12da67a00623b3abf03a62026e8d6d61dc21da37) 
extra:        org.apache.spark.version = 2.4.7 
extra:        org.apache.spark.sql.parquet.row.metadata = {"type":"struct","fields":[{"name":"email","type":"string","nullable":true,"metadata":{}},{"name":"employee_id","type":"long","nullable":true,"metadata":{}},{"name":"first_name","type":"string","nullable":true,"metadata":{}},{"name":"hire_date","type":"string","nullable":true,"metadata":{}},{"name":"last_name","type":"string","nullable":true,"metadata":{}},{"name":"manager_id","type":"long","nullable":true,"metadata":{}},{"name":"phone_number","type":"long","nullable":true,"metadata":{}},{"name":"salary","type":"long","nullable":true,"metadata":{}}]} 

file schema:  spark_schema 
--------------------------------------------------------------------------------
email:        OPTIONAL BINARY L:STRING R:0 D:1
employee_id:  OPTIONAL INT64 R:0 D:1
first_name:   OPTIONAL BINARY L:STRING R:0 D:1
hire_date:    OPTIONAL BINARY L:STRING R:0 D:1
last_name:    OPTIONAL BINARY L:STRING R:0 D:1
manager_id:   OPTIONAL INT64 R:0 D:1
phone_number: OPTIONAL INT64 R:0 D:1
salary:       OPTIONAL INT64 R:0 D:1

row group 1:  RC:10 TS:959 OFFSET:4 
--------------------------------------------------------------------------------
email:         BINARY UNCOMPRESSED DO:0 FPO:4 SZ:215/215/1.00 VC:10 ENC:RLE,BIT_PACKED,PLAIN ST:[min: babu@mail.com, max: vinod@zoho.com, num_nulls: 0]
employee_id:   INT64 UNCOMPRESSED DO:0 FPO:219 SZ:105/105/1.00 VC:10 ENC:RLE,BIT_PACKED,PLAIN ST:[min: 1, max: 10, num_nulls: 0]
first_name:    BINARY UNCOMPRESSED DO:0 FPO:324 SZ:126/126/1.00 VC:10 ENC:RLE,BIT_PACKED,PLAIN ST:[min: Manoj, max: Vinod, num_nulls: 0]
hire_date:     BINARY UNCOMPRESSED DO:0 FPO:450 SZ:137/137/1.00 VC:10 ENC:RLE,BIT_PACKED,PLAIN_DICTIONARY ST:[min: 07-Jun-02, max: 21-Jun-07, num_nulls: 0]
last_name:     BINARY UNCOMPRESSED DO:0 FPO:587 SZ:73/73/1.00 VC:10 ENC:RLE,BIT_PACKED,PLAIN_DICTIONARY ST:[min: Babu, max: Reddy, num_nulls: 0]
manager_id:    INT64 UNCOMPRESSED DO:0 FPO:660 SZ:93/93/1.00 VC:10 ENC:RLE,BIT_PACKED,PLAIN_DICTIONARY ST:[min: 1, max: 7, num_nulls: 1]
phone_number:  INT64 UNCOMPRESSED DO:0 FPO:753 SZ:105/105/1.00 VC:10 ENC:RLE,BIT_PACKED,PLAIN ST:[min: 60312366, max: 99509833, num_nulls: 0]
salary:        INT64 UNCOMPRESSED DO:0 FPO:858 SZ:105/105/1.00 VC:10 ENC:RLE,BIT_PACKED,PLAIN ST:[min: 2600, max: 24000, num_nulls: 0]
```

### `dump` command

Prints the content and metadata of a Parquet file

**Usage:**

```sh
hadoop jar parquet-tools.jar dump [option...] <input>
```

where option is one of:

```sh
    -c,--column <arg>  Dump only the given column, can be specified more than
                       once
    -d,--disable-data  Do not dump column data
       --debug         Enable debug output
    -h,--help          Show this help string
    -m,--disable-meta  Do not dump row group and page metadata
    -n,--disable-crop  Do not crop the output based on console width
       --no-color      Disable color output even if supported
```

where `<input>` is the parquet file to print to stdout

**Example:**

```sh
$ hadoop jar parquet-tools.jar dump hdfs://localhost:8020/employees.parquet
```

```sh
row group 0 
--------------------------------------------------------------------------------
email:         BINARY UNCOMPRESSED DO:0 FPO:4 SZ:215/215/1.00 VC:10 EN [more]...
employee_id:   INT64 UNCOMPRESSED DO:0 FPO:219 SZ:105/105/1.00 VC:10 E [more]...
first_name:    BINARY UNCOMPRESSED DO:0 FPO:324 SZ:126/126/1.00 VC:10  [more]...
hire_date:     BINARY UNCOMPRESSED DO:0 FPO:450 SZ:137/137/1.00 VC:10  [more]...
last_name:     BINARY UNCOMPRESSED DO:0 FPO:587 SZ:73/73/1.00 VC:10 EN [more]...
manager_id:    INT64 UNCOMPRESSED DO:0 FPO:660 SZ:93/93/1.00 VC:10 ENC [more]...
phone_number:  INT64 UNCOMPRESSED DO:0 FPO:753 SZ:105/105/1.00 VC:10 E [more]...
salary:        INT64 UNCOMPRESSED DO:0 FPO:858 SZ:105/105/1.00 VC:10 E [more]...

    email TV=10 RL=0 DL=1
    ----------------------------------------------------------------------------
    page 0:                         DLE:RLE RLE:BIT_PACKED VLE:PLAIN S [more]... SZ:196

    employee_id TV=10 RL=0 DL=1
    ----------------------------------------------------------------------------
    page 0:                         DLE:RLE RLE:BIT_PACKED VLE:PLAIN S [more]... SZ:86

    first_name TV=10 RL=0 DL=1
    ----------------------------------------------------------------------------
    page 0:                         DLE:RLE RLE:BIT_PACKED VLE:PLAIN S [more]... SZ:107

    hire_date TV=10 RL=0 DL=1 DS:  7 DE:PLAIN_DICTIONARY
    ----------------------------------------------------------------------------
    page 0:                         DLE:RLE RLE:BIT_PACKED VLE:PLAIN_DICTIONARY [more]... SZ:14

    last_name TV=10 RL=0 DL=1 DS:  4 DE:PLAIN_DICTIONARY
    ----------------------------------------------------------------------------
    page 0:                         DLE:RLE RLE:BIT_PACKED VLE:PLAIN_DICTIONARY [more]... SZ:12

    manager_id TV=10 RL=0 DL=1 DS: 6 DE:PLAIN_DICTIONARY
    ----------------------------------------------------------------------------
    page 0:                         DLE:RLE RLE:BIT_PACKED VLE:PLAIN_DICTIONARY [more]... SZ:15

    phone_number TV=10 RL=0 DL=1
    ----------------------------------------------------------------------------
    page 0:                         DLE:RLE RLE:BIT_PACKED VLE:PLAIN S [more]... SZ:86

    salary TV=10 RL=0 DL=1
    ----------------------------------------------------------------------------
    page 0:                         DLE:RLE RLE:BIT_PACKED VLE:PLAIN S [more]... SZ:86

BINARY email 
--------------------------------------------------------------------------------
*** row group 1 of 1, values 1 to 10 *** 
value 1:  R:0 D:1 V:rangareddy@yahoo.com
value 2:  R:0 D:1 V:raja@gmail.com
value 3:  R:0 D:1 V:vasu@gmail.com
value 4:  R:0 D:1 V:meena@test.com
value 5:  R:0 D:1 V:manu@rediff.com
value 6:  R:0 D:1 V:vinod@zoho.com
value 7:  R:0 D:1 V:rajar@yahoo.co.in
value 8:  R:0 D:1 V:shiva@mymail.com
value 9:  R:0 D:1 V:babu@mail.com
value 10: R:0 D:1 V:nish@nish.com

INT64 employee_id 
--------------------------------------------------------------------------------
*** row group 1 of 1, values 1 to 10 *** 
value 1:  R:0 D:1 V:1
value 2:  R:0 D:1 V:2
value 3:  R:0 D:1 V:3
value 4:  R:0 D:1 V:4
value 5:  R:0 D:1 V:5
value 6:  R:0 D:1 V:6
value 7:  R:0 D:1 V:7
value 8:  R:0 D:1 V:8
value 9:  R:0 D:1 V:9
value 10: R:0 D:1 V:10

BINARY first_name 
--------------------------------------------------------------------------------
*** row group 1 of 1, values 1 to 10 *** 
value 1:  R:0 D:1 V:Ranga
value 2:  R:0 D:1 V:Raja Sekhar
value 3:  R:0 D:1 V:Vasundra
value 4:  R:0 D:1 V:Meena
value 5:  R:0 D:1 V:Manoj
value 6:  R:0 D:1 V:Vinod
value 7:  R:0 D:1 V:Raja
value 8:  R:0 D:1 V:Shiva
value 9:  R:0 D:1 V:Reddy
value 10: R:0 D:1 V:Nishanth

BINARY hire_date 
--------------------------------------------------------------------------------
*** row group 1 of 1, values 1 to 10 *** 
value 1:  R:0 D:1 V:21-Jun-07
value 2:  R:0 D:1 V:13-Jan-08
value 3:  R:0 D:1 V:17-Sep-03
value 4:  R:0 D:1 V:17-Feb-04
value 5:  R:0 D:1 V:17-Aug-05
value 6:  R:0 D:1 V:07-Jun-02
value 7:  R:0 D:1 V:07-Jun-02
value 8:  R:0 D:1 V:07-Jun-02
value 9:  R:0 D:1 V:07-Jun-02
value 10: R:0 D:1 V:17-Jun-03

BINARY last_name 
--------------------------------------------------------------------------------
*** row group 1 of 1, values 1 to 10 *** 
value 1:  R:0 D:1 V:Reddy
value 2:  R:0 D:1 V:Reddy
value 3:  R:0 D:1 V:Reddy
value 4:  R:0 D:1 V:P
value 5:  R:0 D:1 V:Kumar
value 6:  R:0 D:1 V:Kumar
value 7:  R:0 D:1 V:Reddy
value 8:  R:0 D:1 V:P
value 9:  R:0 D:1 V:Babu
value 10: R:0 D:1 V:Reddy

INT64 manager_id 
--------------------------------------------------------------------------------
*** row group 1 of 1, values 1 to 10 *** 
value 1:  R:0 D:0 V:<null>
value 2:  R:0 D:1 V:1
value 3:  R:0 D:1 V:1
value 4:  R:0 D:1 V:2
value 5:  R:0 D:1 V:3
value 6:  R:0 D:1 V:3
value 7:  R:0 D:1 V:4
value 8:  R:0 D:1 V:6
value 9:  R:0 D:1 V:7
value 10: R:0 D:1 V:2

INT64 phone_number 
--------------------------------------------------------------------------------
*** row group 1 of 1, values 1 to 10 *** 
value 1:  R:0 D:1 V:99509833
value 2:  R:0 D:1 V:75050798
value 3:  R:0 D:1 V:91512344
value 4:  R:0 D:1 V:81535555
value 5:  R:0 D:1 V:60312366
value 6:  R:0 D:1 V:71237777
value 7:  R:0 D:1 V:91518888
value 8:  R:0 D:1 V:81512380
value 9:  R:0 D:1 V:91528181
value 10: R:0 D:1 V:61512347

INT64 salary 
--------------------------------------------------------------------------------
*** row group 1 of 1, values 1 to 10 *** 
value 1:  R:0 D:1 V:2600
value 2:  R:0 D:1 V:2600
value 3:  R:0 D:1 V:4400
value 4:  R:0 D:1 V:13000
value 5:  R:0 D:1 V:6000
value 6:  R:0 D:1 V:6500
value 7:  R:0 D:1 V:10000
value 8:  R:0 D:1 V:12008
value 9:  R:0 D:1 V:8300
value 10: R:0 D:1 V:24000
```

### `merge` command

Merges multiple Parquet files into one. The command doesn't merge row groups, just places one after the other. When used to merge many small files, the resulting file will still contain small row groups, which usually leads to bad query performance.

**Usage:**

```sh
hadoop jar parquet-tools.jar merge [option...] <input> [<input> ...] <output>
```

where option is one of:

```sh
       --debug     Enable debug output
    -h,--help      Show this help string
       --no-color  Disable color output even if supported
```

where `<input>` is the source parquet files/directory to be merged
   `<output>` is the destination parquet file

**Example:**

```sh
$ hadoop jar parquet-tools.jar merge hdfs://localhost:8020/test_1.parquet hdfs://localhost:8020/test_2.parquet hdfs://localhost:8020/test_output.parquet
```

```sh
Warning: file hdfs://localhost:8020/test_1.parquet is too small, length: 490
Warning: file hdfs://localhost:8020/test_2.parquet is too small, length: 490
Warning: you merged too small files. Although the size of the merged file is bigger, it STILL contains small row groups, thus you don't have the advantage of big row groups, which usually leads to bad query performance!
```

Print the merged file content:

```sh
$ hadoop jar parquet-tools.jar cat --json hdfs://localhost:8020/test_output.parquet
```

```sh
2023-01-18 04:22:30,439 INFO hadoop.InternalParquetRecordReader: RecordReader initialized will read a total of 8 records.
2023-01-18 04:22:30,439 INFO hadoop.InternalParquetRecordReader: at row 0. reading next block
2023-01-18 04:22:30,465 INFO compress.CodecPool: Got brand-new decompressor [.snappy]
2023-01-18 04:22:30,482 INFO hadoop.InternalParquetRecordReader: block read in memory in 43 ms. row count = 4
{"id":1}
{"id":2}
{"id":3}
{"id":4}
2023-01-18 04:22:30,829 INFO hadoop.InternalParquetRecordReader: Assembled and processed 4 records from 1 columns in 46 ms: 0.08695652 rec/ms, 0.08695652 cell/ms
2023-01-18 04:22:30,829 INFO hadoop.InternalParquetRecordReader: time spent so far 48% reading (43 ms) and 51% processing (46 ms)
2023-01-18 04:22:30,829 INFO hadoop.InternalParquetRecordReader: at row 4. reading next block
2023-01-18 04:22:30,830 INFO hadoop.InternalParquetRecordReader: block read in memory in 1 ms. row count = 4
{"id":6}
{"id":7}
{"id":8}
{"id":9}
```

### `rowcount` command 

Print the count of rows in a Parquet file

**Usage:**

```sh
hadoop jar parquet-tools.jar rowcount [option...] <input>
```

where option is one of:

```sh
    -d,--detailed  Detailed rowcount of each matching file
       --debug     Enable debug output
    -h,--help      Show this help string
       --no-color  Disable color output even if supported
```

where `<input>` is the parquet file to count rows to stdout

**Example:**

```sh
$ hadoop jar parquet-tools.jar rowcount hdfs://localhost:8020/employees.parquet
```

```sh
2023-01-17 11:55:08,389 INFO hadoop.ParquetFileReader: Initiating action with parallelism: 5
2023-01-17 11:55:08,393 INFO hadoop.ParquetFileReader: reading another 1 footers
2023-01-17 11:55:08,395 INFO hadoop.ParquetFileReader: Initiating action with parallelism: 5
Total RowCount: 10
```

### `size` command 

Prints the size of Parquet file(s)

**Usage:**

```sh
hadoop jar parquet-tools.jar size [option...] <input>
```

where option is one of:

```sh
    -d,--detailed      Detailed size of each matching file
       --debug         Enable debug output
    -h,--help          Show this help string
       --no-color      Disable color output even if supported
    -p,--pretty        Pretty size
    -u,--uncompressed  Uncompressed size
```

where `<input>` is the parquet file to get size & human readable size to stdout

**Example:**

```sh
$ hadoop jar parquet-tools.jar size hdfs://localhost:8020/employees.parquet
```

```sh
2023-01-17 11:55:59,432 INFO hadoop.ParquetFileReader: Initiating action with parallelism: 5
2023-01-17 11:55:59,578 INFO hadoop.ParquetFileReader: reading another 1 footers
2023-01-17 11:55:59,642 INFO hadoop.ParquetFileReader: Initiating action with parallelism: 5
Total Size: 959 bytes
```

## References

* https://github.com/apache/parquet-mr/tree/parquet-1.8.0rc1/parquet-tools/
* https://mvnrepository.com/artifact/org.apache.parquet/parquet-tools
