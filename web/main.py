from flask import Flask, render_template

app = Flask(__name__)

# --- CẤU HÌNH ---
# Đây là địa chỉ của Node.js Socket Gateway.
# - Nếu chạy trên cùng máy tính: dùng "ws://localhost:8080"
# - Nếu Gateway nằm trên server khác/máy khác: thay bằng IP của máy đó, ví dụ "ws://192.168.1.5:8080"
GATEWAY_URL = "ws://localhost:8080"

@app.route('/')
def index():
    """
    Route mặc định (Trang chủ).
    Vì đã bỏ chức năng đăng nhập, vào trang web là thấy ngay Dashboard.
    """
    # Render file HTML trong thư mục 'templates'
    # Truyền biến 'ws_server' xuống để JavaScript biết đường kết nối.
    return render_template('dashboard.html', ws_server=GATEWAY_URL)

if __name__ == '__main__':
    # Chạy Web Server ở cổng 5000
    print("---------------------------------------------------")
    print(f"Web Client đang chạy tại: http://localhost:5000")
    print(f"Đang cấu hình kết nối tới Gateway: {GATEWAY_URL}")
    print("---------------------------------------------------")
    
    app.run(debug=True, port=5000)

