---
layout: post
title: Spark Shuffle Partition Generator tool
categories: Spark
tags: Spark Utilities
author: Ranga Reddy
date: "2023-02-18 06:20:00 +0530"
---

* content
{:toc}

## Spark Shuffle Partition Generator

Used to generate the spark shuffle partition value based on shuffle input size.

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
          $("#spark_shuffle_configuration_id").hide();
        }

        function init_value() {
          $("#shuffleInputSize").selectRange({
            min: 1,
            max: 1000,
            select: 1
          });
          $("#numExecutors").selectRange({
            min: 1,
            max: 1000,
            select: 5
          });
          $("#executorCores").selectRange({
            min: 1,
            max: 30,
            select: 3
          });
          $("#shuffleSize").prop("selectedIndex", 1);
          hide_configuration();
        }
        init_value();
        $("#reset-spark-configuration").click(function() {
          init_value();
        });
        $("#generate-spark-configuration").click(function() {
          hide_configuration();
          var shuffleInputSize = parseInt($("#shuffleInputSize").val());
          if (shuffleInputSize < 1) {
            alert('Shuffle Input Size must be greater than 1');
            $("#shuffleInputSize").focus();
            hide_configuration();
            return false;
          }
          var shuffleSize = Math.pow(1024, (parseInt($('#shuffleSize :selected').val()) + 1));
          var numExecutors = parseInt($("#numExecutors :selected").val());
          var executorCores = parseInt($("#executorCores :selected").val());
          var shuffleSizeText = $('#shuffleSize :selected').text();
          var totalExecutorCores = numExecutors * executorCores;
          var mbValue = 1024 * 1024;
          var defaultPartitionSize = 100 * mbValue;
          var maxDefaultPartitionSize = 200 * mbValue;
          var totalShuffleSize = shuffleInputSize * shuffleSize;
          var totalShufflePartitions = Math.round(totalShuffleSize / defaultPartitionSize);
          var defaultSparkShufflePartitions = 200;
          /*
             The limited size of cluster working with small DataFrame: set the number of shuffle partitions to 1x or 2x the number of cores you have. (each partition should less than 200 mb to gain better performance) 
             
             e.g. input size: 2 GB with 20 cores, set shuffle partitions to 20 or 40

             The limited size of clusters, but working with huge DataFrame: set the number of shuffle partitions to Input Data Size / Partition Size (<= 200mb per partition), even better to be the multiple of the number of cores you have 

             e.g. input size: 20 GB with 40 cores, set shuffle partitions to 120 or 160 (3x to 4x of the cores & makes each partition less than 200 mb)

             Powerful clusters which have more number of cores than the number calculated above: set the number of shuffle partitions to 1x or 2x the number of cores
             
             e.g. input size: 80 GB with 400 cores, set shuffle partitions to 400 or 800.
          */
          /* 
            if( //((totalShufflePartitions/4) > totalExecutorCores)  || 
               ((totalShuffleSize/maxDefaultPartitionSize) > 4) ) {
               alert('Adjust the Number of Executors or Number of Executor Cores to process ' + shuffleInputSize + shuffleSizeText +' shuffle data');
               return false;
            }
      
            if( totalShuffleSize < (11 *  mbValue) 
               && totalExecutorCores > 10) {
               alert('Reduce the Number of Executors or Number of Executor Cores to process ' + shuffleInputSize + shuffleSizeText + ' shuffle data');
               return false;
            }
            */
          if (totalShufflePartitions > defaultSparkShufflePartitions) {
            alert('if');
          } else {
            alert('else');
          }
          var sparkSqlShufflePartitions = totalShufflePartitions;
          if (defaultPartitionSize >= totalShuffleSize || totalShufflePartitions <= 80) {
            if (defaultPartitionSize >= totalShuffleSize) {
              sparkSqlShufflePartitions = totalExecutorCores;
            } else {
              if (totalShufflePartitions < totalExecutorCores) {
                sparkSqlShufflePartitions = totalExecutorCores;
              } else {
                sparkSqlShufflePartitions = totalExecutorCores * 2;
                if (totalShufflePartitions > sparkSqlShufflePartitions) {
                  var doubleVal = (sparkSqlShufflePartitions * 2);
                  var doubleValDiff = totalShufflePartitions - doubleVal;
                  var singleValDiff = totalShufflePartitions - sparkSqlShufflePartitions;
                  if (singleValDiff > doubleValDiff) {
                    sparkSqlShufflePartitions = doubleVal;
                  }
                }
                if (totalShufflePartitions > sparkSqlShufflePartitions) {
                  var doubleVal = (sparkSqlShufflePartitions * 1.5);
                  var doubleValDiff = totalShufflePartitions - doubleVal;
                  var singleValDiff = totalShufflePartitions - sparkSqlShufflePartitions;
                  if (singleValDiff > doubleValDiff) {
                    sparkSqlShufflePartitions = doubleVal;
                  }
                }
              }
            }
          } else {
            console.log("**** Not yet implemented ****");
          }
          var sparkConfList = [];
          sparkConfList.push(sparkSqlShufflePartitions);
          console.log("totalExecutorCores \t: " + totalExecutorCores);
          console.log("totalShuffleSize \t: " + totalShuffleSize);
          console.log("totalShufflePartitions \t: " + totalShufflePartitions);
          console.log("totalShufflePartitions/totalExecutorCores \t: " + (totalShufflePartitions / totalExecutorCores));
          var table = " < table class = \"table table-bordered\" id=\"spark_shuffle_configuration_tbl\">";
          table += " < thead class = 'thead-light' > ";
          table += " < tr > < th scope = \"col\" class=\"text-center\">Spark Shuffle Partitions</th>";
          table += " < /thead> < tbody > ";
          const needle = totalShufflePartitions;
          const closest = sparkConfList.reduce((a, b) => {
            return Math.abs(b - needle) < Math.abs(a - needle) ? b : a;
          });
          // spark.conf.set("spark.sql.shuffle.partitions", 1000)
          for (i = 0; i < sparkConfList.length; i++) {
            var data = sparkConfList[i];
            if (data === closest) {
              table += " < tr class = \"table-success\">";
            } else {
              table += " < tr class = \"table-warning\">";
            }
            table += " < td class = \"text-center\">" + data + "</td> < /tr>";
          }
          table += " < /tbody> < /table>";
          $("#spark_configuration_table").html(table);
          $("#spark_shuffle_configuration_id").show();
        });
      });
    </script>
  </head>
  <body>
    <div class="container-fluid">
      <div class="row" id="shuffle_input_config" style="margin-top: 10px;">
        <div class="col-md-12">
          <div class="card">
            <h5 class="card-header">Spark Shuffle Configuration</h5>
            <div class="card-body">
              <div class="row">
                <div class="col-sm-4">
                  <div class="form-group">
                    <label for="shuffleInputSize">Shuffle Input Size</label>
                  </div>
                </div>
                <div class="col-sm-4">
                  <div class="form-group">
                    <select id="shuffleInputSize" name='shuffleInputSize' class="form-select"></select>
                  </div>
                </div>
                <div class="col-sm-4">
                  <div class="form-group">
                    <select id='shuffleSize' name='shuffleSize' class="form-select">
                      <option value="1">MB</option>
                      <option value="2" selected>GB</option>
                      <option value="3">TB</option>
                      <option value="4">PB</option>
                    </select>
                  </div>
                </div>
              </div>
              <div class="row" style='margin-top: 10px;'>
                <div class="col-sm-4">
                  <div class="form-group">
                    <label for="numExecutors">Number of Executors</label>
                  </div>
                </div>
                <div class="col-sm-4">
                  <div class="form-group">
                    <select id="numExecutors" name='numExecutors' class="form-select"></select>
                  </div>
                </div>
              </div>
              <div class="row" style='margin-top: 10px;'>
                <div class="col-sm-4">
                  <div class="form-group">
                    <label for="executorCores">Number of Executor Cores</label>
                  </div>
                </div>
                <div class="col-sm-4">
                  <div class="form-group">
                    <select id="executorCores" name='executorCores' class="form-select"></select>
                  </div>
                </div>
              </div>
            </div>
            <!-- card-body -->
            <div class="card-footer" id='spark_configuration_button'>
              <span style="margin-right: 10px;">
                <button type="button" id='generate-spark-configuration' class="btn btn-primary">Generate</button>
              </span>
              <span style="margin-right: 10px;">
                <button type="button" id='reset-spark-configuration' class="btn btn-warning">Reset</button>
              </span>
            </div>
          </div>
        </div>
      </div>
      <!-- shuffle_input_config -->
      <div class="row" id='spark_shuffle_configuration_id' style="margin-top: 10px;">
        <div class="col-md-12">
          <div class="card">
            <h5 class="card-header">Spark Configuration Approches</h5>
            <div class="card-body" style="margin-bottom: -20px;">
              <div id='spark_configuration_table' class="table-responsive"></div>
            </div>
          </div>
        </div>
      </div>
      <!-- spark_shuffle_configuration_id-->
    </div>
    <!-- container-fluid -->
  </body>
</html>