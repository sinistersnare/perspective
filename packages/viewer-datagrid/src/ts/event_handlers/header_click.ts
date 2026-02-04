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

import { sortHandler } from "./sort.js";
import { expandCollapseHandler } from "./expand_collapse.js";
import type {
    RegularTable,
    DatagridModel,
    PerspectiveViewerElement,
} from "../types.js";

export async function mousedown_listener(
    this: DatagridModel,
    regularTable: RegularTable,
    viewer: PerspectiveViewerElement,
    event: MouseEvent,
): Promise<void> {
    if (event.which !== 1) {
        return;
    }

    let target = event.target as HTMLElement | null;
    if (target?.tagName === "A") {
        return;
    }

    while (target && target.tagName !== "TD" && target.tagName !== "TH") {
        target = target.parentElement;
        if (!target || !regularTable.contains(target)) {
            return;
        }
    }

    if (!target) return;

    if (target.classList.contains("psp-tree-label")) {
        expandCollapseHandler.call(this, regularTable, event);
        return;
    }

    if (target.classList.contains("psp-menu-enabled")) {
        const meta = regularTable.getMeta(target);
        const column_name = meta?.column_header?.[this._config.split_by.length];
        await viewer.toggleColumnSettings(`${column_name}`);
    } else if (target.classList.contains("psp-sort-enabled")) {
        sortHandler.call(this, regularTable, viewer, event, target);
    }
}

export function click_listener(
    regularTable: RegularTable,
    event: MouseEvent,
): void {
    if (event.which !== 1) {
        return;
    }

    let target = event.target as HTMLElement | null;
    while (target && target.tagName !== "TD" && target.tagName !== "TH") {
        target = target.parentElement;
        if (!target || !regularTable.contains(target)) {
            return;
        }
    }

    if (!target) return;

    if (target.classList.contains("psp-tree-label") && event.offsetX < 26) {
        event.stopImmediatePropagation();
    } else if (
        target.classList.contains("psp-header-leaf") &&
        !target.classList.contains("psp-header-corner")
    ) {
        event.stopImmediatePropagation();
    }
}
