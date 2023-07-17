---
layout: post
title: Spark Submit Command generator using Iceberg Catalog
categories: Spark
tags: Spark Utilities Iceberg
author: Ranga Reddy
date: "2023-07-15 12:00:00 +0530"
---

* content
{:toc}

## Spark Submit Command generator using different Iceberg Catalog(s)

This tool is used to generate or build the Spark Submit Command using Iceberg Catalog(s).

<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Spark Submit Command generator using Iceberg Catalog</title>
    <link href="{{ site.baseurl }}{% link css/bootstrap.min.css %}" rel="stylesheet">
    <script src="{{ site.baseurl }}{% link js/bootstrap.bundle.min.js %}"></script>
    <script src="{{ site.baseurl }}{% link js/jquery-slim.js %}"></script>
    <script src="{{ site.baseurl }}{% link js/common.js %}"></script>
    <script type="text/javascript">
      	$(document).ready(function() {

      		$('#scala-version').attr('disabled', true);
      		$('#iceberg-version').attr('disabled', true);

			$("#catalog-type").change(function() {
		        var selectedType = $(this).val();
		        $(".catalog-log-div").hide();
		        $("#" + selectedType+"-catalog").show();
		    });

			$("#spark-version").change(function() {
				$('#iceberg-version').attr('disabled', true);
		    	var sparkVersion = $(this).val();
		    	$("#iceberg-version > option").each(function() {
	    			var icebergVersion=this.text;
	    			$("#iceberg-version option[value='"+icebergVersion+"']").show();
				});
				$('#iceberg-version').prop('selectedIndex',0);

		    	if("3.0" === sparkVersion) {
		    		$("#iceberg-version > option").each(function() {
		    			var icebergVersion=this.text;
		    			if(['0.14.0', '0.14.1', '1.0.0'].indexOf(icebergVersion) >= 0 ) {
		    				$("#iceberg-version option[value='"+icebergVersion+"']").show();
		    			} else {
		    				$("#iceberg-version option[value='"+icebergVersion+"']").hide();
		    			}
					});
		    	} else if("3.3" === sparkVersion) {
		    		$("#iceberg-version > option").each(function() {
		    			var icebergVersion=this.text;
		    			if(['0.13.0', '0.13.1', '0.13.2'].indexOf(icebergVersion) >= 0 ) {
		    				$("#iceberg-version option[value='"+icebergVersion+"']").hide();
		    			} else {
		    				$("#iceberg-version option[value='"+icebergVersion+"']").show();
		    			}
					});
		    	} else if("3.4" === sparkVersion) {
		    		$("#iceberg-version > option").each(function() {
		    			var icebergVersion=this.text;
		    			if(['1.3.0'].indexOf(icebergVersion) >= 0 ) {
		    				$("#iceberg-version option[value='"+icebergVersion+"']").show();
		    			} else {
		    				$("#iceberg-version option[value='"+icebergVersion+"']").hide();
		    			}
					});
		    	}
		    	$('#iceberg-version').attr('disabled', false);
		    	$('#scala-version').attr('disabled', true);
		    	$('#scala-version').prop('selectedIndex',0);
		    });

			// iceberg-spark-runtime-3.0 - 0.14.0 to 1.0.0 - Scala version - 2.12
			// iceberg-spark-runtime-3.1 - 0.13.0 to 1.3.0 - Scala version - 2.12
			// iceberg-spark-runtime-3.2 - 0.13.0 to 1.3.0 - Scala version - 2.12 and 2.13 (0.13.x only supports 2.12)
			// iceberg-spark-runtime-3.3 - 0.14.0 to 1.3.0 - Scala version - 2.12 and 2.13
			// iceberg-spark-runtime-3.4 - 1.3.0 - Scala version - 2.12 and 2.13

		    $("#iceberg-version").change(function() {
		    	$('#scala-version').attr('disabled', true);
		    	$("#scala-version > option").each(function() {
		    		var scalaVersion=this.text;
		    		$("#scala-version option[value='"+scalaVersion+"']").show();
				});
				$('#scala-version').prop('selectedIndex',0);
		    	var icebergVersion = $(this).val();
		    	var sparkVersion = $("#spark-version").val();
		    	if(["3.0", "3.1"].indexOf(sparkVersion) >= 0) {
					$("#scala-version > option").each(function() {
		    			var scalaVersion=this.text;
		    			if(['2.12'].indexOf(scalaVersion) >= 0 ) {
		    				$("#scala-version option[value='"+scalaVersion+"']").show();
		    			} else {
		    				$("#scala-version option[value='"+scalaVersion+"']").hide();
		    			}
					});
		    	} else if ("3.2" === sparkVersion && ['0.13.0', '0.13.1', '0.13.2'].indexOf(icebergVersion) >= 0 ) {
		    		$("#scala-version > option").each(function() {
		    			var scalaVersion=this.text;
		    			if(['2.12'].indexOf(scalaVersion) >= 0 ) {
		    				$("#scala-version option[value='"+scalaVersion+"']").show();
		    			} else {
		    				$("#scala-version option[value='"+scalaVersion+"']").hide();
		    			}
					});
		    	}
		    	$('#scala-version').attr('disabled', false);
		    });

		    $("#generate_spark_submit_cmd").click(function() {
		        var catalogType = $("#catalog-type").val();
				var catalogName = $("#catalog-name").val();
				var icebergVersion = $("#iceberg-version").val();
				var sparkVersion = $("#spark-version").val();
				var scalaVersion = $("#scala-version").val();

				if (!catalogName) {
					alert("Enter catalog name");
					$("#catalog-name").focus();
					return
				}
				if (!sparkVersion || sparkVersion === "none") {
					alert("Select Spark version");
					$("#spark-version").focus();
					return
				}
				if (!icebergVersion || icebergVersion === "none") {
					alert("Select Iceberg version");
					$("#iceberg-version").focus();
					return
				}
				if (!scalaVersion || scalaVersion === "none") {
					alert("Select Scala version");
					$("#scala-version").focus();
					return
				}
				if (!catalogType || catalogType === "none") {
					alert("Select catalog type");
					$("#catalog-type").focus();
					return
				}
				
				var dependencies = "org.apache.iceberg:iceberg-spark-runtime-"+ sparkVersion + "_" + scalaVersion + ":" + icebergVersion;

				var command = "spark-shell \\ </br>";
				command += "&emsp;--master yarn \\ </br>";
				command += "&emsp;--deploy-mode client \\ </br>";
				command += "&emsp;--packages "+ dependencies + " \\ </br>";
				command += "&emsp;--conf spark.sql.extensions=org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions" + " \\ </br>";

				if ("hive" === catalogType) {
				  command += "&emsp;--conf spark.sql.catalog." + catalogName + "=org.apache.iceberg.spark.SparkSessionCatalog" + " \\ </br>";
				} else {
				  command += "&emsp;--conf spark.sql.catalog." + catalogName + "=org.apache.iceberg.spark.SparkCatalog" + " \\ </br>";
				}
				
				command += "&emsp;--conf spark.sql.catalog." + catalogName + ".type=" + catalogType + " \\ </br>";
				if( "hive" === catalogType) {
					command += "&emsp;--conf spark.sql.catalog." + catalogName + ".uri=" + $("#metastore-uri").val();
				} else if("hadoop" === catalogType) {
					command += "&emsp;--conf spark.sql.catalog." + catalogName + ".warehouse=" + $("#warehouse-url").val();
				} else if("rest" === catalogType) {
					command += "&emsp;--conf spark.sql.catalog." + catalogName + ".uri=" + $("#rest-uri").val();
				}

				// Display the generated command
				document.getElementById("spark_iceberg_submit_cmd_text").innerHTML = command;
		    });

		    $("#copy-spark-iceberg-submit").click(function(e) {
	          e.preventDefault();
	          copy_text_to_clipboard('spark_iceberg_submit_cmd_text', 'spark-submit command copied!');
	        });
      	});

/*	spark-sql \
    --packages org.apache.iceberg:iceberg-spark-runtime-3.2_2.12:1.0.0 \
    --conf spark.sql.catalog.my_catalog=org.apache.iceberg.spark.SparkCatalog \
    --conf spark.sql.catalog.jdbc.warehouse=$WAREHOUSE \
    --conf spark.sql.catalog.jdbc.catalog-impl=org.apache.iceberg.jdbc.JdbcCatalog \
    --conf spark.sql.catalog.jdbc.uri=$URI \
    --conf spark.sql.catalog.jdbc.jdbc.verifyServerCertificate=true \
    --conf spark.sql.catalog.jdbc.jdbc.useSSL=true \
    --conf spark.sql.catalog.jdbc.jdbc.user=$DB_USERNAME \
    --conf spark.sql.catalog.jdbc.jdbc.password=$DB_PASSWORD 

	spark-sql --packages org.apache.iceberg:iceberg-spark-runtime-3.2_2.12:1.3.0 \
    --conf spark.sql.catalog.my_catalog=org.apache.iceberg.spark.SparkCatalog \
    --conf spark.sql.catalog.my_catalog.warehouse=s3://my-bucket/my/key/prefix \
    --conf spark.sql.catalog.my_catalog.catalog-impl=org.apache.iceberg.jdbc.JdbcCatalog \
    --conf spark.sql.catalog.my_catalog.uri=jdbc:mysql://test.1234567890.us-west-2.rds.amazonaws.com:3306/default \
    --conf spark.sql.catalog.my_catalog.jdbc.verifyServerCertificate=true \
    --conf spark.sql.catalog.my_catalog.jdbc.useSSL=true \
    --conf spark.sql.catalog.my_catalog.jdbc.user=admin \
    --conf spark.sql.catalog.my_catalog.jdbc.password=pass 
*/

  </script>
</head>

<body>
	<div class="container-fluid">
        <div class="row" id="spark_iceberg_generator_container" style="margin-top: 10px;">
        	<div class="col-md-12">
          		<div class="card">
            		<div class="card-header">
              			<h5>Spark Submit Command generator using Iceberg Catalog</h5>
            		</div> <!-- card-header -->
	            	<div class="card-body">
	              		<div class="row" style='margin-top: 10px;'>
			                <div class="col-sm-4">
			                  <div class="form-group">
			                    <label for="catalog-name">Catalog Name:</label>
			                  </div>
			                </div>
			                <div class="col-sm-4">
			                  <div class="form-group">
			                    <input type="text" id="catalog-name" name="catalog-name" class="form-control" value='spark-catalog'>
			                  </div>
			                </div>
	              		</div>
	              		<div class="row" style='margin-top: 10px;'>
			                <div class="col-sm-4">
			                  	<div class="form-group">
			                    	<label for="spark-version">Spark Version:</label>
			                  	</div>
			                </div>
			                <div class="col-sm-4">
			                  	<div class="form-group">
			                    	<select class="form-control" id="spark-version">
			                    		<option disabled selected value>Select Spark Version</option>
								        <option value="3.0">3.0</option>
								        <option value="3.1">3.1</option>
								        <option value="3.2">3.2</option>
								        <option value="3.3">3.3</option>
								        <option value="3.4">3.4</option>
							      	</select>
			                  	</div>
			                </div>
	              		</div>
	              		<div class="row" style='margin-top: 10px;'>
			                <div class="col-sm-4">
			                  	<div class="form-group">
			                    	<label for="iceberg-version">Iceberg Version:</label>
			                  	</div>
			                </div>
			                <div class="col-sm-4">
			                  	<div class="form-group">
								    <select class="form-control" id="iceberg-version">
								    	<option disabled selected value>Select Iceberg Version</option>
								        <option value="0.13.0">0.13.0</option>
								      	<option value="0.13.1">0.13.1</option>
								        <option value="0.13.2">0.13.2</option>
								        <option value="0.14.0">0.14.0</option>
								      	<option value="0.14.1">0.14.1</option>
								        <option value="1.0.0">1.0.0</option>
								        <option value="1.1.0">1.1.0</option>
								        <option value="1.2.0">1.2.0</option>
								        <option value="1.2.1">1.2.1</option>
								        <option value="1.3.0">1.3.0</option>
								    </select>
			                  	</div>
			                </div>
	              		</div>
	              		<div class="row" style='margin-top: 10px;'>
			                <div class="col-sm-4">
			                  	<div class="form-group">
			                    	<label for="scala-version">Scala Version:</label>
			                  	</div>
			                </div>
			                <div class="col-sm-4">
			                  	<div class="form-group">
							      	<select class="form-control" id="scala-version">
							      		<option disabled selected value>Select Scala Version</option>
								        <option value="2.12">2.12</option>
								      	<option value="2.13">2.13</option>
							      	</select>
			                  	</div>
			                </div>
	              		</div>
	              		<div class="row" style='margin-top: 10px;'>
			                <div class="col-sm-4">
			                  <div class="form-group">
			                    <label for="catalog-type">Catalog Type:</label>
			                  </div>
			                </div>
			                <div class="col-sm-4">
			                  	<div class="form-group">
			                    	<select class="form-control" id="catalog-type">
			                    		<option disabled selected value>Select Catalog Type</option>
								        <option value="hive">Hive</option>
								        <option value="hadoop">Hadoop</option>
								        <option value="rest">REST</option>
								        <option value="jdbc">Jdbc</option>
								        <!--<option value="glue">AWS Glue</option>
								        <option value="nessie">Nessie</option> -->
						      		</select>
			                  	</div>
			                </div>
	              		</div>
	              		<div class="row catalog-log-div" id="hive-catalog" style="margin-top: 10px; display: none;">
					    	<div class="col-sm-4">
			                  <div class="form-group">
			                    <label for="metastore-uri">Hive Metastore Uri:</label>
			                  </div>
			                </div>
			                <div class="col-sm-4">
			                  	<input type="text" id="metastore-uri" name="metastore-uri" class="form-control" value='thrift://localhost:9083'>
			                </div>
					    </div>
					    <div class="row catalog-log-div" id="hadoop-catalog" style="margin-top: 10px; display: none;">
					    	<div class="col-sm-4">
			                  <div class="form-group">
			                    <label for="warehouse-url">Warehouse Path:</label>
			                  </div>
			                </div>
			                <div class="col-sm-4">
			                  	<input type="text" id="warehouse-url" name="warehouse-url" class="form-control" value='hdfs://localhost:8020/iceberg-warehouse'>
			                </div>
					    </div>
					    <div class="row catalog-log-div" id="rest-catalog" style="margin-top: 10px; display: none;">
					    	<div class="col-sm-4">
			                  <div class="form-group">
			                    <label for="rest-uri">Rest Catalog Uri:</label>
			                  </div>
			                </div>
			                <div class="col-sm-4">
			                  	<input type="text" id="rest-uri" name="rest-uri" class="form-control" value='http://localhost:8080'>
			                </div>
					    </div>
					    <div class="row" style='margin-top: 10px;' id="test-catalog" style="display: none;">
						    <div class="form-group catalog-log-div" id="hadoop" style="display: none;">
						    	spark.sql.catalog.hadoop_prod.warehouse = hdfs://nn:8020/warehouse/path*/
						      <label for="hadoop-catalog-log">Hadoop Catalog Log:</label>
						      <input type="text" class="form-control" id="hadoop-catalog-log">
						    </div>
						    <div class="form-group catalog-log-div" id="glue" style="display: none;">
						      <label for="glue-catalog-log">Glue Catalog Log:</label>
						      <input type="text" class="form-control" id="glue-catalog-log">
						    </div>
						    <div class="form-group catalog-log-div" id="nessie" style="display: none;">
						      <label for="nessie-catalog-log">Nessie Catalog Log:</label>
						      <input type="text" class="form-control" id="nessie-catalog-log">
						    </div>
	              		</div>
	              	</div>
              		<div class="card-footer">
		              <span style="margin-right: 12px;">
		                <button type="button" id='generate_spark_submit_cmd' class="btn btn-primary">Generate Spark Submit Command</button>
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
    	</div> <!-- spark_iceberg_generator_container -->
    	<div class="row" id='spark_iceberg_submit_cmd_container' style="margin-top: 10px;">
	        <div class="col-md-12">
	          <div class="card">
	            <h4 class="card-header" style="color: blue;">Spark Submit Command</h4>
	            <div class="card-body">
	              <p class="card-text" id='spark_iceberg_submit_cmd_text' style="background: lightgreen;"></p>
	            </div>
	            <div class="card-footer">
	              <p class="card-text" id='spark_submit_hide_id' style="display:none;"></p>
	              <button type="button" id='copy-spark-iceberg-submit' class="btn btn-danger">Copy Spark Submit Command</button>
	            </div>
	          </div>
	        </div>
	    </div>  <!-- spark_iceberg_submit_cmd_container -->
	</div> <!--container-fluid -->
</body>
</html>