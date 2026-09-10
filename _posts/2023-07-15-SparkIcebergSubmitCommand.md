---
title: Spark Submit Command generator using Iceberg Catalog
categories: Spark
tags: Spark Utilities Iceberg
author: Ranga Reddy
date: "2023-07-15 12:00:00 +0530"
updated: "2026-09-10 10:00:00 +0530"
description: >-
  Pick a catalog type (Hive, Hadoop, REST or JDBC) plus Spark, Iceberg and Scala
  versions, and get the spark-shell command with the right iceberg-spark-runtime
  coordinates and catalog configs. Version pairs come from each Iceberg release's
  own build, up to Iceberg 1.11.0 on Spark 4.1.
kind: tool
tool_assets: true
---

* content
{:toc}

> **TL;DR**
>
> * Pick a Spark version and the tool offers only the Iceberg releases that actually support it, read from each release's own build, then only the Scala versions Iceberg publishes a runtime for.
> * Spark 4.x is Scala 2.13 only, so no `_2.12` Iceberg runtime exists for it. The tool will not let you build that coordinate.
> * It emits the `--packages` coordinate, the `IcebergSparkSessionExtensions` config, and the catalog configs for Hive, Hadoop, REST or JDBC.
> * `SparkSessionCatalog` is used for Hive so Iceberg and existing Hive tables coexist under one catalog name; every other type gets `SparkCatalog`.

## Spark Submit Command generator using different Iceberg Catalog(s)

This tool is used to generate or build the Spark Submit Command using Iceberg Catalog(s).

<div class="tool-widget">
    <script type="text/javascript">
      	$(document).ready(function() {

      		$('#scala-version').attr('disabled', true);
      		$('#iceberg-version').attr('disabled', true);

			$("#catalog-type").change(function() {
		        var selectedType = $(this).val();
		        $(".catalog-log-div").hide();
		        $("#" + selectedType+"-catalog").show();
		    });

			// Support matrix read from each Iceberg release's gradle.properties
			// (systemProp.knownSparkVersions) at its apache-iceberg-<v> tag, plus
			// settings.gradle for the Scala suffixes. Spark 4.x runtimes are
			// published for Scala 2.13 only.
			var ICEBERG_SUPPORT = {
				"1.11.0": ["3.4", "3.5", "4.0", "4.1"],
				"1.10.2": ["3.4", "3.5", "4.0"],
				"1.9.2": ["3.4", "3.5"],
				"1.8.1": ["3.3", "3.4", "3.5"],
				"1.7.2": ["3.3", "3.4", "3.5"],
				"1.6.1": ["3.3", "3.4", "3.5"],
				"1.5.2": ["3.3", "3.4", "3.5"],
				"1.4.3": ["3.2", "3.3", "3.4", "3.5"]
			};

			function scalaVersionsFor(sparkVersion) {
				// Spark 4 dropped Scala 2.12, so Iceberg only ships _2.13 runtimes.
				return sparkVersion.indexOf("4.") === 0 ? ["2.13"] : ["2.12", "2.13"];
			}

			function setOptions(selectId, values, placeholder) {
				var $sel = $(selectId);
				$sel.empty();
				$sel.append($("<option>", { disabled: true, selected: true, value: "", text: placeholder }));
				values.forEach(function(v) {
					$sel.append($("<option>", { value: v, text: v }));
				});
			}

			$("#spark-version").change(function() {
				var sparkVersion = $(this).val();
				var supported = Object.keys(ICEBERG_SUPPORT).filter(function(iceberg) {
					return ICEBERG_SUPPORT[iceberg].indexOf(sparkVersion) >= 0;
				});
				setOptions("#iceberg-version", supported, "Select Iceberg Version");
				setOptions("#scala-version", scalaVersionsFor(sparkVersion), "Select Scala Version");
				$("#iceberg-version").attr("disabled", supported.length === 0);
				$("#scala-version").attr("disabled", false);
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
				} else if("jdbc" === catalogType) {
					// JdbcCatalog reads connection settings under the "jdbc." prefix
					// (JdbcCatalog.PROPERTY_PREFIX); uri and warehouse are top level.
					command += "&emsp;--conf spark.sql.catalog." + catalogName + ".uri=" + $("#jdbc-uri").val() + " \\ </br>";
					command += "&emsp;--conf spark.sql.catalog." + catalogName + ".warehouse=" + $("#jdbc-warehouse").val() + " \\ </br>";
					command += "&emsp;--conf spark.sql.catalog." + catalogName + ".jdbc.user=" + $("#jdbc-user").val() + " \\ </br>";
					command += "&emsp;--conf spark.sql.catalog." + catalogName + ".jdbc.password=$ICEBERG_CATALOG_PASSWORD";
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
								        <option value="3.2">3.2</option>
								        <option value="3.3">3.3</option>
								        <option value="3.4">3.4</option>
								        <option value="3.5">3.5</option>
								        <option value="4.0">4.0</option>
								        <option value="4.1">4.1</option>
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
										<!-- populated from ICEBERG_SUPPORT when a Spark version is picked -->
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
								        <option value="jdbc">JDBC</option>
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
					    <div class="row catalog-log-div" id="jdbc-catalog" style="margin-top: 10px; display: none;">
			                <div class="col-sm-4">
			                  	<div class="form-group">
			                    	<label for="jdbc-uri">JDBC URI:</label>
			                  	</div>
			                </div>
			                <div class="col-sm-8">
			                  	<div class="form-group">
			                    	<input type="text" class="form-control" id="jdbc-uri" value="jdbc:postgresql://catalog-db.internal:5432/iceberg">
			                  	</div>
			                </div>
			                <div class="col-sm-4">
			                  	<div class="form-group">
			                    	<label for="jdbc-warehouse">Warehouse:</label>
			                  	</div>
			                </div>
			                <div class="col-sm-8">
			                  	<div class="form-group">
			                    	<input type="text" class="form-control" id="jdbc-warehouse" value="s3://lakehouse-prod/warehouse">
			                  	</div>
			                </div>
			                <div class="col-sm-4">
			                  	<div class="form-group">
			                    	<label for="jdbc-user">JDBC user:</label>
			                  	</div>
			                </div>
			                <div class="col-sm-8">
			                  	<div class="form-group">
			                    	<input type="text" class="form-control" id="jdbc-user" value="iceberg_catalog">
			                  	</div>
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
	    </div> <!-- spark_iceberg_submit_cmd_container -->
	</div> <!--container-fluid -->
</div>

## References

* [Iceberg Spark getting started](https://iceberg.apache.org/docs/latest/spark-getting-started/) for the runtime coordinate and session extensions
* [Iceberg Spark configuration](https://iceberg.apache.org/docs/latest/spark-configuration.html) for catalog properties and the `SparkCatalog` versus `SparkSessionCatalog` choice
* [`CatalogUtil.java` at apache-iceberg-1.11.0](https://github.com/apache/iceberg/blob/apache-iceberg-1.11.0/core/src/main/java/org/apache/iceberg/CatalogUtil.java), the accepted `type` values
* [Iceberg `gradle.properties` at apache-iceberg-1.11.0](https://github.com/apache/iceberg/blob/apache-iceberg-1.11.0/gradle.properties), the Spark and Scala support matrix this tool encodes
