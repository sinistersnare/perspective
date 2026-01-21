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

//! A simple "structurally-typed" method extension implementation.  This
//! collection of `trait`s allows methods to be automatically defined for
//! `struct`s only if the define accessors for the necessary applications state
//! objects (which are conviently derivable with the `derive_model!` macro).

use yew::Component;

use crate::custom_events::*;
use crate::dragdrop::*;
use crate::presentation::*;
use crate::renderer::*;
use crate::root::*;
use crate::session::*;

pub trait HasCustomEvents {
    fn custom_events(&self) -> &'_ CustomEvents;
}

pub trait HasDragDrop {
    fn dragdrop(&self) -> &'_ DragDrop;
}

pub trait HasPresentation {
    fn presentation(&self) -> &'_ Presentation;
}

pub trait HasRoot {
    /// Use an assoociated type to prevent a (circular) dependency on
    /// [`crate::components`].
    type RootComponent: Component;
    fn root(&self) -> &'_ Root<Self::RootComponent>;
}

pub trait HasRenderer {
    fn renderer(&self) -> &'_ Renderer;
}

pub trait HasSession {
    fn session(&self) -> &'_ Session;
}

impl HasSession for Session {
    fn session(&self) -> &'_ Session {
        self
    }
}

#[macro_export]
macro_rules! PerspectiveProperties {
    // (impl @tuple $name:ident CustomEvents $x:tt) => {
    //     impl $crate::model::HasCustomEvents for $name {
    //         fn custom_events(&self) -> &'_ CustomEvents {
    //             &self.$x
    //         }
    //     }
    // };

    // (impl @tuple $name:ident DragDrop $x:tt) => {
    //     impl $crate::model::HasDragDrop for $name {
    //         fn dragdrop(&self) -> &'_ DragDrop {
    //             &self.$x
    //         }
    //     }
    // };

    // (impl @tuple $name:ident Presentatio $x:tt) => {
    //     impl $crate::model::HasPresentation for $name {
    //         fn presentation(&self) -> &'_ Presentation {
    //             &self.$x
    //         }
    //     }
    // };

    // (impl @tuple $name:ident Renderer $x:tt) => {
    //     impl $crate::model::HasRenderer for $name {
    //         fn renderer(&self) -> &'_ Renderer {
    //             &self.$x
    //         }
    //     }
    // };

    // (impl @tuple $name:ident Root $x:tt) => {
    //     impl $crate::model::HasRoot for $name {
    //         type RootComponent = $crate::components::viewer::PerspectiveViewer;
    //         fn root(&self) -> &'_ Root<Self::RootComponent> {
    //             &self.$x
    //         }
    //     }
    // };

    // (impl @tuple $name:ident Session $x:tt) => {
    //     impl $crate::model::HasSession for $name {
    //         fn session(&self) -> &'_ Session {
    //             &self.$x
    //         }
    //     }
    // };

    // (impl @tuple $name:ident *_x:tt $x:tt) => {};

    (impl @field $name:ident custom_events $value:ty) => {
        impl $crate::model::HasCustomEvents for $name {
            fn custom_events(&self) -> &'_ $value {
                &self.custom_events
            }
        }
    };

    (impl @field $name:ident dragdrop $value:ty) => {
        impl $crate::model::HasDragDrop for $name {
            fn dragdrop(&self) -> &'_ $value {
                &self.dragdrop
            }
        }
    };

    (impl @field $name:ident presentation $value:ty) => {
        impl $crate::model::HasPresentation for $name {
            fn presentation(&self) -> &'_ $value {
                &self.presentation
            }
        }
    };

    (impl @field $name:ident renderer $value:ty) => {
        impl $crate::model::HasRenderer for $name {
            fn renderer(&self) -> &'_ $value {
                &self.renderer
            }
        }
    };

    (impl @field $name:ident root $value:ty) => {
        impl $crate::model::HasRoot for $name {
            type RootComponent = $crate::components::viewer::PerspectiveViewer;
            fn root(&self) -> &'_ $value {
                &self.root
            }
        }
    };

    (impl @field $name:ident session $value:ty) => {
        impl $crate::model::HasSession for $name {
            fn session(&self) -> &'_ $value {
                &self.session
            }
        }
    };

    (impl @field $name:ident $x:ident $value:ty) => {};

    (impl @fields_provider $name:ident {$($x:tt : $y:ty,)*} custom_events, $($field:ident,)*) => {
        PerspectiveProperties!(impl @fields_provider $name { custom_events : CustomEvents, $($x : $y,)*} $($field,)*);
    };

    (impl @fields_provider $name:ident {$($x:tt : $y:ty,)*} dragdrop, $($field:ident,)*) => {
        PerspectiveProperties!(impl @fields_provider $name { dragdrop : DragDrop, $($x : $y,)*} $($field,)*);
    };

    (impl @fields_provider $name:ident {$($x:tt : $y:ty,)*} presentation, $($field:ident,)*) => {
        PerspectiveProperties!(impl @fields_provider $name { presentation : Presentation, $($x : $y,)*} $($field,)*);
    };

    (impl @fields_provider $name:ident {$($x:tt : $y:ty,)*} renderer, $($field:ident,)*) => {
        PerspectiveProperties!(impl @fields_provider $name { renderer : Renderer, $($x : $y,)*} $($field,)*);
    };

     (impl @fields_provider $name:ident {$($x:tt : $y:ty,)*} root, $($field:ident,)*) => {
        PerspectiveProperties!(impl @fields_provider $name { root : Root<$crate::components::viewer::PerspectiveViewer>, $($x : $y,)*} $($field,)*);
    };

    (impl @fields_provider $name:ident {$($x:tt : $y:ty,)*} session, $($field:ident,)*) => {
        PerspectiveProperties!(impl @fields_provider $name { session : Session, $($x : $y,)*} $($field,)*);
    };

    (impl @fields_provider $name:ident {$($x:tt : $y:ty,)*} $_x:ident, $($field:ident,)*) => {
        PerspectiveProperties!(impl @fields_provider $name {$($x : $y,)*} $($field,)*);
    };

    (impl @fields_provider $name:ident {}) => {};

    (impl @fields_provider $name:ident {$($x:tt : $y:ty,)*}) => {
        perspective_client::vendor::paste::paste! {
            #[derive(PartialEq, Clone)]
            pub struct [< $name State >] {
                $($x: $y,)*
            }

            impl $crate::model::StateProvider for $name {
                type State = [< $name State >];
                fn clone_state(&self) -> Self::State {
                    Self::State {
                        $($x : self.$x.clone(),)*
                    }
                }
            }

            PerspectiveProperties!(impl @fields [< $name State >] $($x : $y,)*);
        }
    };

    (impl @fields $name:ident $field:ident : $value:ty, $($field_tail:ident : $value_tail:ty,)*) => {
        PerspectiveProperties!(impl @field $name $field $value);
        PerspectiveProperties!(impl @fields $name $($field_tail : $value_tail,)*);
    };

    (impl @fields $name:ident) => {};

    // (impl @tuples $name:ident $value:tt : $acc:tt, $($value_tail:tt : $acc_tail:tt,)*) => {
    //     PerspectiveProperties!(impl @tuple $name $value $acc);
    //     PerspectiveProperties!(impl @tuples $name $($value_tail : $acc_tail,)*);
    // };

    // (impl @tuples $name:ident) => {};

    ($(#[$m:meta])* $pub:vis struct $name:ident { $($(#[$_m:meta])* $_p:vis $field:ident : $value:ty),* $(,)? }) => {
        PerspectiveProperties!(impl @fields $name $($field : $value,)*);
        PerspectiveProperties!(impl @fields_provider $name {} $($field,)*);
    };

    // ($(#[$m:meta])* $pub:vis struct $name:ident ( $($(#[$_m:meta])* $value:tt $(< $_ttt:ty >)?),* $(,)? );) => {
    //     PerspectiveProperties!(impl @tuples $name $($value : ${index()} ,)*);
    // };
}

pub trait StateProvider {
    type State: Clone + 'static;

    /// Clones _just_ the state objects fields into a new dedicated state
    /// struct (generated by [`PerspectiveProperties`]).
    fn clone_state(&self) -> Self::State;
}
