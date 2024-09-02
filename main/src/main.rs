#[cfg(target_os = "android")]
use android_io::connect_bluetooth;

#[cfg(target_os = "ios")]
use ios_io::connect_bluetooth;

use gui::main as run;

fn main() {
    run(); // Start the Iced app
}
