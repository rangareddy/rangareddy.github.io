---
layout: post
title: Epoch & Unix Timestamp Converter Tools
categories: Tools
tags: Tools Utilities Linux
author: Ranga Reddy
date: "2022-02-28 00:00:00 +0530"
---

* content
{:toc}

## Epoch and Unix Timestamp Converter

A simple tool to convert an epoch/unix timestamp into a human readable date vice versa. It also displays the current epoch/unix timestamp in both seconds and milliseconds.

Epoch also known as Unix timestamps, is the number of seconds that have elapsed since **1970-01-01 00:00:00 GMT**.

<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
	<title><i class="bi bi-clock"></i>Epoch and Unix Timestamp Converter</title>
	<link href="{{ site.baseurl }}{% link css/bootstrap.min.css %}" rel="stylesheet">
    <script src="{{ site.baseurl }}{% link js/bootstrap.bundle.min.js %}"></script>
    <script src="{{ site.baseurl }}{% link js/jquery-slim.js %}"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.3/font/bootstrap-icons.css">
    <style>
		.epoch_container {
		    border-radius: .4rem;
		    background-color: #e9ecef
		}
		.ephoc_time {
		    text-align: center;
		    padding: 8px 10px;
		    margin: 0;
		    font-size: 1.2em;
		    font-weight: 400;
		    background-color: var(--bs-card-color);
		}
    </style>
    <script>

    	function convert_epoch_to_human_readable() {
    		var ephoc_value = $('#ephoc_input_value').val();
			if (ephoc_value) {
				var ephoc_value_len = ephoc_value.length;
				if(ephoc_value_len < 10) {
					alert("ephoc value length must be > 9");
					$("#ephoc_input_value").val(ephoc_value);
					$("#ephoc_input_value").focus();
					return false;
				}
				var unixTimestamp = parseInt(ephoc_value);
				var date;
				if(ephoc_value_len > 10) {
					date = new Date(unixTimestamp);
				} else {
					date = new Date(unixTimestamp * 1000);
				}
				$("#local_date").val(date);
				$("#gmt_date").val(date.toUTCString());
				$("#display_ephoc_date_container").show();
			} else {
				alert("Please enter ephoc value");
				$("#ephoc_input_value").focus();
				$("#display_ephoc_date_container").hide();
				return false;
			}
		}

		function convert_human_readable_to_epoch() {
			var year = parseInt($('#year').val());
			var month = parseInt($('#month').val()) - 1;
			var day = parseInt($('#day').val());
			var hours = parseInt($('#hours').val());
			var mins = parseInt($('#min').val());
			var secs = parseInt($('#sec').val());

			var date = new Date(year,month,day,hours,mins,secs);
			if(date) {
				var ephoc = Math.floor(date.getTime()/1000.0);
				$("#ephoc_date").val(ephoc);
				$("#ephoc_gmt_date").val(date.toUTCString());
				$("#display_date_ephoc_container").show();
			} else {
				$("#display_date_ephoc_container").hide();
				alert("Invalid date.");
				return false;
			}
		}

		$(document).ready(function() {
			const intervalID = setInterval(display_ephoc_time, 100);
			function display_ephoc_time() {
				const date = new Date();
				const utcStr = date.toUTCString()
				const ephoc = Math.floor(date.getTime()/1000.0);
				$("#ephoc_time").val("The current ephoc time is "+ephoc);
			}
			$("#display_ephoc_date_container").hide();
			$("#display_date_ephoc_container").hide();
		});
	</script>
</head>

<body>
    <h2>The Current Epoch Unix Timestamp</h2>
    <div id="epoch_clock_container" class='card epoch_container'>
        <input type="text" class="form-control ephoc_time" id="ephoc_time" name="ephoc_time" readonly>
    </div>
    <h2>Convert Unix Timestamp to Human Readable Date Format</h2>
    <div id="epoch_convert_timestamp_human_container" class='card epoch_container'>
        <div class="card-body">
            <form id='ephoc_date_form'>
                <div class="row" id='ephoc_date_input_container'>
                    <div class="col-md-7">
                        <div class="form-group">
                            <input type="num" class="form-control" id="ephoc_input_value" name="ephoc_input_value" onkeypress="return /[0-9]/i.test(event.key)" minlength="10" maxlength="13" required placeholder='Enter Epoch value'>
                        </div>
                    </div>
                    <div class="col-md-5">
                    	<div class="form-group">
                            <input type="button" class="btn btn-primary form-control" id='unix_human_date_btn' onclick="convert_epoch_to_human_readable();" value="Convert Unix Timestamp to Human date"/>
                        </div>
                    </div>
                </div>
                <div class="row" id='display_ephoc_date_container' style='margin-top: 10px;'>
                	<div class="col-md-7">
	                	<div class="form-group">
	                        <label for="local_date" class="form-label"><b>Local Time:</b></label>
	                        <input type="text" class="form-control" id="local_date" name="local_date">
	                    </div>
	                </div>
	                <div class="col-md-5">
	                    <div class="form-group">
	                        <label for="gmt_date" class="form-label"><b>GMT Time:</b></label>
	                        <input type="text" class="form-control" id="gmt_date" name="gmt_date">
	                    </div>
	                </div>
                </div>
            </form>
        </div>
    </div>
    <h2>Convert DateTime to Unix Timestamp</h2>
    <div id="epoch_convert_human_date_to_timestamp_container" class='card epoch_container'>
        <div class="card-body">
            <form id='date_ephoc_form'>
            	<div class="row" id='date_ephoc_input_container'>
                    <div class="col-md-7">
                    	<div class='row'>
	                        <div class="form-group col-4 col-lg-2">
								<label for="year">Year</label>
								<input type="number" name="year" id="year" class="form-control" step="1" min='1970' maxlength="4" placeholder="YYYY" value="2023">
							</div>
							<div class="form-group col-4 col-lg-2">
								<label for="month">Month</label>
								<input type="number" name="month" id="month" class="form-control" min="1" max="12" step="1" maxlength="2" placeholder="MM" value="01">
							</div>
							<div class="form-group col-4 col-lg-2">
								<label for="day">Day</label>
								<input type="number" name="day" id="day" class="form-control" min="1" max="31" step="1" maxlength="2" placeholder="DD" value="01">
							</div>
							<div class="form-group col-4 col-lg-2">
								<label for="hours">Hour (24h)</label>
								<input type="number" name="hours" id="hours" class="form-control" min="0" max="23" step="1" maxlength="2" placeholder="HH" value="1">
							</div>
							<div class="form-group col-4 col-lg-2">
								<label for="min">Minutes</label>
								<input type="number" name="min" id="min" class="form-control" step="1" min="0" max="59" maxlength="2" placeholder="MM" value="1">
							</div>
							<div class="form-group col-4 col-lg-2">
								<label for="sec">Seconds</label>
								<input type="number" name="sec" id="sec" class="form-control" step="1" min="0" max="59" maxlength="2" placeholder="SS" value="0">
							</div>
						</div>
                    </div>
                    <div class="col-md-5">
                    	<div class="form-group">
                    		<label for="unix_human_date_btn"></label>
                    		<input type="button" class="btn btn-primary form-control" id='unix_human_date_btn' onclick="convert_human_readable_to_epoch();" value="Convert Human date to Unix TimeStamp"/>
                        </div>
                    </div>
                </div>
                <div class="row" id='display_date_ephoc_container' style='margin-top: 10px;'>
                	<div class="col-md-7">
	                	<div class="form-group">
	                        <label for="ephoc_date" class="form-label"><b>Unix Epoch:</b></label>
	                        <input type="text" class="form-control" id="ephoc_date" name="ephoc_date">
	                    </div>
	                </div>
	                <div class="col-md-5">
	                    <div class="form-group">
	                        <label for="ephoc_gmt_date" class="form-label"><b>GMT Time:</b></label>
	                        <input type="text" class="form-control" id="ephoc_gmt_date" name="ephoc_gmt_date">
	                    </div>
	                </div>
                </div>
            </form>
        </div>
    </div>
</body>

</html>
