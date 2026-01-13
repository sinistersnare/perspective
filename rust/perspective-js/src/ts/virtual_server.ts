// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ ██████ ██████ ██████       █      █      █      █      █ █▄  ▀███ █       ┃
// ┃ ▄▄▄▄▄█ █▄▄▄▄▄ ▄▄▄▄▄█  ▀▀▀▀▀█▀▀▀▀▀ █ ▀▀▀▀▀█ ████████▌▐███ ███▄  ▀█ █ ▀▀▀▀▀ ┃
// ┃ █▀▀▀▀▀ █▀▀▀▀▀ █▀██▀▀ ▄▄▄▄▄ █ ▄▄▄▄▄█ ▄▄▄▄▄█ ████████▌▐███ █████▄   █ ▄▄▄▄▄ ┃
// ┃ █      ██████ █  ▀█▄       █ ██████      █      ███▌▐███ ███████▄ █       ┃
// ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
// ┃ Copyright (c) 2017, the Perspective Authors.                              ┃
// ┃ ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ ┃
// ┃ This file is part of the Perspective library, distributed under the terms ┃
// ┃ of the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0). ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

/**
 * VirtualServer API for implementing custom data sources in JavaScript/WASM.
 *
 * The VirtualServer pattern allows you to create custom data sources that
 * integrate with Perspective's protocol. This is useful for:
 * - Connecting to external databases (DuckDB, PostgreSQL, etc.)
 * - Streaming data from APIs or message queues
 * - Implementing custom aggregation or transformation logic
 * - Creating data adapters without copying data into Perspective tables
 *
 * @module virtual_server
 *
 * @example
 * ```typescript
 * import { VirtualServer, VirtualDataSlice } from "@perspective-dev/client";
 *
 * const handler = {
 *   getHostedTables: () => ["my_table"],
 *   tableSchema: (id: string) => ({ id: "integer", name: "string" }),
 *   tableSize: (id: string) => 100,
 *   tableMakeView: (tableId: string, viewId: string, config: any) => {},
 *   tableColumnsSize: (tableId: string, config: any) => 2,
 *   viewSchema: (viewId: string, config?: any) => ({ id: "integer", name: "string" }),
 *   viewSize: (viewId: string) => 100,
 *   viewDelete: (viewId: string) => {},
 *   viewGetData: (viewId: string, config: any, viewport: any, dataSlice: VirtualDataSlice) => {
 *     // Fill dataSlice with data
 *     dataSlice.setIntegerCol("id", 0, 1, null);
 *     dataSlice.setStringCol("name", 0, "Alice", null);
 *   }
 * };
 *
 * const server = new VirtualServer(handler);
 * const response = server.handleRequest(requestBytes);
 * ```
 */

export type ColumnType =
    | "integer"
    | "float"
    | "string"
    | "boolean"
    | "date"
    | "datetime";

export interface HostedTable {
    name: string;
    index?: string | null;
    limit?: number | null;
}

export interface ViewPort {
    start_row?: number;
    end_row?: number;
    start_col?: number;
    end_col?: number;
}

export interface ViewConfig {
    columns?: string[];
    aggregates?: Record<string, string>;
    group_by?: string[];
    split_by?: string[];
    sort?: Array<[string, string]>;
    filter?: any[];
    expressions?: Record<string, string>;
}

export interface ServerFeatures {
    expressions?: boolean;
}

/**
 * Handler interface that you implement to provide custom data sources.
 *
 * All methods will be called by the VirtualServer when handling protocol
 * messages from Perspective clients. Methods can return values directly or
 * return Promises for asynchronous operations (e.g., database queries).
 *
 * @example
 * ```typescript
 * // Synchronous handler
 * const syncHandler: VirtualServerHandler = {
 *   getHostedTables: () => ["my_table"],
 *   tableSchema: (id) => ({ id: "integer", name: "string" }),
 *   tableSize: (id) => 100,
 *   // ... implement other required methods
 * };
 *
 * // Asynchronous handler (e.g., DuckDB WASM)
 * const asyncHandler: VirtualServerHandler = {
 *   getHostedTables: async () => ["my_table"],
 *   tableSchema: async (id) => {
 *     const result = await db.query(`DESCRIBE ${id}`);
 *     return { id: "integer", name: "string" };
 *   },
 *   tableSize: async (id) => {
 *     const result = await db.query(`SELECT COUNT(*) FROM ${id}`);
 *     return result[0][0];
 *   },
 *   // ... implement other required methods
 * };
 * ```
 */
export interface VirtualServerHandler {
    getHostedTables(): (string | HostedTable)[] | Promise<(string | HostedTable)[]>;
    tableSchema(tableId: string): Record<string, ColumnType> | Promise<Record<string, ColumnType>>;
    tableSize(tableId: string): number | Promise<number>;
    tableMakeView(tableId: string, viewId: string, config: ViewConfig): void | Promise<void>;
    tableColumnsSize(tableId: string, config: ViewConfig): number | Promise<number>;
    viewSchema(viewId: string, config?: ViewConfig): Record<string, ColumnType> | Promise<Record<string, ColumnType>>;
    viewSize(viewId: string): number | Promise<number>;
    viewDelete(viewId: string): void | Promise<void>;
    viewGetData(
        viewId: string,
        config: ViewConfig,
        viewport: ViewPort,
        dataSlice: any, // Use 'any' here to avoid circular reference
    ): void | Promise<void>;
    tableValidateExpression?(tableId: string, expression: string): ColumnType | Promise<ColumnType>;
    getFeatures?(): ServerFeatures | Promise<ServerFeatures>;
    makeTable?(tableId: string, data: string | Uint8Array): void | Promise<void>;
}

/**
 * Re-export the WASM VirtualServer and VirtualDataSlice classes with better names.
 *
 * VirtualServer: Handles Perspective protocol messages using your custom handler
 * VirtualDataSlice: Used to fill data in viewGetData callbacks
 */
export {
    JsVirtualServer as VirtualServer,
    JsVirtualDataSlice as VirtualDataSlice,
} from "../../dist/wasm/perspective-js.js";
