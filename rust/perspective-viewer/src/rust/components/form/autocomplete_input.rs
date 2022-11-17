////////////////////////////////////////////////////////////////////////////////
//
// Copyright (c) 2018, the Perspective Authors.
//
// This file is part of the Perspective library, distributed under the terms
// of the Apache License 2.0.  The full license can be found in the LICENSE
// file.

use std::pin::Pin;
use std::rc::Rc;

use futures::Future;
use wasm_bindgen::JsCast;
use web_sys::*;
use yew::prelude::*;

use crate::components::style::LocalStyle;
use crate::config::*;
use crate::custom_elements::*;
use crate::utils::ApiFuture;
use crate::*;

/// A control for a single filter condition.
pub struct AutocompleteInput {
    current_val: String,
    input_ref: NodeRef,
    autocomplete_dropdown: Option<FilterDropDownElement>,
}

pub type Completer = Rc<dyn Fn(String) -> Pin<Box<dyn Future<Output = ApiResult<Vec<String>>>>>>;

#[derive(Debug)]
pub enum AutocompleteInputMsg {
    AutoInput(String),
    AutoKeyDown(u32),
    AutoFocus,
    AutoCloseModal,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum InputType {
    Number { step: Option<usize> },
    String,
    Date,
    Datetime,
    Bool,
}

impl From<Type> for InputType {
    fn from(value: Type) -> Self {
        match value {
            Type::String => InputType::String,
            Type::Datetime => InputType::Datetime,
            Type::Date => InputType::Date,
            Type::Integer => InputType::Number { step: Some(1) },
            Type::Float => InputType::Number { step: None },
            Type::Bool => InputType::Bool,
        }
    }
}

#[derive(Properties, Clone)]
pub struct AutocompleteInputProps {
    pub initial_val: String,
    pub input_type: Option<InputType>,
    pub is_suggest: bool,
    pub on_value_selected: Callback<String>,
    pub completer: Completer,
}

impl PartialEq for AutocompleteInputProps {
    fn eq(&self, rhs: &Self) -> bool {
        self.initial_val == rhs.initial_val && self.input_type == rhs.input_type
    }
}

impl AutocompleteInputProps {
    /// Does this filter item get a "suggestions" auto-complete modal?
    fn is_suggestable(&self) -> bool {
        self.is_suggest && self.input_type == Some(InputType::String)
    }
}

impl Component for AutocompleteInput {
    type Message = AutocompleteInputMsg;
    type Properties = AutocompleteInputProps;

    fn create(ctx: &Context<Self>) -> Self {
        let input_ref = NodeRef::default();
        AutocompleteInput {
            current_val: ctx.props().initial_val.clone(),
            input_ref,
            autocomplete_dropdown: None,
        }
    }

    fn update(&mut self, ctx: &Context<Self>, msg: AutocompleteInputMsg) -> bool {
        match msg {
            AutocompleteInputMsg::AutoInput(input) => {
                let target = self.input_ref.cast::<HtmlInputElement>().unwrap();
                let input = if let Some(InputType::Bool) = ctx.props().input_type {
                    if target.checked() {
                        "true".to_owned()
                    } else {
                        "false".to_owned()
                    }
                } else {
                    input
                };

                self.current_val = input;
                if ctx.props().is_suggestable() {
                    self.autocomplete_dropdown = match self.autocomplete_dropdown.clone() {
                        None => Some(FilterDropDownElement::new(
                            ctx.props().on_value_selected.clone(),
                            self.input_ref.cast::<HtmlElement>().unwrap(),
                        )),
                        d => d,
                    };

                    clone!(
                        ctx.props().completer,
                        self.current_val,
                        self.autocomplete_dropdown
                    );
                    ApiFuture::spawn(async move {
                        let results = completer(current_val).await?;
                        autocomplete_dropdown.unwrap().autocomplete(results);
                        Ok(())
                    });

                    // let completed = ;
                    // self.filter_dropdown.autocomplete(
                    //     column,
                    //     if ctx.props().filter.1 == FilterOp::In {
                    //         input.split(',').last().unwrap().to_owned()
                    //     } else {
                    //         input.clone()
                    //     },
                    //     target.unchecked_into(),
                    //     ctx.props().on_keydown.clone(),
                    // );
                }

                //ctx.props().update_filter_input(input);
                //  ctx.props().on_keydown.emit(input);
                false
            }
            AutocompleteInputMsg::AutoKeyDown(40) => {
                // if ctx.props().is_suggestable() {
                //     ctx.props().filter_dropdown.item_down();
                //     ctx.props().filter_dropdown.item_select();
                // }
                false
            }
            AutocompleteInputMsg::AutoKeyDown(38) => {
                // if ctx.props().is_suggestable() {
                //     ctx.props().filter_dropdown.item_up();
                //     ctx.props().filter_dropdown.item_select();
                // }
                false
            }
            AutocompleteInputMsg::AutoKeyDown(13) => {
                // if ctx.props().is_suggestable() {
                //     ctx.props().filter_dropdown.item_select();
                //     ctx.props().filter_dropdown.hide().unwrap();
                // }
                false
            }
            AutocompleteInputMsg::AutoKeyDown(_) => {
                // if ctx.props().is_suggestable() {
                //     ctx.props().filter_dropdown.reautocomplete();
                // }
                false
            }
            AutocompleteInputMsg::AutoFocus => false,
            AutocompleteInputMsg::AutoCloseModal => false,
        }
    }

    fn view(&self, ctx: &Context<Self>) -> Html {
        // let idx = ctx.props().idx;
        //let initial_val = ctx.props().initial_val.clone();
        let noderef = &self.input_ref;
        let on_input = ctx.link().callback({
            move |event: InputEvent| {
                AutocompleteInputMsg::AutoInput(
                    event
                        .target()
                        .unwrap()
                        .unchecked_into::<HtmlInputElement>()
                        .value(),
                )
            }
        });

        // let on_focus = ctx
        //     .link()
        //     .callback(|_: FocusEvent| AutocompleteInputMsg::AutoFocus);

        // let on_blur = ctx
        //     .link()
        //     .callback(|_| AutocompleteInputMsg::AutoCloseModal);

        let on_keydown = ctx.link().callback(move |event: KeyboardEvent| {
            AutocompleteInputMsg::AutoKeyDown(event.key_code())
        });

        let type_class = match ctx.props().input_type {
            Some(InputType::Number { .. }) => "num-filter",
            Some(InputType::String) => "string-filter",
            _ => "",
        };

        let input_elem = match ctx.props().input_type {
            Some(InputType::Number { step: Some(step) }) => html! {
                <input
                    type="number"
                    placeholder="Value"
                    class="num-filter"
                    step={ step.to_string() }
                    ref={ noderef.clone() }
                    onkeydown={ on_keydown }
                    value={ self.current_val.clone() }
                    oninput={ on_input }/>
            },
            Some(InputType::Number { step: None }) => html! {
                <input
                    type="number"
                    placeholder="Value"
                    class="num-filter"
                    ref={ noderef.clone() }
                    onkeydown={ on_keydown }
                    value={ self.current_val.clone() }
                    oninput={ on_input }/>
            },
            Some(InputType::Bool) => html! {
                <input
                    type="checkbox"
                    ref={ noderef.clone() }
                    checked={ self.current_val == "true" }
                    oninput={ on_input }/>
            },
            Some(InputType::Date) => html! {
                <input
                    type="date"
                    placeholder="Value"
                    class="date-filter"
                    ref={ noderef.clone() }
                    onkeydown={ on_keydown }
                    value={ self.current_val.clone() }
                    oninput={ on_input }/>
            },
            Some(InputType::Datetime) => html! {
                <input
                    type="datetime-local"
                    placeholder="Value"
                    class="datetime-filter"
                    step="0.001"
                    ref={ noderef.clone() }
                    onkeydown={ on_keydown }
                    value={ self.current_val.clone() }
                    oninput={ on_input }/>
            },
            Some(InputType::String) => html! {
                <input
                    type="text"
                    size="4"
                    placeholder="Value"
                    class="string-filter"
                    // TODO This is dirty and it may not work in the future.
                    onInput="this.parentNode.dataset.value=this.value"
                    ref={ noderef.clone() }
                    onkeydown={ on_keydown }
                    // onfocus={ focus }
                    // onblur={ blur }
                    value={ self.current_val.clone() }
                    oninput={ on_input }/>
            },
            _ => html! {},
        };

        html_template! {
            <LocalStyle href={ css!("filter-item") } />
            if let Some(InputType::Bool) = ctx.props().input_type {
                {
                    input_elem
                }
            } else {
                <label
                    class={ format!("input-sizer {}", type_class) }
                    data-value={ self.current_val.clone() }>
                    {
                        input_elem
                    }
                </label>
            }
        }
    }
}
