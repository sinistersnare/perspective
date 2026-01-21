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

import { RegularTableElement } from "regular-table";

import type {
    DatagridModel,
    PerspectiveViewerElement,
    ColumnsConfig,
    DatagridPluginElement,
} from "../types.js";

import { cell_style_numeric } from "./table_cell/numeric.js";
import { cell_style_string } from "./table_cell/string.js";
import { cell_style_datetime } from "./table_cell/datetime.js";
import { cell_style_boolean } from "./table_cell/boolean.js";
import { cell_style_row_header } from "./table_cell/row_header.js";
import {
    CollectedCell,
    LocalSelectedPositionMap,
    LocalSelectedRowsMap,
    CellMetaExtended,
} from "./types.js";
import { ColumnType } from "@perspective-dev/client";

function get_psp_type(
    model: DatagridModel,
    metadata: CellMetaExtended,
): ColumnType {
    if (metadata.x !== undefined && metadata.x >= 0) {
        return model._column_types[metadata.x];
    } else {
        return model._row_header_types[(metadata.row_header_x ?? 0) - 1];
    }
}

/**
 * Apply styles to all body cells in a single pass.
 */
export function applyBodyCellStyles(
    this: DatagridModel,
    cells: CollectedCell[],
    plugins: ColumnsConfig,
    isSettingsOpen: boolean,
    isSelectable: boolean,
    isEditable: boolean,
    regularTable: RegularTableElement,
    selectedRowsMap: LocalSelectedRowsMap,
    selectedPositionMap: LocalSelectedPositionMap,
    viewer: PerspectiveViewerElement,
): void {
    const hasSelected = selectedRowsMap.has(regularTable);
    const selected = selectedRowsMap.get(regularTable);

    for (const { element: td, metadata, isHeader } of cells) {
        const column_name =
            metadata.column_header?.[this._config.split_by.length];
        const type = get_psp_type(this, metadata);
        const plugin = column_name
            ? plugins[column_name.toString()]
            : undefined;
        const is_numeric = type === "integer" || type === "float";

        // Calculate aggregate depth visibility
        metadata._is_hidden_by_aggregate_depth = ((x?: number) =>
            x === 0 || x === undefined
                ? false
                : x - 1 <
                  Math.min(
                      this._config.group_by.length,
                      plugin?.aggregate_depth || 0,
                  ))(
            (metadata.row_header as unknown[] | undefined)?.filter(
                (x) => x !== undefined,
            )?.length,
        );

        // Apply type-specific cell styling
        if (is_numeric) {
            cell_style_numeric.call(
                this,
                plugin as any,
                td,
                metadata as any,
                isSettingsOpen,
            );
        } else if (type === "boolean") {
            cell_style_boolean.call(this, plugin, td, metadata as any);
        } else if (type === "string") {
            cell_style_string.call(this, plugin as any, td, metadata as any);
        } else if (type === "date" || type === "datetime") {
            cell_style_datetime.call(this, plugin as any, td, metadata as any);
        } else {
            td.style.backgroundColor = "";
            td.style.color = "";
        }

        // Apply common cell classes
        td.classList.toggle(
            "psp-bool-type",
            type === "boolean" && metadata.user !== null,
        );
        td.classList.toggle("psp-null", metadata.value === null);
        td.classList.toggle("psp-align-right", !isHeader && is_numeric);
        td.classList.toggle("psp-align-left", isHeader || !is_numeric);
        if (this._column_settings_selected_column) {
            td.classList.toggle(
                "psp-menu-open",
                column_name === this._column_settings_selected_column,
            );
        }

        td.classList.toggle(
            "psp-color-mode-bar",
            plugin?.number_fg_mode === "bar" && is_numeric,
        );

        // Apply row header styling
        if (isHeader) {
            cell_style_row_header.call(this, regularTable, td, metadata as any);
        }

        // Set data attributes
        const tr = td.parentElement as HTMLElement;
        if (tr) {
            tr.dataset.y = String(metadata.y);
        }

        if (
            metadata.row_header_x === undefined ||
            metadata.row_header_x ===
                (metadata.row_header as unknown[]).length - 1 ||
            (metadata.row_header as unknown[])[metadata.row_header_x + 1] ===
                undefined
        ) {
            td.dataset.y = String(metadata.y);
            td.dataset.x = String(metadata.x);
        } else {
            delete td.dataset.y;
            delete td.dataset.x;
        }

        // Apply selection styling (if selectable)
        if (isSelectable) {
            if (!hasSelected) {
                td.classList.toggle("psp-row-selected", false);
                td.classList.toggle("psp-row-subselected", false);
            } else {
                const id = this._ids[(metadata.y ?? 0) - (metadata.y0 ?? 0)];
                const key_match = (selected as unknown[]).reduce<boolean>(
                    (agg, x, i) => agg && x === id[i],
                    true,
                );

                const selectedArr = selected as unknown[];
                if (isHeader) {
                    if (
                        metadata.row_header_x !== undefined &&
                        !!id[metadata.row_header_x]
                    ) {
                        td.classList.toggle("psp-row-selected", false);
                        td.classList.toggle("psp-row-subselected", false);
                    } else {
                        td.classList.toggle(
                            "psp-row-selected",
                            id.length === selectedArr.length && key_match,
                        );
                        td.classList.toggle(
                            "psp-row-subselected",
                            id.length !== selectedArr.length && key_match,
                        );
                    }
                } else {
                    td.classList.toggle(
                        "psp-row-selected",
                        id.length === selectedArr.length && key_match,
                    );
                    td.classList.toggle(
                        "psp-row-subselected",
                        id.length !== selectedArr.length && key_match,
                    );
                }
            }
        }

        // Apply editable styling (if editable)
        if (!isHeader && metadata.x !== undefined) {
            if (isEditable && this._is_editable[metadata.x]) {
                const col_name =
                    metadata.column_header?.[this._config.split_by.length];
                const col_name_str = col_name?.toString();
                if (
                    col_name_str &&
                    type === "string" &&
                    plugins[col_name_str]?.format === "link"
                ) {
                    td.toggleAttribute("contenteditable", false);
                    td.classList.toggle("boolean-editable", false);
                } else if (type === "boolean") {
                    td.toggleAttribute("contenteditable", false);
                    td.classList.toggle(
                        "boolean-editable",
                        (metadata as { user?: unknown }).user !== null,
                    );
                } else {
                    if (isEditable !== td.hasAttribute("contenteditable")) {
                        td.toggleAttribute("contenteditable", isEditable);
                    }
                    td.classList.toggle("boolean-editable", false);
                }
            } else {
                td.toggleAttribute("contenteditable", false);
                td.classList.toggle("boolean-editable", false);
            }
        }
    }
}
