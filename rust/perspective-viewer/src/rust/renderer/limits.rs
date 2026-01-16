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

use perspective_js::utils::ApiError;

use crate::js::plugin::*;

pub async fn get_row_and_col_limits(
    view: &perspective_client::View,
    plugin_metadata: &ViewConfigRequirements,
) -> Result<(usize, usize, Option<usize>, Option<usize>), ApiError> {
    let dimensions = view.dimensions().await?;
    let num_cols = dimensions.num_view_columns as usize;
    let num_rows = dimensions.num_view_rows as usize;
    match (plugin_metadata.max_columns, plugin_metadata.render_warning) {
        (Some(_), false) => Ok((num_cols, num_rows, None, None)),
        (max_columns, _) => {
            let schema = view.schema().await?;
            let keys = schema.keys();
            let num_schema_columns = std::cmp::max(1, keys.len() as usize);
            let max_cols = max_columns.and_then(|max_columns| {
                let column_group_diff = max_columns % num_schema_columns;
                let column_limit = max_columns + column_group_diff;
                if column_limit < num_cols {
                    Some(column_limit)
                } else {
                    None
                }
            });

            let max_rows = plugin_metadata.max_cells.map(|max_cells| {
                match max_cols {
                    Some(max_cols) => max_cells as f64 / max_cols as f64,
                    None => max_cells as f64 / num_cols as f64,
                }
                .ceil() as usize
            });

            Ok((num_cols, num_rows, max_cols, max_rows))
        },
    }
}
