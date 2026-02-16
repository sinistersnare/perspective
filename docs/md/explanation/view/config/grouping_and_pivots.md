# Grouping and Pivots

## Group By

A group by _groups_ the dataset by the unique values of each column used as a
group by - a close analogue in SQL to the `GROUP BY` statement. The underlying
dataset is aggregated to show the values belonging to each group, and a total
row is calculated for each group, showing the currently selected aggregated
value (e.g. `sum`) of the column. Group by are useful for hierarchies,
categorizing data and attributing values, i.e. showing the number of units sold
based on State and City. In Perspective, group by are represented as an array of
string column names to pivot, are applied in the order provided; For example, a
group by of `["State", "City", "Postal Code"]` shows the values for each Postal
Code, which are grouped by City, which are in turn grouped by State.

<div class="javascript">

```javascript
const view = await table.view({ group_by: ["a", "c"] });
```

</div>
<div class="python">

```python
view = table.view(group_by=["a", "c"])
```

</div>
<div class="rust">

```rust
let view = table.view(Some(ViewConfigUpdate {
    group_by: Some(vec!["a".into(), "c".into()]),
    ..ViewConfigUpdate::default()
})).await?;
```

</div>

## Split By

A split by _splits_ the dataset by the unique values of each column used as a
split by. The underlying dataset is not aggregated, and a new column is created
for each unique value of the split by. Each newly created column contains the
parts of the dataset that correspond to the column header, i.e. a `View` that
has `["State"]` as its split by will have a new column for each state. In
Perspective, Split By are represented as an array of string column names to
pivot:

<div class="javascript">

```javascript
const view = await table.view({ split_by: ["a", "c"] });
```

</div>
<div class="python">

```python
view = table.view(split_by=["a", "c"])
```

</div>
<div class="rust">

```rust
let view = table.view(Some(ViewConfigUpdate {
    split_by: Some(vec!["a".into(), "c".into()]),
    ..ViewConfigUpdate::default()
})).await?;
```

</div>

## Aggregates

Aggregates perform a calculation over an entire column, and are displayed when
one or more [Group By](#group-by) are applied to the `View`. Aggregates can be
specified by the user, or Perspective will use the following sensible default
aggregates based on column type:

-   "sum" for `integer` and `float` columns
-   "count" for all other columns

Perspective provides a selection of aggregate functions that can be applied to
columns in the `View` constructor using a dictionary of column name to aggregate
function name.

<div class="javascript">

```javascript
const view = await table.view({
    aggregates: {
        a: "avg",
        b: "distinct count",
    },
});
```

</div>
<div class="python">

```python
view = table.view(
  aggregates={
    "a": "avg",
    "b": "distinct count"
  }
)
```

</div>
<div class="rust">

```rust
use std::collections::HashMap;
let view = table.view(Some(ViewConfigUpdate {
    aggregates: Some(HashMap::from([
        ("a".into(), "avg".into()),
        ("b".into(), "distinct count".into()),
    ])),
    ..ViewConfigUpdate::default()
})).await?;
```

</div>

The available aggregate functions depend on the column type:

**Numeric columns** (`integer`, `float`): `sum`, `abs sum`, `sum abs`,
`sum not null`, `any`, `avg`, `mean`, `count`, `distinct count`, `dominant`,
`first`, `last`, `last by index`, `high`, `low`, `max`, `min`,
`high minus low`, `last minus first`, `median`, `q1`, `q3`,
`pct sum parent`, `pct sum total`, `stddev`, `var`, `unique`,
`weighted mean`, `min by`, `max by`.

**String columns**: `count`, `any`, `distinct count`, `dominant`, `first`,
`last`, `last by index`, `join`, `median`, `q1`, `q3`, `unique`, `min by`,
`max by`.

**Date/Datetime columns**: `count`, `any`, `avg`, `distinct count`, `dominant`,
`first`, `last`, `last by index`, `high`, `low`, `max`, `min`, `median`,
`q1`, `q3`, `unique`.

**Boolean columns**: `count`, `any`, `distinct count`, `dominant`, `first`,
`last`, `last by index`, `unique`.
