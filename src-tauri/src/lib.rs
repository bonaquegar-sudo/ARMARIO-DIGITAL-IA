use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// Writes a backup file where the user can reach it from the other device:
/// - iPad: the app's Documents folder (Files → On My iPad → Armario Digital).
/// - Windows: iCloud Drive if iCloud for Windows is installed, otherwise Documents.
#[tauri::command]
fn guardar_copia(app: AppHandle, nombre: String, datos: String) -> Result<String, String> {
    if nombre.contains(['/', '\\']) {
        return Err("Nombre de archivo no válido".into());
    }
    let path = app.path();
    let icloud: Option<PathBuf> = path.home_dir().ok().map(|h| h.join("iCloudDrive")).filter(|d| d.is_dir());
    let dir = match icloud {
        Some(d) if cfg!(desktop) => d,
        _ => path.document_dir().map_err(|e| e.to_string())?,
    };
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let file = dir.join(nombre);
    std::fs::write(&file, datos).map_err(|e| e.to_string())?;
    Ok(file.display().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![guardar_copia])
        .setup(|_app| {
            // iOS: by default the WKWebView scroll view also insets the safe area, so the
            // CSS env(safe-area-inset-*) gets counted twice (gap under the tab bar).
            #[cfg(target_os = "ios")]
            _app.get_webview_window("main").unwrap().with_webview(|wv| unsafe {
                use objc2::{msg_send, runtime::AnyObject};
                let web = wv.inner() as *mut AnyObject;
                let scroll: *mut AnyObject = msg_send![web, scrollView];
                let _: () = msg_send![scroll, setContentInsetAdjustmentBehavior: 2isize]; // .never
            })?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error al iniciar Armario Digital");
}
