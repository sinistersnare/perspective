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

import type { HTMLPerspectiveWorkspaceElement } from "./perspective-workspace";
import type * as React from "react";

type ReactPerspectiveWorkspaceAttributes<T> = React.HTMLAttributes<T>;

type JsxPerspectiveWorkspaceElement = {
    class?: string;
} & React.DetailedHTMLProps<
    ReactPerspectiveWorkspaceAttributes<HTMLPerspectiveWorkspaceElement>,
    HTMLPerspectiveWorkspaceElement
>;

// React <19

declare global {
    namespace JSX {
        interface IntrinsicElements {
            "perspective-workspace": JsxPerspectiveWorkspaceElement;
        }
    }
}

// React >=19

// @ts-ignore
declare module "react/jsx-runtime" {
    namespace JSX {
        interface IntrinsicElements {
            "perspective-workspace": JsxPerspectiveWorkspaceElement;
        }
    }
}

// @ts-ignore
declare module "react/jsx-dev-runtime" {
    namespace JSX {
        interface IntrinsicElements {
            "perspective-workspace": JsxPerspectiveWorkspaceElement;
        }
    }
}

declare module "react" {
    namespace JSX {
        interface IntrinsicElements {
            "perspective-workspace": JsxPerspectiveWorkspaceElement;
        }
    }
}

// Custom Elements extensions

declare global {
    interface Document {
        createElement(
            tagName: "perspective-workspace",
            options?: ElementCreationOptions,
        ): HTMLPerspectiveWorkspaceElement;
        querySelector<E extends Element = Element>(selectors: string): E | null;
        querySelector(
            selectors: "perspective-workspace",
        ): HTMLPerspectiveWorkspaceElement | null;
    }

    interface CustomElementRegistry {
        get(
            tagName: "perspective-workspace",
        ): HTMLPerspectiveWorkspaceElement & typeof HTMLElement;
    }
}
