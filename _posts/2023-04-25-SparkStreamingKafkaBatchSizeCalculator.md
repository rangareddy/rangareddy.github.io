---
layout: post
title: Spark Streaming Kafka Batch Size Calculator
categories: Spark
tags: Spark Utilities Streaming
author: Ranga Reddy
date: "2023-04-25 17:00:00 +0530"
---

* content
{:toc}

## Spark Streaming Kafka Batch Size Calculator

Used to calculate the Spark Streaming Kafka Batch Size.

<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Spark Shuffle Partition Generator</title>
    <link href="{{ site.baseurl }}{% link css/bootstrap.min.css %}" rel="stylesheet">
    <script src="{{ site.baseurl }}{% link js/bootstrap.bundle.min.js %}"></script>
    <script src="{{ site.baseurl }}{% link js/jquery-slim.js %}"></script>
    <script src="{{ site.baseurl }}{% link js/common.js %}"></script>
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
  </head>
  <body>
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
  </body>
</html>