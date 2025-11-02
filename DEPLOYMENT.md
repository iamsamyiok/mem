# 笔记系统部署指南

## 系统架构

```
公网访问 (112.90.76.170:15378)
         |
      Nginx (反向代理)
         |
    +----+----+
    |         |
  静态文件   Flask API
 (HTML/CSS/JS) (端口8080)
```

## 部署步骤

### 1. 环境准备

```bash
# 更新系统包
sudo apt update && sudo apt upgrade -y

# 安装必要软件
sudo apt install nginx python3 python3-pip supervisor -y
```

### 2. 部署文件

将以下文件上传到云服务器的 `/var/www/html/` 目录：
- `index.html` (手机端界面)
- `web_client.html` (电脑端界面)
- `app.js` (手机端逻辑)
- `web_app.js` (电脑端逻辑)

将以下文件上传到应用目录（如 `/opt/note-app/`）：
- `app.py` (Flask应用)
- `requirements.txt` (依赖列表)

### 3. 安装Python依赖

```bash
cd /opt/note-app/
pip3 install -r requirements.txt
```

### 4. 配置Supervisor管理Flask应用

创建文件 `/etc/supervisor/conf.d/note-app.conf`：

```ini
[program:note-app]
command=python3 /opt/note-app/app.py
directory=/opt/note-app/
user=www-data
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/note-app.log
```

然后重启Supervisor：

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start note-app
```

### 5. 配置Nginx

将以下配置添加到 `/etc/nginx/sites-available/note-app`：

```nginx
# Main server block for HTTPS access
server {
    listen 15378;
    server_name 112.90.76.170;

    # Serve static files (HTML, CSS, JS)
    location / {
        root /var/www/html;
        index web_client.html;
        try_files $uri $uri/ =404;
    }

    # Proxy API requests to Flask application
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Error pages
    error_page 404 /404.html;
    location = /404.html {
        root /var/www/html;
    }

    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /var/www/html;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/note-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

如果您已有Nginx配置文件，可以将以下server块添加到现有配置中：

```nginx
# Additional server block for the new requirement (port 15378)
server {
    listen 15378;
    server_name 112.90.76.170 localhost 127.0.0.1;

    # Serve static files (HTML, CSS, JS)
    location / {
        root C:/www/html;  # 修改为您的实际路径
        index web_client.html;
        try_files $uri $uri/ =404;
    }

    # Proxy API requests to Flask application
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Error pages
    error_page 404 /404.html;
    location = /404.html {
        root C:/www/html;  # 修改为您的实际路径
    }

    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root C:/www/html;  # 修改为您的实际路径
    }
}
```

### 6. 防火墙设置

```bash
# 开放15378端口
sudo ufw allow 15378
```

### 7. 启动服务

```bash
# 重启服务
sudo systemctl restart nginx
sudo supervisorctl restart note-app

# 检查状态
sudo supervisorctl status note-app
sudo systemctl status nginx
```

## 访问应用

部署完成后，可以通过以下地址访问应用：
- 电脑端: http://112.90.76.170:15378/web_client.html
- 手机端: http://112.90.76.170:15378/

首次使用时需要配置：
- 服务器地址: http://112.90.76.170:15378
- 访问密码: 15378 (初始密码)

## 日志查看

```bash
# 查看应用日志
sudo supervisorctl tail note-app

# 查看Nginx日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## 故障排除

1. 如果无法访问，请检查：
   - Nginx是否正在运行
   - Flask应用是否正在运行
   - 防火墙是否允许15378端口

2. 如果API调用失败，请检查：
   - Flask应用是否正常启动
   - Nginx代理配置是否正确
   - 端口8080是否被占用

3. 如果静态文件无法加载，请检查：
   - 文件是否已正确上传到 `/var/www/html/`
   - Nginx配置中的root路径是否正确