//! 文件存储模块 - 读写 data 目录下的配置文件

use std::fs;
use std::path::PathBuf;
use tauri::Manager;

/// 获取 data 目录路径
fn get_data_dir(app: &tauri::AppHandle) -> PathBuf {
    // 使用应用的数据目录
    let app_data_dir = app.path().app_data_dir().expect("无法获取应用数据目录");
    app_data_dir.join("data")
}

/// 确保 data 目录存在
fn ensure_data_dir(app: &tauri::AppHandle) -> PathBuf {
    let data_dir = get_data_dir(app);
    if !data_dir.exists() {
        fs::create_dir_all(&data_dir).expect("无法创建 data 目录");
    }
    data_dir
}

/// 读取 JSON 文件
#[tauri::command]
pub async fn read_json_file(app: tauri::AppHandle, filename: String) -> Result<String, String> {
    let data_dir = ensure_data_dir(&app);
    let file_path = data_dir.join(&filename);

    if file_path.exists() {
        fs::read_to_string(&file_path)
            .map_err(|e| format!("读取文件失败: {}", e))
    } else {
        // 文件不存在时返回空对象
        Ok("{}".to_string())
    }
}

/// 写入 JSON 文件
#[tauri::command]
pub async fn write_json_file(app: tauri::AppHandle, filename: String, content: String) -> Result<(), String> {
    let data_dir = ensure_data_dir(&app);
    let file_path = data_dir.join(&filename);

    fs::write(&file_path, &content)
        .map_err(|e| format!("写入文件失败: {}", e))
}

/// 删除 JSON 文件
#[tauri::command]
pub async fn delete_json_file(app: tauri::AppHandle, filename: String) -> Result<(), String> {
    let data_dir = ensure_data_dir(&app);
    let file_path = data_dir.join(&filename);

    if file_path.exists() {
        fs::remove_file(&file_path)
            .map_err(|e| format!("删除文件失败: {}", e))
    } else {
        Ok(())
    }
}