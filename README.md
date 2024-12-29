# QR Code File Upload System

一个基于 Node.js 的二维码文件上传系统，支持文件上传和预览功能。用户可以通过扫描二维码上传文件，每个二维码仅允许上传一次文件。系统提供文件预览和管理功能。

## 功能特点

- 生成唯一的二维码
- 通过扫描二维码上传文件
- 文件预览功能
- 支持图片文件在线预览
- 文件下载功能
- MongoDB 数据持久化
- 用户认证和登录保护
- GitHub Actions 自动部署

## 技术栈

- Node.js
- Express.js
- MongoDB
- EJS 模板引擎
- QR Code 生成
- GitHub Actions
- PM2 进程管理
- AWS/Ubuntu 服务器

## 系统要求

- Node.js 16+
- MongoDB 4.4+
- PM2 (用于进程管理)
- Git

## 环境变量配置

项目使用 `.env` 文件进行配置，所有配置项都是必需的：



## 本地开发

1. 克隆仓库：
```bash
git clone https://github.com/your-username/qrcode-upload-system.git
cd qrcode-upload-system
```

2. 安装依赖：
```bash
npm install
```

3. 配置环境变量：
```bash
cp .env.example .env
# 编辑 .env 文件，填写必要的配置信息
```

4. 创建管理员账户：
```bash
npm run create-admin
```

5. 启动开发服务器：
```bash
npm run dev
```

## 生产环境部署

### 使用 GitHub Actions 自动部署

1. Fork 本仓库

2. 在 GitHub 仓库的 Settings -> Secrets and variables -> Actions 中添加以下 Secrets：

   - `SERVER_HOST`: 服务器 IP 地址
   - `SERVER_USERNAME`: SSH 用户名
   - `SERVER_SSH_KEY`: SSH 私钥
   - `PORT`: 应用端口
   - `MONGODB_URI`: MongoDB 连接字符串
   - `MAX_FILE_SIZE`: 最大文件大小
   - `SESSION_SECRET`: Session 密钥（使用随机字符串）
   - `ADMIN_USERNAME`: 管理员用户名
   - `ADMIN_PASSWORD`: 管理员密码

3. 生成安全的 SESSION_SECRET：
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

4. 确保服务器已安装必要的软件：
```bash
# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 PM2
npm install -g pm2

# 安装 MongoDB
# 参考 MongoDB 官方文档进行安装
```

5. 推送代码到 main 分支，GitHub Actions 将自动部署

### 手动部署

1. 在服务器上克隆仓库：
```bash
git clone https://github.com/your-username/qrcode-upload-system.git
cd qrcode-upload-system
```

2. 安装依赖：
```bash
npm install
```

3. 创建并配置 `.env` 文件

4. 使用 PM2 启动应用：
```bash
pm2 start index.js --name qrcode-app
```

## 使用说明

1. 访问系统主页（需要登录）
2. 使用管理员账号登录
3. 点击"生成新二维码"按钮生成二维码
4. 使用手机扫描二维码上传文件
5. 在主页查看已上传的文件和二维码状态

## 安全建议

1. 使用强密码作为管理员密码
2. 定期更换 SESSION_SECRET
3. 在生产环境中使用 HTTPS
4. 根据需要限制上传文件的大小和类型
5. 定期备份数据库

## 许可证

ISC

## 贡献指南

1. Fork 本仓库
2. 创建特性分支
3. 提交改动
4. 推送到分支
5. 创建 Pull Request

## 问题反馈

如果你发现任何问题或有改进建议，请创建 Issue 或提交 Pull Request。 