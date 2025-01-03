//  This Source Code Form is subject to the terms of the Mozilla Public
//  License, v. 2.0. If a copy of the MPL was not distributed with this
//  file, You can obtain one at https://mozilla.org/MPL/2.0/.

use leptos::*;
use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::JsFuture;
use web_sys::{window, IdbDatabase, IdbFactory, IdbOpenDbRequest, IdbRequest, IdbTransactionMode, HtmlInputElement, HtmlLinkElement, HtmlMetaElement, js_sys};
use js_sys::{Promise, Date, Array};
use std::rc::Rc;
use wasm_bindgen::JsCast;
use serde::{Serialize, Deserialize};
use serde_wasm_bindgen;
use gloo_console as console;

// Database Structures and Implementation
#[derive(Serialize, Deserialize, Clone, Debug)]
struct WidgetEntry {
    widget_id: String,
    timestamp: String,
    content: String,
}

#[derive(Clone)]
struct DbConnection {
    db: IdbDatabase,
}

impl DbConnection {
    async fn new() -> Result<Self, JsValue> {
        let window = web_sys::window().unwrap();
        let idb: IdbFactory = window.indexed_db()?.unwrap();
        
        // Create a Promise that will resolve with our database
        let db_promise = Promise::new(&mut |resolve, reject| {
            let open_request: IdbOpenDbRequest = idb.open_with_u32("widget_storage", 1)
                .expect("Failed to create open request");

            // Keep closures alive for the duration of the request
            let success_closure = Closure::wrap(Box::new(move |event: web_sys::Event| {
                let target = event.target().expect("Event should have target");
                let req: IdbRequest = target.dyn_into().expect("Target should be IDBRequest");
                let result = req.result().expect("Request should have result");
                let db: IdbDatabase = result.dyn_into().expect("Result should be IDBDatabase");
                resolve.call1(&JsValue::NULL, &db).expect("Failed to resolve promise");
            }) as Box<dyn FnMut(web_sys::Event)>);

            let error_closure = Closure::wrap(Box::new(move |event: web_sys::Event| {
                reject.call1(&JsValue::NULL, &event).expect("Failed to reject promise");
            }) as Box<dyn FnMut(web_sys::Event)>);

            let upgrade_closure = Closure::wrap(Box::new(move |event: web_sys::Event| {
                let target = event.target().expect("Event should have target");
                let req: IdbRequest = target.dyn_into().expect("Target should be IDBRequest");
                let result = req.result().expect("Request should have result");
                let db: IdbDatabase = result.dyn_into().expect("Result should be IDBDatabase");
                
                match db.create_object_store("widget_entries") {
                    Ok(_) => (),
                    Err(e) => {
                        console::error!("Failed to create object store:", e);
                    }
                }
            }) as Box<dyn FnMut(web_sys::Event)>);

            // Set the event handlers
            open_request.set_onsuccess(Some(success_closure.as_ref().unchecked_ref()));
            open_request.set_onerror(Some(error_closure.as_ref().unchecked_ref()));
            open_request.set_onupgradeneeded(Some(upgrade_closure.as_ref().unchecked_ref()));

            // Leak the closures so they stay alive
            success_closure.forget();
            error_closure.forget();
            upgrade_closure.forget();
        });

        // Wait for the database to be ready
        let db = JsFuture::from(db_promise).await?;
        let db: IdbDatabase = db.dyn_into()?;
        
        Ok(DbConnection { db })
    }
    
    async fn add_entry(&self, widget_id: &str, content: &str) -> Result<WidgetEntry, JsValue> {
        let store_name = "widget_entries";
        let transaction = self.db.transaction_with_str_sequence_and_mode(
            &Array::of1(&JsValue::from_str(store_name)),
            IdbTransactionMode::Readwrite,
        )?;
        
        let store = transaction.object_store(store_name)?;
        
        let entry = WidgetEntry {
            widget_id: widget_id.to_string(),
            timestamp: Date::new_0().to_iso_string().as_string().unwrap(),
            content: content.to_string(),
        };
        
        let entry_js = serde_wasm_bindgen::to_value(&entry)?;
        let request = store.put(&entry_js)?;
        let promise: Promise = request.dyn_into()?;
        JsFuture::from(promise).await?;
        
        Ok(entry)
    }
    
    async fn get_entries(&self, widget_id: &str) -> Result<Vec<WidgetEntry>, JsValue> {
        let store_name = "widget_entries";
        let transaction = self.db.transaction_with_str_sequence(
            &Array::of1(&JsValue::from_str(store_name))
        )?;
        
        let store = transaction.object_store(store_name)?;
        let request = store.get_all()?;
        let promise: Promise = request.dyn_into()?;
        let result = JsFuture::from(promise).await?;
        
        let entries: Vec<WidgetEntry> = result
            .dyn_into::<js_sys::Array>()?
            .iter()
            .filter_map(|entry| {
                serde_wasm_bindgen::from_value(entry).ok()
                    .and_then(|entry: WidgetEntry| {
                        if entry.widget_id == widget_id {
                            Some(entry)
                        } else {
                            None
                        }
                    })
            })
            .collect();
        
        Ok(entries)
    }
}

// Widget Components and Implementation
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

    fn widget_id(&self) -> String {
        if self.name.is_empty() {
            "widget-title".to_string()
        } else {
            format!("widget-{}", self.name.to_lowercase().replace(" ", "-"))
        }
    }
}

#[component]
fn InputBlock(
    placeholder: &'static str,
) -> impl IntoView {
    let widget = expect_context::<Widget>();
    let widget_id = widget.widget_id();
    let db = expect_context::<DbConnection>();
    let db_effect = db.clone();
    let db_submit = db.clone();
    
    let (input_value, set_input_value) = create_signal(String::new());
    let (history, set_history) = create_signal(Vec::<WidgetEntry>::new());
    let (latest_entry, set_latest_entry) = create_signal(String::new());
    
    // Load initial history and set latest entry
    let widget_id_clone = widget_id.clone();
    create_effect(move |_| {
        let db = db_effect.clone();
        let widget_id = widget_id_clone.clone();
        spawn_local(async move {
            match db.get_entries(&widget_id).await {
                Ok(entries) => {
                    set_history.set(entries.clone());
                    if let Some(latest) = entries.first() {
                        set_latest_entry.set(latest.content.clone());
                    }
                }
                Err(e) => {
                    console::error!("Failed to load entries:", e);
                }
            }
        });
    });
    
    let handle_input = move |ev| {
        let input = event_target::<HtmlInputElement>(&ev);
        set_input_value.set(input.value());
    };
    
    let widget_id_submit = widget_id.clone();
    let handle_submit = move |ev: web_sys::SubmitEvent| {
        ev.prevent_default();
        let current_value = input_value.get();
        if !current_value.is_empty() {
            let db = db_submit.clone();
            let widget_id = widget_id_submit.clone();
            let value = current_value.clone();
            spawn_local(async move {
                match db.add_entry(&widget_id, &value).await {
                    Ok(entry) => {
                        set_history.update(|h| {
                            let mut new_history = vec![entry.clone()];
                            new_history.extend(h.iter().cloned());
                            *h = new_history;
                        });
                        set_latest_entry.set(value);
                    }
                    Err(e) => {
                        console::error!("Failed to add entry:", e);
                    }
                }
            });
            set_input_value.set(String::new());
        }
    };

    view! {
        <div class="input-block">
            <form on:submit=handle_submit>
                <input
                    type="text"
                    value=input_value
                    on:input=handle_input
                    placeholder=placeholder
                />
            </form>
            <div class="history-display">
                <Show
                    when=move || !latest_entry.get().is_empty()
                    fallback=|| view! { <p>"No entries yet"</p> }
                >
                    <p>{move || latest_entry.get()}</p>
                </Show>
            </div>
        </div>
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

#[wasm_bindgen(start)]
pub fn main() {
    console_error_panic_hook::set_once();
    setup_document();
    
    spawn_local(async {
        match DbConnection::new().await {
            Ok(db) => {
                leptos::mount_to_body(move || view! {
                    <Provider value=db>
                        <App />
                    </Provider>
                });
            }
            Err(e) => {
                // More detailed error logging
                console::error!("Failed to initialize database");
                console::error!("Error details:", e);
                
                // Mount a basic error message for the user
                leptos::mount_to_body(|| view! {
                    <div style="padding: 20px; color: red;">
                        "Failed to initialize application. Please refresh the page or contact support."
                    </div>
                });
            }
        }
    });
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
        "This is the query for Widget 7.",
        1.0 / 3.0,
        false,
        Rc::new(|| view! { <InputBlock 
            placeholder="Type something..."
        /> }),
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
        "This is the query for Widget 11.",
        1.0 / 3.0,
        false,
        Rc::new(|| view! { <InputBlock 
            placeholder="Type something..."
        /> }),
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
        "This is the query for Widget 15.",
        1.0 / 3.0,
        false,
        Rc::new(|| view! { <InputBlock 
            placeholder="Type something..."
        /> }),
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
        "This is the query for Widget 19.",
        1.0 / 3.0,
        false,
        Rc::new(|| view! { <InputBlock 
            placeholder="Type something..."
        /> }),
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
        "This is the query for Widget 23.",
        1.0 / 3.0,
        false,
        Rc::new(|| view! { <InputBlock 
            placeholder="Type something..."
        /> }),
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
                --accent-color: #3F7FBF;
                --progress-color: #3F7FBF;
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
                font-weight: 300;
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
                padding: 1%;
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
                border-radius: var(--border-radius);
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
                overflow-y: auto;
                overflow-x: hidden;
            }

            .modal-main-content {
                height:25%;
            }
                
            .input-block {
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                padding: 1vw;
                box-sizing: border-box;
            }

            .input-block form {
                width: 100%;
                margin-bottom: 1vw;
            }

            .input-block input {
                width: 100%;
                padding: 1vw;
                border: none;
                border-radius: var(--border-radius);
                background-color: var(--faded-background);
                color: var(--text-color);
                font-family: "Noto Sans", sans-serif;
                font-size: large;
                box-sizing: border-box;
            }

            .input-block input:focus {
                outline: none;
                box-shadow: var(--drop-shadow);
            }

            .input-block input::placeholder {
                color: var(--text-color);
                opacity: 0.5;
            }

            .history-display {
                flex: 1;
                overflow-y: auto;
                width: 100%;
            }

            .history-display p {
                margin: 0.5vw 0;
                padding: 1vw;
                background-color: var(--faded-background);
                border-radius: var(--border-radius);
                text-align: left;
            }

            .modal-history p {
                margin: 1vw;
                padding: 1vw;
                background-color: var(--faded-background);
                border-radius: var(--border-radius);
                border-top: none;
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
    let widget_for_click = widget.clone();
    let widget_for_provider = widget.clone();

    view! {
        <div
            key=index
            class="widget"
            on:click=move |_| {
                if !widget_for_click.is_header && index != 0 {
                    set_selected_widget.set(Some(widget_for_click.clone()));
                }
            }
            id=move || if index == 0 { Some("title-widget") } else { None }
            style=move || {
                let (width, height) = window_size.get();
                let window_aspect_ratio = width / height;

                let base_style = if window_aspect_ratio > ((total_widgets as f64).clamp(12.0, 24.0) * -0.0558 + 2.0) {
                    let column_width = height / ((total_widgets as f64).clamp(12.0, 24.0) / 16.0);
                    let widget_height = column_width * widget_aspect_ratio;
                    format!("width: {}px; height: {}px; display: flex; align-items: center; justify-content: center; box-sizing: border-box;", column_width, widget_height)
                } else {
                    let widget_width = width;
                    let widget_height = widget_width * widget_aspect_ratio;
                    format!("width: 100%; height: {}px; display: flex; align-items: center; justify-content: center; box-sizing: border-box;", widget_height)
                };

                base_style
            }
        >
            <Provider value=widget_for_provider>
                <div class={if is_header { "widget-content header-widget" } else { "widget-content" }}>
                    <div class={if is_header { "header-title" } else { "widget-title" }}>{name}</div>
                    <Show when=move || !is_header>
                        <>
                            <div class="widget-main-content">{ (content)() }</div>
                            <div class="widget-description">{description}</div>
                        </>
                    </Show>
                </div>
            </Provider>
        </div>
    }
}

#[component]
fn ModalComponent(widget: Widget, on_close: impl Fn() + 'static) -> impl IntoView {
    let db = expect_context::<DbConnection>();
    let db_effect = db.clone();
    let widget_id = widget.widget_id();
    let (history, set_history) = create_signal(Vec::<WidgetEntry>::new());
    
    create_effect(move |_| {
        let db = db_effect.clone();
        let widget_id = widget_id.clone();
        spawn_local(async move {
            match db.get_entries(&widget_id).await {
                Ok(entries) => {
                    set_history.set(entries);
                }
                Err(e) => {
                    console::error!("Failed to load modal entries:", e);
                }
            }
        });
    });

    let modal_content_ref = create_node_ref::<html::Div>();
    let on_close_rc = Rc::new(on_close);

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
                <Provider value=widget.clone()>
                    <div class="modal-main-content">
                        { (widget.content)() }
                    </div>
                </Provider>
                <div class="modal-history">
                    <Show
                        when=move || !history.get().is_empty()
                        fallback=|| view! { <p>"No historical data"</p> }
                    >
                        {move || history.get().iter().map(|entry| {
                            view! {
                                <div class="history-entry">
                                    <p class="entry-content">{&entry.content}</p>
                                    <p class="entry-timestamp">{&entry.timestamp}</p>
                                </div>
                            }
                        }).collect::<Vec<_>>()}
                    </Show>
                </div>
            </div>
        </div>
    }
}