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

import datetime
from typing import List, Union, Tuple, Optional
# General Transit Feed Specification
from nyct_gtfs import NYCTFeed, Trip

import asyncio
import threading
import time
import itertools

from aiohttp import web

import perspective
from perspective import Table, PerspectiveManager, PerspectiveAIOHTTPHandler

# CSV of all stops (may become stale!!!)
# https://github.com/Andrew-Dickinson/nyct-gtfs/blob/b36a33d512ad376e0913ee492ec4ca30e6a424bb/nyct_gtfs/gtfs_static/stops.txt
# Reproduced for this example at stops.csv

FEED_URLS = {
    "jz": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-jz",
    "ace": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace",
    "g": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-g",
    "nqrw": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-nqrw",
    "1234567": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs",
    "bdfm": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm",
    "l": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-l",
    "sir": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-si"
}

def get_stops():
    import csv
    stops = {}
    with open('stops.csv', 'r') as f:
        reader=csv.DictReader(f)
        for row in reader:
            stops[row['stop_id']] = row
    return stops

def get_stop_info(stops, stop_id: Optional[str]) -> Union[Tuple[float, float, str], Tuple[None, None, None]]:
    if stop_id and stop_id in stops and stops[stop_id]:
        return (stops[stop_id]['stop_lat'], stops[stop_id]['stop_lon'], stops[stop_id]['stop_name'])
    else:
        return (None, None, None)

def get_feed(stops, feed_url: str):
    raw: NYCTFeed = NYCTFeed(feed_url, api_key="X")
    trips: List[Trip] = raw.trips
    feed = []
    for train in trips:
        lat, lon, name = get_stop_info(stops, train.location)
        feed.append({
            "trip_id": train.trip_id,
            "line": train.route_id,
            "lat": float(lat) if lat else None,
            "lon": float(lon) if lon else None,
            "direction": train.direction,
            "last_update": train.last_position_update,
            "underway": train.underway,
            "current_stop": name,
        })
    return feed

def update_loop(t: perspective.Table):
    stops = get_stops()
    for line, feed_url in itertools.cycle(FEED_URLS.items()):
        print("Updating line '" + line + "'.")
        feed = get_feed(stops, feed_url)
        t.update(feed)
        time.sleep(7)


def perspective_thread(manager, table):
    """Perspective application thread starts its own event loop, and
    adds the table with the name "data_source_one", which will be used
    in the front-end."""
    psp_loop = asyncio.new_event_loop()
    manager.set_loop_callback(psp_loop.call_soon_threadsafe)
    manager.host_table("mta_feeds", table)
    psp_loop.run_forever()

def make_app(t):
    manager = PerspectiveManager()

    thread = threading.Thread(target=perspective_thread, args=(manager,t))
    thread.daemon = True
    thread.start()
    update_thread = threading.Thread(target=update_loop, args=(t,))
    update_thread.daemon = True
    update_thread.start()

    async def websocket_handler(request):
        handler = PerspectiveAIOHTTPHandler(manager=manager, request=request)
        await handler.run()

    app = web.Application()
    app.router.add_get("/websocket", websocket_handler)
    return app


if __name__ == "__main__":
    stops = get_stops()
    t = Table({
            "trip_id": str,
            "line": str,
            "lat": float,
            "lon": float,
            "direction": str,
            "last_update": datetime.datetime,
            "underway": bool,
            "current_stop": str,
    }, index="trip_id")
    app = make_app(t)
    # logging.critical("Listening on http://localhost:8080")
    web.run_app(app, host="0.0.0.0", port=8080)