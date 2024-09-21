//  This Source Code Form is subject to the terms of the Mozilla Public
//  License, v. 2.0. If a copy of the MPL was not distributed with this
//  file, You can obtain one at https://mozilla.org/MPL/2.0/.
//
//  Copyright 2024 — by The Lindemans, LLC
//
use leptos::*;
use wasm_bindgen::prelude::*;
use web_sys::{window, HtmlLinkElement, HtmlMetaElement};
use std::rc::Rc;

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
    description: &'static str,
    widget_aspect_ratio: f64, // Static aspect ratio for each widget
    is_header: bool,          // Indicates if the widget is a header
    content: Rc<dyn Fn() -> View>,
}

impl Widget {
    fn new(
        name: &'static str,
        description: &'static str,
        widget_aspect_ratio: f64,
        is_header: bool,
        content: Rc<dyn Fn() -> View>,
    ) -> Self {
        Widget {
            name,
            description,
            widget_aspect_ratio,
            is_header,
            content,
        }
    }
}

#[component]
fn ProgressBar() -> impl IntoView {
    view! {
        <div class="progress-bar">
            <div class="progress" style="width: 50%; background-color: green; height: 20px;"></div>
        </div>
    }
}

#[component]
fn TextBlock(text: &'static str) -> impl IntoView {
    view! {
        <p>{text}</p>
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
        Widget::new(
            "Widget 1",
            "This is the description for Widget 1.",
            0.5 / 3.0,
            false,
            Rc::new(|| view! { <ProgressBar /> }),
        ),
        Widget::new(
            "Widget 2",
            "This is the description for Widget 2.",
            1.5 / 3.0,
            false,
            Rc::new(|| view! { <TextBlock text="Sample text for Widget 2." /> }),
        ),
        Widget::new(
            "Widget 3",
            "This is the description for Widget 3.",
            2.0 / 3.0,
            false,
            Rc::new(|| view! { <TextBlock text="Another sample text for Widget 3." /> }),
        ),
        Widget::new(
            "Header 2",
            "This is a header widget.",
            0.5 / 3.0,
            true,
            Rc::new(|| view! { <TextBlock text="" /> }), // No content for header widget
        ),
        Widget::new(
            "Widget 4",
            "This is the description for Widget 4.",
            1.0 / 3.0,
            false,
            Rc::new(|| view! { <ProgressBar /> }),
        ),
        Widget::new(
            "Widget 5",
            "This is the description for Widget 5.",
            1.0 / 3.0,
            false,
            Rc::new(|| view! { <TextBlock text="Text block for Widget 5." /> }),
        ),
        Widget::new(
            "Widget 6",
            "This is the description for Widget 6.",
            1.0 / 3.0,
            false,
            Rc::new(|| view! { <ProgressBar /> }),
        ),
        Widget::new(
            "Widget 7",
            "This is the description for Widget 7.",
            1.0 / 3.0,
            false,
            Rc::new(|| view! { <TextBlock text="Sample content for Widget 7." /> }),
        ),
        Widget::new(
            "Widget 8",
            "This is the description for Widget 8.",
            1.0 / 3.0,
            false,
            Rc::new(|| view! { <ProgressBar /> }),
        ),
        Widget::new(
            "Widget 9",
            "This is the description for Widget 9.",
            1.0 / 3.0,
            false,
            Rc::new(|| view! { <TextBlock text="Text block for Widget 9." /> }),
        ),
        Widget::new(
            "Widget 10",
            "This is the description for Widget 10.",
            1.0 / 3.0,
            false,
            Rc::new(|| view! { <ProgressBar /> }),
        ),
        Widget::new(
            "Widget 11",
            "This is the description for Widget 11.",
            1.0 / 3.0,
            false,
            Rc::new(|| view! { <TextBlock text="Sample content for Widget 11." /> }),
        ),
        Widget::new(
            "Widget 12",
            "This is the description for Widget 12.",
            1.0 / 3.0,
            false,
            Rc::new(|| view! { <ProgressBar /> }),
        ),
        Widget::new(
            "Widget 13",
            "This is the description for Widget 13.",
            1.0 / 3.0,
            false,
            Rc::new(|| view! { <TextBlock text="Text block for Widget 13." /> }),
        ),
        Widget::new(
            "Widget 14",
            "This is the description for Widget 14.",
            1.0 / 3.0,
            false,
            Rc::new(|| view! { <ProgressBar /> }),
        ),
        Widget::new(
            "Widget 15",
            "This is the description for Widget 15.",
            1.0 / 3.0,
            false,
            Rc::new(|| view! { <TextBlock text="Sample content for Widget 15." /> }),
        ),
        Widget::new(
            "Widget 16",
            "This is the description for Widget 16.",
            1.0 / 3.0,
            false,
            Rc::new(|| view! { <ProgressBar /> }),
        ),
        Widget::new(
            "Widget 17",
            "This is the description for Widget 17.",
            1.0 / 3.0,
            false,
            Rc::new(|| view! { <TextBlock text="Text block for Widget 17." /> }),
        ),
        Widget::new(
            "Widget 18",
            "This is the description for Widget 18.",
            1.0 / 3.0,
            false,
            Rc::new(|| view! { <ProgressBar /> }),
        ),
        Widget::new(
            "Widget 19",
            "This is the description for Widget 19.",
            1.0 / 3.0,
            false,
            Rc::new(|| view! { <TextBlock text="Sample content for Widget 19." /> }),
        ),
        Widget::new(
            "Widget 20",
            "This is the description for Widget 20.",
            1.0 / 3.0,
            false,
            Rc::new(|| view! { <ProgressBar /> }),
        ),
        Widget::new(
            "Widget 21",
            "This is the description for Widget 21.",
            1.0 / 3.0,
            false,
            Rc::new(|| view! { <TextBlock text="Text block for Widget 21." /> }),
        ),
        Widget::new(
            "Widget 22",
            "This is the description for Widget 22.",
            1.0 / 3.0,
            false,
            Rc::new(|| view! { <ProgressBar /> }),
        ),
        Widget::new(
            "Widget 23",
            "This is the description for Widget 23.",
            1.0 / 3.0,
            false,
            Rc::new(|| view! { <TextBlock text="Sample content for Widget 23." /> }),
        ),
        Widget::new(
            "Widget 24",
            "This is the description for Widget 24.",
            1.0 / 3.0,
            false,
            Rc::new(|| view! { <ProgressBar /> }),
        ),
    ];

    let total_widgets = widgets.len(); // Total number of widgets

    // Signal to track the selected widget for the modal
    let (selected_widget, set_selected_widget) = create_signal::<Option<Widget>>(None);

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

                .widget-content {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    height: 100%;
                }

                .widget-title {
                    text-align: center;
                    font-weight: bold;
                    margin-bottom: 5px;
                }

                .header-title {
                    align-self: flex-end; /* Bottom-align the title */
                    margin-bottom: 0; /* Adjust margin as needed */
                    padding: 5px 10px; /* Optional padding adjustment */
                    font-size: larger; /* Optional: Increase font size for headers */
                }

                .widget-main-content {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .widget-description {
                    text-align: center;
                    margin-top: 5px;
                }

                /* Modal styles */
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: flex-end;
                    justify-content: center;
                    z-index: 1000;
                }

                .modal-content {
                    background: #fff;
                    width: 100%;
                    height: 66%;
                    border-top-left-radius: 10px;
                    border-top-right-radius: 10px;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }

                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px;
                    background-color: #f1f1f1;
                }

                .modal-main-content {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .modal-history {
                    height: 150px;
                    overflow-y: auto;
                    background-color: #e9e9e9;
                    padding: 10px;
                }

                .modal-history p {
                    margin: 0;
                    padding: 5px 0;
                    border-bottom: 1px solid #ccc;
                }

                "#}
            </style>

            <div
                id="app"
                style=move || {
                    let (width, height) = window_size.get();
                    let window_aspect_ratio = width / height;

                    if window_aspect_ratio > ((total_widgets as f64).clamp(12.0, 24.0) * -0.0558 + 2.0) {
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
                        let widget_clone = widget.clone();
                        let set_selected_widget = set_selected_widget.clone();
                        let window_size = window_size.clone();
                        view! {
                            <WidgetComponent
                                widget=widget_clone
                                index=index
                                window_size=window_size
                                total_widgets=total_widgets
                                set_selected_widget=set_selected_widget
                            />
                        }
                    }).collect::<Vec<_>>()
                }
            </div>

            { selected_widget.get().map(|widget| {
                view! {
                    <ModalComponent
                        widget=widget.clone()
                        on_close=move || set_selected_widget.set(None)
                    />
                }
            }) }
        </>
    }
}

#[component]
fn WidgetComponent(
    widget: Widget,
    index: usize,
    window_size: ReadSignal<(f64, f64)>,
    total_widgets: usize,
    set_selected_widget: WriteSignal<Option<Widget>>,
) -> impl IntoView {
    let Widget { name, description, widget_aspect_ratio, is_header, content, .. } = widget.clone();

    view! {
        <div
            key=index
            on:click=move |_| {
                set_selected_widget.set(Some(widget.clone()));
            }
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
                    base_style.push_str(" background-color: transparent; text-align: left; padding: 0px 10px;");
                } else {
                    base_style.push_str(" background-color: black;");
                }

                // Add sticky style to the first widget
                let sticky_style = if index == 0 { "position: sticky; top: 0; z-index: 1;" } else { "" };
                format!("{} {}", base_style, sticky_style)
            }
        >
            <div class="widget-content">
                <div class={if is_header { "header-title" } else { "widget-title" }}>{name}</div>
                <div class="widget-main-content">{ (content)() }</div>
                <div class="widget-description">{description}</div>
            </div>
        </div>
    }
}

#[component]
fn ModalComponent(widget: Widget, on_close: impl Fn() + 'static) -> impl IntoView {
    view! {
        <div class="modal-overlay" on:click=move |_| on_close()>
            <div class="modal-content" on:click=|e| e.stop_propagation()>
                <div class="modal-header">
                    <h2>{widget.name}</h2>
                </div>
                <div class="modal-main-content">
                    { (widget.content)() }
                </div>
                <div class="modal-history">
                    // Render history data here
                    <p>"Previous day's data for {widget.name}..."</p>
                    <p>"Another entry for {widget.name}..."</p>
                    <p>"More historical data for {widget.name}..."</p>
                    // Add more history entries as needed
                </div>
            </div>
        </div>
    }
}
