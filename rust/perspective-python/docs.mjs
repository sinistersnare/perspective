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

import * as fs from "fs";
import "zx/globals";

const FILES = [
    "perspective/__init__.py",
    "perspective/handlers/aiohttp.py",
    "perspective/handlers/starlette.py",
    "perspective/handlers/tornado.py",
    "perspective/widget/__init__.py",
    "perspective/virtual_servers/clickhouse.py",
    "perspective/virtual_servers/duckdb.py",
];

await $`pdoc ${FILES.join(" ")} -o ../../docs/static/python`;

let content = fs.readFileSync("../../docs/static/python/perspective.html");
const reg = /\[<code>([a-zA-Z0-9:_]+)<\/code>\]/g;

content = content.toString().replaceAll(reg, function (_, arg) {
    if (arg.includes("::")) {
        const r = arg.replace("::", ".");
        return `<a href="#${r}"><code>${r}</code></a>`;
    } else {
        return (
            `<a href="https://docs.rs/perspective-python/latest/perspective_python/struct.` +
            arg +
            `.html"><code>` +
            arg +
            "</code></a>"
        );
    }
});

const reg2 = /\[<code>([<>\/="# a-zA-Z0-9:_]+)<\/code>\]/g;

content = content.toString().replaceAll(reg2, function (_, arg) {
    return arg;
});

fs.writeFileSync("../../docs/static/python/index.html", content);
