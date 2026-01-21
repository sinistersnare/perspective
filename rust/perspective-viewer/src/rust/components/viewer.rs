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

use futures::channel::oneshot::*;
use perspective_js::utils::*;
use wasm_bindgen::prelude::*;
use yew::prelude::*;

use super::containers::split_panel::SplitPanel;
use super::font_loader::{FontLoader, FontLoaderProps, FontLoaderStatus};
use super::form::debug::DebugPanel;
use super::style::{LocalStyle, StyleProvider};
use crate::components::column_settings_sidebar::ColumnSettingsPanel;
use crate::components::main_panel::MainPanel;
use crate::components::settings_panel::SettingsPanel;
use crate::config::*;
use crate::custom_events::CustomEvents;
use crate::dragdrop::*;
use crate::model::*;
use crate::presentation::{ColumnLocator, ColumnSettingsTab, Presentation};
use crate::renderer::*;
use crate::session::*;
use crate::utils::*;
use crate::{PerspectiveProperties, css};

#[derive(Clone, Properties, PerspectiveProperties!)]
pub struct PerspectiveViewerProps {
    /// The light DOM element this component will render to.
    pub elem: web_sys::HtmlElement,

    /// State
    pub custom_events: CustomEvents,
    pub dragdrop: DragDrop,
    pub session: Session,
    pub renderer: Renderer,
    pub presentation: Presentation,
}

impl PartialEq for PerspectiveViewerProps {
    fn eq(&self, _rhs: &Self) -> bool {
        false
    }
}

impl PerspectiveViewerProps {
    fn is_title(&self) -> bool {
        self.session.get_title().is_some()
    }
}

#[derive(Debug)]
pub enum PerspectiveViewerMsg {
    ColumnSettingsPanelSizeUpdate(Option<i32>),
    ColumnSettingsTabChanged(ColumnSettingsTab),
    OpenColumnSettings {
        locator: Option<ColumnLocator>,
        sender: Option<Sender<()>>,
        toggle: bool,
    },
    PreloadFontsUpdate,
    Reset(bool, Option<Sender<()>>),
    Resize,
    SettingsPanelSizeUpdate(Option<i32>),
    ToggleDebug,
    ToggleSettingsComplete(SettingsUpdate, Sender<()>),
    ToggleSettingsInit(Option<SettingsUpdate>, Option<Sender<ApiResult<JsValue>>>),
}

use PerspectiveViewerMsg::*;

pub struct PerspectiveViewer {
    _subscriptions: [Subscription; 1],
    column_settings_panel_width_override: Option<i32>,
    debug_open: bool,
    fonts: FontLoaderProps,
    on_close_column_settings: Callback<()>,
    on_rendered: Option<Sender<()>>,
    on_resize: Rc<PubSub<()>>,
    settings_open: bool,
    settings_panel_width_override: Option<i32>,
}

impl Component for PerspectiveViewer {
    type Message = PerspectiveViewerMsg;
    type Properties = PerspectiveViewerProps;

    fn create(ctx: &Context<Self>) -> Self {
        let elem = ctx.props().elem.clone();
        let fonts = FontLoaderProps::new(&elem, ctx.link().callback(|()| PreloadFontsUpdate));

        let session_sub = {
            let props = ctx.props().clone();
            let callback = ctx.link().batch_callback(move |(update, _)| {
                if update {
                    vec![]
                } else {
                    let locator = props.get_current_column_locator();
                    vec![OpenColumnSettings {
                        locator,
                        sender: None,
                        toggle: false,
                    }]
                }
            });

            ctx.props()
                .renderer
                .render_limits_changed
                .add_listener(callback)
        };

        let on_close_column_settings = ctx.link().callback(|_| OpenColumnSettings {
            locator: None,
            sender: None,
            toggle: false,
        });

        Self {
            _subscriptions: [session_sub],
            column_settings_panel_width_override: None,
            debug_open: false,
            fonts,
            on_close_column_settings,
            on_rendered: None,
            on_resize: Default::default(),
            settings_open: false,
            settings_panel_width_override: None,
        }
    }

    fn update(&mut self, ctx: &Context<Self>, msg: Self::Message) -> bool {
        match msg {
            PreloadFontsUpdate => true,
            Resize => {
                self.on_resize.emit(());
                false
            },
            Reset(all, sender) => {
                ctx.props().presentation.set_open_column_settings(None);
                clone!(
                    ctx.props().renderer,
                    ctx.props().session,
                    ctx.props().presentation
                );

                ApiFuture::spawn(async move {
                    session
                        .reset(ResetOptions {
                            config: true,
                            expressions: all,
                            ..ResetOptions::default()
                        })
                        .await?;
                    let columns_config = if all {
                        presentation.reset_columns_configs();
                        None
                    } else {
                        Some(presentation.all_columns_configs())
                    };

                    renderer.reset(columns_config.as_ref()).await?;
                    presentation.reset_available_themes(None).await;
                    if all {
                        presentation.reset_theme().await?;
                    }

                    let result = renderer.draw(session.validate().await?.create_view()).await;
                    if let Some(sender) = sender {
                        sender.send(()).unwrap();
                    }

                    renderer.reset_changed.emit(());
                    result
                });

                false
            },
            ToggleSettingsInit(Some(SettingsUpdate::Missing), None) => false,
            ToggleSettingsInit(Some(SettingsUpdate::Missing), Some(resolve)) => {
                resolve.send(Ok(JsValue::UNDEFINED)).unwrap();
                false
            },
            ToggleSettingsInit(Some(SettingsUpdate::SetDefault), resolve) => {
                self.init_toggle_settings_task(ctx, Some(false), resolve);
                false
            },
            ToggleSettingsInit(Some(SettingsUpdate::Update(force)), resolve) => {
                self.init_toggle_settings_task(ctx, Some(force), resolve);
                false
            },
            ToggleSettingsInit(None, resolve) => {
                self.init_toggle_settings_task(ctx, None, resolve);
                false
            },
            ToggleSettingsComplete(SettingsUpdate::SetDefault, resolve) if self.settings_open => {
                ctx.props().presentation.set_open_column_settings(None);
                self.settings_open = false;
                self.on_rendered = Some(resolve);
                true
            },
            ToggleSettingsComplete(SettingsUpdate::Update(force), resolve)
                if force != self.settings_open =>
            {
                ctx.props().presentation.set_open_column_settings(None);
                self.settings_open = force;
                self.on_rendered = Some(resolve);
                true
            },
            ToggleSettingsComplete(_, resolve)
                if matches!(self.fonts.get_status(), FontLoaderStatus::Finished) =>
            {
                ctx.props().presentation.set_open_column_settings(None);
                if let Err(e) = resolve.send(()) {
                    tracing::error!("toggle settings failed {:?}", e);
                }

                false
            },
            ToggleSettingsComplete(_, resolve) => {
                ctx.props().presentation.set_open_column_settings(None);
                self.on_rendered = Some(resolve);
                true
            },
            OpenColumnSettings {
                locator,
                sender,
                toggle,
            } => {
                let mut open_column_settings = ctx.props().presentation.get_open_column_settings();
                if locator == open_column_settings.locator {
                    if toggle {
                        ctx.props().presentation.set_open_column_settings(None);
                    }
                } else {
                    open_column_settings.locator.clone_from(&locator);
                    open_column_settings.tab =
                        if matches!(locator, Some(ColumnLocator::NewExpression)) {
                            Some(ColumnSettingsTab::Attributes)
                        } else {
                            locator.as_ref().and_then(|x| {
                                x.name().map(|x| {
                                    if ctx.props().session.is_column_active(x) {
                                        ColumnSettingsTab::Style
                                    } else {
                                        ColumnSettingsTab::Attributes
                                    }
                                })
                            })
                        };

                    ctx.props()
                        .presentation
                        .set_open_column_settings(Some(open_column_settings));
                }

                if let Some(sender) = sender {
                    sender.send(()).unwrap();
                }

                true
            },
            SettingsPanelSizeUpdate(Some(x)) => {
                self.settings_panel_width_override = Some(x);
                false
            },
            SettingsPanelSizeUpdate(None) => {
                self.settings_panel_width_override = None;
                false
            },
            ColumnSettingsPanelSizeUpdate(Some(x)) => {
                self.column_settings_panel_width_override = Some(x);
                false
            },
            ColumnSettingsPanelSizeUpdate(None) => {
                self.column_settings_panel_width_override = None;
                false
            },
            ColumnSettingsTabChanged(tab) => {
                let mut open_column_settings = ctx.props().presentation.get_open_column_settings();
                open_column_settings.tab.clone_from(&Some(tab));
                ctx.props()
                    .presentation
                    .set_open_column_settings(Some(open_column_settings));
                true
            },
            ToggleDebug => {
                self.debug_open = !self.debug_open;
                clone!(ctx.props().renderer, ctx.props().session);
                ApiFuture::spawn(async move {
                    renderer.draw(session.validate().await?.create_view()).await
                });

                true
            },
        }
    }

    /// This top-level component is mounted to the Custom Element, so it has no
    /// API to provide props - but for sanity if needed, just return true on
    /// change.
    fn changed(&mut self, _ctx: &Context<Self>, _old: &Self::Properties) -> bool {
        true
    }

    /// On rendered call notify_resize().  This also triggers any registered
    /// async callbacks to the Custom Element API.
    fn rendered(&mut self, _ctx: &Context<Self>, _first_render: bool) {
        if self.on_rendered.is_some()
            && matches!(self.fonts.get_status(), FontLoaderStatus::Finished)
            && self.on_rendered.take().unwrap().send(()).is_err()
        {
            tracing::warn!("Orphan render");
        }
    }

    fn view(&self, ctx: &Context<Self>) -> Html {
        let Self::Properties {
            custom_events,
            dragdrop,
            presentation,
            renderer,
            session,
            ..
        } = ctx.props();

        let is_settings_open = self.settings_open && ctx.props().session.has_table();
        let mut class = classes!();
        if !is_settings_open {
            class.push("settings-closed");
        }

        if ctx.props().is_title() {
            class.push("titled");
        }

        let on_open_expr_panel = ctx.link().callback(|c| OpenColumnSettings {
            locator: Some(c),
            sender: None,
            toggle: true,
        });

        let on_split_panel_resize = ctx
            .link()
            .callback(|(x, _)| SettingsPanelSizeUpdate(Some(x)));

        let on_column_settings_panel_resize = ctx
            .link()
            .callback(|(x, _)| ColumnSettingsPanelSizeUpdate(Some(x)));

        let on_close_settings = ctx.link().callback(|()| ToggleSettingsInit(None, None));
        let on_debug = ctx.link().callback(|_| ToggleDebug);
        let selected_column = ctx.props().get_current_column_locator();
        let selected_tab = ctx.props().presentation.get_open_column_settings().tab;
        let settings_panel = html! {
            if is_settings_open {
                <SettingsPanel
                    on_close={on_close_settings}
                    on_resize={&self.on_resize}
                    on_select_column={on_open_expr_panel}
                    is_debug={self.debug_open}
                    {on_debug}
                    {dragdrop}
                    {presentation}
                    {renderer}
                    {session}
                />
            }
        };

        let on_settings = ctx.link().callback(|()| ToggleSettingsInit(None, None));
        let on_select_tab = ctx.link().callback(ColumnSettingsTabChanged);
        let column_settings_panel = html! {
            if let Some(selected_column) = selected_column {
                <SplitPanel
                    id="modal_panel"
                    reverse=true
                    initial_size={self.column_settings_panel_width_override}
                    on_reset={ctx.link().callback(|_| ColumnSettingsPanelSizeUpdate(None))}
                    on_resize={on_column_settings_panel_resize}
                >
                    <ColumnSettingsPanel
                        {selected_column}
                        {selected_tab}
                        on_close={self.on_close_column_settings.clone()}
                        width_override={self.column_settings_panel_width_override}
                        {on_select_tab}
                        {custom_events}
                        {presentation}
                        {renderer}
                        {session}
                    />
                    <></>
                </SplitPanel>
            }
        };

        let main_panel = html! {
            <MainPanel {on_settings} {custom_events} {presentation} {renderer} {session} />
        };

        let debug_panel = html! {
            if self.debug_open { <DebugPanel {presentation} {renderer} {session} /> }
        };

        html! {
            <StyleProvider root={ctx.props().elem.clone()}>
                <LocalStyle href={css!("viewer")} />
                <div id="component_container">
                    if is_settings_open {
                        <SplitPanel
                            id="app_panel"
                            reverse=true
                            skip_empty=true
                            initial_size={self.settings_panel_width_override}
                            on_reset={ctx.link().callback(|_| SettingsPanelSizeUpdate(None))}
                            on_resize={on_split_panel_resize.clone()}
                            on_resize_finished={ctx.props().render_callback()}
                        >
                            { debug_panel }
                            { settings_panel }
                            <div id="main_column_container">
                                { main_panel }
                                { column_settings_panel }
                            </div>
                        </SplitPanel>
                    } else {
                        <div id="main_column_container">
                            { main_panel }
                            { column_settings_panel }
                        </div>
                    }
                </div>
                <FontLoader ..self.fonts.clone() />
            </StyleProvider>
        }
    }

    fn destroy(&mut self, _ctx: &Context<Self>) {}
}

impl PerspectiveViewer {
    /// Toggle the settings, or force the settings panel either open (true) or
    /// closed (false) explicitly.  In order to reduce apparent
    /// screen-shear, `toggle_settings()` uses a somewhat complex render
    /// order:  it first resize the plugin's `<div>` without moving it,
    /// using `overflow: hidden` to hide the extra draw area;  then,
    /// after the _async_ drawing of the plugin is complete, it will send a
    /// message to complete the toggle action and re-render the element with
    /// the settings removed.
    ///
    /// # Arguments
    /// * `force` - Whether to explicitly set the settings panel state to
    ///   Open/Close (`Some(true)`/`Some(false)`), or to just toggle the current
    ///   state (`None`).
    fn init_toggle_settings_task(
        &mut self,
        ctx: &Context<Self>,
        force: Option<bool>,
        sender: Option<Sender<ApiResult<JsValue>>>,
    ) {
        let is_open = ctx.props().presentation.is_settings_open();
        match force {
            Some(force) if is_open == force => {
                if let Some(sender) = sender {
                    sender.send(Ok(JsValue::UNDEFINED)).unwrap();
                }
            },
            Some(_) | None => {
                ctx.props().presentation.set_settings_before_open(!is_open);
                let force = !is_open;
                let callback = ctx.link().callback(move |resolve| {
                    let update = SettingsUpdate::Update(force);
                    ToggleSettingsComplete(update, resolve)
                });

                clone!(
                    ctx.props().renderer,
                    ctx.props().session,
                    ctx.props().presentation
                );

                ApiFuture::spawn(async move {
                    let result = if session.js_get_table().is_some() {
                        renderer
                            .presize(force, {
                                let (sender, receiver) = channel::<()>();
                                callback.emit(sender);
                                async move { Ok(receiver.await?) }
                            })
                            .await
                    } else {
                        let (sender, receiver) = channel::<()>();
                        callback.emit(sender);
                        receiver.await?;
                        Ok(JsValue::UNDEFINED)
                    };

                    if let Some(sender) = sender {
                        let msg = result.ignore_view_delete();
                        sender
                            .send(msg.map(|x| x.unwrap_or(JsValue::UNDEFINED)))
                            .into_apierror()?;
                    };

                    presentation.set_settings_open(!is_open);
                    Ok(JsValue::undefined())
                });
            },
        };
    }
}
