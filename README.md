# QR Code File Upload System

一个基于 Node.js 的二维码文件上传系统，支持文件上传和预览功能。

## 功能特点

- 生成唯一的二维码
- 通过扫描二维码上传文件
- 文件预览功能
- 支持图片文件在线预览
- 文件下载功能
- MongoDB 数据持久化

## 技术栈

- Node.js
- Express.js
- MongoDB
- EJS 模板引擎
- QR Code 生成
- GitHub Actions 自动部署

## 部署要求

- Node.js 16+
- MongoDB 4.4+
- PM2 (用于进程管理)

## 安装步骤

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

4. 启动 MongoDB：
```bash
# macOS
brew services start mongodb-community
```

5. 启动应用：
```bash
# 开发环境
npm run dev

# 生产环境
npm start
```

## GitHub Actions 自动部署

本项目使用 GitHub Actions 进行自动部署。当代码推送到 main 分支时，会自动触发部署流程。

### 配置部署

1. 在 GitHub 仓库设置中添加以下 Secrets：
   - `SERVER_HOST`: 服务器 IP 地址
   - `SERVER_USERNAME`: SSH 用户名
   - `SERVER_SSH_KEY`: SSH 私钥

2. 确保服务器上已安装：
   - Node.js
   - MongoDB
   - PM2

## 开发

```bash
# 启动开发服务器
npm run dev
```

## 生产部署

```bash
# 使用 PM2 启动应用
pm2 start index.js --name qrcode-app
```

## 许可证

ISC 