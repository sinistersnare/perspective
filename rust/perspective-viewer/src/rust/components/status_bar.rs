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

use web_sys::*;
use yew::prelude::*;

use super::status_indicator::StatusIndicator;
use super::style::LocalStyle;
use crate::components::containers::select::*;
use crate::components::status_bar_counter::StatusBarRowsCounter;
use crate::custom_elements::copy_dropdown::*;
use crate::custom_elements::export_dropdown::*;
use crate::custom_events::CustomEvents;
use crate::model::*;
use crate::presentation::Presentation;
use crate::renderer::*;
use crate::session::*;
use crate::utils::*;
use crate::*;

#[derive(Properties, PerspectiveProperties!)]
pub struct StatusBarProps {
    // DOM Attribute
    pub id: String,

    /// Fired when the reset button is clicked.
    pub on_reset: Callback<bool>,

    /// Fires when the settings button is clicked
    #[prop_or_default]
    pub on_settings: Option<Callback<()>>,

    // State
    pub custom_events: CustomEvents,
    pub session: Session,
    pub renderer: Renderer,
    pub presentation: Presentation,
}

impl PartialEq for StatusBarProps {
    fn eq(&self, other: &Self) -> bool {
        self.id == other.id
    }
}

pub enum StatusBarMsg {
    Reset(MouseEvent),
    Export,
    Copy,
    Noop,
    Eject,
    SetThemeConfig((Rc<Vec<String>>, Option<usize>)),
    SetTheme(String),
    ResetTheme,
    PointerEvent(web_sys::PointerEvent),
    TitleInputEvent,
    TitleChangeEvent,
}

/// A toolbar with buttons, and `Table` & `View` status information.
pub struct StatusBar {
    _subscriptions: [Subscription; 5],
    copy_ref: NodeRef,
    export_ref: NodeRef,
    input_ref: NodeRef,
    statusbar_ref: NodeRef,
    theme: Option<String>,
    themes: Rc<Vec<String>>,
    title: Option<String>,
}

impl Component for StatusBar {
    type Message = StatusBarMsg;
    type Properties = StatusBarProps;

    fn create(ctx: &Context<Self>) -> Self {
        fetch_initial_theme(ctx);
        Self {
            _subscriptions: register_listeners(ctx),
            copy_ref: NodeRef::default(),
            export_ref: NodeRef::default(),
            input_ref: NodeRef::default(),
            statusbar_ref: NodeRef::default(),
            theme: None,
            themes: vec![].into(),
            title: ctx.props().session().get_title().clone(),
        }
    }

    fn changed(&mut self, ctx: &Context<Self>, _old_props: &Self::Properties) -> bool {
        self._subscriptions = register_listeners(ctx);
        true
    }

    fn update(&mut self, ctx: &Context<Self>, msg: Self::Message) -> bool {
        maybe_log_or_default!(Ok(match msg {
            StatusBarMsg::Reset(event) => {
                let all = event.shift_key();
                ctx.props().on_reset.emit(all);
                false
            },
            StatusBarMsg::ResetTheme => {
                let state = ctx.props().clone_state();
                ApiFuture::spawn(async move {
                    state.presentation.reset_theme().await?;
                    let view = state.session.get_view().into_apierror()?;
                    state.renderer.restyle_all(&view).await
                });
                true
            },
            StatusBarMsg::SetThemeConfig((themes, index)) => {
                let new_theme = index.and_then(|x| themes.get(x)).cloned();
                let should_render = new_theme != self.theme || self.themes != themes;
                self.theme = new_theme;
                self.themes = themes;
                should_render
            },
            StatusBarMsg::SetTheme(theme_name) => {
                let state = ctx.props().clone_state();
                ApiFuture::spawn(async move {
                    state.presentation.set_theme_name(Some(&theme_name)).await?;
                    let view = state.session.get_view().into_apierror()?;
                    state.renderer.restyle_all(&view).await
                });

                false
            },
            StatusBarMsg::Export => {
                let target = self.export_ref.cast::<HtmlElement>().into_apierror()?;
                ExportDropDownMenuElement::new_from_model(ctx.props()).open(target);
                false
            },
            StatusBarMsg::Copy => {
                let target = self.copy_ref.cast::<HtmlElement>().into_apierror()?;
                CopyDropDownMenuElement::new_from_model(ctx.props()).open(target);
                false
            },
            StatusBarMsg::Eject => {
                ctx.props().presentation().on_eject.emit(());
                false
            },
            StatusBarMsg::Noop => {
                self.title = ctx.props().session().get_title();
                true
            },
            StatusBarMsg::TitleInputEvent => {
                let elem = self.input_ref.cast::<HtmlInputElement>().into_apierror()?;
                let title = elem.value();
                let title = if title.trim().is_empty() {
                    None
                } else {
                    Some(title)
                };

                self.title = title;
                true
            },
            StatusBarMsg::TitleChangeEvent => {
                let elem = self.input_ref.cast::<HtmlInputElement>().into_apierror()?;
                let title = elem.value();
                let title = if title.trim().is_empty() {
                    None
                } else {
                    Some(title)
                };

                ctx.props().session().set_title(title);
                false
            },
            StatusBarMsg::PointerEvent(event) => {
                if event.target().map(JsValue::from)
                    == self.statusbar_ref.cast::<HtmlElement>().map(JsValue::from)
                {
                    ctx.props()
                        .custom_events()
                        .dispatch_event(format!("statusbar-{}", event.type_()).as_str(), &event)?;
                }

                false
            },
        }))
    }

    fn view(&self, ctx: &Context<Self>) -> Html {
        let Self::Properties {
            custom_events,
            presentation,
            renderer,
            session,
            ..
        } = ctx.props();

        let mut is_updating_class_name = classes!();
        if session.get_title().is_some() {
            is_updating_class_name.push("titled");
        };

        if !presentation.is_settings_open() {
            is_updating_class_name.push(["settings-closed", "titled"]);
        };

        if !session.has_table() {
            is_updating_class_name.push("updating");
        }

        // TODO Memoizing these would reduce some vdom diffing later on
        let onblur = ctx.link().callback(|_| StatusBarMsg::Noop);
        let onclose = ctx.link().callback(|_| StatusBarMsg::Eject);
        let onpointerdown = ctx.link().callback(StatusBarMsg::PointerEvent);
        let onexport = ctx.link().callback(|_: MouseEvent| StatusBarMsg::Export);
        let oncopy = ctx.link().callback(|_: MouseEvent| StatusBarMsg::Copy);
        let onreset = ctx.link().callback(StatusBarMsg::Reset);
        let onchange = ctx
            .link()
            .callback(|_: Event| StatusBarMsg::TitleChangeEvent);

        let oninput = ctx
            .link()
            .callback(|_: InputEvent| StatusBarMsg::TitleInputEvent);

        let is_menu = session.has_table() && ctx.props().on_settings.as_ref().is_none();
        let is_title = is_menu
            || presentation.get_is_workspace()
            || session.get_title().is_some()
            || session.is_errored()
            || presentation.is_active(&self.input_ref.cast::<Element>());

        let is_settings = session.get_title().is_some()
            || presentation.get_is_workspace()
            || !session.has_table()
            || session.is_errored()
            || presentation.is_settings_open()
            || presentation.is_active(&self.input_ref.cast::<Element>());

        if is_settings {
            html! {
                <>
                    <LocalStyle href={css!("status-bar")} />
                    <div
                        ref={&self.statusbar_ref}
                        id={ctx.props().id.clone()}
                        class={is_updating_class_name}
                        {onpointerdown}
                    >
                        <StatusIndicator {custom_events} {renderer} {session} />
                        if is_title {
                            <label
                                class="input-sizer"
                                data-value={self.title.clone().unwrap_or_default()}
                            >
                                <input
                                    ref={&self.input_ref}
                                    placeholder=""
                                    value={self.title.clone().unwrap_or_default()}
                                    size="10"
                                    {onblur}
                                    {onchange}
                                    {oninput}
                                />
                                <span id="status-bar-placeholder" />
                            </label>
                        }
                        if is_title {
                            <StatusBarRowsCounter {session} />
                        }
                        <div id="spacer" />
                        if is_menu {
                            <div id="menu-bar" class="section">
                                <ThemeSelector
                                    theme={self.theme.clone()}
                                    themes={self.themes.clone()}
                                    on_change={ctx.link().callback(StatusBarMsg::SetTheme)}
                                    on_reset={ctx.link().callback(|_| StatusBarMsg::ResetTheme)}
                                />
                                <div id="plugin-settings"><slot name="statusbar-extra" /></div>
                                <span class="hover-target">
                                    <span id="reset" class="button" onmousedown={&onreset}>
                                        <span />
                                    </span>
                                </span>
                                <span
                                    ref={&self.export_ref}
                                    class="hover-target"
                                    onmousedown={onexport}
                                >
                                    <span id="export" class="button"><span /></span>
                                </span>
                                <span
                                    ref={&self.copy_ref}
                                    class="hover-target"
                                    onmousedown={oncopy}
                                >
                                    <span id="copy" class="button"><span /></span>
                                </span>
                            </div>
                        }
                        if let Some(x) = ctx.props().on_settings.as_ref() {
                            <div
                                id="settings_button"
                                class="noselect"
                                onmousedown={x.reform(|_| ())}
                            />
                            <div id="close_button" class="noselect" onmousedown={onclose} />
                        }
                    </div>
                </>
            }
        } else if let Some(x) = ctx.props().on_settings.as_ref() {
            let class = classes!(is_updating_class_name, "floating");
            html! {
                <div id={ctx.props().id.clone()} {class}>
                    <div id="settings_button" class="noselect" onmousedown={x.reform(|_| ())} />
                    <div id="close_button" class="noselect" onmousedown={&onclose} />
                </div>
            }
        } else {
            html! {}
        }
    }
}

fn register_listeners(ctx: &Context<StatusBar>) -> [Subscription; 5] {
    [
        ctx.props()
            .presentation()
            .theme_config_updated
            .add_listener(ctx.link().callback(StatusBarMsg::SetThemeConfig)),
        ctx.props()
            .presentation()
            .visibility_changed
            .add_listener(ctx.link().callback(|_| StatusBarMsg::Noop)),
        ctx.props()
            .session()
            .title_changed
            .add_listener(ctx.link().callback(|_| StatusBarMsg::Noop)),
        ctx.props()
            .session()
            .table_loaded
            .add_listener(ctx.link().callback(|_| StatusBarMsg::Noop)),
        ctx.props()
            .session()
            .table_errored
            .add_listener(ctx.link().callback(|_| StatusBarMsg::Noop)),
    ]
}

fn fetch_initial_theme(ctx: &Context<StatusBar>) {
    ApiFuture::spawn({
        let on_theme = ctx.link().callback(StatusBarMsg::SetThemeConfig);
        clone!(ctx.props().presentation());
        async move {
            on_theme.emit(presentation.get_selected_theme_config().await?);
            Ok(())
        }
    });
}

#[derive(Properties, PartialEq)]
struct ThemeSelectorProps {
    pub theme: Option<String>,
    pub themes: Rc<Vec<String>>,
    pub on_reset: Callback<()>,
    pub on_change: Callback<String>,
}

#[function_component]
fn ThemeSelector(props: &ThemeSelectorProps) -> Html {
    let is_first = props
        .theme
        .as_ref()
        .and_then(|x| props.themes.first().map(|y| y == x))
        .unwrap_or_default();

    let values = use_memo(props.themes.clone(), |themes| {
        themes
            .iter()
            .cloned()
            .map(SelectItem::Option)
            .collect::<Vec<_>>()
    });

    match &props.theme {
        None => html! {},
        Some(selected) => {
            html! {
                if values.len() > 1 {
                    <span class="hover-target">
                        <div
                            id="theme_icon"
                            class={if is_first {""} else {"modified"}}
                            tabindex="0"
                            onclick={props.on_reset.reform(|_| ())}
                        />
                        <span id="theme" class="button">
                            <Select<String>
                                id="theme_selector"
                                class="invert"
                                {values}
                                selected={selected.to_owned()}
                                on_select={props.on_change.clone()}
                            />
                        </span>
                    </span>
                }
            }
        },
    }
}
