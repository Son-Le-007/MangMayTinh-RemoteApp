from flask import Flask, render_template
from config import load_gateway_url, get_port

app = Flask(__name__)

# Load configuration
GATEWAY_URL = load_gateway_url()
PORT = get_port()

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
    # Chạy Web Server
    print("---------------------------------------------------")
    print(f"Web Client đang chạy tại: http://localhost:{PORT}")
    print(f"Đang cấu hình kết nối tới Gateway: {GATEWAY_URL}")
    print("---------------------------------------------------")
    
    app.run(debug=True, port=PORT)

