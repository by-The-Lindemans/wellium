//  This Source Code Form is subject to the terms of the Mozilla Public
//  License, v. 2.0. If a copy of the MPL was not distributed with this
//  file, You can obtain one at https://mozilla.org/MPL/2.0/.
// 
//  Copyright 2024 — by The Lindemans, LLC
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
use leptos::*;
use wasm_bindgen::prelude::*;
use web_sys::{window, HtmlLinkElement, HtmlMetaElement};

#[wasm_bindgen(start)]
pub fn main() {
    console_error_panic_hook::set_once();
    setup_document();
    leptos::mount_to_body(|| view! { <App /> });
}

fn setup_document() {
    let document = window().unwrap().document().unwrap();

    // Set the document title
    document.set_title("welliuᴍ");

    // Add the favicon
    let link: HtmlLinkElement = document.create_element("link").unwrap().dyn_into().unwrap();
    link.set_rel("icon");
    link.set_href("./favicon.ico");
    link.set_type("image/x-icon");
    document.head().unwrap().append_child(&link).unwrap();

    // Add the viewport meta tag to control scaling on mobile devices
    let meta: HtmlMetaElement = document.create_element("meta").unwrap().dyn_into().unwrap();
    meta.set_name("viewport");
    meta.set_content("width=device-width, initial-scale=1.0, user-scalable=no");
    document.head().unwrap().append_child(&meta).unwrap();
}

#[derive(Clone)]
struct Widget {
    name: &'static str,
    widget_aspect_ratio: f64, // Static aspect ratio for each widget
    is_header: bool,          // Indicates if the widget is a header
}

impl Widget {
    fn new(name: &'static str, widget_aspect_ratio: f64, is_header: bool) -> Self {
        Widget {
            name,
            widget_aspect_ratio,
            is_header,
        }
    }
}

#[component]
fn App() -> impl IntoView {
    // Track window size to determine orientation and manage layout
    let (window_size, set_window_size) = create_signal((0.0, 0.0));

    let update_window_size = move || {
        let window = leptos::window();
        let width = window.inner_width().unwrap().as_f64().unwrap();
        let height = window.inner_height().unwrap().as_f64().unwrap();
        set_window_size.set((width, height));
    };

    let window = leptos::window();
    let closure = Closure::wrap(Box::new(move || {
        update_window_size();
    }) as Box<dyn Fn()>);
    window
        .add_event_listener_with_callback("resize", closure.as_ref().unchecked_ref())
        .unwrap();
    closure.forget();

    update_window_size();

    // Initialize widgets with static aspect ratios
    let widgets = vec![
        Widget::new("welliuᴍ", 0.5 / 3.0, false),
        Widget::new("Widget 2", 1.5 / 3.0, false),
        Widget::new("Widget 3", 2.0 / 3.0, false),
        Widget::new("Header 2", 0.5 / 3.0, true), //header
        Widget::new("Widget 4", 1.0 / 3.0, false),
        Widget::new("Widget 5", 1.0 / 3.0, false),
        Widget::new("Widget 6", 1.0 / 3.0, false),
        Widget::new("Widget 7", 1.0 / 3.0, false),
        Widget::new("Widget 8", 1.0 / 3.0, false),
        Widget::new("Widget 9", 1.0 / 3.0, false),
        Widget::new("Widget 10", 1.0 / 3.0, false),
        Widget::new("Widget 11", 1.0 / 3.0, false),
        Widget::new("Widget 12", 1.0 / 3.0, false),
        Widget::new("Widget 13", 1.0 / 3.0, false),
        Widget::new("Widget 14", 1.0 / 3.0, false),
        Widget::new("Widget 15", 1.0 / 3.0, false),
        Widget::new("Widget 16", 1.0 / 3.0, false),
        Widget::new("Widget 17", 1.0 / 3.0, false),
        Widget::new("Widget 18", 1.0 / 3.0, false),
        Widget::new("Widget 19", 1.0 / 3.0, false),
        Widget::new("Widget 20", 1.0 / 3.0, false),
        Widget::new("Widget 21", 1.0 / 3.0, false),
        Widget::new("Widget 22", 1.0 / 3.0, false),
        Widget::new("Widget 23", 1.0 / 3.0, false),
        Widget::new("Widget 24", 1.0 / 3.0, false),
    ];

    let total_widgets = widgets.len(); // Total number of widgets

    view! {
        <>
            <style>
                {r#"
                @import url('https://fonts.cdnfonts.com/css/code-new-roman');
                html, body {
                    margin: 0;
                    padding: 0;
                    gap: 0;
                    height: 100%;
                    width: 100%;
                    overflow: hidden;
                    font-family: 'Code New Roman', monospace;
                    font-size: xx-large;
                    background-color: #7f7f7f;
                    color: white;
                }

                /* Hide scrollbars for any scrollable container */
                #app {
                    height: 100%;
                    overflow: hidden;
                    -ms-overflow-style: none;  /* IE and Edge */
                    scrollbar-width: none;  /* Firefox */
                }

                #app::-webkit-scrollbar {
                    display: none;  /* Chrome, Safari, Opera */
                }
                "#}
            </style>

            <div
                id="app"
                style=move || {
                    let (width, height) = window_size.get();
                    let window_aspect_ratio = width / height;

                    if window_aspect_ratio > ((total_widgets as f64).clamp(12.0, 24.0) * -0.0558 + 2.0) { //computes to 1.33 - 0.66 to allow smooth transition between views
                        // Landscape: allow for horizontal scrolling, wrap widgets into columns based on their height and aspect ratio
                        format!("display: flex; flex-wrap: wrap; flex-direction: column; height: 100%; width: {}px; overflow-x: auto; overflow-y: hidden; margin: 0; padding: 0; gap: 5px;", width)
                    } else {
                        // Portrait: vertical scrolling with grid layout
                        "display: grid; grid-template-columns: 1fr; grid-auto-rows: min-content; width: 100%; height: 100%; overflow-y: auto; gap: 5px;".to_string()
                    }
                }
            >
                {
                    widgets.iter().enumerate().map(|(index, widget)| {
                        let Widget { name, widget_aspect_ratio, is_header } = widget.clone();
                        view! {
                            <div
                                key=index
                                style=move || {
                                    let (width, height) = window_size.get();
                                    let window_aspect_ratio = width / height;

                                    let mut base_style;

                                    if window_aspect_ratio > ((total_widgets as f64).clamp(12.0, 24.0) * -0.0558 + 2.0) {
                                        // Landscape mode: widget width based on column calculation
                                        let column_width = height / ((total_widgets as f64).clamp(12.0, 24.0) / 16.0);
                                        let widget_height = column_width * widget_aspect_ratio; // Calculate height based on widget aspect ratio

                                        base_style = format!("width: {}px; height: {}px; display: flex; align-items: center; justify-content: center; box-sizing: border-box;", column_width, widget_height);
                                    } else {
                                        // Portrait mode: maintain aspect ratio relative to widget width
                                        let widget_width = width; // Use full width
                                        let widget_height = widget_width * widget_aspect_ratio; // Maintain aspect ratio

                                        base_style = format!("width: 100%; height: {}px; display: flex; align-items: center; justify-content: center; box-sizing: border-box;", widget_height);
                                    }

                                    // Add header-specific formatting if it's a header
                                    if is_header {
                                        base_style.push_str(" background-color: transparent; text-align: left; font-size: larger; padding: 0px 10px;");
                                    } else {
                                        base_style.push_str(" background-color: black;");
                                    }

                                    // Add sticky style to the first widget
                                    let sticky_style = if index == 0 { "position: sticky; top: 0; z-index: 1;" } else { "" };
                                    format!("{} {}", base_style, sticky_style)
                                }
                            >
                                {name}
                            </div>
                        }
                    }).collect::<Vec<_>>()
                }
            </div>
        </>
    }
}
