const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database đơn giản (trong memory)
const userDatabase = new Map();

// 📌 API 1: Active premium từ username
app.post('/api/activate', (req, res) => {
    try {
        const { username } = req.body;
        
        if (!username || username.trim() === '') {
            return res.json({
                success: false,
                error: 'Vui lòng nhập username!',
                example: '{"username": "ten_cua_ban"}'
            });
        }
        
        console.log(`🚀 Nhận yêu cầu active premium cho: ${username}`);
        
        // Tạo user_id tự động
        const userId = `locket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Premium data template
        const premiumData = {
            request_date: new Date().toISOString(),
            subscriber: {
                original_app_user_id: userId,
                original_username: username,
                first_seen: new Date().toISOString(),
                subscriptions: {
                    "com.locket.premium.yearly": {
                        period_type: "normal",
                        purchase_date: new Date().toISOString(),
                        original_purchase_date: "2024-01-01T00:00:00Z",
                        expires_date: "2099-12-31T23:59:59Z",
                        store: "app_store",
                        is_sandbox: false,
                        ownership_type: "PURCHASED",
                        billing_issues_detected_at: null
                    }
                },
                entitlements: {
                    "pro": {
                        expires_date: "2099-12-31T23:59:59Z",
                        product_identifier: "com.locket.premium.yearly"
                    },
                    "gold": {
                        expires_date: "2099-12-31T23:59:59Z",
                        product_identifier: "com.locket.premium.yearly"
                    }
                }
            },
            message: `✅ Premium activated for ${username}`,
            note: "Tự động bởi Render Server"
        };
        
        // Lưu vào database
        userDatabase.set(username, {
            userId: userId,
            activatedAt: new Date().toISOString(),
            data: premiumData
        });
        
        console.log(`✅ Đã active cho ${username}, user_id: ${userId}`);
        
        res.json({
            success: true,
            username: username,
            user_id: userId,
            expires_date: "2099-12-31T23:59:59Z",
            premium_data: premiumData,
            next_steps: [
                "1. Premium đã được active",
                "2. User ID đã tạo tự động",
                "3. Mở app Locket để kiểm tra"
            ]
        });
        
    } catch (error) {
        console.error('❌ Lỗi:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 📌 API 2: Lấy premium data theo username
app.get('/api/premium/:username', (req, res) => {
    const username = req.params.username;
    
    if (!userDatabase.has(username)) {
        return res.status(404).json({
            error: 'Username chưa được active',
            solution: 'Gửi POST /api/activate với username'
        });
    }
    
    const userData = userDatabase.get(username);
    
    // Set headers giống RevenueCat
    res.set({
        'Content-Type': 'application/json',
        'X-RevenueCat-ETag': '',
        'Cache-Control': 'no-cache'
    });
    
    res.json(userData.data);
});

// 📌 API 3: Check status
app.get('/api/status/:username', (req, res) => {
    const username = req.params.username;
    
    if (userDatabase.has(username)) {
        const data = userDatabase.get(username);
        res.json({
            status: 'ACTIVE',
            username: username,
            user_id: data.userId,
            activated_at: data.activatedAt,
            is_active: true
        });
    } else {
        res.json({
            status: 'INACTIVE',
            username: username,
            is_active: false
        });
    }
});

// 📌 API 4: Health check (cho Render monitoring)
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        server: 'Locket Premium Render Server',
        users_count: userDatabase.size,
        uptime: process.uptime()
    });
});

// 📌 Trang web chính - UI đơn giản
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>🚀 Locket Premium - Render Server</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    margin: 0;
                    padding: 20px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                .container {
                    background: white;
                    border-radius: 15px;
                    padding: 30px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                    max-width: 500px;
                    width: 100%;
                }
                h1 {
                    color: #333;
                    text-align: center;
                    margin-bottom: 10px;
                }
                .subtitle {
                    color: #666;
                    text-align: center;
                    margin-bottom: 30px;
                }
                .input-group {
                    margin-bottom: 20px;
                }
                input {
                    width: 100%;
                    padding: 12px 15px;
                    border: 2px solid #ddd;
                    border-radius: 8px;
                    font-size: 16px;
                    box-sizing: border-box;
                }
                input:focus {
                    outline: none;
                    border-color: #667eea;
                }
                button {
                    width: 100%;
                    padding: 14px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: transform 0.2s;
                }
                button:hover {
                    transform: translateY(-2px);
                }
                .result {
                    margin-top: 25px;
                    padding: 20px;
                    background: #f8f9fa;
                    border-radius: 8px;
                    display: none;
                }
                .success {
                    color: #10b981;
                    font-weight: bold;
                    margin-bottom: 15px;
                }
                .info-box {
                    background: #e3f2fd;
                    padding: 12px;
                    border-radius: 6px;
                    margin: 10px 0;
                    font-size: 14px;
                }
                .code {
                    background: #2d3748;
                    color: #81e6d9;
                    padding: 10px;
                    border-radius: 6px;
                    font-family: monospace;
                    font-size: 13px;
                    overflow-x: auto;
                }
                .loader {
                    border: 3px solid #f3f3f3;
                    border-top: 3px solid #667eea;
                    border-radius: 50%;
                    width: 30px;
                    height: 30px;
                    animation: spin 1s linear infinite;
                    margin: 20px auto;
                    display: none;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🔥 LOCKET PREMIUM</h1>
                <p class="subtitle">Chỉ cần nhập username → Tự động lên Gold!</p>
                
                <div class="input-group">
                    <input type="text" 
                           id="username" 
                           placeholder="Nhập username Locket của bạn"
                           autocomplete="off">
                </div>
                
                <button onclick="activatePremium()">
                    🚀 ACTIVE PREMIUM NGAY
                </button>
                
                <div class="loader" id="loader"></div>
                
                <div class="result" id="result">
                    <!-- Kết quả sẽ hiển thị ở đây -->
                </div>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                    <p style="color: #666; font-size: 14px; text-align: center;">
                        Powered by <strong>Render.com</strong> | Server đang hoạt động ✅
                    </p>
                </div>
            </div>
            
            <script>
                async function activatePremium() {
                    const usernameInput = document.getElementById('username');
                    const username = usernameInput.value.trim();
                    const resultDiv = document.getElementById('result');
                    const loader = document.getElementById('loader');
                    
                    if (!username) {
                        alert('⚠️ Vui lòng nhập username của bạn!');
                        usernameInput.focus();
                        return;
                    }
                    
                    // Hiển thị loader
                    loader.style.display = 'block';
                    resultDiv.style.display = 'none';
                    
                    try {
                        // Gọi API trên chính server này
                        const response = await fetch('/api/activate', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ username: username })
                        });
                        
                        const data = await response.json();
                        
                        // Ẩn loader
                        loader.style.display = 'none';
                        resultDiv.style.display = 'block';
                        
                        if (data.success) {
                            resultDiv.innerHTML = \`
                                <div class="success">✅ ACTIVE THÀNH CÔNG!</div>
                                
                                <div class="info-box">
                                    <strong>👤 Username:</strong> \${data.username}<br>
                                    <strong>🆔 User ID:</strong> \${data.user_id}<br>
                                    <strong>⏰ Expires:</strong> 2099-12-31
                                </div>
                                
                                <p><strong>🎯 Bước tiếp theo:</strong></p>
                                <ol style="margin-left: 20px;">
                                    <li>Đóng trang web này</li>
                                    <li>Mở app Locket trên điện thoại</li>
                                    <li>Kiểm tra premium status</li>
                                    <li>Nếu chưa thấy, restart app</li>
                                </ol>
                                
                                <div style="margin-top: 15px; font-size: 13px; color: #666;">
                                    <strong>💡 Lưu ý:</strong> Server tự động xử lý tất cả. 
                                    Bạn không cần làm gì thêm!
                                </div>
                            \`;
                        } else {
                            resultDiv.innerHTML = \`
                                <div style="color: #ef4444; font-weight: bold;">❌ LỖI</div>
                                <p>\${data.error || 'Có lỗi xảy ra'}</p>
                            \`;
                        }
                        
                    } catch (error) {
                        loader.style.display = 'none';
                        resultDiv.style.display = 'block';
                        resultDiv.innerHTML = \`
                            <div style="color: #ef4444;">❌ Lỗi kết nối</div>
                            <p>\${error.message}</p>
                            <p style="font-size: 14px; color: #666;">
                                Kiểm tra kết nối internet và thử lại.
                            </p>
                        \`;
                    }
                }
                
                // Cho phép nhấn Enter để submit
                document.getElementById('username').addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        activatePremium();
                    }
                });
            </script>
        </body>
        </html>
    `);
});

// Khởi động server
app.listen(PORT, () => {
    console.log(\`🚀 Server đang chạy trên port \${PORT}\`);
    console.log(\`📌 Truy cập: http://localhost:\${PORT}\`);
    console.log(\`🌐 Health check: http://localhost:\${PORT}/health\`);
    console.log(\`📊 API Active: POST http://localhost:\${PORT}/api/activate\`);
});