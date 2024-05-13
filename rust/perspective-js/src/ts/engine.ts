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

interface RawServer {}

export interface EmscriptenApi {
    HEAP8: Int8Array;
    HEAPU8: Uint8Array;
    HEAP16: Int16Array;
    HEAPU16: Uint16Array;
    HEAP32: Int32Array;
    HEAPU32: Uint32Array;
    _js_alloc(size: number): number;
    _js_free(ptr: number): void;
    _js_new_server(): RawServer;
    _js_delete_server(server: RawServer): void;
    _js_handle_message(
        server: RawServer,
        client_id: number,
        buffer_ptr: number,
        buffer_len: number
    ): number;
    _js_poll(server: RawServer): number; // ????
}

export type ApiResponse = {
    client_id: number;
    data: Uint8Array;
};

export class Srvr {
    mod: EmscriptenApi;
    server: RawServer;
    client_id: number;
    constructor(raw: EmscriptenApi, client_id: number) {
        this.mod = raw;
        this.server = this.mod._js_new_server();
        this.client_id = client_id;
    }

    handle_message(view: Uint8Array): ApiResponse[] {
        const ptr = convert_typed_array_to_pointer(
            this.mod,
            view,
            (viewPtr) => {
                return this.mod._js_handle_message(
                    this.server,
                    this.client_id,
                    viewPtr,
                    view.byteLength
                );
            }
        );

        return decode_api_responses(this.mod, ptr);
    }

    poll(): ApiResponse[] {
        const polled = this.mod._js_poll(this.server);
        return decode_api_responses(this.mod, polled);
    }

    delete() {
        this.mod._js_delete_server(this.server);
    }
}

function convert_typed_array_to_pointer(
    core: EmscriptenApi,
    array: Uint8Array,
    callback: (_: number) => number
): number {
    const ptr = core._js_alloc(array.byteLength);
    const arr = new Uint8Array(core.HEAP8.buffer);
    arr.set(array, ptr);
    const msg = callback(ptr);
    core._js_free(ptr);
    return msg;
}

function convert_pointer_to_typed_array(
    core: EmscriptenApi,
    ptr: number
    // callback: (_: Uint8Array) => void
) {
    const len = core.HEAPU32[ptr / 4];
    const slice = core.HEAPU8.slice(ptr + 4, ptr + 4 + len);
    return slice;
}

function convert_pointer_to_u32_array(core: EmscriptenApi, ptr: number) {
    const loc = ptr / 4; // cause we are doing 32-bit indexing not byte indexing
    const len = core.HEAPU32[loc];
    return core.HEAPU32.slice(loc + 1, loc + 1 + len);
}

function decode_single_api_response(
    core: EmscriptenApi,
    ptr: number
): ApiResponse {
    // each response is a ptr to...
    // - data ptr -> [length, data]
    // - client_id
    const data_ptr = core.HEAPU32[ptr / 4];
    const client_id = core.HEAPU32[ptr / 4 + 1];
    const data = convert_pointer_to_typed_array(core, data_ptr);
    return {
        client_id,
        data,
    };
}

function decode_api_responses(core: EmscriptenApi, ptr: number): ApiResponse[] {
    // it is a Vec<ApiResponse>
    // so it is [length, Responses...]
    const responses = convert_pointer_to_u32_array(core, ptr);
    const ret: ApiResponse[] = [];
    for (const resp of responses) {
        ret.push(decode_single_api_response(core, resp));
    }
    return ret;
}
