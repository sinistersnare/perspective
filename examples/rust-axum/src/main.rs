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

use std::fs::{self, File};
use std::io::Read;
use std::net::SocketAddr;

use axum::extract::connect_info::ConnectInfo;
use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::extract::State;
use axum::response::IntoResponse;
use axum::routing::get;
use axum::Router;
use perspective::client::{TableData, TableInitOptions};
use perspective::server::PerspectiveServer;
use tower_http::trace::TraceLayer;

fn init_tracing() {
    use tracing_subscriber::filter::LevelFilter;
    use tracing_subscriber::fmt::layer;
    use tracing_subscriber::prelude::*;
    use tracing_subscriber::registry;
    registry()
        .with(layer().pretty().with_filter(LevelFilter::INFO))
        .init();
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    init_tracing();
    let server = PerspectiveServer::new();
    let client = perspective::create_local_client(&server).await?;

    const FILENAME: &str = "../../node_modules/superstore-arrow/superstore.lz4.arrow";
    let mut f = File::open(FILENAME).expect("no file found");
    let metadata = fs::metadata(FILENAME).expect("unable to read metadata");
    let mut feather = Vec::with_capacity(metadata.len() as usize);
    f.read_to_end(&mut feather).expect("buffer overflow");

    let _table = client
        .table(TableData::Arrow(feather), TableInitOptions {
            name: Some("superstore".to_owned()),
            ..TableInitOptions::default()
        })
        .await?;

    let app = Router::new()
        .route("/ws", get(websocket_handshake))
        .with_state(server)
        .layer(TraceLayer::new_for_http());

    let service = app.into_make_service_with_connect_info::<SocketAddr>();
    let listener = tokio::net::TcpListener::bind("127.0.0.1:3000").await?;
    tracing::info!("listening on {}", listener.local_addr()?);
    axum::serve(listener, service).await?;
    Ok(())
}

async fn websocket_handshake(
    ws: WebSocketUpgrade,
    State(server): State<PerspectiveServer>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
) -> impl IntoResponse {
    tracing::info!("{addr} Connected.");
    ws.on_upgrade(move |socket| websocket_session(server, socket, addr))
}

async fn websocket_session(server: PerspectiveServer, mut socket: WebSocket, addr: SocketAddr) {
    while let Some(msg) = socket.recv().await {
        if let Ok(Message::Binary(x)) = msg {
            for (_client_id, resp) in server.handle_message(0, &x) {
                if let Err(e) = socket.send(Message::Binary(resp)).await {
                    tracing::error!("{addr} unexpected error {e:?}");
                    return;
                }
            }

            for (_client_id, resp) in server.poll() {
                if let Err(e) = socket.send(Message::Binary(resp)).await {
                    tracing::error!("{addr} unexpected error {e:?}");
                    return;
                }
            }
        } else {
            tracing::error!("{addr} Unexpected msg {msg:?}");
            tracing::debug!("{addr} Unexpected msg {msg:?}");
        }
    }

    tracing::info!("{addr} disconnected");
}
