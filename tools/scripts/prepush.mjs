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

import "zx/globals";

function lint_git(sha) {
    if (!sha || typeof sha !== "string") {
        throw new Error(`invalid sha: ${sha}`);
    }
    const result = $.sync`git log -1 ${sha} | grep -F "Signed-off-by: "`;
    if (result.exitCode !== 0) {
        console.error(
            "`git log -1 " +
                sha +
                "` is missing a Signed-off-by: and DCO check will surely fail.",
        );
        console.error("To sign off, run:\ngit commit --amend --edit --sign");
        process.exit(1);
    }
}

async function readPrePushInput() {
    // Git supplies information about the push to the hook on stdin.
    // https://git-scm.com/docs/githooks#_pre_push
    const chunks = [];

    if (process.stdin.isTTY) {
        // Makes developing the pre-push script more convenient.  In particular
        // when you run `pnpm run prepush` from a shell terminal you don't have
        // to send EOF on stdin.
        return [];
    }
    for await (const chunk of process.stdin) {
        chunks.push(chunk);
    }

    const input = Buffer.concat(chunks).toString();
    const lines = input.split("\n").filter((l) => l.length > 0);
    return lines.map((line) => {
        const parts = line.trim().split(" ");

        return {
            local_ref: parts[0],
            local_object_name: parts[1],
            remote_ref: parts[2],
            remote_object_name: parts[3],
        };
    });
}

if (import.meta.main) {
    // Does not actually run all pre-push hook checks (it does not run the repo
    // lint script).  These are lints which run only in pre-push.  The
    // `prepush` script defined in package.json is responsible for running the
    // repo lint script.
    const pushes = await readPrePushInput();
    for (const push of pushes) {
        const { local_object_name } = push;
        lint_git(local_object_name);
    }
}
