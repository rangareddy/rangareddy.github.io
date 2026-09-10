---
layout: page
title: About Me
permalink: /about/
icon: heart
type: page
description: >-
  Senior Data Engineer with 14+ years on petabyte-scale big data platforms.
  Open Source Engineer at OneHouse, contributing upstream to Apache Hudi and
  Apache XTable. Previously Cloudera's Spark and Iceberg backline engineer.
---

* content
{:toc}

## Hello

I am **Ranga Reddy**, a Senior Data Engineer based in Bangalore, India, with
**14+ years** of experience building petabyte-scale big data platforms and
lakehouse architectures.

Today I work as an **Open Source Engineer at OneHouse**, contributing upstream to
**Apache Hudi** and **Apache XTable**: indexing strategies, compaction,
clustering, metadata table optimization and multi-writer concurrency. Before
that I spent four and a half years at **Cloudera** as the **Spark and Iceberg
backline engineer**, the final escalation point for the platform's most critical
P0/P1 customer issues across Fortune 500 deployments.

That combination is what this blog is about: format internals on one side,
and what actually breaks in production on the other.

## What I work on

- **Open source development and community work**, on Apache Hudi and Apache XTable
- **Backline engineering**: production escalation and root-cause analysis on Spark and Iceberg
- **Spark SQL and DataFrame optimization**, including Catalyst query tuning
- **Lakehouse architecture** with Hudi, Iceberg and Hive Metastore
- **Real-time and batch pipeline engineering**
- **Customer-facing solution engineering** and technical writing

## Experience

### Open Source Engineer, OneHouse
*Bangalore, September 2024 to present*

Contributing upstream to Apache Hudi and Apache XTable, designing and optimizing
core components for large-scale lakehouse systems.

- **Upstream development.** Authored and reviewed pull requests, JIRAs and RFCs
  across Hudi internals: indexing strategies, compaction, clustering, metadata
  table optimization and multi-writer concurrency models.
- **Customer escalation engineering.** Lead escalation engineer for community and
  enterprise issues filed through Slack, GitHub and the Hudi mailing list,
  covering Spark, Trino, Presto and Flink integrations.
- **Benchmarking framework.** Built automated performance and correctness suites
  comparing Hudi behaviour across Spark, Presto and Trino, used internally to
  gate releases.
- **Cost-saving tooling.** Built end-to-end tooling that parses table metadata,
  query logs and statistics into actionable metrics, letting customers cut up to
  40% of their production costs.
- **Technical content.** Deep-dive posts and tutorials on Hudi internals for the
  OSS community.

Stack: Java, Scala, Python, Spark, Trino, Presto, AWS (EMR, S3, Athena, Glue),
GCP (Dataproc, GCS, BigQuery).

### Staff Software Engineer, Spark and Iceberg Backline, Cloudera
*Bangalore, March 2020 to August 2024*

The final escalation point for Cloudera's global support organization: the
complex Spark and Iceberg production outages that frontline support and field
engineers could not resolve.

- **Spark escalations.** Root-cause analysis on hundreds of P0/P1 Spark issues
  across CDP and CDH: shuffle failures, OOM patterns, dynamic allocation
  regressions, Catalyst optimizer edge cases, and Hive-on-Spark and
  Spark-on-YARN integration breaks.
- **Iceberg production support.** Metadata corruption, snapshot isolation
  conflicts, time-travel query regressions, and partition and schema evolution
  compatibility across Spark 3.x and Hive Metastore, plus Iceberg's integration
  with Trino and Presto.
- **Internal tooling.** A unified log-parsing tool that ingests Spark event logs,
  application logs and Iceberg metadata files to surface stage-level bottlenecks
  and table-level inefficiencies. Adopted by the global support team.
- **Cross-platform debugging.** Integration issues between Spark, Iceberg and
  cloud storage (S3, GCS), including consistency models and file-listing
  performance.
- **Knowledge sharing.** Published Spark and Iceberg knowledge articles on the
  Cloudera Community, and designed *Spark Hogwarts*, a hands-on internal training
  program on Spark internals and lakehouse formats for the frontline support team.

Stack: Java, Scala, Python, Spark 2.x and 3.x, Kafka, Iceberg, Hive, Cloudera
CDP/CDH/HDP.

### Big Data Engineer, Dell EMC
*Bangalore, November 2015 to March 2020*

**Support Assist Intelligence Engine (SAIE)** and **SAIE Analytics**: storing
Support Assist telemetry to enable proactive and predictive support.

- Designed a Spark to Kafka to Storm to HBase ingest path for unstructured and
  semi-structured telemetry at scale.
- Read from Oracle, processed through Spark, published to Kafka, consumed from
  Kafka with Storm for real-time analysis.
- Co-led the HDP 2.3 to 2.5 production upgrade across a 40-node cluster with zero
  unplanned downtime.
- Led the design of the Support Assist Enterprise module and its configuration
  ingestion pipeline.

Stack: Hadoop, Hortonworks HDP, Spark, Storm, Kafka, Oracle, HBase.

### Senior Software Engineer, Mindtree
*Bangalore, August 2014 to November 2015*

**Meeting Services Application**: a mobile and tablet platform letting meeting
planners request services without leaving the room. Controller, service and DAO
layers, Spring service interfaces, JSP with jQuery and AngularJS, Hibernate.

Stack: Java, Spring, Hibernate, AngularJS, jQuery, MySQL.

### Junior Software Engineer, ITApp Software
*Bangalore, October 2012 to July 2014*

**AppCenter**: a cloud services delivery and business management platform for
provisioning, lifecycle, monitoring and user management. Spring Portlet MVC
portlets, controllers, JSP front end, Kendo UI, JUnit.

Stack: Java, Spring, Hibernate, MySQL, Kendo UI, jQuery.

## Core skills

| Domain | Technologies |
|:--|:--|
| Lakehouse and table formats | Apache Hudi (contributor), Apache Iceberg, Hive Metastore |
| Distributed compute | Apache Spark (SQL, Streaming, DataFrames), Apache Storm, Apache Hadoop |
| Streaming and messaging | Apache Kafka, Hudi Streamer |
| Query engines | Trino, PrestoDB, Athena, Spark SQL, Hive |
| Cloud and storage | AWS (S3, Athena, Glue, EMR), GCP, MinIO |
| Languages | Java, Scala, Python |
| Frameworks | Spring, Hibernate |
| Databases | Oracle, MySQL, HBase |
| Distributions | Cloudera CDP/CDH, Hortonworks HDP, Onehouse |
| Tooling | Maven, Gradle, Jenkins, Git, IntelliJ |

## Open source

- **[Apache Hudi]({{ site.hudi_contributions }})**: upstream commits across
  indexing, compaction, clustering, the metadata table and multi-writer
  concurrency.
- **Apache XTable**: cross-platform lakehouse interoperability.
- **Benchmarking framework**: automated performance and correctness validation
  for Hudi across Spark, Presto and Trino.
- **[Cloudera Community articles]({{ site.cloudera_community }})**: Spark and
  Iceberg knowledge base articles.

## Education

- **Master of Computer Applications (MCA)**, Sri Krishnadevaraya University,
  Anantapur, 2011, 80%
- **Bachelor of Science (B.Sc)**, Sri Venkateswara University, Tirupati, 2008, 81%

## Recognition

- Silver Award, Dell EMC (Q4 FY18)
- Cash Award for the SAIE Analytics project, Dell EMC
- A-Team Performer for the MSA project, Mindtree
- Cloudera Hackathon and Dell Ideafest participant

## Get in touch

- **Email:** [{{ site.email }}](mailto:{{ site.email }})
- **LinkedIn:** [linkedin.com/in/{{ site.linkedIn_username }}](https://www.linkedin.com/in/{{ site.linkedIn_username }})
- **GitHub:** [github.com/{{ site.github_username }}](https://github.com/{{ site.github_username }})
- **Stack Overflow:** [stackoverflow.com/{{ site.stackoverflow }}](https://stackoverflow.com/{{ site.stackoverflow }})

Full CV: [download my resume]({{ site.resume | relative_url }}) (PDF).
