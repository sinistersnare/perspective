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
    RegularTable,
    DatagridModel,
    PerspectiveViewerElement,
} from "../../types.js";

export function write_cell(
    table: RegularTable,
    model: DatagridModel,
    active_cell: HTMLElement,
): boolean {
    const meta = table.getMeta(active_cell);
    if (!meta) {
        return false;
    }
    const type = model._schema[model._column_paths[meta.x]];
    let text: string | number | boolean | null = active_cell.textContent || "";
    const id = model._ids[meta.y - meta.y0][0];
    if (type === "float" || type === "integer") {
        const parsed = parseFloat(text.replace(/,/g, ""));
        if (isNaN(parsed)) {
            return false;
        }
        text = parsed;
    } else if (type === "date" || type === "datetime") {
        const parsed = Date.parse(text);
        if (isNaN(parsed)) {
            return false;
        }
        text = parsed;
    } else if (type === "boolean") {
        text = text === "true" ? false : text === "false" ? true : null;
    }

    const msg = {
        __INDEX__: id,
        [model._column_paths[meta.x]]: text,
    };

    model._table.update([msg], { port_id: model._edit_port, format: null });
    return true;
}

export function clickListener(
    this: DatagridModel,
    table: RegularTable,
    _viewer: PerspectiveViewerElement,
    event: MouseEvent,
): void {
    const meta = table.getMeta(event.target as Element);
    if (typeof meta?.x !== "undefined") {
        const is_editable2 = this._is_editable[meta.x];
        const is_bool = this.get_psp_type(meta) === "boolean";
        const is_null = (event.target as Element).classList.contains(
            "psp-null",
        );
        if (is_editable2 && is_bool && !is_null) {
            write_cell(table, this, event.target as HTMLElement);
        }
    }
}
