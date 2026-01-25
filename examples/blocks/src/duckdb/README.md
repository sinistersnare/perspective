An example of [Perspective](https://github.com/perspective-dev/perspective)
using [DuckDB WASM](https://duckdb.org/docs/api/wasm/overview) as a virtual
server backend via the `DuckDBHandler` adapter.

Instead of using Perspective's built-in WebAssembly query engine, this example
demonstrates how to use DuckDB as the data processing layer while still
leveraging Perspective's visualization components. The `DuckDBHandler` translates
Perspective's view configuration (group by, split by, sort, filter, expressions,
aggregates) into DuckDB SQL queries, enabling Perspective to query data stored
in DuckDB tables.

This example loads the Superstore sample dataset into a DuckDB table, then
creates a Perspective viewer that queries the data through the DuckDB virtual
server. A separate log viewer displays the SQL queries being generated in
real-time, along with a timeline chart showing query frequency.
