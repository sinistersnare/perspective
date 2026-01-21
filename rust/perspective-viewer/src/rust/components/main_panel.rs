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

use futures::channel::oneshot::*;
use perspective_js::utils::*;
use wasm_bindgen::prelude::*;
use yew::prelude::*;

use super::render_warning::RenderWarning;
use super::status_bar::StatusBar;
use crate::PerspectiveProperties;
use crate::custom_events::CustomEvents;
use crate::presentation::Presentation;
use crate::renderer::*;
use crate::session::*;
use crate::utils::*;

#[derive(Clone, Properties, PerspectiveProperties!)]
pub struct MainPanelProps {
    pub on_settings: Callback<()>,

    /// State
    pub custom_events: CustomEvents,
    pub session: Session,
    pub renderer: Renderer,
    pub presentation: Presentation,
}

impl PartialEq for MainPanelProps {
    fn eq(&self, _rhs: &Self) -> bool {
        false
    }
}

impl MainPanelProps {
    fn is_title(&self) -> bool {
        self.session.get_title().is_some()
    }
}

#[derive(Debug)]
pub enum MainPanelMsg {
    Reset(bool, Option<Sender<()>>),
    RenderLimits(Option<(usize, usize, Option<usize>, Option<usize>)>),
    PointerEvent(web_sys::PointerEvent),
    Error,
}

pub struct MainPanel {
    _subscriptions: [Subscription; 2],
    dimensions: Option<(usize, usize, Option<usize>, Option<usize>)>,
    main_panel_ref: NodeRef,
}

impl Component for MainPanel {
    type Message = MainPanelMsg;
    type Properties = MainPanelProps;

    fn create(ctx: &Context<Self>) -> Self {
        let session_sub = {
            let callback = ctx.link().callback(move |(_, render_limits)| {
                MainPanelMsg::RenderLimits(Some(render_limits))
            });

            ctx.props()
                .renderer
                .render_limits_changed
                .add_listener(callback)
        };

        let error_sub = ctx
            .props()
            .session
            .table_errored
            .add_listener(ctx.link().callback(|_| MainPanelMsg::Error));

        Self {
            _subscriptions: [session_sub, error_sub],
            dimensions: None,
            main_panel_ref: NodeRef::default(),
        }
    }

    fn update(&mut self, ctx: &Context<Self>, msg: Self::Message) -> bool {
        match msg {
            MainPanelMsg::Error => true,
            MainPanelMsg::Reset(all, sender) => {
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

            MainPanelMsg::RenderLimits(dimensions) => {
                if self.dimensions != dimensions {
                    self.dimensions = dimensions;
                    true
                } else {
                    false
                }
            },

            MainPanelMsg::PointerEvent(event) => {
                if event.target().map(JsValue::from)
                    == self
                        .main_panel_ref
                        .cast::<web_sys::HtmlElement>()
                        .map(JsValue::from)
                {
                    ctx.props()
                        .custom_events
                        .dispatch_event(format!("statusbar-{}", event.type_()).as_str(), &event)
                        .unwrap();
                }

                false
            },
        }
    }

    fn changed(&mut self, _ctx: &Context<Self>, _old: &Self::Properties) -> bool {
        true
    }

    fn view(&self, ctx: &Context<Self>) -> Html {
        let Self::Properties {
            custom_events,
            presentation,
            renderer,
            session,
            ..
        } = ctx.props();

        let is_settings_open =
            ctx.props().presentation.is_settings_open() && ctx.props().session.has_table();

        let on_settings = (!is_settings_open).then(|| ctx.props().on_settings.clone());

        let mut class = classes!();
        if !is_settings_open {
            class.push("settings-closed");
        }

        if ctx.props().is_title() {
            class.push("titled");
        }

        let on_reset = ctx.link().callback(|all| MainPanelMsg::Reset(all, None));
        let pointerdown = ctx.link().callback(MainPanelMsg::PointerEvent);
        html! {
            <div id="main_column">
                <StatusBar
                    id="status_bar"
                    {on_settings}
                    on_reset={on_reset.clone()}
                    {custom_events}
                    {presentation}
                    {renderer}
                    {session}
                />
                <div
                    id="main_panel_container"
                    ref={self.main_panel_ref.clone()}
                    {class}
                    onpointerdown={pointerdown}
                >
                    <RenderWarning {renderer} {session} dimensions={self.dimensions} />
                    <slot />
                </div>
            </div>
        }
    }

    fn destroy(&mut self, _ctx: &Context<Self>) {}
}
