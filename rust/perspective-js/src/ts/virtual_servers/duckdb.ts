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

import type {
    VirtualDataSlice,
    VirtualServerHandler,
} from "@perspective-dev/client";
import type { ColumnType } from "@perspective-dev/client/dist/esm/ts-rs/ColumnType.d.ts";
import type { ViewConfig } from "@perspective-dev/client/dist/esm/ts-rs/ViewConfig.d.ts";
import type { ViewWindow } from "@perspective-dev/client/dist/esm/ts-rs/ViewWindow.d.ts";
import type * as duckdb from "@duckdb/duckdb-wasm";

const NUMBER_AGGS = [
    "sum",
    "count",
    "any_value",
    "arbitrary",
    "array_agg",
    "avg",
    "bit_and",
    "bit_or",
    "bit_xor",
    "bitstring_agg",
    "bool_and",
    "bool_or",
    "countif",
    "favg",
    "fsum",
    "geomean",
    "kahan_sum",
    "last",
    "max",
    "min",
    "product",
    "string_agg",
    "sumkahan",
];

const STRING_AGGS = [
    "count",
    "any_value",
    "arbitrary",
    "first",
    "countif",
    "last",
    "string_agg",
];

const FILTER_OPS = [
    "==",
    "!=",
    "LIKE",
    "IS DISTINCT FROM",
    "IS NOT DISTINCT FROM",
    ">=",
    "<=",
    ">",
    "<",
];

function duckdbTypeToPsp(name: string): ColumnType {
    if (name === "VARCHAR") return "string";
    if (
        name === "DOUBLE" ||
        name === "BIGINT" ||
        name === "HUGEINT" ||
        name.startsWith("Decimal")
    )
        return "float";
    if (name.startsWith("Decimal")) return "float";
    if (name.startsWith("Int")) return "integer";
    if (name === "INTEGER") return "integer";
    if (name === "Utf8") return "string";
    if (name === "Date32<DAY>") return "date";
    if (name === "Float64") return "float";
    if (name === "DATE") return "date";
    if (name === "BOOLEAN") return "boolean";
    if (name === "TIMESTAMP" || name.startsWith("Timestamp")) return "datetime";
    throw new Error(`Unknown type '${name}'`);
}

function convertDecimalToNumber(value: any, dtypeString: string) {
    if (
        value === null ||
        value === undefined ||
        !(value instanceof Uint32Array || value instanceof Int32Array)
    ) {
        return value;
    }

    let bigIntValue = BigInt(0);
    for (let i = 0; i < value.length; i++) {
        bigIntValue |= BigInt(value[i]) << BigInt(i * 32);
    }

    const maxInt128 = BigInt(2) ** BigInt(127);
    if (bigIntValue >= maxInt128) {
        bigIntValue -= BigInt(2) ** BigInt(128);
    }

    const scaleMatch = dtypeString.match(/Decimal\[\d+e(\d+)\]/);
    const scale = scaleMatch ? parseInt(scaleMatch[1]) : 0;

    if (scale > 0) {
        return Number(bigIntValue) / Math.pow(10, scale);
    } else {
        return Number(bigIntValue);
    }
}

async function runQuery(
    db: duckdb.AsyncDuckDBConnection,
    query: string,
    options: { columns: true },
): Promise<{
    rows: any[];
    columns: string[];
    dtypes: string[];
}>;

async function runQuery(
    db: duckdb.AsyncDuckDBConnection,
    query: string,
    options?: { columns: boolean },
): Promise<any[]>;

async function runQuery(
    db: duckdb.AsyncDuckDBConnection,
    query: string,
    options: { columns?: boolean } = {},
) {
    query = query.replace(/\s+/g, " ").trim();
    // console.log("Query:", query);
    try {
        const result = await db.query(query);
        if (options.columns) {
            return {
                rows: result.toArray(),
                columns: result.schema.fields.map((f) => f.name),
                dtypes: result.schema.fields.map((f) => f.type.toString()),
            };
        }

        return result.toArray();
    } catch (error) {
        console.error("Query error:", error);
        console.error("Query:", query);
        throw error;
    }
}

export class DuckDBHandler implements VirtualServerHandler {
    private db: duckdb.AsyncDuckDBConnection;

    constructor(db: duckdb.AsyncDuckDBConnection) {
        this.db = db;
    }

    getFeatures() {
        return {
            group_by: true,
            split_by: true,
            sort: true,
            expressions: true,
            filter_ops: {
                integer: FILTER_OPS,
                float: FILTER_OPS,
                string: FILTER_OPS,
                boolean: FILTER_OPS,
                date: FILTER_OPS,
                datetime: FILTER_OPS,
            },
            aggregates: {
                integer: NUMBER_AGGS,
                float: NUMBER_AGGS,
                string: STRING_AGGS,
                boolean: STRING_AGGS,
                date: STRING_AGGS,
                datetime: STRING_AGGS,
            },
        };
    }

    async getHostedTables() {
        const results = await runQuery(this.db, "SHOW ALL TABLES");
        return results.map((row) => row.toJSON().name);
    }

    async tableSchema(tableId: string) {
        const query = `DESCRIBE ${tableId}`;
        const results = await runQuery(this.db, query);
        const schema = {} as Record<string, ColumnType>;
        for (const result of results) {
            const res = result.toJSON();
            const colName = res.column_name;
            if (!colName.startsWith("__") || !colName.endsWith("__")) {
                const cleanName = colName.split("_").slice(-1)[0] as string;
                schema[cleanName] = duckdbTypeToPsp(res.column_type);
            }
        }

        return schema;
    }

    async viewColumnSize(viewId: string, config: ViewConfig) {
        const query = `SELECT COUNT(*) FROM (DESCRIBE ${viewId})`;
        const results = await runQuery(this.db, query);
        const gs = config.group_by?.length || 0;
        const count = Number(Object.values(results[0].toJSON())[0]);
        return (
            count -
            (gs === 0 ? 0 : gs + (config.split_by?.length === 0 ? 1 : 0))
        );
    }

    async tableSize(tableId: string) {
        const query = `SELECT COUNT(*) FROM ${tableId}`;
        const results = await runQuery(this.db, query);
        return Number(results[0].toJSON()["count_star()"]);
    }

    // async viewSchema(viewId: string, config: ViewConfig) {
    //     return this.tableSchema(viewId);
    // }

    // async viewSize(viewId: string) {
    //     return this.tableSize(viewId);
    // }

    async tableMakeView(tableId: string, viewId: string, config: ViewConfig) {
        const columns = config.columns || [];
        const group_by = config.group_by || [];
        const split_by = config.split_by || [];
        const aggregates = config.aggregates || {};
        const sort = config.sort || [];
        const expressions = config.expressions || {};
        const filter = config.filter || [];

        const colName = (col: string) => {
            const expr = expressions[col];
            return expr || `"${col}"`;
        };

        const getAggregate = (col: string) => aggregates[col] || null;

        const generateSelectClauses = () => {
            const clauses = [];
            if (group_by.length > 0) {
                for (const col of columns) {
                    if (col !== null) {
                        // TODO texodus
                        const agg = getAggregate(col) || "any_value";
                        clauses.push(`${agg}(${colName(col)}) as "${col}"`);
                    }
                }

                if (split_by.length === 0) {
                    for (let idx = 0; idx < group_by.length; idx++) {
                        clauses.push(
                            `${colName(group_by[idx])} as __ROW_PATH_${idx}__`,
                        );
                    }

                    const groups = group_by.map(colName).join(", ");
                    clauses.push(`GROUPING_ID(${groups}) AS __GROUPING_ID__`);
                }
            } else if (columns.length > 0) {
                for (const col of columns) {
                    if (col !== null) {
                        // TODO texodus
                        clauses.push(
                            `${colName(col)} as "${col.replace(/"/g, '""')}"`,
                        );
                    }
                }
            }

            return clauses;
        };

        const orderByClauses = [];
        const windowClauses = [];
        const whereClauses = [];

        if (group_by.length > 0) {
            for (let gidx = 0; gidx < group_by.length; gidx++) {
                const groups = group_by
                    .slice(0, gidx + 1)
                    .map(colName)
                    .join(", ");
                if (split_by.length === 0) {
                    orderByClauses.push(`GROUPING_ID(${groups}) DESC`);
                }

                for (const [sort_col, sort_dir] of sort) {
                    if (sort_dir !== "none") {
                        const agg = getAggregate(sort_col) || "any_value";
                        if (gidx >= group_by.length - 1) {
                            orderByClauses.push(
                                `${agg}(${colName(sort_col)}) ${sort_dir}`,
                            );
                        } else {
                            orderByClauses.push(
                                `first(${agg}(${colName(sort_col)})) OVER __WINDOW_${gidx}__ ${sort_dir}`,
                            );
                        }
                    }
                }

                orderByClauses.push(`__ROW_PATH_${gidx}__ ASC`);
            }
        } else {
            for (const [sort_col, sort_dir] of sort) {
                if (sort_dir) {
                    orderByClauses.push(`${colName(sort_col)} ${sort_dir}`);
                }
            }
        }

        if (sort.length > 0 && group_by.length > 1) {
            for (let gidx = 0; gidx < group_by.length - 1; gidx++) {
                const partition = Array.from(
                    { length: gidx + 1 },
                    (_, i) => `__ROW_PATH_${i}__`,
                ).join(", ");
                const sub_groups = group_by
                    .slice(0, gidx + 1)
                    .map(colName)
                    .join(", ");
                const groups = group_by.map(colName).join(", ");
                windowClauses.push(
                    `__WINDOW_${gidx}__ AS (PARTITION BY GROUPING_ID(${sub_groups}), ${partition} ORDER BY ${groups})`,
                );
            }
        }

        for (const [name, op, value] of filter) {
            if (value !== null && value !== undefined) {
                const term_lit =
                    typeof value === "string" ? `'${value}'` : String(value);
                whereClauses.push(`${colName(name)} ${op} ${term_lit}`);
            }
        }

        let query;
        if (split_by.length > 0) {
            query = `SELECT * FROM ${tableId}`;
        } else {
            const selectClauses = generateSelectClauses();
            query = `SELECT ${selectClauses.join(", ")} FROM ${tableId}`;
        }

        if (whereClauses.length > 0) {
            query = `${query} WHERE ${whereClauses.join(" AND ")}`;
        }

        if (split_by.length > 0) {
            const groups = group_by.map(colName).join(", ");
            const group_aliases = group_by
                .map((x, i) => `${colName(x)} AS __ROW_PATH_${i}__`)
                .join(", ");
            const pivotOn = split_by.map((c) => `"${c}"`).join(", ");
            const pivotUsing = generateSelectClauses().join(", ");

            query = `
                SELECT * EXCLUDE (${groups}), ${group_aliases} FROM (
                    PIVOT (${query})
                    ON ${pivotOn}
                    USING ${pivotUsing}
                    GROUP BY ${groups}
                )
            `;
        } else if (group_by.length > 0) {
            const groups = group_by.map(colName).join(", ");
            query = `${query} GROUP BY ROLLUP(${groups})`;
        }

        if (windowClauses.length > 0) {
            query = `${query} WINDOW ${windowClauses.join(", ")}`;
        }

        if (orderByClauses.length > 0) {
            query = `${query} ORDER BY ${orderByClauses.join(", ")}`;
        }

        query = `CREATE TABLE ${viewId} AS (${query})`;
        await runQuery(this.db, query);
    }

    async tableValidateExpression(tableId: string, expression: string) {
        const query = `DESCRIBE (select ${expression} from ${tableId})`;
        const results = await runQuery(this.db, query);
        return duckdbTypeToPsp(results[0].toJSON()["column_type"]);
    }

    async viewDelete(viewId: string) {
        const query = `DROP TABLE IF EXISTS ${viewId}`;
        await runQuery(this.db, query);
    }

    async viewGetData(
        viewId: string,
        config: ViewConfig,
        viewport: ViewWindow,
        dataSlice: VirtualDataSlice,
    ) {
        const group_by = config.group_by || [];
        const split_by = config.split_by || [];
        const start_col = viewport.start_col;
        const end_col = viewport.end_col;
        const start_row = viewport.start_row || 0;
        const end_row = viewport.end_row;

        let limit = "";
        if (end_row !== null && end_row !== undefined) {
            limit = `LIMIT ${end_row - start_row} OFFSET ${start_row}`;
        }

        const schemaQuery = `DESCRIBE ${viewId}`;
        const schemaResults = await runQuery(this.db, schemaQuery);
        const columnTypes = new Map();
        for (const result of schemaResults) {
            const res = result.toJSON();
            columnTypes.set(res.column_name, res.column_type);
        }

        const dataColumns = Array.from(columnTypes.entries())
            .filter(([colName]) => !colName.startsWith("__"))
            .slice(start_col, end_col);

        const groupByColsList = [];
        if (group_by.length > 0) {
            if (split_by.length === 0) {
                groupByColsList.push("__GROUPING_ID__");
            }
            for (let idx = 0; idx < group_by.length; idx++) {
                groupByColsList.push(`__ROW_PATH_${idx}__`);
            }
        }

        const allColumns = [
            ...groupByColsList.map((col) => `"${col}"`),
            ...dataColumns.map(([colName]) => `"${colName}"`),
        ];

        const query = `
            SELECT ${allColumns.join(", ")}
            FROM ${viewId} ${limit}
        `;

        const { rows, columns, dtypes } = await runQuery(this.db, query, {
            columns: true,
        });

        for (let cidx = 0; cidx < columns.length; cidx++) {
            const col = columns[cidx];

            if (cidx === 0 && group_by.length > 0 && split_by.length === 0) {
                continue;
            }

            let group_by_index = null;
            let max_grouping_id = null;
            const row_path_match = col.match(/__ROW_PATH_(\d+)__/);
            if (row_path_match) {
                group_by_index = parseInt(row_path_match[1]);
                max_grouping_id = 2 ** (group_by.length - group_by_index) - 1;
            }

            const dtype = duckdbTypeToPsp(dtypes[cidx]);
            const isDecimal = dtypes[cidx].startsWith("Decimal");
            const colName =
                group_by_index !== null
                    ? "__ROW_PATH__"
                    : col.replace(/_/g, "|");

            for (let ridx = 0; ridx < rows.length; ridx++) {
                const row = rows[ridx];
                const rowArray = row.toArray();
                const shouldSet =
                    split_by.length > 0 ||
                    max_grouping_id === null ||
                    rowArray[0] < max_grouping_id;

                if (shouldSet) {
                    let value = rowArray[cidx];

                    if (isDecimal) {
                        value = convertDecimalToNumber(value, dtypes[cidx]);
                    }

                    if (typeof value === "bigint") {
                        value = Number(value);
                    }

                    dataSlice.setCol(
                        dtype,
                        colName,
                        ridx,
                        value,
                        group_by_index,
                    );
                }
            }
        }
    }
}
