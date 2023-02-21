---
layout: post
title: Spark Configuration Generator tool
categories: Spark
tags: Spark Utilities Generator
author: Ranga Reddy
date: "2021-12-29 00:00:00 +0530"
---

* content
{:toc}

## Spark Configuration Generator

**Spark Configuration Generator** tool will generate the **spark configuration** based on **hardware configuration**.

<html lang="en">
   <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
      <title>Spark Configuration Generator</title>
      <link href="{{ site.baseurl }}{% link css/bootstrap.min.css %}" rel="stylesheet">
      <script src="{{ site.baseurl }}{% link js/bootstrap.bundle.min.js %}"></script>
      <script src="{{ site.baseurl }}{% link js/jquery-slim.js %}"></script>
      <script src="{{ site.baseurl }}{% link js/common.js %}"></script>
      <style>
         .square {
           height: 200px;
           width: 200px;
           background-color: #d6e9c6;
         }
      </style>
      <script type="text/javascript">

         $(document).ready(function() {
            let br_delimeter = " \\<br>"
            let space_delimeter = "&nbsp;&nbsp;&nbsp;&nbsp;";
            let delimeter = br_delimeter + space_delimeter
            var sparkSubmitCommand = ""
            function hide_configuration() {
               $("#spark_configuration_id").hide();
               $("#spark_submit_container_id").hide();   
            }
            
            hide_configuration();

            $("#reset-spark-configuration").click(function(){
               $("#totalNodes").val("10");
               $("#coresPerNode").val("16");
               $("#memoryPerNode").val("64");
               hide_configuration();
            });

            $("#generate-spark-configuration").click(function(){
               
               var sparkConfList = []
               sparkSubmitCommand = ""
               var totalNodes = $("#totalNodes").val().trim();
               var coresPerNode = $("#coresPerNode").val().trim();
               var memoryPerNode = $("#memoryPerNode").val().trim();


               if (totalNodes < 1) {
                  alert('Total Nodes in Cluster value must be greater than 1');
                  $("#totalNodes").focus();
                  hide_configuration();
                  return false
               }

               if (coresPerNode < 1) {
                  alert('vCPU/Cores per Node value must be greater than 1');
                  $("#coresPerNode").focus();
                  hide_configuration();
                  return false
               }

               if (memoryPerNode < 1) {
                  alert('Memory per Node (GB) value must be greater than 1');
                  $("#memoryPerNode").focus();
                  hide_configuration();
                  return false
               }

               var totalCores = totalNodes * coresPerNode;
               var totalMemory = totalNodes * memoryPerNode;
               
               {
                  
                  var executorCores = 1;
                  var totalExecutors = totalCores;
                  var executorMemory =  Math.floor(totalMemory / totalCores);

                  var tinyApproch = {"name": "Tiny", "executor-cores": executorCores, "num-executors": totalExecutors, "executor-memory": executorMemory, "executor-memoryOverhead": 0}
                  sparkConfList.push(tinyApproch)
               }

               {
                  var executorCores = coresPerNode;
                  var totalExecutors = totalNodes;
                  var executorMemory =  Math.floor(totalMemory / totalNodes);

                  var fatApproch = {"name": "Fat", "executor-cores": executorCores, "num-executors": totalExecutors, "executor-memory": executorMemory, "executor-memoryOverhead": 0}
                  sparkConfList.push(fatApproch)
               }

               {

                  var executorCores = 5;
                  var memoryOverHeadValue = 0.10;
                  var hadoopOSCores = 1;
                  var amNodes = 1;

                  var totalCores = (totalNodes * (coresPerNode - hadoopOSCores)); 
                  var totalExecutorsWithAM = (totalCores/executorCores);
                  var totalExecutors = totalExecutorsWithAM - amNodes;
                  var executorsPerNode = Math.floor(totalExecutorsWithAM / totalNodes);
                  var executorMemoryWithOverhead =  Math.round(memoryPerNode / executorsPerNode);
                  //var memoryOverHead = Math.max(384, (Math.round(executorMemoryWithOverhead * memoryOverHeadValue) * 1024));

                   var memoryOverHead = Math.round(executorMemoryWithOverhead * memoryOverHeadValue);
                  var executorMemory =  Math.round(executorMemoryWithOverhead - memoryOverHead);

                  var balancedApproch = {"name": "Balanced", "executor-cores": executorCores, "num-executors": totalExecutors, "executor-memory": executorMemory, "executor-memoryOverhead": memoryOverHead}
                  sparkConfList.push(balancedApproch)

                  sparkSubmitCommand = "spark-shell"+delimeter+
                     "--conf spark.master=yarn"+ delimeter +
                     "--conf spark.submit.deployMode=client"+ delimeter +
                     "--conf spark.executor.cores="+balancedApproch["executor-cores"] + delimeter +
                     "--conf spark.executor.instances="+balancedApproch["num-executors"] + delimeter +
                     "--conf spark.executor.memory="+balancedApproch["executor-memory"] +"g" + delimeter +
                     "--conf spark.executor.memoryOverhead=" + memoryOverHead +"g";

                  $("#spark_submit_id").html(sparkSubmitCommand);
                  $("#spark_submit_hide_id").html(sparkSubmitCommand.replaceAll(delimeter, " "));
                  
                  $("#spark_submit_container_id").show();
               }

               var table = "<table class=\"table table-bordered\" id=\"spark_configuration_tab\">";
               table += "<thead class='thead-light'>";
               table += "<tr><th scope=\"col\" class=\"text-center\">Executor Approch Type</th><th scope=\"col\" class=\"text-center\">Executor Cores<br>(spark.executor.cores)</th><th scope=\"col\" class=\"text-center\">Number of Executors<br>(spark.executor.instances)</th><th scope=\"col\" class=\"text-center\">Executor Memory in GB<br>(spark.executor.memory)</th><th scope=\"col\" class=\"text-center\">Executor Memory Overhead in GB<br>(spark.executor.memoryOverhead)</th></tr>";
               table += "</thead><tbody>";

               for (i = 0; i < sparkConfList.length; i++) {
                   var data = sparkConfList[i];
                   var approchName = data["name"];
                   if(approchName === "Balanced") {
                     table += "<tr class=\"table-success\"><th scope=\"row\"'><i class=\"bi bi-calendar2-check\"></i>&nbsp;&nbsp;"+data["name"]+"</th>";
                   } else {
                     table += "<tr class=\"table-warning\"><th scope=\"row\"><i class=\"bi bi-calendar-x\"></i>&nbsp;&nbsp;"+data["name"]+"</th>";
                   }

                   table += "<td class=\"text-center\">"+data["executor-cores"]+"</td><td class=\"text-center\">"+data["num-executors"]+"</td>";
                   table += "<td class=\"text-center\">"+data["executor-memory"]+"</td><td class=\"text-center\">"+data["executor-memoryOverhead"]+"</td></tr>";
               }
               table+="</tbody></table>";
               $("#spark_configuration_table").html(table);
               $("#spark_configuration_id").show();
            });

            $("#copy-spark-shell").click(function (e) {  
               e.preventDefault();
               copy_text_to_clipboard('spark_submit_id', 'spark-shell command copied!');
            });
         });
      </script>
   </head>
   <body>

      <div class="container-fluid">

         <!--<div class="row" id="container-boxes-row" style="margin-top: 10px;">
            <div class="col-md-12">
               <div class="square"></div>
            </div>
         </div> -->

         <div class="row" id="hardware-config-row" style="margin-top: 10px;">
            <!--<div class="col-md-1"></div>-->
            <div class="col-md-12">
               <div class="card">
                  <h5 class="card-header">Hardware Configuration</h5>
                  <div class="card-body">
                     <table id="HardwareConfigurationTable" class="table table-bordered" style="width: 100%;">
                        <thead class='thead-light'><tr><th>Name</th><th>Value</th></tr></thead>
                        <tbody>
                           <tr><td><label for="totalNodes">Total Nodes in Cluster</label></td><td><input class="form-control" id="totalNodes" value='10' placeholder="Total Nodes in Cluster"></td></tr>
                           <tr><td><label for="coresPerNode">vCPU/Cores per Node</label></td><td><input class="form-control" id="coresPerNode" value='16' placeholder="vCPU/Cores per Node"></td></tr>
                           <tr><td><label for="memoryPerNode">Memory per Node (GB)</label></td><td><input class="form-control" id="memoryPerNode" value='64' placeholder="Memory per Node (GB)"></td></tr>
                        </tbody>
                     </table>
                  </div>
                  <div class="card-footer" id='spark_configuration_button'>
                     <span style="margin-right: 10px;"><button type="button" id='generate-spark-configuration' class="btn btn-primary">Generate</button></span>
                     <span style="margin-right: 10px;"><button type="button" id='reset-spark-configuration' class="btn btn-warning">Reset</button></span>

                    <!-- <div class="progress">
                        <div style="width: 60%;" aria-valuemax="100" aria-valuemin="0" aria-valuenow="60" role="progressbar" class="red progress-bar">
                        <span>60%</span>
                        </div>
                     </div> -->

                  </div>
               </div>
            </div>
            <!--<div class="col-md-1"></div>-->
         </div> <!-- row -->
               
         <div class="row" id='spark_configuration_id' style="margin-top: 10px;">
            <!--<div class="col-md-1"></div>-->
            <div class="col-md-12">
               <div class="card">
                  <h5 class="card-header">Spark Configuration Approches</h5>
                  <div class="card-body" style="margin-bottom: -20px;">
                     <div id='spark_configuration_table' class="table-responsive"> </div>
                  </div>
                  <!--<div class="card-footer"></div>-->
               </div>
            </div>
            <!--<div class="col-md-1"></div>-->
         </div> <!-- row -->

         <div class="row" id='spark_submit_container_id' style="margin-top: 10px;">
            <!--<div class="col-md-1"></div>-->
            <div class="col-md-12">
               <div class="card">
                  <h5 class="card-header">Balanced Approach Spark Shell Command</h5>
                  <div class="card-body">
                     <p class="card-text" id='spark_submit_id' style="background: lightgreen;"></p>
                  </div>
                  <div class="card-footer">
                     <p class="card-text" id='spark_submit_hide_id' style="display:none;"></p>
                     <button type="button" id='copy-spark-shell' class="btn btn-info">Copy Shell Command</button>
                  </div>
               </div>
            </div>
            <!--<div class="col-md-1"></div>-->
         </div> <!-- row -->

      </div> <!-- container-fluid -->
   </body>
</html>
