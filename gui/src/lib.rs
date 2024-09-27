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
use wasm_bindgen::JsCast;

#[wasm_bindgen(start)]
pub fn main() {
    console_error_panic_hook::set_once();
    setup_document();
    leptos::mount_to_body(|| view! { <App /> });
}

fn setup_document() {
    let document = window().unwrap().document().unwrap();

    document.set_title("welliuᴍ");

    let link: HtmlLinkElement = document.create_element("link").unwrap().dyn_into().unwrap();
    link.set_rel("icon");
    link.set_href("./favicon.ico");
    link.set_type("image/x-icon");
    document.head().unwrap().append_child(&link).unwrap();

    let meta: HtmlMetaElement = document.create_element("meta").unwrap().dyn_into().unwrap();
    meta.set_name("viewport");
    meta.set_content("width=device-width, initial-scale=1.0, user-scalable=no");
    document.head().unwrap().append_child(&meta).unwrap();
}

#[derive(Clone)]
struct Widget {
    name: &'static str,
    description: &'static str,
    widget_aspect_ratio: f64,
    is_header: bool,
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
fn ProgressBar(percent: f64) -> impl IntoView {
    let percent = percent.round();
    let width_percentage = format!("{:.0}%", percent);
    view! {
        <div class="progress-bar">
            <div class="progress" style:width=width_percentage></div>
        </div>
    }
}

#[component]
fn LabeledProgressBar(numerator: u32, denominator: u32) -> impl IntoView {
    let percent = if denominator != 0 {
        (numerator as f64 / denominator as f64) * 100.0
    } else {
        0.0
    }
    .round();

    view! {
        <div class="labeled-progress-bar">
            <div class="percentage-label">{ format!("{:.0}%", percent) }</div>
            <div class="progress-container">
                <ProgressBar percent=percent />
            </div>
            <div class="labels">
                <span class="label-left">0</span>
                <span class="label-center">{ numerator }</span>
                <span class="label-right">{ denominator }</span>
            </div>
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
        Widget::new(
            "",
            "",
            0.5 / 3.0,
            false,
            Rc::new(|| view! { <TextBlock text="welliuᴍ" /> }),
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
            "",
            0.5 / 3.0,
            true,
            Rc::new(|| view! { <TextBlock text="" /> }),
        ),
        // Updated Widgets: Replaced ProgressBar with LabeledProgressBar
        Widget::new(
            "Widget 4",
            "This is the description for Widget 4.",
            1.0 / 3.0,
            false,
            Rc::new(|| view! { <LabeledProgressBar numerator=0 denominator=100 /> }),
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
            Rc::new(|| view! { <LabeledProgressBar numerator=10 denominator=100 /> }),
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
            Rc::new(|| view! { <LabeledProgressBar numerator=20 denominator=100 /> }),
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
            Rc::new(|| view! { <LabeledProgressBar numerator=30 denominator=100 /> }),
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
            Rc::new(|| view! { <LabeledProgressBar numerator=40 denominator=100 /> }),
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
            Rc::new(|| view! { <LabeledProgressBar numerator=50 denominator=100 /> }),
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
            Rc::new(|| view! { <LabeledProgressBar numerator=60 denominator=100 /> }),
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
            Rc::new(|| view! { <LabeledProgressBar numerator=70 denominator=100 /> }),
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
            Rc::new(|| view! { <LabeledProgressBar numerator=80 denominator=100 /> }),
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
            Rc::new(|| view! { <LabeledProgressBar numerator=90 denominator=100 /> }),
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
            Rc::new(|| view! { <LabeledProgressBar numerator=100 denominator=100 /> }),
        ),
    ];

    let total_widgets = widgets.len();

    let selected_widget = create_rw_signal::<Option<Widget>>(None);

    view! {
        <>
            <style>
                {r#"
                @import url('https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,100..900;1,100..900&display=swap');
                @import url('https://fonts.cdnfonts.com/css/code-new-roman');

                :root {
                    --background-color: #7f7f7f; 
                    --widget-background: black;
                    --text-color: white;
                    --accent-color: #007fff;
                    --progress-color: var(--accent-color);
                    --faded-background: rgba(255, 255, 255, 0.15);
                    --border-radius: 10vw;
                    --drop-shadow: 0px 0px 0.5vw rgba(255, 255, 255, 0.5);
                }

                * {
                    -webkit-overflow-scrolling: touch;
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                    justify-content: center;
                    align-items: center;
                    text-align: center;
                    color: var(--text-color);
                }

                *-webkit-scrollbar {
                    display: none;
                }

                html, body {
                    margin: 0;
                    height: 100%;
                    width: 100%;
                    overflow: hidden;
                    background-color: var(--background-color);
                    font-size: x-large;
                    font-family: "Noto Sans", sans-serif;
                    font-weight: 400;
                }

                #app {
                    height: 100%;
                    overflow: hidden;
                    align-items: flex-start;
                    justify-content: flex-start; 
                }

                .widget-content {
                    background-color: black;
                    display: flex;
                    flex-direction: column;
                    width: 100%;
                    height: 100%;
                    cursor: pointer;
                }

                .widget-title {
                    font-weight: 500;
                }

                .widget-main-content {
                    flex: 2;
                    display: flex;
                    align-items: center;
                    width: 100%;
                    height: auto;

                }

                .widget-description {
                    font-size: large;
                }

                .widget-title,
                .widget-description {
                    flex: 1;
                    display: flex;
                }

                #title-widget {
                    display: block;
                    position: sticky; 
                    top: 0; 
                    z-index: 1;
                    font-family: 'Code New Roman', monospace;
                    font-size: xxx-large;
                }

                #title-widget .widget-content {
                    cursor: default;                
                }

                .header-widget {
                    justify-content: flex-end; 
                    background-color: transparent;
                    cursor: default;
                }

                .header-title {
                    color: var(--widget-background);
                    font-weight: 700;
                    font-size: xx-large;
                }
                
                .labeled-progress-bar {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    width: 75%;
                    margin: 0 auto;
                    height: 100%;
                    font-size: medium;
                }

                .percentage-label {
                    flex: 0 0 25%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 600;
                }

                .progress-container {
                    flex: 0 0 50%;
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .progress-bar {
                    width: 100%;
                    height: 100%;
                    padding: 2%;
                    box-sizing: border-box;
                    border-radius: var(--border-radius);
                    background-color: var(--text-color);
                    overflow: hidden;
                    position: relative;
                }

                .progress {
                    width: calc(100% - 4%);
                    height: 100%;
                    background-color: var(--progress-color);
                    border-radius: calc(var(--border-radius) - 1%);
                    box-sizing: border-box;
                    margin-left: 0;
                }

                .labels {
                    flex: 0 0 25%;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    width: 100%;
                }

                .label-left,
                .label-center,
                .label-right {
                    width: 33%;
                }

                .label-left {
                    text-align: left;
                }

                .label-right {
                    text-align: right;
                }


                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: var(--faded-background);
                    z-index: 1000;
                    overflow-y: hidden;
                }

                .modal-content {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    width: 100%;
                    height: 66.66vh;
                    background-color: var(--widget-background);
                    border-top-left-radius: var(--border-radius);
                    border-top-right-radius: var(--border-radius);
                    overflow-y: auto;
                    overflow-x: hidden;
                }

                .modal-main-content {
                    height:25%;
                }

                .modal-history p {
                    text-align: left;
                    border-top: 1px solid var(--background-color);
                    padding: 0 1vw;
                }

                "#}
            </style>

            <div
                id="app"
                style=move || {
                    let (width, height) = window_size.get();
                    let window_aspect_ratio = width / height;

                    if window_aspect_ratio > ((total_widgets as f64).clamp(12.0, 24.0) * -0.0558 + 2.0) {
                        format!("display: flex; flex-wrap: wrap; flex-direction: column; height: 100%; width: {}px; overflow-x: auto; overflow-y: hidden; margin: 0; padding: 0; gap: 5px;", width)
                    } else {
                        "display: grid; grid-template-columns: 1fr; grid-auto-rows: min-content; width: 100%; height: 100%; overflow-y: auto; gap: 5px;".to_string()
                    }
                }
            >
            {
                widgets.iter().enumerate().map(|(index, widget)| {
                    let widget_clone = widget.clone();
                    view! {
                        <WidgetComponent
                            widget=widget_clone
                            index=index
                            window_size=window_size
                            total_widgets=total_widgets
                            set_selected_widget=selected_widget
                        />
                    }
                }).collect::<Vec<_>>()  
            }
            </div>

            <Show
                when=move || selected_widget.get().is_some()
                fallback=|| ()
            >
                {
                    move || {
                        if let Some(widget) = selected_widget.get() {
                            view! {
                                <ModalComponent
                                    widget=widget.clone()
                                    on_close=move || selected_widget.set(None)
                                />
                            }
                        } else {
                            ().into_view()
                        }
                    }
                }
            </Show>
            </>
    }
}

#[component]
fn WidgetComponent(
    widget: Widget,
    index: usize,
    window_size: ReadSignal<(f64, f64)>,
    total_widgets: usize,
    set_selected_widget: RwSignal<Option<Widget>>,
) -> impl IntoView {
    let Widget { name, description, widget_aspect_ratio, is_header, content, .. } = widget.clone();

    view! {
        <div
            key=index
            class="widget"
            on:click=move |_| {
                if !widget.is_header && index != 0 {
                    set_selected_widget.set(Some(widget.clone()));
                }
            }
            id=move || if index == 0 { Some("title-widget") } else { None }
            style=move || {
                let (width, height) = window_size.get();
                let window_aspect_ratio = width / height;

                let base_style;

                if window_aspect_ratio > ((total_widgets as f64).clamp(12.0, 24.0) * -0.0558 + 2.0) {
                    let column_width = height / ((total_widgets as f64).clamp(12.0, 24.0) / 16.0);
                    let widget_height = column_width * widget_aspect_ratio;
                    base_style = format!("width: {}px; height: {}px; display: flex; align-items: center; justify-content: center; box-sizing: border-box;", column_width, widget_height);
                } else {
                    let widget_width = width;
                    let widget_height = widget_width * widget_aspect_ratio;
                    base_style = format!("width: 100%; height: {}px; display: flex; align-items: center; justify-content: center; box-sizing: border-box;", widget_height);
                }
                
                base_style
            }
        >
            <div class={if is_header { "widget-content header-widget" } else { "widget-content" }}>
                <div class={if is_header { "header-title" } else { "widget-title" }}>{name}</div>
                <Show when=move || !is_header>
                    <>
                        <div class="widget-main-content">{ (content)() }</div>
                        <div class="widget-description">{description}</div>
                    </>
                </Show>
            </div>
        </div>
    }
}

#[component]
fn ModalComponent(widget: Widget, on_close: impl Fn() + 'static) -> impl IntoView {
    use std::rc::Rc;

    let on_close_rc = Rc::new(on_close);

    let modal_content_ref = create_node_ref::<html::Div>();

    let on_close_click = {
        let on_close_rc = on_close_rc.clone();
        move |_| {
            (on_close_rc)();
        }
    };

    let on_wheel = {
        let on_close_rc = on_close_rc.clone();
        let modal_content_ref = modal_content_ref.clone();

        move |e: web_sys::WheelEvent| {
            if let Some(content) = modal_content_ref.get() {
                let scroll_top = content.scroll_top();
                if e.delta_y() < 0.0 && scroll_top <= 0 {
                    e.prevent_default();
                    (on_close_rc)();
                }
            }
        }
    };

    let historical_data = (0..30)
        .map(|i| {
            view! { <p>{format!("Historical data entry {}", i + 1)}</p> }
        })
        .collect::<Vec<_>>();

    view! {
        <div
            class="modal-overlay"
            on:click=on_close_click
        >
            <div
                class="modal-content"
                node_ref=modal_content_ref
                on:click=|e| e.stop_propagation()
                on:wheel=on_wheel
            >
                <div class="modal-header">
                    <h2>{widget.name}</h2>
                </div>
                <div class="modal-main-content">
                    { (widget.content)() }
                </div>
                <div class="modal-history">
                    { historical_data }
                </div>
            </div>
        </div>
    }
}
