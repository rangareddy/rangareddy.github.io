## 

```sh
bundler exec jekyll serve --baseurl ""
```

## CSV to table

### 1. Create a CSV

Create a CSV file in your [Data files]({{ '/docs/datafiles/' | relative_url }}) directory so
that Jekyll will pick it up. A sample path and CSV data are shown below:

`_data/authors.csv`

```
First name,Last name,Age,Location
John,Doe,35,United States
Jane,Doe,29,France
Jack,Hill,25,Australia
```

That data file will now be available in Jekyll like this:

{% raw %}
```liquid
{{ site.data.authors }}
```
{% endraw %}


### 2. Add a table

Choose an HTML or markdown file where you want your table to be shown.

For example: `table_test.md`

```yaml
---
title: Table test
---
```

### Inspect a row

Grab the first row and see what it looks like using the `inspect` filter.

{% raw %}
```liquid
{% assign row = site.data.authors[0] %}
{{ row | inspect }}
```
{% endraw %}


The result will be a _hash_ (an object consisting of key-value pairs) which looks like this:

```ruby
{
  "First name"=>"John",
  "Last name"=>"Doe",
  "Age"=>"35",
  "Location"=>"United States"
}
```

### Add table data rows

In this section we add the data rows to the table. Now, we use the second element of `pair`
to find the value.

For convenience, we render using the `tablerow` tag - this works like a `for` loop, but the inner
data will be rendered with `tr` and `td` HTML tags for us. Unfortunately, there is no equivalent for
the header row, so we must write that out in full, as in the previous section.

{% raw %}
```liquid
---
title: Table test
---

<table>
  {% for row in site.data.authors %}
    {% if forloop.first %}
    <tr>
      {% for pair in row %}
        <th>{{ pair[0] }}</th>
      {% endfor %}
    </tr>
    {% endif %}

    {% tablerow pair in row %}
      {{ pair[1] }}
    {% endtablerow %}
  {% endfor %}
</table>
```
{% endraw %}

