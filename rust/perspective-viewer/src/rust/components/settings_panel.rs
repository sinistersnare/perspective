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

use std::rc::Rc;

use yew::prelude::*;

use super::column_selector::ColumnSelector;
use super::plugin_selector::PluginSelector;
use crate::PerspectiveProperties;
use crate::components::containers::sidebar_close_button::SidebarCloseButton;
use crate::dragdrop::*;
use crate::model::*;
use crate::presentation::{ColumnLocator, Presentation};
use crate::renderer::*;
use crate::session::*;
use crate::utils::*;

#[derive(Clone, Properties, PerspectiveProperties!)]
pub struct SettingsPanelProps {
    pub on_close: Callback<()>,
    pub on_resize: Rc<PubSub<()>>,
    pub on_select_column: Callback<ColumnLocator>,
    pub on_debug: Callback<()>,
    pub is_debug: bool,

    /// State
    pub dragdrop: DragDrop,
    pub session: Session,
    pub renderer: Renderer,
    pub presentation: Presentation,
}

impl PartialEq for SettingsPanelProps {
    fn eq(&self, _rhs: &Self) -> bool {
        false
    }
}

#[function_component]
pub fn SettingsPanel(props: &SettingsPanelProps) -> Html {
    let SettingsPanelProps {
        dragdrop,
        presentation,
        renderer,
        session,
        ..
    } = &props;
    let selected_column = props.get_current_column_locator();
    html! {
        <div id="settings_panel" class="sidebar_column noselect split-panel orient-vertical">
            if selected_column.is_none() {
                <SidebarCloseButton
                    id="settings_close_button"
                    on_close_sidebar={&props.on_close.clone()}
                />
            }
            <SidebarCloseButton
                id={if props.is_debug {"debug_close_button"} else {"debug_open_button"}}
                on_close_sidebar={&props.on_debug}
            />
            <PluginSelector {presentation} {renderer} {session} />
            <ColumnSelector
                on_resize={&props.on_resize}
                on_open_expr_panel={&props.on_select_column}
                selected_column={selected_column.clone()}
                {dragdrop}
                {renderer}
                {session}
            />
        </div>
    }
}
