# Requirements - Remote App System

Tài liệu này liệt kê tất cả các phụ thuộc và yêu cầu hệ thống cần thiết để chạy cả 3 component của hệ thống Remote App.

---

## 📋 Tổng quan

Hệ thống Remote App bao gồm 3 component chính:
1. **Agent** - Ứng dụng C# chạy trên máy client Windows
2. **Gateway** - Server WebSocket Node.js trung gian
3. **Web** - Giao diện web Python Flask

---

## 🖥️ Agent Component (C# .NET)

### Yêu cầu hệ thống:
- **Hệ điều hành:** Windows (bắt buộc)
- **.NET Runtime:** .NET 6.0 SDK hoặc Runtime
  - Download: https://dotnet.microsoft.com/download/dotnet/6.0
  - Chọn bản "SDK" hoặc "Runtime" cho Windows
- **Quyền truy cập:** Quyền Administrator (cần cho một số lệnh như shutdown, kill process)

### NuGet Packages (tự động cài khi build):
Các package sau sẽ được tự động restore khi chạy `dotnet restore`:

- **Microsoft.Extensions.Configuration** (v6.0.1)
  - Quản lý cấu hình ứng dụng
  
- **Microsoft.Extensions.Configuration.Json** (v6.0.0)
  - Đọc file cấu hình JSON (appsettings.json)
  
- **OpenCvSharp4.Windows** (v4.8.0.20230708)
  - Xử lý webcam và video streaming
  - Bao gồm native DLLs cho Windows (x64 và x86)

### Cài đặt:
```bash
cd agent
dotnet restore  # Tự động tải các NuGet packages
dotnet build
```

---

## 🌐 Gateway Component (Node.js)

### Yêu cầu hệ thống:
- **Node.js:** Version 14 trở lên
  - Download: https://nodejs.org/
  - Khuyến nghị: LTS version (Long Term Support)
- **npm:** Đi kèm với Node.js (hoặc có thể dùng yarn)

### NPM Packages:
Các package sau sẽ được cài đặt khi chạy `npm install`:

- **ws** (^8.15.0)
  - WebSocket library cho Node.js
  - Dùng để tạo WebSocket server và xử lý kết nối

### Cài đặt:
```bash
cd gateway
npm install  # Cài đặt dependencies từ package.json
```

---

## 🌍 Web Component (Python Flask)

### Yêu cầu hệ thống:
- **Python:** Version 3.x (3.7 trở lên)
  - Download: https://www.python.org/downloads/
  - Đảm bảo Python được thêm vào PATH
- **pip:** Package manager cho Python (thường đi kèm với Python)
- **Trình duyệt web:** 
  - Chrome, Firefox, Edge, Safari (phiên bản mới)
  - Hỗ trợ WebSocket API

### Python Packages:
Cài đặt bằng lệnh `pip install`:

- **Flask** (latest)
  - Web framework để serve HTML và static files
  - Cài đặt: `pip install flask`

### Cài đặt:
```bash
cd web
pip install flask
```

---

## 📦 Cài đặt nhanh toàn bộ hệ thống

### 1. Agent (C#):
```bash
cd agent
dotnet restore
dotnet build
```

### 2. Gateway (Node.js):
```bash
cd gateway
npm install
```

### 3. Web (Python):
```bash
cd web
pip install flask
```

---

## ⚙️ Cấu hình

Sau khi cài đặt dependencies, cần cấu hình file `appsettings.json` ở thư mục gốc:

```json
{
  "GatewayServer": "ws://localhost:8080",
  "Port": 5000
}
```

- **GatewayServer:** URL WebSocket của Gateway server
- **Port:** Port cho Web component (Flask server)

---

## 🔍 Kiểm tra cài đặt

### Kiểm tra .NET:
```bash
dotnet --version
# Kết quả mong đợi: 6.0.x hoặc cao hơn
```

### Kiểm tra Node.js:
```bash
node --version
# Kết quả mong đợi: v14.x.x hoặc cao hơn

npm --version
# Kiểm tra npm đã được cài đặt
```

### Kiểm tra Python:
```bash
python --version
# Kết quả mong đợi: Python 3.7.x hoặc cao hơn

pip --version
# Kiểm tra pip đã được cài đặt
```

### Kiểm tra Flask:
```bash
python -c "import flask; print(flask.__version__)"
# Hiển thị version của Flask nếu đã cài đặt
```

---

## 🚀 Chạy hệ thống

### Thứ tự khởi động:

1. **Gateway** (chạy đầu tiên):
   ```bash
   cd gateway
   npm start
   ```
   Server sẽ lắng nghe trên `ws://localhost:8080`

2. **Agent** (chạy trên máy client Windows):
   ```bash
   cd agent
   dotnet run
   ```
   Agent sẽ tự động kết nối tới Gateway

3. **Web** (chạy trên máy quản trị):
   ```bash
   cd web
   python main.py
   ```
   Mở trình duyệt: `http://localhost:5000`

---

## 📝 Ghi chú

- **Agent** chỉ chạy được trên Windows do sử dụng Windows APIs
- **Gateway** và **Web** có thể chạy trên Windows, Linux, hoặc macOS
- Đảm bảo các port không bị firewall chặn:
  - Gateway: Port 8080 (WebSocket)
  - Web: Port 5000 (HTTP, mặc định)
- Nếu gặp lỗi khi build Agent, đảm bảo đã cài đặt .NET 6.0 SDK (không chỉ Runtime)
- OpenCvSharp yêu cầu Visual C++ Redistributable trên Windows (thường đã có sẵn)

---

## 🔗 Liên kết tải về

- **.NET 6.0 SDK:** https://dotnet.microsoft.com/download/dotnet/6.0
- **Node.js:** https://nodejs.org/
- **Python:** https://www.python.org/downloads/
- **Visual C++ Redistributable (nếu cần):** https://aka.ms/vs/17/release/vc_redist.x64.exe

