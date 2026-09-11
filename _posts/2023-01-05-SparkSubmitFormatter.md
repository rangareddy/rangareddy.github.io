---
title: Spark Submit Command Formatter tool
categories: Spark
tags: Spark Utilities
author: Ranga Reddy
date: "2023-01-05 11:40:00 +0530"
updated: "2026-09-11 10:00:00 +0530"
description: >-
  Paste a spark-submit command and get it back formatted across lines or minified
  onto one line, with every Spark option resolved to the configuration property
  it sets and your application's own arguments kept separate.
kind: tool
tool_assets: true
tool_tables: true
---

* content
{:toc}

> **TL;DR**
>
> * Paste a `spark-submit` command written on one line and get it back split across lines with a trailing backslash per option, or minified back to one line.
> * Each Spark option is resolved to the configuration property it actually sets, so `--num-executors` shows as `spark.executor.instances` and you can compare a command against `spark-defaults.conf` directly.
> * Your application's own arguments are kept separate from Spark's, so a job that takes `--input` and `--output` no longer has them mistaken for Spark options.
> * Quoted values survive the round trip intact, including an `extraJavaOptions` string containing spaces.

## Spark Submit Command Formatter/Minifier

Format a `spark-submit` command across lines for review, or minify it back onto
one line for a scheduler that wants a single string. Both directions preserve the
command exactly.

The useful part is the breakdown underneath. A long `spark-submit` line hides
duplicated or contradictory settings, and the same setting can arrive as either a
flag or a `--conf`, which makes them hard to compare by eye. The parameter table
resolves every option to its configuration property, so `--executor-memory 18g`
and `--conf spark.executor.memory=18g` line up as the same row.

The option-to-property mapping follows the `OptionAssigner` list in
`SparkSubmit.scala` and the flag names in `SparkSubmitOptionParser.java` at the
Spark `v4.2.0` tag, so `--principal` and `--keytab` resolve to
`spark.kerberos.principal` and `spark.kerberos.keytab` rather than the pre-Spark-3
`spark.yarn.*` names.

<div class="tool-widget">
    <style>
      #spark_submit_config_txt {
        resize: vertical;
        width: 100%;
        font-family: var(--font-mono, monospace);
        font-size: 0.86rem;
      }
      #spark_submit_cmd_text {
        white-space: pre-wrap;
        word-break: break-word;
        margin: 0;
        font-family: var(--font-mono, monospace);
        font-size: 0.86rem;
        line-height: 1.6;
      }
    </style>
    <script type="text/javascript">
      $(document).ready(function () {
        'use strict';

        // --------------------------------------------------------------------
        // spark-submit option table.
        // Flag -> equivalent configuration property, taken from the
        // OptionAssigner list in SparkSubmit.scala and the flag names in
        // SparkSubmitOptionParser.java at the v4.2.0 tag. Only flags
        // spark-submit actually accepts appear here; anything else is emitted
        // as --conf, which is what spark-submit expects.
        // --------------------------------------------------------------------
        var SPARK_OPTIONS = {
          'master': 'spark.master',
          'remote': 'spark.remote',
          'deploy-mode': 'spark.submit.deployMode',
          'name': 'spark.app.name',
          'jars': 'spark.jars',
          'packages': 'spark.jars.packages',
          'exclude-packages': 'spark.jars.excludes',
          'repositories': 'spark.jars.repositories',
          'py-files': 'spark.submit.pyFiles',
          'files': 'spark.files',
          'archives': 'spark.archives',
          'driver-memory': 'spark.driver.memory',
          'driver-cores': 'spark.driver.cores',
          'driver-java-options': 'spark.driver.extraJavaOptions',
          'driver-class-path': 'spark.driver.extraClassPath',
          'driver-library-path': 'spark.driver.extraLibraryPath',
          'executor-memory': 'spark.executor.memory',
          'executor-cores': 'spark.executor.cores',
          'num-executors': 'spark.executor.instances',
          'total-executor-cores': 'spark.cores.max',
          'principal': 'spark.kerberos.principal',
          'keytab': 'spark.kerberos.keytab',
          'queue': 'spark.yarn.queue',
          // Accepted by spark-submit but with no configuration equivalent.
          'proxy-user': null,
          'properties-file': null
        };

        // Flags that take no value.
        var SPARK_SWITCHES = ['verbose', 'supervise', 'version', 'help', 'load-spark-defaults'];

        var INDENT = ' '.repeat(2);
        var lastCommand = '';
        var parameterTable = null;
        var appArgsTable = null;

        // --------------------------------------------------------------------
        // Tokenizer: splits on whitespace but keeps quoted values intact, so a
        // value like "-XX:+UseG1GC -Dfoo=bar" survives as one token. Also joins
        // backslash-continued lines first, which is how these commands are
        // usually pasted.
        // --------------------------------------------------------------------
        function tokenize(text) {
          var src = String(text).replace(/\\[ \t]*\r?\n/g, ' ');
          var tokens = [];
          var current = '';
          var quote = null;
          var started = false;
          for (var i = 0; i < src.length; i++) {
            var ch = src.charAt(i);
            if (quote !== null) {
              if (ch === quote) { quote = null; } else { current += ch; }
              continue;
            }
            if (ch === '"' || ch === "'") { quote = ch; started = true; continue; }
            if (/\s/.test(ch)) {
              if (started) { tokens.push(current); current = ''; started = false; }
              continue;
            }
            current += ch;
            started = true;
          }
          if (started) { tokens.push(current); }
          return tokens;
        }

        // --------------------------------------------------------------------
        // Parser. spark-submit's grammar is: launcher, options, primary
        // resource, then application arguments. Everything after the resource
        // belongs to the application and is passed through untouched, which is
        // what keeps an app's own --input/--output flags out of the Spark
        // parameter table.
        // --------------------------------------------------------------------
        function parseCommand(tokens) {
          var parsed = {
            launcher: 'spark-submit',
            options: [],
            className: null,
            resource: null,
            appArgs: []
          };
          var i = 0;

          if (tokens.length > 0 && tokens[0].charAt(0) !== '-') {
            parsed.launcher = tokens[0] === 'org.apache.spark.deploy.SparkSubmit' ? 'spark-submit' : tokens[0];
            i = 1;
          }

          for (; i < tokens.length; i++) {
            var token = tokens[i];

            if (parsed.resource !== null) { parsed.appArgs.push(token); continue; }
            if (token.charAt(0) !== '-') { parsed.resource = token; continue; }

            var name = token.replace(/^--?/, '');

            if (name === 'conf') {
              var pair = tokens[++i] || '';
              var eq = pair.indexOf('=');
              parsed.options.push({
                flag: null,
                name: eq === -1 ? pair : pair.substring(0, eq),
                value: eq === -1 ? '' : pair.substring(eq + 1)
              });
            } else if (SPARK_SWITCHES.indexOf(name) !== -1) {
              parsed.options.push({ flag: name, name: name, value: null });
            } else if (name === 'class') {
              parsed.className = tokens[++i] || '';
            } else {
              // Known flag, or one we do not recognise. Either way it keeps its
              // value and its position rather than being dropped.
              parsed.options.push({ flag: name, name: name, value: tokens[++i] || '' });
            }
          }
          return parsed;
        }

        // Re-quote only values that need it, so the output can be pasted back.
        function quoteIfNeeded(value) {
          if (value === null || value === '') { return value === '' ? '""' : ''; }
          return /[\s"'$*?&|<>()]/.test(value) ? '"' + value.replace(/"/g, '\\"') + '"' : value;
        }

        function renderCommand(parsed, mode) {
          var parts = [parsed.launcher];
          parsed.options.forEach(function (option) {
            if (option.flag === null) {
              parts.push('--conf ' + option.name + '=' + quoteIfNeeded(option.value));
            } else if (option.value === null) {
              parts.push('--' + option.flag);
            } else {
              parts.push('--' + option.flag + ' ' + quoteIfNeeded(option.value));
            }
          });
          if (parsed.className) { parts.push('--class ' + parsed.className); }

          // The application resource and its arguments belong to the program,
          // not to Spark, so they stay together on the final line.
          var tail = [];
          if (parsed.resource) { tail.push(parsed.resource); }
          parsed.appArgs.forEach(function (arg) { tail.push(quoteIfNeeded(arg)); });
          if (tail.length > 0) { parts.push(tail.join(' ')); }

          return mode === 'minify' ? parts.join(' ') : parts.join(' \\\n' + INDENT);
        }

        // Rows for the parameter table: show the configuration property for a
        // flag that has one, so a reader can compare a command against
        // spark-defaults.conf.
        function toParameterRows(parsed) {
          return parsed.options.map(function (option) {
            var key = option.name;
            var source = 'conf';
            if (option.flag !== null) {
              source = '--' + option.flag;
              if (Object.prototype.hasOwnProperty.call(SPARK_OPTIONS, option.flag) && SPARK_OPTIONS[option.flag]) {
                key = SPARK_OPTIONS[option.flag];
              }
            }
            return { name: key, value: option.value === null ? '(flag)' : option.value, source: source };
          });
        }

        function destroyTables() {
          if (parameterTable) { parameterTable.destroy(); parameterTable = null; }
          if (appArgsTable) { appArgsTable.destroy(); appArgsTable = null; }
          $('#spark_submit_cmd_parameter_table tbody').empty();
          $('#spark_submit_cmd_line_parameter_table tbody').empty();
        }

        var TABLE_OPTIONS = {
          responsive: true, paging: true, searching: true, ordering: true, info: false
        };

        function showResult(parsed, mode) {
          $('#spark_submit_cmd_format_container').show();
          $('#spark_submit_cmd_parameter_container').toggle(parsed.options.length > 0);
          $('#spark_submit_cmd_add_parameter_container').toggle(parsed.appArgs.length > 0);
        }

        function hideResult() {
          $('#spark_submit_cmd_format_container').hide();
          $('#spark_submit_cmd_parameter_container').hide();
          $('#spark_submit_cmd_add_parameter_container').hide();
        }

        function build(mode) {
          var raw = $('#spark_submit_config_txt').val();
          if (!raw || !raw.trim()) {
            hideResult();
            $('#spark_submit_config_txt').trigger('focus');
            return;
          }

          destroyTables();

          var parsed = parseCommand(tokenize(raw));
          lastCommand = renderCommand(parsed, mode);

          // textContent, not html(): a pasted command is untrusted input and
          // must never be interpreted as markup.
          document.getElementById('spark_submit_cmd_text').textContent = lastCommand;

          parameterTable = $('#spark_submit_cmd_parameter_table').DataTable($.extend({
            data: toParameterRows(parsed),
            columns: [{ data: 'name' }, { data: 'value' }, { data: 'source' }]
          }, TABLE_OPTIONS));

          if (parsed.appArgs.length > 0) {
            // Order matters for application arguments, so this table keeps the
            // sequence the command used rather than sorting it.
            appArgsTable = $('#spark_submit_cmd_line_parameter_table').DataTable($.extend({}, TABLE_OPTIONS, {
              data: parsed.appArgs.map(function (arg, index) { return { position: index + 1, value: arg }; }),
              columns: [{ data: 'position' }, { data: 'value' }],
              ordering: false
            }));
          }

          showResult(parsed, mode);
        }

        function copyCommand() {
          if (!lastCommand) { return; }
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(lastCommand).then(function () {
              window.alert('spark-submit command copied!');
            }, function () {
              window.alert('Select the command and press Ctrl+C to copy.');
            });
          } else {
            window.alert('Select the command and press Ctrl+C to copy.');
          }
        }

        var SAMPLE = [
          'spark-submit',
          '--class com.rangareddy.pipeline.TripsIngest',
          '--master yarn',
          '--deploy-mode cluster',
          '--num-executors 12',
          '--executor-cores 5',
          '--executor-memory 18g',
          '--driver-memory 4g',
          '--conf spark.sql.shuffle.partitions=480',
          '--conf spark.executor.extraJavaOptions="-XX:+UseG1GC -Dlog4j.configurationFile=log4j2.properties"',
          's3a://lakehouse-prod/artifacts/trips-ingest-2.4.1.jar',
          '--input s3a://lakehouse-prod/raw/trips/',
          '--table s3a://lakehouse-prod/warehouse/trips/'
        ].join(' \\\n' + INDENT);

        $('#sample_spark_submit_config').on('click', function () {
          $('#spark_submit_config_txt').val(SAMPLE);
          hideResult();
        });
        $('#format_spark_submit_config').on('click', function (e) { e.preventDefault(); build('format'); });
        $('#minify_spark_submit_config').on('click', function (e) { e.preventDefault(); build('minify'); });
        $('#reset_spark_submit_config').on('click', function (e) {
          e.preventDefault();
          $('#spark_submit_config_txt').val('');
          destroyTables();
          hideResult();
        });
        $('#copy-spark-submit').on('click', function (e) { e.preventDefault(); copyCommand(); });

        hideResult();
      });
    </script>
    <div class="container-fluid">
      <div class="row" id="spark_submit_cmd_container" style="margin-top: 10px;">
        <div class="col-md-12">
          <div class="card">
            <div class="card-header">
              <span style='float: left;'>
                <h4>Spark Submit Command</h4>
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
            <h4 class="card-header">Formatted Spark Submit Command</h4>
            <div class="card-body">
              <pre class="card-text" id='spark_submit_cmd_text'></pre>
            </div>
            <div class="card-footer">
              <button type="button" id='copy-spark-submit' class="btn btn-primary">Copy Spark Submit Command</button>
            </div>
          </div>
        </div>
      </div>
      <!-- row -->
      <div class="row" id="spark_submit_cmd_parameter_container" style="margin-top: 10px;">
        <div class="col-md-12">
          <div class="card">
            <h4 class="card-header">Spark Configuration Parameters</h4>
            <div class="card-body">
              <table id="spark_submit_cmd_parameter_table" class="table table-striped table-responsive" style="width:100%">
                <thead>
                    <tr>
                        <th>Configuration property</th>
                        <th>Value</th>
                        <th>Set by</th>
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
            <h4 class="card-header">Application Arguments</h4>
            <div class="card-body">
              <table id="spark_submit_cmd_line_parameter_table" class="table table-striped table-responsive" style="width:100%">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Argument passed to your application</th>
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
</div>

## References

* [Submitting applications](https://spark.apache.org/docs/latest/submitting-applications.html) for the `spark-submit` argument reference
* [`SparkSubmit.scala` at v4.2.0](https://github.com/apache/spark/blob/v4.2.0/core/src/main/scala/org/apache/spark/deploy/SparkSubmit.scala), the `OptionAssigner` list this tool's flag-to-property mapping follows
* [Spark configuration reference](https://spark.apache.org/docs/latest/configuration.html) for what each `--conf` key means and its precedence
* [Spark Configuration Generator]({% post_url 2021-12-29-SparkConfigurationGenerator %}) to work out the executor sizes before formatting the command
* [Spark JVM troubleshooting playbook]({% post_url 2026-09-10-SparkTroubleshootingPlaybook %}) for the `extraJavaOptions` gotchas a long command tends to hide
