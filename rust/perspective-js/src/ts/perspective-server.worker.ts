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

import load_perspective from "../../dist/pkg/web/perspective-server.js";
import { load_wasm_stage_0 } from "./decompress";
import { Srvr, EmscriptenApi } from "./engine.js";

class PspModule {
    modulePromise;
    resolve;
    reject;
    timeoutId;

    constructor(timeout = 30000) {
        // default timeout of 30 seconds
        this.modulePromise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });

        this.timeoutId = setTimeout(() => {
            this.reject(new Error("Module loading timed out"));
        }, timeout);
    }

    get module() {
        return this.modulePromise;
    }

    loaded(module) {
        clearTimeout(this.timeoutId);
        this.resolve(module);
    }

    error(err) {
        clearTimeout(this.timeoutId);
        this.reject(err);
    }
}

let psp = new PspModule();
let protoServer: Srvr;
let is_polling = false;

const CLIENT_ID = 69; // lol

self.addEventListener("message", async (msg) => {
    const id = msg.data.id;
    if (msg.data.cmd === "init") {
        await init(new Uint8Array(msg.data.args[0]));
        let mod: EmscriptenApi = await psp.module;
        protoServer = new Srvr(mod, CLIENT_ID);
        self.postMessage({ id });
    } else {
        await psp.module;
        let responses = protoServer.handle_message(new Uint8Array(msg.data));
        for (const resp of responses) {
            const f = resp.data.buffer;
            self.postMessage(f, { transfer: [f] });
        }

        // if (!is_polling) {
        //     is_polling = true;
        //     setTimeout(() => {
        //         protoServer.poll((_client_id, resp) => {
        //             const f = resp.slice().buffer;
        //             self.postMessage(f, { transfer: [f] });
        //         });

        //         is_polling = false;
        //     });
        // }
    }
});

type PerspectiveModule = {};

/**
 * Boilerplate to boot WASM from emscripten.
 *
 * @param {Uint8Array} wasmBinary WASM Blob
 */
async function init(wasmBinary) {
    wasmBinary = await load_wasm_stage_0(wasmBinary);
    const perspective = await (
        load_perspective as (o: unknown) => Promise<PerspectiveModule>
    )({
        wasmBinary,
        locateFile(x) {
            return x;
        },
    });

    psp.loaded(perspective);
}

export default async () => {};
