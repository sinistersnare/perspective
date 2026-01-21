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
import { CellMetadata } from "regular-table/dist/esm/types.js";
import { ColumnType } from "@perspective-dev/client";
import { PRIVATE_PLUGIN_SYMBOL } from "../model/index.js";
import type {
    DatagridModel,
    PerspectiveViewerElement,
    ColumnsConfig,
    DatagridPluginElement,
    SelectedPosition,
} from "../types.js";

import { cell_style_numeric } from "./table_cell/numeric.js";
import { cell_style_string } from "./table_cell/string.js";
import { cell_style_datetime } from "./table_cell/datetime.js";
import { cell_style_boolean } from "./table_cell/boolean.js";
import { cell_style_row_header } from "./table_cell/row_header.js";
import { applyFocusStyle } from "./focus.js";
import { styleColumnHeaderRow } from "./column_header.js";
import { applyColumnHeaderStyles } from "./editable.js";
import { applyGroupHeaderStyles } from "./group_header.js";
import { applyBodyCellStyles } from "./body.js";

interface CellMetaExtended extends CellMetadata {
    _is_hidden_by_aggregate_depth?: boolean;
}

interface CollectedCell {
    element: HTMLElement;
    metadata: CellMetaExtended;
    isHeader: boolean;
}

interface CollectedHeaderRow {
    row: HTMLTableRowElement;
    cells: Array<{
        element: HTMLTableCellElement;
        metadata: CellMetadata | undefined;
    }>;
}

/**
 * Context object passed through consolidated styling
 */
export interface StyleContext {
    model: DatagridModel;
    regularTable: RegularTableElement;
    viewer: PerspectiveViewerElement;
    datagrid: DatagridPluginElement;
    plugins: ColumnsConfig;
    isSettingsOpen: boolean;
    isSelectable: boolean;
    isEditable: boolean;
    selectedRowsMap: Map<RegularTableElement, unknown[]>;
    selectedPositionMap: Map<RegularTableElement, SelectedPosition>;
}

// Local types for selection maps - match the actual runtime usage
// (activate.ts uses `as any` casts when passing these)
type LocalSelectedRowsMap = WeakMap<RegularTableElement, unknown[]>;
type LocalSelectedPositionMap = WeakMap<RegularTableElement, SelectedPosition>;

function isEditableMode(
    model: DatagridModel,
    viewer: PerspectiveViewerElement,
    allowed: boolean = false,
): boolean {
    const has_pivots =
        model._config.group_by.length === 0 &&
        model._config.split_by.length === 0;
    const selectable = viewer.hasAttribute("selectable");
    const plugin = viewer.children[0] as
        | (DatagridPluginElement & { dataset: DOMStringMap })
        | undefined;
    const editable = allowed || plugin?.dataset?.editMode === "EDIT";
    return has_pivots && !selectable && editable;
}

/**
 * Consolidated style listener that handles all cell styling in a single pass.
 * This eliminates redundant DOM traversals and reduces layout thrashing by:
 * 1. Collecting all cell metadata in a read phase
 * 2. Applying all styles in a write phase
 */
export function createConsolidatedStyleListener(
    datagrid: DatagridPluginElement,
    selectedRowsMap: LocalSelectedRowsMap,
    selectedPositionMap: LocalSelectedPositionMap,
): (
    this: DatagridModel,
    regularTable: RegularTableElement,
    viewer: PerspectiveViewerElement,
) => void {
    return function consolidatedStyleListener(
        this: DatagridModel,
        regularTable: RegularTableElement,
        viewer: PerspectiveViewerElement,
    ): void {
        const plugins: ColumnsConfig =
            (regularTable as any)[PRIVATE_PLUGIN_SYMBOL] || {};
        const isSettingsOpen = viewer.hasAttribute("settings");
        const isSelectable = viewer.hasAttribute("selectable");
        const isEditable = isEditableMode(this, viewer);
        const isEditableAllowed = isEditableMode(this, viewer, true);

        // Toggle edit mode class on datagrid
        datagrid.classList.toggle("edit-mode-allowed", isEditableAllowed);

        // ========== PHASE 1: Collect all metadata (READ PHASE) ==========
        const bodyCells: CollectedCell[] = [];
        const headerCells: CollectedCell[] = [];
        const groupHeaderRows: CollectedHeaderRow[] = [];

        // Collect body cells (tbody)
        const tbody = regularTable.children[0]?.children[1];
        if (tbody) {
            for (const tr of tbody.children) {
                for (const cell of tr.children) {
                    const metadata = regularTable.getMeta(cell) as
                        | CellMetaExtended
                        | undefined;
                    if (metadata) {
                        const isHeader = cell.tagName === "TH";
                        bodyCells.push({
                            element: cell as HTMLElement,
                            metadata,
                            isHeader,
                        });
                    }
                }
            }
        }

        // Collect header rows (thead)
        const thead = regularTable.children[0]?.children[0];
        if (thead) {
            for (const tr of thead.children) {
                const rowData: CollectedHeaderRow = {
                    row: tr as HTMLTableRowElement,
                    cells: [],
                };
                for (const cell of tr.children) {
                    const metadata = regularTable.getMeta(cell) as
                        | CellMetadata
                        | undefined;
                    rowData.cells.push({
                        element: cell as HTMLTableCellElement,
                        metadata,
                    });
                }
                groupHeaderRows.push(rowData);
            }
        }

        // ========== PHASE 2: Apply all styles (WRITE PHASE) ==========

        // 2a. Style body cells
        this._applyBodyCellStyles(
            bodyCells,
            plugins,
            isSettingsOpen,
            isSelectable,
            isEditable,
            regularTable,
            selectedRowsMap,
            selectedPositionMap,
            viewer,
        );

        // 2b. Style group headers
        this._applyGroupHeaderStyles(groupHeaderRows, regularTable);

        // 2c. Style column headers
        this._applyColumnHeaderStyles(groupHeaderRows, regularTable, viewer);

        // 2d. Apply focus
        this._applyFocusStyle(bodyCells, regularTable, selectedPositionMap);
    };
}

// Extend DatagridModel prototype with styling methods
declare module "../types.js" {
    interface DatagridModel {
        _applyBodyCellStyles(
            cells: CollectedCell[],
            plugins: ColumnsConfig,
            isSettingsOpen: boolean,
            isSelectable: boolean,
            isEditable: boolean,
            regularTable: RegularTableElement,
            selectedRowsMap: LocalSelectedRowsMap,
            selectedPositionMap: LocalSelectedPositionMap,
            viewer: PerspectiveViewerElement,
        ): void;
        _applyGroupHeaderStyles(
            headerRows: CollectedHeaderRow[],
            regularTable: RegularTableElement,
        ): void;
        _applyColumnHeaderStyles(
            headerRows: CollectedHeaderRow[],
            regularTable: RegularTableElement,
            viewer: PerspectiveViewerElement,
        ): void;
        _applyFocusStyle(
            cells: CollectedCell[],
            regularTable: RegularTableElement,
            selectedPositionMap: LocalSelectedPositionMap,
        ): void;
        _styleColumnHeaderRow(
            headerRow: CollectedHeaderRow,
            regularTable: RegularTableElement,
            is_menu_row: boolean,
        ): void;
    }
}

/**
 * Install the styling methods on the DatagridModel prototype.
 * This should be called once during module initialization.
 */
export function installConsolidatedStyleMethods(modelPrototype: any): void {
    modelPrototype._applyBodyCellStyles = applyBodyCellStyles;
    modelPrototype._applyGroupHeaderStyles = applyGroupHeaderStyles;
    modelPrototype._applyColumnHeaderStyles = applyColumnHeaderStyles;
    modelPrototype._applyFocusStyle = applyFocusStyle;
    modelPrototype._styleColumnHeaderRow = styleColumnHeaderRow;
}
