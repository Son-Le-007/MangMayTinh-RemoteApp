Chỉ mới tạo ra UI cơ bản của trang client.

bên web client: gửi role (web client / agent client) trên url

Cấu trúc gói tin:

{
  "type": "register",
  "role": "web_client"
}

{
  "target": "cpp_server",
  "action": "TÊN_HÀNH_ĐỘNG",
  "...": "tham số phụ nếu có"
}

Cấu trúc chi tiết:

1. Lấy danh sách app:
Action name: LIST_APPS
Tham số đi kèm: không có
{ "target": "cpp_server", "action": "LIST_APPS" }

2. Lấy danh sách process:
Action name: LIST_PROCESS
Tham số đi kèm: không có
{ "target": "cpp_server", "action": "LIST_PROCESS" }

3. Chạy app mới:
Action name: EXECUTE
Tham số đi kèm: path: Tên/Đường dẫn app
{ "target": "cpp_server", "action": "EXECUTE", "path": "notepad.exe" }

4. Tắt process:
Có 2 dạng:

Kill theo PID
Action name: KILL_BY_PID
Tham số đi kèm: pid: ID của process
{ "target": "cpp_server", "action": "KILL_BY_PID", "pid": 1234 }

Kill theo name:
Action name: KILL_BY_NAME
Tham số đi kèm: name: tên của process
{ "target": "cpp_server", "action": "KILL_BY_NAME", "name": "chrome.exe" }

5. Chụp màn hình:
Action name: SCREENSHOT
Tham số đi kèm: không có
{ "target": "cpp_server", "action": "SCREENSHOT" }

6. Mở Webcam:
Action name: WEBCAM_START
Tham số đi kèm: không có
{ "target": "cpp_server", "action": "WEBCAM_START" }

7. Tắt Webcam:
Action name: WEBCAM_STOP
Tham số đi kèm: không có
{ "target": "cpp_server", "action": "WEBCAM_STOP" }

8. Bắt phím:
Action name: START_KEYLOG
Tham số đi kèm: không có
{ "target": "cpp_server", "action": "START_KEYLOG" }

9. Restart:
Action name: RESTART
Tham số đi kèm: không có
{ "target": "cpp_server", "action": "RESTART" }

10. Tắt máy:
Action name: SHUTDOWN
Tham số đi kèm: không có
{ "target": "cpp_server", "action": "SHUTDOWN" }