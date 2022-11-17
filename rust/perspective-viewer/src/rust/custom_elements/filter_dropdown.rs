////////////////////////////////////////////////////////////////////////////////
//
// Copyright (c) 2018, the Perspective Authors.
//
// This file is part of the Perspective library, distributed under the terms
// of the Apache License 2.0.  The full license can be found in the LICENSE
// file.

use std::cell::RefCell;
use std::rc::Rc;

use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use web_sys::*;
use yew::html::ImplicitClone;
use yew::*;

use crate::components::filter_dropdown::*;
use crate::custom_elements::modal::*;
use crate::utils::ApiFuture;
use crate::*;

#[wasm_bindgen]
#[derive(Clone)]
pub struct FilterDropDownElement {
    modal: ModalElement<FilterDropDown>,
    // values: Rc<RefCell<Option<Vec<String>>>>,
    target: HtmlElement,
}

impl ImplicitClone for FilterDropDownElement {}

impl FilterDropDownElement {
    pub fn new(on_value_selected: Callback<String>, target: HtmlElement) -> Self {
        let document = window().unwrap().document().unwrap();
        let dropdown = document
            .create_element("perspective-filter-dropdown")
            .unwrap()
            .unchecked_into::<HtmlElement>();

        let props = props!(FilterDropDownProps { on_value_selected });
        let modal = ModalElement::new(dropdown, props, false);
        //et values = Rc::new(RefCell::new(None));
        Self {
            modal,
            //     values,
            target,
        }
    }

    pub fn autocomplete(&self, values: Vec<String>) {
        self.modal.send_message_batch(vec![
            // FilterDropDownMsg::SetCallback(callback),
            FilterDropDownMsg::SetValues(values),
        ]);

        ApiFuture::spawn(self.modal.clone().open(self.target.clone(), None));
    }

    // pub fn reautocomplete(&self) {
    //     ApiFuture::spawn(
    //         self.modal
    //             .clone()
    //             .open(self.target.borrow().clone().unwrap(), None),
    //     );
    // }

    // pub fn autocomplete(
    //     &self,
    //     column: (usize, String),
    //     input: String,
    //     target: HtmlElement,
    //     callback: Callback<String>,
    // ) {
    //     let current_column = self.column.borrow().clone();
    //     match current_column {
    //         Some(filter_col) if filter_col == column => {
    //             let values = filter_values(&input, &self.values);
    //             self.modal.send_message_batch(vec![
    //                 FilterDropDownMsg::SetCallback(callback),
    //                 FilterDropDownMsg::SetValues(values),
    //             ]);
    //         }
    //         _ => {
    //             // TODO is this a race condition? `column` and `values` are
    // out-of-sync             // across an `await` point.
    //             *self.column.borrow_mut() = Some(column.clone());
    //             *self.target.borrow_mut() = Some(target.clone());
    //             ApiFuture::spawn({
    //                 clone!(self.modal, self.session, self.values);
    //                 async move {
    //                     let all_values =
    // session.get_column_values(column.1).await?;
    // *values.borrow_mut() = Some(all_values);                     let
    // filter_values = filter_values(&input, &values);
    // modal.send_message_batch(vec![
    // FilterDropDownMsg::SetCallback(callback),
    // FilterDropDownMsg::SetValues(filter_values),                     ]);

    //                     modal.open(target, None).await
    //                 }
    //             });
    //         }
    //     }
    // }

    pub fn item_select(&self) {
        self.modal.send_message(FilterDropDownMsg::ItemSelect);
    }

    pub fn item_down(&self) {
        self.modal.send_message(FilterDropDownMsg::ItemDown);
    }

    pub fn item_up(&self) {
        self.modal.send_message(FilterDropDownMsg::ItemUp);
    }

    // pub fn hide(&self) -> ApiResult<()> {
    //     let result = self.modal.hide();
    //     drop(self.column.borrow_mut().take());
    //     result
    // }

    pub fn connected_callback(&self) {}
}

fn filter_values(input: &str, values: &Rc<RefCell<Option<Vec<String>>>>) -> Vec<String> {
    let input = input.to_lowercase();
    if let Some(values) = &*values.borrow() {
        values
            .iter()
            .filter(|x| x.to_lowercase().contains(&input))
            .take(10)
            .cloned()
            .collect::<Vec<String>>()
    } else {
        vec![]
    }
}
