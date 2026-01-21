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

import { style_selected_column } from "../style_handlers/column_header.js";
import {
    click_listener,
    mousedown_listener,
} from "../event_handlers/header_click.js";

import { focusinListener, focusoutListener } from "../event_handlers/focus.js";
import { keydownListener, clickListener } from "../event_handlers/click.js";

import { selectionListener } from "../event_handlers/row_select_click.js";
import { deselect_all_listener } from "../event_handlers/deselect_all.js";

import { createModel } from "../model/create.js";
import { dispatch_click_listener } from "../event_handlers/dispatch_click.js";

import { addAreaMouseSelection } from "../event_handlers/select_region.js";

import {
    createConsolidatedStyleListener,
    installConsolidatedStyleMethods,
} from "../style_handlers/consolidated.js";

import type { View } from "@perspective-dev/client";
import type {
    DatagridPluginElement,
    PerspectiveViewerElement,
    SelectedPosition,
} from "../types.js";
import type { RegularTableElement } from "regular-table";

interface ToggleColumnSettingsEvent extends CustomEvent {
    detail: {
        column_name: string | null;
        open: boolean;
    };
}

/**
 * Lazy initialize this plugin with various listeners.
 */
export async function activate(
    this: DatagridPluginElement,
    view: View,
): Promise<void> {
    const viewer = this.parentElement as PerspectiveViewerElement;
    const table = await viewer.getTable();

    if (!this._initialized) {
        this.innerHTML = "";
        if (this.shadowRoot) {
            this.shadowRoot.appendChild(this.regular_table);
        } else {
            this.appendChild(this.regular_table);
        }

        this.model = await createModel.call(
            this,
            this.regular_table,
            table,
            view,
        );

        if (!this.model) {
            return;
        }

        addAreaMouseSelection(this, this.regular_table, {
            className: "psp-select-region",
        });

        // Create shared state maps for selection and focus tracking
        const selected_rows_map = new WeakMap<
            RegularTableElement,
            Set<number>
        >();
        const selected_position_map = new WeakMap<
            RegularTableElement,
            SelectedPosition
        >();

        // Install consolidated style methods on model prototype
        installConsolidatedStyleMethods(this.model);

        // Single consolidated style listener replaces:
        // - table_cell_style_listener
        // - group_header_style_listener
        // - column_header_style_listener
        // - selectionStyleListener
        // - editable_style_listener
        // - focus_style_listener
        this.regular_table.addStyleListener(
            createConsolidatedStyleListener(
                this,
                selected_rows_map as any,
                selected_position_map as any,
            ).bind(this.model, this.regular_table, viewer),
        );

        // uh ..
        this.regular_table.addEventListener(
            "click",
            click_listener.bind(
                this.model,
                this.regular_table,
            ) as EventListener,
        );

        this.regular_table.addEventListener(
            "mousedown",
            selectionListener.bind(
                this.model,
                this.regular_table,
                viewer,
                selected_rows_map as any,
            ) as unknown as EventListener,
        );

        this.regular_table.addEventListener(
            "psp-deselect-all",
            deselect_all_listener.bind(
                this.model,
                this.regular_table,
                viewer,
                selected_rows_map as any,
            ) as unknown as EventListener,
        );

        // User event click
        this.regular_table.addEventListener(
            "click",
            dispatch_click_listener.bind(
                this.model,
                this.regular_table,
                viewer,
            ) as unknown as EventListener,
        );

        // tree collapse, expand, edit button headers
        this.regular_table.addEventListener(
            "mousedown",
            mousedown_listener.bind(
                this.model,
                this.regular_table,
                viewer,
            ) as unknown as EventListener,
        );

        // Editing event handlers (style handling is now in consolidated listener)
        // TODO relies on this.model._is_editable
        this.regular_table.addEventListener(
            "click",
            clickListener.bind(
                this.model,
                this.regular_table,
                viewer,
            ) as EventListener,
        );

        this.regular_table.addEventListener(
            "focusin",
            focusinListener.bind(
                this.model,
                this.regular_table,
                viewer,
                selected_position_map as any,
            ) as EventListener,
        );

        this.regular_table.addEventListener(
            "focusout",
            focusoutListener.bind(
                this.model,
                this.regular_table,
                viewer,
                selected_position_map as any,
            ) as EventListener,
        );

        this.regular_table.addEventListener(
            "keydown",
            keydownListener.bind(
                this.model,
                this.regular_table,
                viewer,
                selected_position_map as any,
            ) as EventListener,
        );

        // viewer event listeners
        viewer.addEventListener(
            "perspective-toggle-column-settings",
            (event: Event) => {
                const toggleEvent = event as ToggleColumnSettingsEvent;
                if (this.isConnected) {
                    style_selected_column.call(
                        this.model!,
                        this.regular_table,
                        viewer,
                        toggleEvent.detail.column_name ?? undefined,
                    );
                    if (!toggleEvent.detail.open) {
                        this.model!._column_settings_selected_column =
                            undefined;
                        return;
                    }

                    this.model!._column_settings_selected_column =
                        toggleEvent.detail.column_name ?? undefined;
                }
            },
        );

        this._initialized = true;
    } else {
        await createModel.call(
            this,
            this.regular_table,
            table,
            view,
            this.model,
        );
    }
}
