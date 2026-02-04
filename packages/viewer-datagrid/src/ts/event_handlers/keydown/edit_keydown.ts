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

import { focusSelectedCell } from "../../style_handlers/focus.js";
import type {
    RegularTable,
    DatagridModel,
    PerspectiveViewerElement,
    SelectedPosition,
} from "../../types.js";

type SelectedPositionMap = Map<RegularTable, SelectedPosition>;

type AsyncFunction<T extends unknown[], R> = (
    this: DatagridModel,
    ...args: T
) => Promise<R>;

function lock<T extends unknown[], R>(
    body: AsyncFunction<T, R>,
): AsyncFunction<T, R | undefined> {
    let lockPromise: Promise<void> | undefined;
    return async function (
        this: DatagridModel,
        ...args: T
    ): Promise<R | undefined> {
        if (lockPromise) {
            await lockPromise;
            return;
        }

        let resolve: () => void;
        lockPromise = new Promise((x) => (resolve = x));
        const result = await body.apply(this, args);
        lockPromise = undefined;
        resolve!();
        return result;
    };
}

interface ContentEditableElement extends HTMLElement {
    isContentEditable: boolean;
    selectionStart?: number;
}

function getPos(this: ContentEditableElement): number {
    if (this.isContentEditable) {
        const _range = (this.getRootNode() as Document)
            .getSelection()
            ?.getRangeAt(0);
        if (!_range) return 0;
        const range = _range.cloneRange();
        range.selectNodeContents(this);
        range.setEnd(_range.endContainer, _range.endOffset);
        return range.toString().length;
    } else {
        return this.selectionStart || 0;
    }
}

const moveSelection = lock(async function (
    this: DatagridModel,
    table: RegularTable,
    selected_position_map: SelectedPositionMap,
    active_cell: HTMLElement,
    dx: number,
    dy: number,
): Promise<void> {
    const meta = table.getMeta(active_cell);
    if (!meta || meta.type !== "body") return;
    const num_columns = this._column_paths.length;
    const num_rows = this._num_rows;
    const selected_position = selected_position_map.get(table);
    if (!selected_position) {
        return;
    }

    if (meta.x + dx < num_columns && 0 <= meta.x + dx) {
        selected_position.x = meta.x + dx;
    }

    if (meta.y + dy < num_rows && 0 <= meta.y + dy) {
        selected_position.y = meta.y + dy;
    }

    const xmin = Math.max(meta.x0 - 10, 0);
    const xmax = Math.min(meta.x0 + 10, num_columns);
    const ymin = Math.max(meta.y0 - 5, 0);
    const ymax = Math.min(meta.y0 + 10, num_rows);
    let x = meta.x0 + dx,
        y = meta.y0 + dy;
    while (
        !focusSelectedCell(table, selected_position_map) &&
        x >= xmin &&
        x < xmax &&
        y >= ymin &&
        y < ymax
    ) {
        await table.scrollToCell(x, y);
        selected_position_map.set(table, selected_position);
        x += dx;
        y += dy;
    }
});

function isLastCell(
    model: DatagridModel,
    table: RegularTable,
    target: HTMLElement,
): boolean {
    const meta = table.getMeta(target);
    return meta?.type === "body" && meta.y === model._num_rows - 1;
}

export function keydownListener(
    this: DatagridModel,
    table: RegularTable,
    _viewer: PerspectiveViewerElement,
    selected_position_map: SelectedPositionMap,
    event: KeyboardEvent,
): void {
    const target = (table.getRootNode() as Document)
        .activeElement as HTMLElement;
    (event.target as HTMLElement).classList.remove("psp-error");
    switch (event.key) {
        case "Enter":
            event.preventDefault();
            if (isLastCell(this, table, target)) {
                target.blur();
                selected_position_map.delete(table);
            } else if (event.shiftKey) {
                moveSelection.call(
                    this,
                    table,
                    selected_position_map,
                    target,
                    0,
                    -1,
                );
            } else {
                moveSelection.call(
                    this,
                    table,
                    selected_position_map,
                    target,
                    0,
                    1,
                );
            }
            break;
        case "ArrowLeft":
            if (getPos.call(target as ContentEditableElement) === 0) {
                event.preventDefault();
                moveSelection.call(
                    this,
                    table,
                    selected_position_map,
                    target,
                    -1,
                    0,
                );
            }
            break;
        case "ArrowUp":
            event.preventDefault();
            moveSelection.call(
                this,
                table,
                selected_position_map,
                target,
                0,
                -1,
            );
            break;
        case "ArrowRight":
            if (
                getPos.call(target as ContentEditableElement) ===
                (target.textContent?.length || 0)
            ) {
                event.preventDefault();
                moveSelection.call(
                    this,
                    table,
                    selected_position_map,
                    target,
                    1,
                    0,
                );
            }
            break;
        case "ArrowDown":
            event.preventDefault();
            moveSelection.call(
                this,
                table,
                selected_position_map,
                target,
                0,
                1,
            );
            break;
        default:
    }
}
