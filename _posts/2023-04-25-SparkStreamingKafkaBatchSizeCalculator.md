---
title: Kafka rate limit calculator for Spark Streaming
categories: Spark
tags: Spark Utilities Streaming Kafka
author: Ranga Reddy
date: "2023-04-25 17:00:00 +0530"
updated: "2026-09-11 10:00:00 +0530"
description: >-
  Size the Kafka rate limit for a Spark job in either API: maxOffsetsPerTrigger
  for Structured Streaming, or spark.streaming.kafka.maxRatePerPartition for a
  DStream. Enter partitions, interval and target throughput and copy the config
  line.
kind: tool
tool_assets: true
---

* content
{:toc}

> **TL;DR**
>
> * Pick your API, enter partitions, interval and target throughput, and copy the config line the tool produces.
> * The two limits are scoped differently, which is the thing to get right. `maxOffsetsPerTrigger` is a total for the whole topic per trigger, split proportionally across partitions. `spark.streaming.kafka.maxRatePerPartition` is records per second per partition.
> * So Structured Streaming takes `throughput x interval`, while a DStream batch works out to `partitions x rate x duration`.
> * Setting a limit at or slightly above what your job processes in one interval keeps batches steady and recovery from a backlog predictable.

## Kafka rate limit calculator

Both Spark streaming APIs let you cap how much Kafka data a single batch or
trigger pulls in, and both still ship in Spark 4.2.0. They just scope the limit
differently, so the same number means different things depending on which one you
are using.

| API | Option | Scope |
|:--|:--|:--|
| Structured Streaming | `maxOffsetsPerTrigger` | Total offsets per trigger for the whole topic, split proportionally across partitions |
| DStream | `spark.streaming.kafka.maxRatePerPartition` | Records per second, per partition |

Structured Streaming is the API to reach for in new work, and it is the tool's
default. The DStream connector (`connector/kafka-0-10`) is still present if you
are maintaining an older job.

Pick the API, enter your numbers, and the tool gives you the value plus the
average records each partition will see per interval, which is the figure worth
sanity-checking against your executor count.

<div class="tool-widget">
    <script type="text/javascript">
      $(document).ready(function () {
        'use strict';

        // Both rate limits below were read from Spark v4.2.0.
        // maxOffsetsPerTrigger, from the structured streaming Kafka guide, is a
        // "rate limit on maximum number of offsets processed per trigger
        // interval", and that total is split proportionally across partitions.
        // spark.streaming.kafka.maxRatePerPartition, applied in
        // DirectKafkaInputDStream, is a per-partition records-per-second ceiling.
        function calculate() {
          var api = $('#kafka_api').val();
          var partitions = parseInt($('#numPartitions').val(), 10);
          var interval = parseFloat($('#batchDuration').val());
          var rate = parseInt($('#rateValue').val(), 10);

          if (!partitions || !interval || !rate || partitions < 1 || interval <= 0 || rate < 1) {
            $('#kafka_batch_size_output_config').hide();
            window.alert('Enter a partition count, an interval and a rate, all greater than zero.');
            return;
          }

          var total;
          var configLine;

          if (api === 'structured') {
            // maxOffsetsPerTrigger is a total across the topic, so the target
            // throughput multiplied by the trigger interval is the value itself.
            total = Math.round(rate * interval);
            configLine = '.option("maxOffsetsPerTrigger", "' + total + '")';
          } else {
            // maxRatePerPartition is per partition per second.
            total = Math.round(partitions * rate * interval);
            configLine = '--conf spark.streaming.kafka.maxRatePerPartition=' + rate;
          }

          var perPartition = Math.ceil(total / partitions);

          $('#batchSize').val(total);
          $('#perPartition').val(perPartition);
          document.getElementById('kafka_config_line').textContent = configLine;
          $('#kafka_batch_size_output_config').show();
        }

        function applyApiLabels() {
          var structured = $('#kafka_api').val() === 'structured';
          $('#rateLabel').text(structured
            ? 'Target throughput for the whole topic (records/sec):'
            : 'Max rate per partition (records/sec):');
          $('#intervalLabel').text(structured
            ? 'Trigger interval (seconds):'
            : 'Batch duration (seconds):');
          $('#totalLabel').text(structured
            ? 'maxOffsetsPerTrigger (offsets per trigger, whole topic)'
            : 'Maximum Kafka messages fetched per batch');
          $('#kafka_batch_size_output_config').hide();
        }

        $('#kafka_api').on('change', applyApiLabels);
        $('#calculate-batch-size').on('click', calculate);
        $('#reset-batch-size').on('click', function () {
          $('#kafka_api').val('structured');
          $('#numPartitions').val(12);
          $('#batchDuration').val(10);
          $('#rateValue').val(5000);
          applyApiLabels();
        });

        applyApiLabels();
      });
    </script>
    <div class="container-fluid">
      <div class="row" id="kafka_batch_size_config" style="margin-top: 10px;">
        <div class="col-md-12">
          <div class="card">
            <div class="card-header">
              <h5>Kafka rate limit calculator</h5>
            </div>
            <div class="card-body">
              <div class="row" style='margin-top: 10px;'>
                <div class="col-sm-5">
                  <div class="form-group">
                    <label for="kafka_api">Streaming API:</label>
                  </div>
                </div>
                <div class="col-sm-5">
                  <div class="form-group">
                    <select class="form-control" id="kafka_api">
                      <option value="structured" selected>Structured Streaming (maxOffsetsPerTrigger)</option>
                      <option value="dstream">DStream (spark.streaming.kafka.maxRatePerPartition)</option>
                    </select>
                  </div>
                </div>
              </div>
              <div class="row" style='margin-top: 10px;'>
                <div class="col-sm-5">
                  <div class="form-group">
                    <label for="numPartitions">Number of Kafka partitions:</label>
                  </div>
                </div>
                <div class="col-sm-5">
                  <div class="form-group">
                    <input type="number" class="form-control" id="numPartitions" min="1" step="1" value="12" required>
                  </div>
                </div>
              </div>
              <div class="row" style='margin-top: 10px;'>
                <div class="col-sm-5">
                  <div class="form-group">
                    <label for="batchDuration" id="intervalLabel">Trigger interval (seconds):</label>
                  </div>
                </div>
                <div class="col-sm-5">
                  <div class="form-group">
                    <input type="number" class="form-control" id="batchDuration" min="1" step="1" value="10" required>
                  </div>
                </div>
              </div>
              <div class="row" style='margin-top: 10px;'>
                <div class="col-sm-5">
                  <div class="form-group">
                    <label for="rateValue" id="rateLabel">Target throughput for the whole topic (records/sec):</label>
                  </div>
                </div>
                <div class="col-sm-5">
                  <div class="form-group">
                    <input type="number" class="form-control" id="rateValue" min="1" step="1" value="5000" required>
                  </div>
                </div>
              </div>
            </div>
            <div class="card-footer">
              <div class="row">
                <div class="col-sm-4">
                  <div class="form-group">
                    <button type="button" id='calculate-batch-size' class="btn btn-primary">Calculate</button>
                  </div>
                </div>
                <div class="col-sm-4">
                  <div class="form-group">
                    <button type="button" id='reset-batch-size' class="btn btn-warning">Reset</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="row" id='kafka_batch_size_output_config' style="margin-top: 10px;">
        <div class="col-md-12">
          <div class="card">
            <div class="card-body">
              <div class="row">
                <div class="col-sm-7">
                  <div class="form-group">
                    <label for="batchSize" id="totalLabel">maxOffsetsPerTrigger (offsets per trigger, whole topic)</label>
                  </div>
                </div>
                <div class="col-sm-5">
                  <div class="form-group">
                    <input type="number" class="form-control" id="batchSize" readonly>
                  </div>
                </div>
              </div>
              <div class="row">
                <div class="col-sm-7">
                  <div class="form-group">
                    <label for="perPartition">Average records per partition per interval</label>
                  </div>
                </div>
                <div class="col-sm-5">
                  <div class="form-group">
                    <input type="number" class="form-control" id="perPartition" readonly>
                  </div>
                </div>
              </div>
              <div class="row">
                <div class="col-sm-12">
                  <pre id="kafka_config_line" style="margin: 0;"></pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- container-fluid -->

## References

* [Structured Streaming and Kafka integration](https://spark.apache.org/docs/latest/structured-streaming-kafka-integration.html) for `maxOffsetsPerTrigger` and `minOffsetsPerTrigger`
* [Spark Streaming and Kafka integration](https://spark.apache.org/docs/latest/streaming-kafka-0-10-integration.html) for `spark.streaming.kafka.maxRatePerPartition` and backpressure
* [`DirectKafkaInputDStream.scala` at v4.2.0](https://github.com/apache/spark/blob/v4.2.0/connector/kafka-0-10/src/main/scala/org/apache/spark/streaming/kafka010/DirectKafkaInputDStream.scala), where the per-partition rate limit is applied
* [Structured Streaming programming guide](https://spark.apache.org/docs/latest/structured-streaming-programming-guide.html) for trigger intervals and processing-time semantics
