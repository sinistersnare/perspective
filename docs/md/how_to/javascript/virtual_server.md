# Virtual Servers

Perspective's Virtual Server feature lets you connect `<perspective-viewer>` to
external data sources without loading data into Perspective's built-in engine.
Instead, queries are translated and executed natively by the external database.

For a detailed explanation of how virtual servers work, see the
[Virtual Servers](../../explanation/virtual_servers.md) concepts page.

Perspective ships with built-in virtual server implementations for:

- [**DuckDB**](./virtual_server/duckdb.md) — query DuckDB databases in-browser
  via `@duckdb/duckdb-wasm`, or on the server via Node.js.
- [**ClickHouse**](./virtual_server/clickhouse.md) — query a ClickHouse server
  directly from the browser or from Node.js.

You can also [**implement your own**](./virtual_server/custom.md) virtual server
to connect Perspective to any data source by implementing the
`VirtualServerHandler` interface.
