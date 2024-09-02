// // This Source Code Form is subject to the terms of the Mozilla Public
// // License, v. 2.0. If a copy of the MPL was not distributed with this
// // file, You can obtain one at https://mozilla.org/MPL/2.0/.
// //
// // Copyright 2024 by The Lindemans, LLC
// //
//
//
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

    let widgets = vec![
        "welliuᴍ", "Widget 2", "Widget 3", "Widget 4", "Widget 5", "Widget 6", "Widget 7", "Widget 8", "Widget 9", "Widget 10", 
        "Widget 11", "Widget 12", "Widget 13", "Widget 14", "Widget 15", "Widget 16", "Widget 17", "Widget 18", "Widget 19", "Widget 20", 
        "Widget 21", "Widget 22", "Widget 23", "Widget 24", // Ensure we have 24 widgets
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
                    let aspect_ratio = width / height;
                    if aspect_ratio > 0.66 {
                        // Landscape: allow for horizontal scrolling, wrap widgets into columns
                        "display: flex; flex-wrap: wrap; flex-direction: column; height: 100%; overflow-x: auto; overflow-y: hidden; margin: 0; padding: 0; gap: 0;"
                    } else {
                        // Portrait: stack widgets vertically, allow vertical scrolling if needed
                        "display: flex; flex-direction: column; height: 100%; overflow-y: auto; overflow-x: hidden; margin: 0; padding: 0; gap: 0;"
                    }
                }
            >
                {
                    widgets.iter().enumerate().map(|(index, widget)| {
                        view! {
                            <div
                                key=index
                                style=move || {
                                    let base_style = "aspect-ratio: 2 / 1; background-color: black; display: flex; align-items: center; justify-content: center; box-sizing: border-box; padding: 0; gap: 0;";
                                    let (width, height) = window_size.get();
                                    let aspect_ratio = width / height;

                                    if aspect_ratio > 0.66 {
                                        // Landscape: 4 widgets per column
                                        let is_last_column = (index / 6 + 1) * 6 >= total_widgets;
                                        let is_last_row = (index % 6 == 5) || (index == total_widgets - 1);
                                        let margin_right = if is_last_column { "0" } else { "5px" };
                                        let margin_bottom = if is_last_row { "0" } else { "5px" };
                                        format!("{} flex: 0 0 calc(16.67% - 4.25px); margin: 0 {} {} 0;", base_style, margin_right, margin_bottom)
                                    } else {
                                        // Portrait: full width, no bottom margin for the last widget
                                        let margin_bottom = if index == total_widgets - 1 { "0" } else { "5px" };
                                        format!("{} flex: 0 0 auto; width: 100%; margin: 0 0 {} 0;", base_style, margin_bottom)
                                    }
                                }
                            >
                                {*widget}
                            </div>
                        }
                    }).collect::<Vec<_>>()
                }
            </div>
        </>
    }
}
