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

## Spark Submit Command Formatter

Used to **format** the **Spark Submit** command and generate it in beautiful format.

<html lang="en">
   <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
      <title>Spark Configuration Generator</title>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.4.1/dist/css/bootstrap.min.css">
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.8.1/font/bootstrap-icons.css">
      <script src="https://code.jquery.com/jquery-3.4.1.slim.min.js"></script>
      <script src="{{ site.baseurl }}{% link js/common.js %}"></script>

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

         	function validateAndHide() {
            	var spark_submit_cmd_val = $("#spark_submit_config_txt").val();
            	if(!spark_submit_cmd_val) {
            		$("#spark_submit_cmd_format_container").hide();
	         		$("#spark_submit_cmd_parameter_container").hide();
	         		$("#spark_submit_cmd_add_parameter_container").hide();
	         		$("#spark_submit_config_txt").focus();
            	}
	        	}

	        function validateAndShow() {
            	var spark_submit_cmd_val = $("#spark_submit_config_txt").val().trim();
            	if(spark_submit_cmd_val) {
            		$("#spark_submit_cmd_format_container").show();
	         		$("#spark_submit_cmd_parameter_container").show();
	         		$("#spark_submit_cmd_add_parameter_container").show();
            	}
	        }

         	validateAndHide();
         	var br_delimeter = " \\<br>"
         	var space_delimeter = "&nbsp;&nbsp;&nbsp;&nbsp;";
         	var delimeter = br_delimeter + space_delimeter
         	var sparkSubmitCommand = ""
         	let sparkConfigMapObj = {
					"master":"spark.master", "deploy-mode":"spark.submit.deployMode", "driver-cores" : "spark.driver.cores", "executor-cores": "spark.executor.cores", "driver-memory": "spark.driver.memory" ,"executor-memory": "spark.executor.memory", "num-executors": "spark.executor.instances", "principal": "spark.yarn.principal", "keytab": "spark.yarn.keytab", "queue":"spark.yarn.queue", "jars":"spark.jars", "name":"spark.app.name",
					"class":"class", "files" :"spark.yarn.dist.files", "driver-java-options": "spark.driver.extraJavaOptions", "driver-class-path": "spark.driver.extraClassPath", "driver-library-path":"spark.driver.extraLibraryPath", "executor-java-options": "spark.executor.extraJavaOptions", "executor-class-path": "spark.executor.extraClassPath", "executor-library-path":"spark.executor.extraLibraryPath"
				}
				var jarFileName = ""
				var className = ""

				$("#sample_spark_submit_config").click(function () {
					var sample_spark_submit_cmd = "spark-submit --class org.apache.spark.examples.SparkPi --master yarn --deploy-mode cluster --num-executors 1";
					sample_spark_submit_cmd += " --driver-memory 512m --executor-memory 512m --driver-cores 1 --executor-cores 2 $SPARK_HOME/examples/jars/spark-examples_*.jar 1000";
					$("#spark_submit_config_txt").val(sample_spark_submit_cmd);
				});

         	$("#format_spark_submit_config").click(function () {
                var spark_submit_config_txt = $("#spark_submit_config_txt").val();
                if(spark_submit_config_txt) {
                	sparkSubmitCommand = ""
                	spark_submit_config_txt = spark_submit_config_txt.replace("org.apache.spark.deploy.SparkSubmit", "spark-submit").trim()
                	
                	var table = "<table class=\"table table-bordered\" id=\"spark_submit_cmd_parameter_table\">";
					table += "<thead class='thead-light'>";
					table += "<tr><th scope=\"col\" class=\"text-center\">Parameter Name</th><th scope=\"col\" class=\"text-center\">Parameter Value</th></tr>";
					table += "</thead><tbody>";

					var sparkSparkArgs = []
					var commandLineArgs = []
					
					let sparkConfigArray = Object.entries(sparkConfigMapObj)
					let sparkConfigMap = new Map(sparkConfigArray);

					const sparkSubmitArray = spark_submit_config_txt.replaceAll("\\\n", "").split("--");
					for (let i = 0; i < sparkSubmitArray.length; i++) {
						let sparkSubmitParameterArray = sparkSubmitArray[i].replace(/\s\s+/g, ' ').trim().split(" ");
						if(sparkSubmitParameterArray.length > 1) {
							let parameterName = sparkSubmitParameterArray[0];
							let parameterValue = sparkSubmitParameterArray[1];
							let is_config_param = parameterName == 'conf';
							let is_spark_param = parameterName.startsWith('spark.')
							if (is_config_param) {
								let parameterValueArray = parameterValue.split("=");
								parameterName = parameterValueArray[0]
								parameterValue = parameterValueArray[1]
							} 

							var is_valid_spark_builtin_param = sparkConfigMap.has(parameterName)
							var is_valid_spark_param = is_config_param || is_spark_param || is_valid_spark_builtin_param;
							if(is_valid_spark_param) {
								if( parameterName == 'class') {
									className = parameterValue;
								} else {
									sparkSparkArgs.push({"name": parameterName, "value": parameterValue})
								}
							} else if ( parameterName != 'spark-submit') {
								commandLineArgs.push({"name": parameterName, "value": parameterValue})
							}
							if(sparkSubmitParameterArray.length > 2) {
								if(sparkSubmitParameterArray[2].endsWith(".jar") || sparkSubmitParameterArray[2].endsWith(".py")) {
									jarFileName = sparkSubmitParameterArray[2]
									if(sparkSubmitParameterArray.length > 3) {
										for(j=3; j < sparkSubmitParameterArray.length; j++){
											commandLineArgs.push({"name": sparkSubmitParameterArray[j], "value": ""})
										}
									}
								}
							}
						} 
					}

					for (i = 0; i < sparkSparkArgs.length; i++) {
						var data = sparkSparkArgs[i];
                   		var name = data["name"];
                   		var value = data["value"];
                   		var is_valid_spark_builtin_param = sparkConfigMap.has(name)
                   		if(is_valid_spark_builtin_param) {
                   			table += "<tr><td class=\"text-left\">"+sparkConfigMap.get(name)+"</td><td class=\"text-left\">"+value+"</td></tr>";
                   		} else {
							table += "<tr><td class=\"text-left\">"+name+"</td><td class=\"text-left\">"+value+"</td></tr>";
						}
					}

					table+="</tbody></table>";
					$("#spark_submit_cmd_parameter_table").html(table);

					if(commandLineArgs.length > 0) {

						var table = "<table class=\"table table-bordered\" id=\"spark_submit_cmd_line_parameter_table\">";
						table += "<thead class='thead-light'>";
						table += "<tr><th scope=\"col\" class=\"text-center\">Parameter Name</th><th scope=\"col\" class=\"text-center\">Parameter Value</th></tr>";
						table += "</thead><tbody>";

						for (i = 0; i < commandLineArgs.length; i++) {
							var data = commandLineArgs[i];
	                   		var name = data["name"];
	                   		var value = data["value"];
							table += "<tr><td class=\"text-left\">"+name+"</td><td class=\"text-left\">"+value+"</td></tr>";
						}

						table+="</tbody></table>";
						$("#spark_submit_cmd_line_parameter_table").html(table);
					}

					$("#spark_submit_cmd_parameter_container").show();

					sparkSubmitCommand += "spark-submit"+delimeter;
					var sparkSubmitArgsLen = sparkSparkArgs.length;

	            for (i = 0; i < sparkSubmitArgsLen; i++) {
						var data = sparkSparkArgs[i];

                   		var name = data["name"];
                   		var value = data["value"];

                   		if(sparkConfigMap.has(name)) {
                   			sparkSubmitCommand += "--"+name+" "+value;
                   		} else {
                   			sparkSubmitCommand += "--conf "+name+"="+value;
                   		}
                   		sparkSubmitCommand += delimeter;
					}

					if(className) {
						sparkSubmitCommand += "--class "+className + delimeter;
					}
					sparkSubmitCommand += jarFileName;
					

					commandLineArgsLen = commandLineArgs.length;
					for (i = 0; i < commandLineArgsLen; i++) {
						var data = commandLineArgs[i];
                   		var name = data["name"];
                   		var value = data["value"];
                   		if( value == "") {
                   			sparkSubmitCommand += " "+name;
               			} else {
               				sparkSubmitCommand += " --"+name+" "+value;
               			}
					}

					$("#spark_submit_id").html(sparkSubmitCommand);
					$("#spark_submit_hide_id").html(sparkSubmitCommand.replaceAll(delimeter, " "));
					validateAndShow();
					if(commandLineArgsLen < 1) {
						$("#spark_submit_cmd_add_parameter_container").hide();
					}
            	} else {
            		alert('Please enter spark-submit command to format');
            		validateAndHide();
            	}
            });

            $("#reset_spark_submit_config").click(function () {
               	$("#spark_submit_config_txt").val("");
               	validateAndHide();
            });

            $("#copy-spark-submit").click(function (e) {  
            	e.preventDefault();
	            copy_text_to_clipboard('spark_submit_id', 'spark-submit command copied!');
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
   							<span style='float: left;'><h4  style="color: sienna;">Spark Submit Command</h4></span>
   							<span style='float: right;'><button type="button" id='sample_spark_submit_config' class="btn btn-success">Load Sample Command</button></span>
   						</div>
   						<div class="card-body">
   							<textarea id="spark_submit_config_txt" placeholder='Enter or Paste the Spark Submit command' rows="7"></textarea>
   						</div>
   						<div class="card-footer">
   							<span style="margin-right: 12px;"><button type="button" id='format_spark_submit_config' class="btn btn-primary">Format Command</button></span>
                    		<span><button type="button" id='reset_spark_submit_config' class="btn btn-warning">Reset Command</button></span>
   						</div>
   					</div>
   				</div>
            </div> <!-- row -->
            <div class="row" id='spark_submit_cmd_format_container' style="margin-top: 10px;">
	            <div class="col-md-12">
	               <div class="card">
	                  <h4 class="card-header" style="color: blue;">Formatted Spark Submit Command</h4>
	                  <div class="card-body">
	                     <p class="card-text" id='spark_submit_id' style="background: lightgreen;"></p>
	                  </div>
	                  <div class="card-footer">
	                     <p class="card-text" id='spark_submit_hide_id' style="display:none;"></p>
	                     <button type="button" id='copy-spark-submit' class="btn btn-danger">Copy Spark Submit Command</button>
	                  </div>
	               </div>
	            </div>
	        </div> <!-- row -->
            <div class="row" id="spark_submit_cmd_parameter_container" style="margin-top: 10px;">
               <div class="col-md-12">
               		<div class="card">
               			<h4 class="card-header" style="color: corol;">Spark Submit Command Parameters</h4>
               			<div class="card-body">
               				<div id='spark_submit_cmd_parameter_table' class="table-responsive"> </div>
               			</div>
               		</div>
     			</div>
     		</div> <!-- row -->
     		<div class="row" id="spark_submit_cmd_add_parameter_container" style="margin-top: 10px;">
     			<div class="col-md-12">
               		<div class="card">
               			<h4 class="card-header" style="color: fuchsia;">Spark Submit Additional (Command Line) Parameters</h4>
               			<div class="card-body">
               				<div id='spark_submit_cmd_line_parameter_table' class="table-responsive"> </div>
               			</div>
               		</div>
     			</div>
	        </div> <!-- row -->
   	    </div> <!-- container-fluid -->
   </body>
</html>