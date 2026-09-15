# Three-persona review: Apache Hudi Merge-on-Read in depth

Reviewed: `_posts/2026-09-15-HudiMergeOnRead.md`, against Hudi 1.2.0.

## Junior data engineer

**"I could not tell which query type I get by default."** (`The three query types`)
*Fixed in the table.* `snapshot` is marked as the default, taken from
`DataSourceReadOptions`, where `QUERY_TYPE` defaults to
`QUERY_TYPE_SNAPSHOT_OPT_VAL`.

**"The worked sequence is clear but I did not know what to do with it."**
*Fixed.* Added the arithmetic that turns it into a decision: commit frequency
divided by the compaction trigger gives the maximum staleness a `read_optimized`
reader ever sees, and the maximum number of log files a `snapshot` query merges.

**"Why are log files missing from my `ls` output?"**
*Answered in the layout section.* `HoodieLogFile.LOG_FILE_PREFIX` is `.`, so they
are hidden files, which is why a Merge-on-Read partition can look like
Copy-on-Write at a glance.

## Senior data engineer

**"Procedure signatures need to be right or the post is useless at the terminal."**
*Verified and corrected.* `ShowCompactionProcedure` takes `table`, `path` and
`limit`; `RunCompactionProcedure` takes `op`, `table`, `path`, `timestamp`,
`options`, `instants` and `limit`. The examples now pass `limit` and explain that
`op` selects the phase.

**"Is `hoodie.compact.inline` really false by default?"**
*Verified.* `HoodieCompactionConfig` at `release-1.2.0` sets it to `"false"`,
with `max.delta.commits` at `5`, `max.delta.seconds` at `3600`, the trigger
strategy at `NUM_COMMITS` and the strategy at
`LogFileSizeBasedCompactionStrategy`. This is the load-bearing fact of the post,
so it appears in the TL;DR, the compaction section and the tips.

**"`hoodie.compaction.target.io` of 512000 needs a unit."**
*Verified and stated.* Its own documentation string reads "Amount of MBs to
spend during compaction run", so 512000 MB is 500 GB per run.

**"Are all seven log block types real?"**
*Verified.* `HoodieLogBlockType` at the tag: `COMMAND_BLOCK`, `DELETE_BLOCK`,
`CORRUPT_BLOCK`, `AVRO_DATA_BLOCK`, `HFILE_DATA_BLOCK`, `PARQUET_DATA_BLOCK`,
`CDC_DATA_BLOCK`. The header keys are equally from source.

## Data architect

**"The post should say plainly that Merge-on-Read is not the default."**
*Fixed.* `hoodie.datasource.write.table.type` defaults to
`COW_TABLE_TYPE_OPT_VAL`, and the "when Copy-on-Write is better" section now
carries that evidence rather than asserting it.

**"Where is the organisational failure mode?"**
*Present and sharpened.* The closing argument of the Copy-on-Write section is
that a Merge-on-Read table with nobody owning compaction degrades silently, and
that "we will set up async compaction later" is a decision with an expiry date.

**"Does this duplicate the held indexing draft?"**
*No, and the two are complementary.* The draft covers how a write locates a file
group; this post covers what happens once it has, and the read side. If both are
published they should cross-link.

## Needs author verification

1. **Nothing was executed.** All configs, defaults, enum values, procedure
   signatures and on-disk naming were read from `release-1.2.0`, and all four
   reference URLs return 200, but the code blocks are not transcripts.
2. **The example file and log names are illustrative.** They follow
   `FSUtils.makeLogFileName` exactly in shape, but the UUIDs, write tokens and
   instants are invented rather than captured from a real table.
3. **The compaction strategy table** lists the classes shipped at the tag. The
   one-line description of what each selects is my reading of their names and
   purpose, not quoted documentation.
