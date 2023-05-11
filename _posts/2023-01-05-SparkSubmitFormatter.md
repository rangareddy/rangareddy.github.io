---
layout: post
title: Spark Submit Command Formatter tool
categories: Spark
tags: Spark Utilities
author: Ranga Reddy
date: "2023-01-05 11:40:00 +0530"
---

* content
{:toc}

## Spark Submit Command Formatter/Minifier

Used to **format/minify** the **Spark Submit** command and generate it in beautiful/minify format.

<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <title>Spark Configuration Generator</title>
    <link href="{{ site.baseurl }}{% link css/bootstrap.min.css %}" rel="stylesheet">
    <script src="{{ site.baseurl }}{% link js/bootstrap.bundle.min.js %}"></script>
    <script src="{{ site.baseurl }}{% link js/jquery-slim.js %}"></script>
    <script src="{{ site.baseurl }}{% link js/common.js %}"></script>
    <link href="{{ site.baseurl }}{% link css/jquery.dataTables.css %}" rel="stylesheet">
    <script src="{{ site.baseurl }}{% link js/jquery.dataTables.js %}"></script>
    <style>
      #spark_submit_config_txt {
        overflow: scroll;
        resize: vertical;
        width: 100%;
        background-color: #F9E98B;
      }
    </style>
    <script type="text/javascript">
      $(document).ready(function() {
        var spark_submit_cmd_line_parameter_table;
        var spark_submit_cmd_parameter_table;

        function validateAndHide() {
          var spark_submit_cmd_val = $("#spark_submit_config_txt").val();
          if (!spark_submit_cmd_val) {
            $("#spark_submit_cmd_format_container").hide();
            $("#spark_submit_cmd_parameter_container").hide();
            $("#spark_submit_cmd_add_parameter_container").hide();
            $("#spark_submit_config_txt").focus();
          }
        }

        function hide_table_containers() {
          $("#spark_submit_cmd_parameter_container").hide();
          $("#spark_submit_cmd_add_parameter_container").hide();
        }

        function show_table_containers() {
          $("#spark_submit_cmd_parameter_container").show();
          $("#spark_submit_cmd_add_parameter_container").show();
        }

        function validateAndShow(build_type) {
          var spark_submit_cmd_val = $("#spark_submit_config_txt").val().trim();
          if (spark_submit_cmd_val) {
            $("#spark_submit_cmd_format_container").show();
          }

          if ('minify' == build_type) {
            hide_table_containers();
          } else {
            show_table_containers();
          }
        }
        validateAndHide();
        var br_delimeter = " \\ <br> "
        var space_delimeter = "&nbsp;&nbsp;&nbsp;&nbsp;";
        var delimeter = br_delimeter + space_delimeter
        var sparkSubmitCommand = ""
        let sparkConfigMapObj = {
          "master": "spark.master",
          "deploy-mode": "spark.submit.deployMode",
          "driver-cores": "spark.driver.cores",
          "executor-cores": "spark.executor.cores",
          "driver-memory": "spark.driver.memory",
          "executor-memory": "spark.executor.memory",
          "num-executors": "spark.executor.instances",
          "principal": "spark.yarn.principal",
          "keytab": "spark.yarn.keytab",
          "queue": "spark.yarn.queue",
          "jars": "spark.jars",
          "name": "spark.app.name",
          "class": "class",
          "files": "spark.yarn.dist.files",
          "driver-java-options": "spark.driver.extraJavaOptions",
          "driver-class-path": "spark.driver.extraClassPath",
          "driver-library-path": "spark.driver.extraLibraryPath",
          "executor-java-options": "spark.executor.extraJavaOptions",
          "executor-class-path": "spark.executor.extraClassPath",
          "executor-library-path": "spark.executor.extraLibraryPath",
          "py-files": "spark.yarn.dist.pyFiles",
          "archives": "spark.yarn.dist.archives",
          "packages": "packages",
          "repositories": "repositories"
        }

        $("#sample_spark_submit_config").click(function() {
          var sample_spark_submit_cmd = "spark-submit --class org.apache.spark.examples.SparkPi --master yarn --deploy-mode cluster --num-executors 1";
          sample_spark_submit_cmd += " --driver-memory 512m --executor-memory 512m --driver-cores 1 --executor-cores 2 $SPARK_HOME/examples/jars/spark-examples_*.jar 1000";
          $("#spark_submit_config_txt").val(sample_spark_submit_cmd);
          hide_table_containers();
          $("#spark_submit_cmd_format_container").hide();
        });

        function build_spark_submit(build_type) {

          if(spark_submit_cmd_parameter_table) {
            spark_submit_cmd_parameter_table.destroy()
          }

          if(spark_submit_cmd_line_parameter_table) {
            spark_submit_cmd_line_parameter_table.destroy()
          }

          var jarFileName = ""
          var className = ""
          var base_spark_class = ""
          var spark_submit_config_txt = $("#spark_submit_config_txt").val();
          if (spark_submit_config_txt) {
            sparkSubmitCommand = ""
            spark_submit_config_txt = spark_submit_config_txt.replace("org.apache.spark.deploy.SparkSubmit", "spark-submit").trim()
            var sparkSparkArgs = []
            var commandLineArgs = []
            let sparkConfigArray = Object.entries(sparkConfigMapObj)
            let sparkConfigMap = new Map(sparkConfigArray);
            const sparkSubmitArray = spark_submit_config_txt.replaceAll("\\\n", "").split("--");
            for (let i = 0; i < sparkSubmitArray.length; i++) {
              let sparkSubmitParameterArray = sparkSubmitArray[i].replace(/\s\s+/g, ' ').replaceAll('\"', '').trim().split(" ");
              let spark_submit_param_arr_len = sparkSubmitParameterArray.length;
              if (spark_submit_param_arr_len > 1) {
                let parameterName = sparkSubmitParameterArray[0];
                let parameterValue = sparkSubmitParameterArray[1];
                let is_config_param = parameterName == 'conf';
                let is_spark_param = parameterName.startsWith('spark.')
                if (is_config_param) {
                  let index = parameterValue.indexOf("=")
                  parameterName = parameterValue.substring(0, index)
                  if (spark_submit_param_arr_len > 2) {
                    let strArray = new Array()
                    for (let j = 2; j < spark_submit_param_arr_len; j++) {
                      strArray[j - 2] = sparkSubmitParameterArray[j]
                    }
                    parameterValue = '\"' + strArray.join(" ") + '\"'
                  } else {
                    parameterValue = parameterValue.substring(index + 1)
                  }
                }
                var is_valid_spark_builtin_param = sparkConfigMap.has(parameterName)
                var is_valid_spark_param = is_config_param || is_spark_param || is_valid_spark_builtin_param;
                if (is_valid_spark_param) {
                  if (parameterName == 'class') {
                    className = parameterValue;
                  } else {
                    sparkSparkArgs.push({
                      "name": parameterName,
                      "value": parameterValue
                    })
                  }
                } else if (parameterName != 'spark-submit' && parameterName != 'packages' && parameterName != 'repositories') {
                  commandLineArgs.push({
                    "name": parameterName,
                    "value": parameterValue
                  })
                }
                if (sparkSubmitParameterArray.length > 2) {
                  if (sparkSubmitParameterArray[2].endsWith(".jar") || sparkSubmitParameterArray[2].endsWith(".py")) {
                    jarFileName = sparkSubmitParameterArray[2]
                    if (sparkSubmitParameterArray.length > 3) {
                      for (j = 3; j < sparkSubmitParameterArray.length; j++) {
                        commandLineArgs.push({
                          "name": sparkSubmitParameterArray[j],
                          "value": ""
                        })
                      }
                    }
                  }
                }
              } else if (sparkSubmitParameterArray[0].indexOf("spark") != -1 && base_spark_class == "") {
                base_spark_class = sparkSubmitParameterArray[0]
              }
            }

            spark_submit_cmd_parameter_table = $('#spark_submit_cmd_parameter_table').DataTable( {
              data: sparkSparkArgs,
              columns: [
                { "data": "name",
                  render: function (data, type, row, meta) {
                    var is_valid_spark_builtin_param = sparkConfigMap.has(data)
                    if (is_valid_spark_builtin_param) {
                      data = sparkConfigMap.get(data);
                    } 
                    return type === 'display' ? ('<span>'+ data + '</span>') : data;
                  }
                },
                { "data": "value"}
              ],
              responsive: true,
              paging: true,
              searching: true,
              ordering:  true,
              info: false
            });
            
            if (commandLineArgs.length > 0) {
              spark_submit_cmd_line_parameter_table = $('#spark_submit_cmd_line_parameter_table').DataTable( {
              data: commandLineArgs,
              columns: [
                { "data": "name" },
                { "data": "value" }
              ],
              responsive: true,
              paging: true,
              searching: true,
              ordering:  true,
              info: false
            });

            }
            $("#spark_submit_cmd_parameter_container").show();
            if (base_spark_class) {
              sparkSubmitCommand += base_spark_class + delimeter;
            } else {
              sparkSubmitCommand += "spark-submit" + delimeter;
            }
            var sparkSubmitArgsLen = sparkSparkArgs.length;
            for (i = 0; i < sparkSubmitArgsLen; i++) {
              var data = sparkSparkArgs[i];
              var name = data["name"];
              var value = data["value"];
              if (sparkConfigMap.has(name)) {
                sparkSubmitCommand += "--" + name + " " + value;
              } else {
                sparkSubmitCommand += "--conf " + name + "=" + value;
              }
              if (i != sparkSubmitArgsLen - 1) {
                sparkSubmitCommand += delimeter;
              }
            }
            if (className) {
              sparkSubmitCommand += delimeter + "--class " + className;
            }
            if (jarFileName) {
              sparkSubmitCommand += delimeter + jarFileName;
            }
            commandLineArgsLen = commandLineArgs.length;
            for (i = 0; i < commandLineArgsLen; i++) {
              var data = commandLineArgs[i];
              var name = data["name"];
              var value = data["value"];
              if (value == "") {
                sparkSubmitCommand += " " + name;
              } else {
                sparkSubmitCommand += " --" + name + " " + value;
              }
            }
            if ('minify' == build_type) {
              $("#spark_submit_cmd_text").html(sparkSubmitCommand.replaceAll(delimeter, " "));
              $("#spark_submit_hide_id").html(sparkSubmitCommand.replaceAll(delimeter, " "));
            } else {
              $("#spark_submit_cmd_text").html(sparkSubmitCommand);
              $("#spark_submit_hide_id").html(sparkSubmitCommand.replaceAll(delimeter, " "));
            }
            validateAndShow(build_type);
            if (commandLineArgsLen < 1) {
              $("#spark_submit_cmd_add_parameter_container").hide();
            }
          } else {
            alert('Please enter spark-submit command to ' + build_type);
            validateAndHide();
          }
        }
        $("#format_spark_submit_config").click(function(e) {
          e.preventDefault();
          build_spark_submit('format')
        });
        $("#minify_spark_submit_config").click(function(e) {
          e.preventDefault();
          build_spark_submit('minify')
        });
        $("#reset_spark_submit_config").click(function(e) {
          e.preventDefault();
          $("#spark_submit_config_txt").val("");
          validateAndHide();
        });
        $("#copy-spark-submit").click(function(e) {
          e.preventDefault();
          copy_text_to_clipboard('spark_submit_cmd_text', 'spark-submit command copied!');
        });
      });
    </script>
  </head>
  <body>
    <div class="container-fluid">
      <div class="row" id="spark_submit_cmd_container" style="margin-top: 10px;">
        <div class="col-md-12">
          <div class="card">
            <div class="card-header">
              <span style='float: left;'>
                <h4 style="color: sienna;">Spark Submit Command</h4>
              </span>
              <span style='float: right;'>
                <button type="button" id='sample_spark_submit_config' class="btn btn-success">Load Sample Command</button>
              </span>
            </div>
            <div class="card-body">
              <textarea id="spark_submit_config_txt" placeholder='Enter or Paste the Spark Submit command' rows="7"></textarea>
            </div>
            <div class="card-footer">
              <span style="margin-right: 12px;">
                <button type="button" id='format_spark_submit_config' class="btn btn-primary">Format</button>
              </span>
              <span style="margin-right: 12px;">
                <button type="button" id='minify_spark_submit_config' class="btn btn-info">Minify</button>
              </span>
              <span style="margin-right: 12px;">
                <button type="button" id='reset_spark_submit_config' class="btn btn-warning">Reset</button>
              </span>
            </div>
          </div>
        </div>
      </div>
      <!-- row -->
      <div class="row" id='spark_submit_cmd_format_container' style="margin-top: 10px;">
        <div class="col-md-12">
          <div class="card">
            <h4 class="card-header" style="color: blue;">Formatted Spark Submit Command</h4>
            <div class="card-body">
              <p class="card-text" id='spark_submit_cmd_text' style="background: lightgreen;"></p>
            </div>
            <div class="card-footer">
              <p class="card-text" id='spark_submit_hide_id' style="display:none;"></p>
              <button type="button" id='copy-spark-submit' class="btn btn-danger">Copy Spark Submit Command</button>
            </div>
          </div>
        </div>
      </div>
      <!-- row -->
      <div class="row" id="spark_submit_cmd_parameter_container" style="margin-top: 10px;">
        <div class="col-md-12">
          <div class="card">
            <h4 class="card-header" style="color: corol;">Spark Submit Command Parameters</h4>
            <div class="card-body">
              <table id="spark_submit_cmd_parameter_table" class="table table-striped table-responsive" style="width:100%">
                <thead>
                    <tr>
                        <th>Parameter Name</th>
                        <th>Parameter Value</th>
                    </tr>
                </thead>
              </table>
            </div>
          </div>
        </div>
      </div>
      <!-- row -->
      <div class="row" id="spark_submit_cmd_add_parameter_container" style="margin-top: 10px;">
        <div class="col-md-12">
          <div class="card">
            <h4 class="card-header" style="color: fuchsia;">Spark Submit Additional (Command Line) Parameters</h4>
            <div class="card-body">
              <table id="spark_submit_cmd_line_parameter_table" class="table table-striped table-responsive" style="width:100%">
                <thead>
                    <tr>
                        <th>Parameter Name</th>
                        <th>Parameter Value</th>
                    </tr>
                </thead>
              </table>
            </div>
          </div>
        </div>
      </div>
      <!-- row -->
    </div>
    <!-- container-fluid -->
  </body>
</html>