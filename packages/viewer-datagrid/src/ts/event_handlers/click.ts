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

import * as edit_click from "./click/edit_click.js";
import * as edit_keydown from "./keydown/edit_keydown.js";
import type {
    DatagridModel,
    PerspectiveViewerElement,
    SelectedPosition,
} from "../types.js";
import { RegularTableElement } from "regular-table";
import { HTMLPerspectiveViewerDatagridPluginElement } from "../custom_elements/datagrid.js";

type SelectedPositionMap = Map<RegularTableElement, SelectedPosition>;

export function is_editable(
    this: DatagridModel,
    viewer: PerspectiveViewerElement,
    allowed: boolean = false,
): boolean {
    const has_pivots =
        this._config.group_by.length === 0 &&
        this._config.split_by.length === 0;
    const selectable = viewer.hasAttribute("selectable");
    const plugin = viewer.children[0] as
        | HTMLPerspectiveViewerDatagridPluginElement
        | undefined;
    const editable = allowed || !!(plugin?._edit_mode === "EDIT");
    return has_pivots && !selectable && editable;
}

export function keydownListener(
    this: DatagridModel,
    table: RegularTableElement,
    viewer: PerspectiveViewerElement,
    selected_position_map: SelectedPositionMap,
    event: KeyboardEvent,
): void {
    if (this._edit_mode === "EDIT") {
        if (!is_editable.call(this, viewer)) {
            return;
        }

        edit_keydown.keydownListener.call(
            this,
            table,
            viewer,
            selected_position_map,
            event,
        );
    } else {
        console.debug(
            `Mode ${this._edit_mode} for "keydown" event not yet implemented`,
        );
    }
}

export function clickListener(
    this: DatagridModel,
    table: RegularTableElement,
    viewer: PerspectiveViewerElement,
    event: MouseEvent,
): void {
    if (this._edit_mode === "EDIT") {
        if (!is_editable.call(this, viewer)) {
            return;
        }

        edit_click.clickListener.call(this, table, viewer, event);
    } else if (this._edit_mode === "READ_ONLY") {
        // No-op for read-only mode
    } else if (this._edit_mode === "SELECT_COLUMN") {
        // Not yet implemented
    } else if (this._edit_mode === "SELECT_ROW") {
        // Not yet implemented
    } else if (this._edit_mode === "SELECT_REGION") {
        // Not yet implemented
    } else {
        console.debug(
            `Mode ${this._edit_mode} for "click" event not yet implemented`,
        );
    }
}
