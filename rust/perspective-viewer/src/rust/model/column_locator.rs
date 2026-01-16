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

use perspective_client::config::ColumnType;

use super::HasSession;
use crate::model::{HasPresentation, HasRenderer, PluginColumnStyles};
use crate::presentation::ColumnLocator;

pub trait ColumnLocatorExt: HasSession {
    fn locator_name_or_default(&self, locator: &ColumnLocator) -> String {
        match locator {
            ColumnLocator::Table(s) | ColumnLocator::Expression(s) => s.clone(),
            ColumnLocator::NewExpression => self.session().metadata().make_new_column_name(None),
        }
    }

    fn is_locator_active(&self, locator: &ColumnLocator) -> bool {
        locator
            .name()
            .map(|name| self.session().is_column_active(name))
            .unwrap_or_default()
    }

    fn locator_view_type(&self, locator: &ColumnLocator) -> Option<ColumnType> {
        let name = locator.name().cloned().unwrap_or_default();
        self.session()
            .metadata()
            .get_column_view_type(name.as_str())
    }

    /// This function will return a [`ColumnLocator`] for agiven column name, or
    /// [`None`] if no such column already exists. If you want to
    /// create a new expression column, use ColumnLocator::Expr(None)
    fn get_column_locator(&self, name: Option<String>) -> Option<ColumnLocator> {
        name.and_then(|name| {
            if self.session().metadata().is_column_expression(&name) {
                Some(ColumnLocator::Expression(name))
            } else {
                self.session().metadata().get_table_columns().and_then(|x| {
                    x.iter()
                        .find_map(|n| (n == &name).then_some(ColumnLocator::Table(name.clone())))
                })
            }
        })
    }
}

impl<T: HasSession> ColumnLocatorExt for T {}

pub trait ColumnLocatorCurrentExt:
    HasPresentation + HasRenderer + HasSession + PluginColumnStyles
{
    /// Gets a [`ColumnLocator`] for the current UI's column settings state,
    /// or [`None`] if it is not currently active.
    fn get_current_column_locator(&self) -> Option<ColumnLocator> {
        self.presentation()
            .get_open_column_settings()
            .locator
            .filter(|locator| match locator {
                ColumnLocator::Table(name) => {
                    self.session().is_locator_active(locator)
                        && self.can_render_column_styles(name).unwrap_or_default()
                },
                _ => true,
            })
    }
}

impl<T: HasPresentation + HasRenderer + HasSession + PluginColumnStyles> ColumnLocatorCurrentExt
    for T
{
}
