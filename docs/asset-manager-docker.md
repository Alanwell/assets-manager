1. 准备服务器
建议：
* Ubuntu 22.04/24.04
* 至少 2 GB 内存
* 安装 Git、Docker、Docker Compose
* 域名解析到服务器 IP

2. 上传并配置项目

```bash
git clone <你的仓库地址> assets-manager
cd assets-manager
cp .env.example .env
```

生成两个独立密钥：

```bash
openssl rand -hex 64
openssl rand -hex 64
```

编辑 .env：

```bash
JWT_ACCESS_SECRET=第一个随机密钥
JWT_REFRESH_SECRET=第二个随机密钥

ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

CORS_ORIGIN=https://asset.example.com
WEB_PORT=127.0.0.1:8080
```

3. 启动服务

```bash
docker compose up --build -d
docker compose ps
docker compose logs -f
```

检查健康状态：

```bash
curl http://127.0.0.1:8080/api/health
```

4. 配置域名和 HTTPS
推荐使用 Caddy，将域名反向代理到 Web 容器：

```caddyfile
asset.example.com {
    reverse_proxy 127.0.0.1:8080
}
```

Caddy 会自动申请和续期 HTTPS 证书。服务器防火墙只需要开放：
* 80
* 443
* SSH 端口
不要单独暴露 API 的 3000 端口。

5. 更新版本

```bash
git pull
docker compose up --build -d
docker compose ps
```

6. 数据保护
数据库、附件和应用备份位于 Docker 的 asset_data 数据卷中。不要执行：

```bash
docker compose down -v
```

其中 -v 会删除全部数据。
建议定期执行：

```bash
docker compose stop api
docker compose cp api:/data ./asset-data-backup
docker compose start api
```
目前系统允许公开注册。如果部署在公网给少数人使用，建议暂时通过防火墙、VPN 或访问白名单限制访问；后续再补充关闭注册、登录限流和完整备份下载功能。