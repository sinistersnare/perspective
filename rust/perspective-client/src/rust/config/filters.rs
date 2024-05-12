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

use std::fmt::Display;

use itertools::Itertools;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::proto;
use crate::proto::scalar;

#[derive(Clone, Deserialize, Debug, PartialEq, Serialize, TS)]
#[serde(untagged)]
pub enum Scalar {
    Float(f64),
    String(String),
    Bool(bool),
    DateTime(f64),
    Null,
    // // Can only have one u64 representation ...
    // Date(u64)
    // Int(u32)
}

impl Default for Scalar {
    fn default() -> Self {
        Self::Null
    }
}

impl Display for Scalar {
    fn fmt(&self, fmt: &mut std::fmt::Formatter<'_>) -> std::result::Result<(), std::fmt::Error> {
        match self {
            Self::Float(x) => write!(fmt, "{}", x),
            Self::String(x) => write!(fmt, "{}", x),
            Self::Bool(x) => write!(fmt, "{}", x),
            Self::DateTime(x) => write!(fmt, "{}", x),
            Self::Null => write!(fmt, ""),
        }
    }
}

#[derive(Clone, Deserialize, Debug, PartialEq, Serialize, TS)]
#[serde(untagged)]
pub enum FilterTerm {
    Array(Vec<Scalar>),
    Scalar(#[serde(default)] Scalar),
}

impl Default for FilterTerm {
    fn default() -> Self {
        Self::Scalar(Scalar::Null)
    }
}

impl Display for FilterTerm {
    fn fmt(&self, fmt: &mut std::fmt::Formatter<'_>) -> std::result::Result<(), std::fmt::Error> {
        match self {
            Self::Scalar(x) => {
                write!(fmt, "{}", x)?;
            },
            Self::Array(xs) => write!(
                fmt,
                "{}",
                Itertools::intersperse(xs.iter().map(|x| format!("{}", x)), ",".to_owned())
                    .collect::<String>()
            )?,
        }

        Ok(())
    }
}

#[derive(Clone, Deserialize, Debug, PartialEq, Serialize, TS)]
#[serde()]
pub struct Filter(String, String, #[serde(default)] FilterTerm);

impl Filter {
    pub fn new(column: String, op: String, term: FilterTerm) -> Self {
        Filter(column, op, term)
    }

    pub fn column(&self) -> &str {
        self.0.as_str()
    }

    pub fn op(&self) -> &str {
        self.1.as_str()
    }

    pub fn term(&self) -> &FilterTerm {
        &self.2
    }

    pub fn column_mut(&mut self) -> &mut String {
        &mut self.0
    }

    pub fn op_mut(&mut self) -> &mut String {
        &mut self.1
    }

    pub fn term_mut(&mut self) -> &mut FilterTerm {
        &mut self.2
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq, TS)]
pub enum FilterReducer {
    #[serde(rename = "and")]
    And,
    #[serde(rename = "or")]
    Or,
}

impl Default for FilterReducer {
    fn default() -> Self {
        Self::And
    }
}

impl From<Scalar> for proto::Scalar {
    fn from(value: Scalar) -> Self {
        match value {
            Scalar::Float(x) => proto::Scalar {
                scalar: Some(scalar::Scalar::Float(x)),
            },
            Scalar::String(x) => proto::Scalar {
                scalar: Some(scalar::Scalar::String(x)),
            },
            Scalar::Bool(x) => proto::Scalar {
                scalar: Some(scalar::Scalar::Bool(x)),
            },
            // Scalar::Date(_) => todo!(),
            Scalar::DateTime(x) => proto::Scalar {
                scalar: Some(scalar::Scalar::Datetime(x as i64)),
            },
            Scalar::Null => proto::Scalar {
                scalar: Some(scalar::Scalar::Null(0)),
            },
        }
    }
}

impl From<proto::Scalar> for Scalar {
    fn from(value: proto::Scalar) -> Self {
        match value.scalar {
            Some(scalar::Scalar::Bool(x)) => Scalar::Bool(x),
            Some(scalar::Scalar::String(x)) => Scalar::String(x),
            Some(scalar::Scalar::Int(x)) => Scalar::Float(x as f64),
            Some(scalar::Scalar::Date(x)) => Scalar::DateTime(x as f64),
            Some(scalar::Scalar::Float(x)) => Scalar::Float(x),
            Some(scalar::Scalar::Datetime(x)) => Scalar::DateTime(x as f64),
            Some(scalar::Scalar::Null(_)) => Scalar::Null,
            None => Scalar::Null,
        }
    }
}

impl From<Filter> for proto::view_config::Filter {
    fn from(value: Filter) -> Self {
        proto::view_config::Filter {
            column: value.0,
            op: value.1,
            value: match value.2 {
                FilterTerm::Scalar(x) => vec![x.into()],
                FilterTerm::Array(x) => x.into_iter().map(|x| x.into()).collect(),
            },
        }
    }
}

impl From<proto::view_config::Filter> for Filter {
    fn from(value: proto::view_config::Filter) -> Self {
        Filter(
            value.column,
            value.op,
            if value.value.len() == 1 {
                FilterTerm::Scalar(value.value.into_iter().next().unwrap().into())
            } else {
                FilterTerm::Array(value.value.into_iter().map(|x| x.into()).collect())
            },
        )
    }
}
