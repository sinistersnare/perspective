#  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
#  ┃ ██████ ██████ ██████       █      █      █      █      █ █▄  ▀███ █       ┃
#  ┃ ▄▄▄▄▄█ █▄▄▄▄▄ ▄▄▄▄▄█  ▀▀▀▀▀█▀▀▀▀▀ █ ▀▀▀▀▀█ ████████▌▐███ ███▄  ▀█ █ ▀▀▀▀▀ ┃
#  ┃ █▀▀▀▀▀ █▀▀▀▀▀ █▀██▀▀ ▄▄▄▄▄ █ ▄▄▄▄▄█ ▄▄▄▄▄█ ████████▌▐███ █████▄   █ ▄▄▄▄▄ ┃
#  ┃ █      ██████ █  ▀█▄       █ ██████      █      ███▌▐███ ███████▄ █       ┃
#  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
#  ┃ Copyright (c) 2017, the Perspective Authors.                              ┃
#  ┃ ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ ┃
#  ┃ This file is part of the Perspective library, distributed under the terms ┃
#  ┃ of the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0). ┃
#  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

from pathlib import Path

import clickhouse_connect
import perspective
import perspective.handlers.tornado
import perspective.virtual_servers.clickhouse
import pyarrow.parquet as pq
import tornado.ioloop
import tornado.web

from loguru import logger
from tornado.web import StaticFileHandler


INPUT_FILE = (
    Path(__file__).parent.resolve()
    / "node_modules"
    / "superstore-arrow"
    / "superstore.parquet"
)


def arrow_type_to_clickhouse(arrow_type):
    t = str(arrow_type)
    if t.startswith("int") or t.startswith("uint"):
        return "Int64"

    if t in ("float", "double", "halffloat"):
        return "Float64"

    if t.startswith("timestamp"):
        return "DateTime"

    if t.startswith("date"):
        return "Date"

    return "String"


if __name__ == "__main__":
    client = clickhouse_connect.get_client(host="localhost")

    # Load superstore parquet data into ClickHouse
    arrow_table = pq.read_table(str(INPUT_FILE))
    client.command("DROP TABLE IF EXISTS data_source_one")
    cols = []
    for field in arrow_table.schema:
        ch_type = arrow_type_to_clickhouse(field.type)
        if field.nullable:
            ch_type = f"Nullable({ch_type})"

        cols.append(f"`{field.name}` {ch_type}")

    client.command(
        f"CREATE TABLE data_source_one ({', '.join(cols)})"
        " ENGINE = MergeTree() ORDER BY tuple()"
    )

    client.insert_arrow("data_source_one", arrow_table)
    logger.info("Loaded superstore data into ClickHouse")

    virtual_server = perspective.virtual_servers.clickhouse.ClickhouseVirtualServer(
        client
    )

    app = tornado.web.Application(
        [
            (
                r"/websocket",
                perspective.handlers.tornado.PerspectiveTornadoHandler,
                {"perspective_server": virtual_server},
            ),
            (r"/node_modules/(.*)", StaticFileHandler, {"path": "../../node_modules/"}),
            (
                r"/(.*)",
                StaticFileHandler,
                {"path": "./", "default_filename": "index.html"},
            ),
        ],
        websocket_max_message_size=100 * 1024 * 1024,
    )

    app.listen(3000)
    logger.info("Listening on http://localhost:3000")
    loop = tornado.ioloop.IOLoop.current()
    loop.start()
