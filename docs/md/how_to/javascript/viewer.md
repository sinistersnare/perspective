# `<perspective-viewer>` Custom Element library

`<perspective-viewer>` provides a complete graphical UI for configuring the
`perspective` library and formatting its output to the provided visualization
plugins.

Once imported and initialized in JavaScript, the `<perspective-viewer>` Web
Component will be available in any standard HTML on your site. A simple example:

```html
<perspective-viewer id="view1"></perspective-viewer>
<script type="module">
    import perspective from "@perspective-dev/client";
    import "@perspective-dev/viewer";

    const worker = await perspective.worker();
    const table = await worker.table(data);
    document.getElementById("view1").load(table);
</script>
```

## Attributes

`<perspective-viewer>` can be configured via HTML attributes or JavaScript
properties. When set as attributes, the viewer will apply the configuration on
initialization:

```html
<perspective-viewer
    columns='["Sales", "Profit"]'
    group-by='["Region"]'
    sort='[["Sales", "desc"]]'>
</perspective-viewer>
```

## UI Features

The viewer provides an interactive side panel with:

- **Column list** - drag and drop columns to configure `group_by`, `split_by`,
  `sort`, and `filter` fields.
- **New Column** button - opens an expression editor for creating computed
  columns via the [expression language](../../explanation/view/config/expressions.md).
- **Plugin selector** - switch between visualization plugins such as Datagrid,
  X/Y Line, X/Y Scatter, Treemap, Sunburst, and Heatmap.
- **Theme** selector - toggle between available themes.
- **Export** - download the current view as CSV or Arrow.
- **Copy** - copy the current view to the clipboard.
- **Reset** - restore the viewer to its default configuration.

## Methods

Key methods on the `<perspective-viewer>` element:

| Method | Description |
|---|---|
| `load(table)` | Bind a `Table` to the viewer |
| `restore(config)` | Apply a saved configuration object |
| `save()` | Serialize the current configuration |
| `reset(all)` | Reset configuration (pass `true` to also reset expressions) |
| `getTable()` | Get the bound `Table` |
| `flush()` | Wait for any pending UI updates to complete |
