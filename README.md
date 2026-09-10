# rangareddy.github.io

[![GitHub stars](https://img.shields.io/github/stars/rangareddy/rangareddy.github.io.svg)](https://github.com/rangareddy/rangareddy.github.io/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/rangareddy/rangareddy.github.io.svg)](https://github.com/rangareddy/rangareddy.github.io/network)
[![GitHub issues](https://img.shields.io/github/issues/rangareddy/rangareddy.github.io.svg)](https://github.com/rangareddy/rangareddy.github.io/issues)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/rangareddy/rangareddy.github.io/master/LICENSE)

Personal blog: notes, troubleshooting guides and browser-based tools for Apache
Spark, Iceberg, Kafka, Parquet and Linux. Built with Jekyll and served by GitHub
Pages.

## Run it locally

```sh
bundle install
bundle exec jekyll serve --livereload
```

The site is then on <http://localhost:4000>.

## Layout of the repository

| Path | What lives there |
|:--|:--|
| `_posts/` | One markdown file per post, named `YYYY-MM-DD-Title.md` |
| `_drafts/` | Unpublished drafts; they are excluded from the build |
| `_layouts/` | `default`, `post` and `page` page shells |
| `_includes/` | Header, footer, sidebar panels, post cards, the SVG icon set |
| `_sass/` | Stylesheet partials, imported by `css/main.scss` |
| `js/site.js` | Theme toggle, mobile nav, table of contents, code copy, search |
| `search.json` | Client-side search index, generated at build time |

## Writing a post

Front matter that the templates read:

```yaml
---
title: Spark Submit Command generator using Iceberg Catalog
categories: Spark
tags: Spark Utilities Iceberg
date: "2023-07-15 12:00:00 +0530"
description: >-
  One or two sentences. Used on the post cards, in the search index and as the
  page meta description.
kind: tool          # optional: badges the post as an interactive tool
tool_assets: true   # optional: loads jQuery + Bootstrap for an embedded widget
tool_tables: true   # optional: also loads DataTables
---
```

`description` is not optional in practice. Listing pages render it instead of the
post body, which is what keeps a post's own scripts and styles off the home page.

Add `* content` followed by `{:toc}` at the top of a post to get a table of
contents; `js/site.js` moves it into the sidebar.

## Donate

You can also donate me for a coffee, and I'll do better. Thanks.

[Donate via PayPal](https://www.paypal.com/paypalme/rangareddyavula)
