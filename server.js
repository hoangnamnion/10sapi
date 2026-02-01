const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// Database đơn giản lưu user đã active
const activeUsers = new Map();

// 📌 API 1: Nhận username và tự động tạo premium data
app.post('/api/auto-premium', async (req, res) => {
    try {
        const { username } = req.body;
        
        if (!username) {
            return res.json({ error: 'Vui lòng nhập username' });
        }
        
        console.log(`🚀 Nhận request cho username: ${username}`);
        
        // Bước 1: Tạo user_id tự động từ username
        const userId = generateUserId(username);
        
        // Bước 2: Tạo premium data CHUẨN RevenueCat
        const premiumData = createPremiumData(userId, username);
        
        // Bước 3: Lưu vào database
        activeUsers.set(username, {
            userId: userId,
            activated: new Date().toISOString(),
            expires: "2099-12-31T23:59:59Z",
            status: "ACTIVE"
        });
        
        // Bước 4: Tạo Surge/Quantumult X config tự động
        const surgeConfig = generateSurgeConfig(username, userId);
        
        // Bước 5: Tạo QR code để import config
        const qrCodeUrl = await generateQRCode(`https://locket-auto.com/activate/${username}`);
        
        res.json({
            success: true,
            message: `✅ Premium đã được active cho ${username}`,
            username: username,
            user_id: userId,
            premium_data: premiumData,
            surge_config: surgeConfig,
            qr_code: qrCodeUrl,
            instructions: `
                1. Username: ${username}
                2. User ID: ${userId}
                3. Expires: 2099-12-31
                4. Mở app Locket để thấy Premium!
            `
        });
        
    } catch (error) {
        console.error('Error:', error);
        res.json({ error: error.message });
    }
});

// 📌 API 2: Get premium data cho Surge/Quantumult X
app.get('/api/premium/:username', (req, res) => {
    const { username } = req.params;
    
    if (!activeUsers.has(username)) {
        return res.status(404).json({ error: 'Username chưa được active' });
    }
    
    const userData = activeUsers.get(username);
    const premiumData = createPremiumData(userData.userId, username);
    
    // Set headers giống RevenueCat
    res.set({
        'Content-Type': 'application/json',
        'X-RevenueCat-ETag': '',
        'Cache-Control': 'no-cache'
    });
    
    res.json(premiumData);
});

// 📌 API 3: Tạo Surge config tự động
app.get('/api/config/:username', (req, res) => {
    const { username } = req.params;
    const config = generateSurgeConfig(username);
    
    res.set('Content-Type', 'text/plain');
    res.send(config);
});

// 📌 API 4: Check status
app.get('/api/status/:username', (req, res) => {
    const { username } = req.params;
    
    if (activeUsers.has(username)) {
        res.json({ 
            status: 'ACTIVE', 
            ...activeUsers.get(username) 
        });
    } else {
        res.json({ status: 'INACTIVE' });
    }
});

// 📌 Trang web chính cho user nhập username
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>🚀 Locket Auto Premium</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 20px;
                }
                .container {
                    background: white;
                    border-radius: 20px;
                    padding: 40px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    max-width: 500px;
                    width: 100%;
                    text-align: center;
                }
                h1 {
                    color: #333;
                    margin-bottom: 10px;
                    font-size: 28px;
                }
                .subtitle {
                    color: #666;
                    margin-bottom: 30px;
                    font-size: 16px;
                }
                .input-group {
                    margin-bottom: 20px;
                }
                input {
                    width: 100%;
                    padding: 15px;
                    border: 2px solid #e0e0e0;
                    border-radius: 10px;
                    font-size: 16px;
                    transition: border 0.3s;
                }
                input:focus {
                    outline: none;
                    border-color: #667eea;
                }
                button {
                    width: 100%;
                    padding: 15px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    border-radius: 10px;
                    font-size: 18px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: transform 0.2s;
                }
                button:hover {
                    transform: translateY(-2px);
                }
                button:active {
                    transform: translateY(0);
                }
                .result {
                    margin-top: 30px;
                    padding: 20px;
                    background: #f8f9fa;
                    border-radius: 10px;
                    text-align: left;
                    display: none;
                }
                .step {
                    background: #e3f2fd;
                    padding: 15px;
                    border-radius: 10px;
                    margin: 10px 0;
                    border-left: 4px solid #2196f3;
                }
                .success {
                    color: #4caf50;
                    font-weight: bold;
                    font-size: 18px;
                }
                .loader {
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #667eea;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    animation: spin 1s linear infinite;
                    margin: 20px auto;
                    display: none;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .qr-code {
                    margin: 20px auto;
                    max-width: 200px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🔥 LOCKET AUTO PREMIUM</h1>
                <p class="subtitle">Chỉ cần nhập username → Tự động lên Gold!</p>
                
                <div class="input-group">
                    <input type="text" id="username" 
                           placeholder="Nhập username Locket của bạn" 
                           autocomplete="off">
                </div>
                
                <button onclick="activatePremium()">
                    🚀 ACTIVE GOLD NGAY
                </button>
                
                <div class="loader" id="loader"></div>
                
                <div class="result" id="result">
                    <!-- Kết quả sẽ hiển thị ở đây -->
                </div>
            </div>
            
            <script>
                async function activatePremium() {
                    const username = document.getElementById('username').value.trim();
                    const resultDiv = document.getElementById('result');
                    const loader = document.getElementById('loader');
                    
                    if (!username) {
                        alert('⚠️ Vui lòng nhập username!');
                        return;
                    }
                    
                    // Hiện loader
                    loader.style.display = 'block';
                    resultDiv.style.display = 'none';
                    
                    try {
                        // Gọi API server
                        const response = await fetch('/api/auto-premium', {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({username: username})
                        });
                        
                        const data = await response.json();
                        
                        // Ẩn loader
                        loader.style.display = 'none';
                        resultDiv.style.display = 'block';
                        
                        if (data.success) {
                            resultDiv.innerHTML = \`
                                <div class="success">✅ THÀNH CÔNG!</div>
                                <p>Premium đã được active cho: <strong>\${username}</strong></p>
                                
                                <div class="step">
                                    <strong>Bước 1:</strong> Username đã được đăng ký
                                </div>
                                
                                <div class="step">
                                    <strong>Bước 2:</strong> User ID: <code>\${data.user_id}</code>
                                </div>
                                
                                <div class="step">
                                    <strong>Bước 3:</strong> Premium expires: 2099-12-31
                                </div>
                                
                                <div class="step">
                                    <strong>Bước 4:</strong> Mở app Locket ngay để kiểm tra!
                                </div>
                                
                                <p style="margin-top: 20px; color: #666;">
                                    <small>Server sẽ tự động xử lý tất cả. Bạn chỉ cần mở app Locket!</small>
                                </p>
                            \`;
                            
                            // Tự động check status sau 3 giây
                            setTimeout(() => {
                                checkStatus(username);
                            }, 3000);
                            
                        } else {
                            resultDiv.innerHTML = \`❌ Lỗi: \${data.error || 'Không xác định'}\`;
                        }
                        
                    } catch (error) {
                        loader.style.display = 'none';
                        resultDiv.style.display = 'block';
                        resultDiv.innerHTML = \`❌ Lỗi kết nối: \${error.message}\`;
                    }
                }
                
                async function checkStatus(username) {
                    const response = await fetch(\`/api/status/\${username}\`);
                    const data = await response.json();
                    
                    if (data.status === 'ACTIVE') {
                        console.log('✅ User đã active:', username);
                    }
                }
                
                // Enter để submit
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

// Helper functions
function generateUserId(username) {
    // Tạo user_id từ username + timestamp
    const hash = require('crypto').createHash('md5')
        .update(username + Date.now())
        .digest('hex')
        .substring(0, 24);
    return \`user_\${hash}\`;
}

function createPremiumData(userId, username) {
    return {
        request_date: new Date().toISOString(),
        subscriber: {
            original_app_user_id: userId,
            original_username: username,
            first_seen: new Date().toISOString(),
            subscriptions: {
                "com.locket.premium.yearly": {
                    expires_date: "2099-12-31T23:59:59Z",
                    purchase_date: new Date().toISOString(),
                    original_purchase_date: "2024-01-01T00:00:00Z",
                    ownership_type: "PURCHASED",
                    store: "app_store",
                    is_sandbox: false
                }
            },
            entitlements: {
                "pro": { expires_date: "2099-12-31T23:59:59Z" },
                "gold": { expires_date: "2099-12-31T23:59:59Z" }
            }
        },
        auto_activated: true,
        activated_by: "Auto Premium Server"
    };
}

function generateSurgeConfig(username, userId) {
    return \`
# Locket Auto Premium Config
# Generated for: \${username}
# User ID: \${userId}

[General]
# Kích hoạt MITM
skip-proxy = 192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12
bypass-tun = 10.0.0.0/8, 100.64.0.0/10, 127.0.0.0/8, 169.254.0.0/16, 172.16.0.0/12, 192.0.0.0/24, 192.0.2.0/24, 192.88.99.0/24, 192.168.0.0/16, 198.18.0.0/15, 198.51.100.0/24, 203.0.113.0/24, 224.0.0.0/4, 255.255.255.255/32

[MITM]
hostname = api.revenuecat.com, %APPEND% locket.camera

[Script]
# Auto premium cho \${username}
locket_auto = type=http-response, pattern=^https://api\\.revenuecat\\.com/v1/subscribers/[^/]+, requires-body=true, timeout=30, script-path=https://\${req.headers.host}/api/premium/\${username}

[URL Rewrite]
^https://api\\.revenuecat\\.com https://\${req.headers.host}/api/premium/\${username} 302
\`;
}

async function generateQRCode(url) {
    // Tạm thời trả về URL
    return \`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=\${encodeURIComponent(url)}\`;
}

// Khởi động server
app.listen(PORT, () => {
    console.log(\`🚀 Auto Premium Server đang chạy: http://localhost:\${PORT}\`);
    console.log(\`📌 User chỉ cần mở trang web và nhập username!\`);
});