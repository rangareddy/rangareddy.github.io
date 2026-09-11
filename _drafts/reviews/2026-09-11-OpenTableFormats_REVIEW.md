# Three-persona review: Open table formats in practice

Reviewed: `_posts/2026-09-11-OpenTableFormats.md`, against Iceberg 1.11.0,
Hudi 1.2.0 and Delta Lake 4.4.0. Each persona names at least one concrete
weakness with its location and the disposition.

## Junior data engineer

**"The three setup blocks mix Spark versions and I cannot tell which to run."**
(Hands-on, `Setting up`) The Iceberg and Hudi commands target Spark 3.5, the
Delta one targets Spark 4.x. Nothing says the three cannot be pasted into the
same shell.
*Fixed.* The Delta block now carries an inline note that Delta 4.x is for Spark
4.x and that `delta-spark` 3.x is the Spark 3.5 line, and the Production tips
close with the full per-engine version matrix.

**"The `MERGE INTO` examples look identical, so why does the format matter?"**
(Hands-on, `Upserting a CDC batch`)
*Fixed by construction, and worth keeping.* The paragraph after the blocks is the
point of the section: the SQL converges and the execution does not. Iceberg and
Delta plan a join whose cost scales with how much of the table it touches; Hudi
does an index lookup whose cost scales with the batch. Showing identical SQL and
then explaining the divergence is more useful than inventing syntactic
differences.

**"I do not know what a Puffin blob is."** (`How each one implements it`)
*Left as is, deliberately.* The sentence says deletion vectors are "stored as
Puffin blobs" and links the Iceberg spec. Defining Puffin's binary layout would
be a digression; the reader needs to know the artefact has a name they can search
for, which the sentence provides.

## Senior data engineer

**"`prod.trips.changes` is not an Iceberg metadata table."** (was in
`Reading only what changed`)
*Fixed, and it was the most serious defect in the draft.* I invented that table.
`MetadataTableType` at `apache-iceberg-1.11.0` lists exactly fifteen: `ENTRIES`,
`FILES`, `DATA_FILES`, `DELETE_FILES`, `HISTORY`, `METADATA_LOG_ENTRIES`,
`SNAPSHOTS`, `REFS`, `MANIFESTS`, `PARTITIONS`, `ALL_DATA_FILES`,
`ALL_DELETE_FILES`, `ALL_FILES`, `ALL_MANIFESTS`, `ALL_ENTRIES`. Change reads go
through `create_changelog_view`, whose real parameters (`table`,
`changelog_view`, `options`, `compute_updates`, `identifier_columns`,
`net_changes`) and real output columns (`_change_type`, `_change_ordinal`,
`_commit_snapshot_id`) the post now uses. The correct metadata-table list was
added to the Iceberg layout section as well.

**"`preCombineField` is the old Hudi spelling."** (`Creating the table`)
*Fixed.* `HoodieOptionConfig` at `release-1.2.0` declares
`.withSqlKey("orderingFields").withAlternatives(List("preCombineField"))`. The
post now uses `orderingFields` and notes the alias, since both resolve to
`hoodie.table.ordering.fields`.

**"Are the Iceberg copy-on-write defaults really the defaults?"**
(`How each one implements it`)
*Verified, not changed.* `TableProperties` at the 1.11.0 tag sets
`DELETE_MODE_DEFAULT`, `UPDATE_MODE_DEFAULT` and `MERGE_MODE_DEFAULT` all to
`RowLevelOperationMode.COPY_ON_WRITE.modeName()`. This is the single most
counter-intuitive fact in the post, so it appears in the TL;DR, the body and the
Production tips.

**"Every Maven coordinate needs to be real."**
*Verified.* All four resolve on Maven Central: `iceberg-spark-runtime-3.5_2.12:1.11.0`,
`hudi-spark3.5-bundle_2.12:1.2.0`, `delta-spark_2.13:4.4.0` and
`delta-spark_2.12:3.3.3`.

## Data architect

**"The Delta recommendation read as 'only if you are on Databricks'."**
(`Choosing between them`)
*Fixed.* That was unfair and, given the author contributes to Hudi, exactly the
bias a reader would look for. The row is now "Layout you want managed for you, or
a Databricks-centred platform", crediting liquid clustering as a layout story on
its own merits rather than as a vendor tie.

**"The commit-protocol section never says the guarantee belongs to the catalog."**
(`Concurrency and multiple writers`)
*Fixed.* Added `The catalog is part of the decision`, which states that the same
Iceberg table has different correctness guarantees on a REST catalog versus a
filesystem catalog while looking identical on disk, and tells the reader to ask
which component provides the atomic compare-and-swap.

**"Does the conclusion deliver what the intro promised?"**
*Fixed on the intro side.* The draft's introduction never stated a promise, so
there was nothing to deliver against. It now names three concrete outcomes
(identify a format from its directory, explain each one's single-row update,
choose from workload shape), and all three are covered by the body and restated
in the conclusion.

**"'When not to use' sections are often decorative."** (`When not to reach for
any of them`)
*Accepted as adequate.* It makes two falsifiable claims: plain partitioned
Parquet is the better choice for append-only, single-engine, small tables that
never need a row corrected; and running two formats in one platform doubles the
operational surface for no analytical gain.

## Needs author verification

1. **No example was executed.** Unlike the parquet-cli post, whose transcripts
   are real output, nothing here was run. Every version, config key, default,
   on-disk path, procedure signature and Maven coordinate was read from the
   release tags, and every URL was checked, but the SQL and Python blocks are
   not transcripts. Running the hands-on section against a real cluster before
   publishing would raise confidence further.
2. **Hudi time travel syntax.** `TIMESTAMP AS OF '20260911093000123'` follows the
   documented Spark SQL form with an instant string. The instant format and
   whether a plain timestamp literal is also accepted are worth a quick check on
   your own 1.2.0 build.
3. **Iceberg `changelog` completeness.** The post says the changelog scan "covers
   appends well and is less complete for updates and deletes". That reflects the
   `compute_updates` and `identifier_columns` parameters existing at all, but it
   is a judgement rather than a quoted limitation.
4. **The two reference articles could not be read.** Both Medium URLs return
   Cloudflare challenges to every client I tried, so the structure was taken from
   the comprehensive-guide outline rather than from those posts. If there is a
   specific element of them you want mirrored, point me at it.
