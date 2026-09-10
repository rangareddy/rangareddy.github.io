---
title: Spark Streaming Kafka Batch Size Calculator
categories: Spark
tags: Spark Utilities Streaming
author: Ranga Reddy
date: "2023-04-25 17:00:00 +0530"
description: >-
  Work out the maximum number of Kafka messages a Spark Streaming batch will fetch from the partition count, batch duration and max rate per partition.
kind: tool
tool_assets: true
---

* content
{:toc}

> **TL;DR**
>
> * Enter the Kafka partition count, the batch duration in seconds and the max rate per partition; the tool returns the maximum messages one batch will fetch.
> * The arithmetic is `partitions x batch duration x max rate per partition`, which is the ceiling `spark.streaming.kafka.maxRatePerPartition` imposes on a DStream batch.
> * Use it to size a batch against what your job can actually process in one interval. A ceiling above your throughput means growing scheduling delay, not faster ingestion.
> * For Structured Streaming the equivalent knob is `maxOffsetsPerTrigger`, which caps offsets per trigger across the whole topic rather than per partition.

## Spark Streaming Kafka Batch Size Calculator

Used to calculate the Spark Streaming Kafka Batch Size.

<div class="tool-widget">
    <script type="text/javascript">
      $(document).ready(function() {

        function hide_configuration() {
          $("#kafka_batch_size_ouput_config").hide();
        }

        $("#reset-batch-size").click(function() {
          hide_configuration();
          $("#numPartitions").val(5)
          $("#maxRatePerPartition").val(100)
          $("#batchDuration").val(2)
        });

        $("#calculate-batch-size").click(function() {
            hide_configuration();
            var numPartitions = parseInt($("#numPartitions").val());
            var maxRatePerPartition = parseInt($("#maxRatePerPartition").val());
            var batchDuration = parseInt($("#batchDuration").val());

            var batchSize = numPartitions * maxRatePerPartition * batchDuration;

            $("#batchSize").val(batchSize);
            $("#kafka_batch_size_ouput_config").show();
        });

        hide_configuration();
      });
    </script>
    <div class="container-fluid">
      <div class="row" id="kafka_batch_size_config" style="margin-top: 10px;">
        <div class="col-md-12">
          <div class="card">
            <div class="card-header">
              <h5>Spark Streaming Kafka Batch Size Configuration</h5>
            </div> <!-- card-header -->
            <div class="card-body">
              <div class="row" style='margin-top: 10px;'>
                <div class="col-sm-4">
                  <div class="form-group">
                    <label for="numPartitions">Number of Kafka Partitions:</label>
                  </div>
                </div>
                <div class="col-sm-4">
                  <div class="form-group">
                    <input type="number" class="form-control" id="numPartitions" name="numPartitions" min="1" step="1" value="5" required>
                  </div>
                </div>
              </div>
              <div class="row" style='margin-top: 10px;'>
                <div class="col-sm-4">
                  <div class="form-group">
                    <label for="batchDuration">Batch Duration (seconds):</label>
                  </div>
                </div>
                <div class="col-sm-4">
                  <div class="form-group">
                    <input type="number" class="form-control" id="batchDuration" name="batchDuration" min="1" step="1" value="2" required>
                  </div>
                </div>
              </div>
              <div class="row" style='margin-top: 10px;'>
                <div class="col-sm-4">
                  <div class="form-group">
                    <label for="maxRatePerPartition">Max Rate Per Partition (records/sec):</label>
                  </div>
                </div>
                <div class="col-sm-4">
                  <div class="form-group">
                    <input type="number" class="form-control" id="maxRatePerPartition" name="maxRatePerPartition" min="1" step="1" value="100" required>
                  </div>
              </div>
              </div>
            </div> <!-- card-body -->
            <div class="card-footer" id='kafka_batch_size_button_config'>
              <div class="row">
                <div class="col-sm-3">
                  <div class="form-group">
                    <button type="button" id='calculate-batch-size' class="btn btn-primary">Calculate Batch Size</button>
                  </div>
                </div>
                <div class="col-sm-3">
                  <div class="form-group">
                    <button type="button" id='reset-batch-size' class="btn btn-warning">Reset Config</button>
                  </div>
                </div>
              </div>
            </div> <!-- card-footer -->
          </div> <!-- card -->
        </div>
      </div> <!-- kafka_batch_size_config -->
      <div class="row" id='kafka_batch_size_ouput_config' style="margin-top: 10px;">
          <div class="col-md-12">
            <div class="card">
              <div class="card-body">
                 <div class="row">
                  <div class="col-sm-4">
                    <div class="form-group">
                      <label for="batchSize">Maximum Kafka Messages to Fetch per Batch is </label>
                    </div>
                  </div>
                  <div class="col-sm-4">
                    <div class="form-group">
                     <input type="number" class="form-control" id="batchSize" name="batchSize" readonly>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
      </div> <!-- kafka_batch_size_ouput_config-->
    </div> <!-- container-fluid -->
</div>

## References

* [Spark Streaming and Kafka integration](https://spark.apache.org/docs/latest/streaming-kafka-0-10-integration.html) for `spark.streaming.kafka.maxRatePerPartition` and backpressure
* [Structured Streaming and Kafka integration](https://spark.apache.org/docs/latest/structured-streaming-kafka-integration.html) for `maxOffsetsPerTrigger`, the current equivalent
* [Structured Streaming programming guide](https://spark.apache.org/docs/latest/structured-streaming-programming-guide.html) for trigger intervals and processing-time semantics
