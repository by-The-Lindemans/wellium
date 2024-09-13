//  This Source Code Form is subject to the terms of the Mozilla Public
//  License, v. 2.0. If a copy of the MPL was not distributed with this
//  file, You can obtain one at https://mozilla.org/MPL/2.0/.
// 
//  Copyright 2024 — by The Lindemans, LLC
//
//
#[cfg(target_os = "android")]
use android_io::connect_bluetooth;

#[cfg(target_os = "ios")]
use ios_io::connect_bluetooth;

use gui::main as run;

fn main() {
    run(); // Start the Iced app
}
