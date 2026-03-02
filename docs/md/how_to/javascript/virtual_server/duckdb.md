# DuckDB Virtual Server

Perspective provides a built-in virtual server for
[DuckDB](https://duckdb.org/), allowing `<perspective-viewer>` to query
DuckDB-WASM databases directly in the browser.

For server-side Python usage, see the
[Python DuckDB guide](../../python/virtual_server/duckdb.md).

## Installation

```bash
npm install @perspective-dev/client @perspective-dev/viewer @duckdb/duckdb-wasm
```

## Usage

Initialize DuckDB-WASM, load data, and connect it to a Perspective viewer:

```javascript
import perspective from "@perspective-dev/client";
import "@perspective-dev/viewer";
import * as duckdb from "@duckdb/duckdb-wasm";

// Initialize DuckDB-WASM
const DUCKDB_BUNDLES = duckdb.getJsDelivrBundles();
const bundle = await duckdb.selectBundle(DUCKDB_BUNDLES);
const worker = await duckdb.createWorker(bundle.mainWorker);
const logger = new duckdb.ConsoleLogger();
const db = new duckdb.AsyncDuckDB(logger, worker);
await db.instantiate(bundle.mainModule);

// Load data into DuckDB
const conn = await db.connect();
await conn.query(`CREATE TABLE my_table AS SELECT * FROM 'data.parquet'`);

// Create a Perspective virtual server backed by DuckDB
const handler = perspective.DuckDBHandler(db);
const messageHandler = perspective.createMessageHandler(handler);

// Connect a viewer
const client = await perspective.worker(messageHandler);
const table = await client.open_table("my_table");
document.getElementById("viewer").load(table);
```

## Examples

- [Browser DuckDB example](https://github.com/perspective-dev/perspective/tree/master/examples/esbuild-duckdb-virtual)
