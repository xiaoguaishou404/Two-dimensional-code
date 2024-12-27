const express = require('express');
const multer = require('multer');
const path = require('path');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
require('dotenv').config();
const connectDB = require('./config/db');
const QRCodeModel = require('./models/QRCode');
const User = require('./models/User');

// 连接数据库
connectDB();

const app = express();
const port = process.env.PORT || 3000;

// Session 配置
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/qrcode_db',
        ttl: 24 * 60 * 60 // 1 day
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
}));

// 允许所有跨域请求
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 添加 JSON 和 form 解析中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// 设置模板引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 身份验证中间件
const requireLogin = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
};

// 登录页面
app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

// 处理登录请求
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });

        if (!user || !(await user.comparePassword(password))) {
            return res.render('login', { error: '用户名或密码错误' });
        }

        req.session.userId = user._id;
        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.render('login', { error: '登录失败，请重试' });
    }
});

// 登出
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// 存储上传文件的目录
const uploadDir = path.join(__dirname, process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// 配置文件存储
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const qrId = req.params.qrId;
        const ext = path.extname(file.originalname);
        cb(null, qrId + ext);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 // 默认 10MB
    }
});

// 生成新的二维码 API
app.get('/api/qrcode/generate', async (req, res) => {
    try {
        const count = parseInt(req.query.count) || 1; // 从查询参数获取数量
        
        // 限制最大生成数量
        if (count > 100) {
            return res.status(400).json({
                success: false,
                error: '单次最多生成 100 个二维码'
            });
        }
        
        const qrCodes = [];

        for (let i = 0; i < count; i++) {
            const qrId = uuidv4();
            const qrUrl = `${req.protocol}://${req.get('host')}/qr/${qrId}`;
            
            // 在数据库中创建新记录
            await QRCodeModel.create({
                qrId: qrId,
                hasFile: false
            });
            
            qrCodes.push({
                qrId: qrId,
                qrUrl: qrUrl
            });
        }
        
        res.json({
            success: true,
            data: qrCodes
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: '服务器错误'
        });
    }
});

// 获取二维码状态 API
app.get('/api/qrcode/:qrId/status', async (req, res) => {
    try {
        const qrId = req.params.qrId;
        const qrInfo = await QRCodeModel.findOne({ qrId });
        
        if (!qrInfo) {
            return res.status(404).json({
                success: false,
                error: '二维码不存在'
            });
        }
        
        res.json({
            success: true,
            data: {
                qrId: qrInfo.qrId,
                hasFile: qrInfo.hasFile,
                filename: qrInfo.originalFilename,
                createdAt: qrInfo.createdAt
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: '服务器错误'
        });
    }
});

// 处理文件上传
app.post('/upload/:qrId', upload.single('file'), async (req, res) => {
    try {
        const qrId = req.params.qrId;
        const qrInfo = await QRCodeModel.findOne({ qrId });
        
        if (!qrInfo) {
            return res.status(404).send('二维码不存在');
        }
        
        if (qrInfo.hasFile) {
            return res.status(400).send('该二维码已经上传过文件');
        }
        
        // 更新数据库记录
        await QRCodeModel.findOneAndUpdate(
            { qrId },
            {
                hasFile: true,
                filename: req.file.filename,
                originalFilename: req.file.originalname
            }
        );
        
        res.redirect(`/qr/${qrId}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('服务器错误');
    }
});

// 文件预览/下载
app.get('/file/:qrId', async (req, res) => {
    try {
        const qrId = req.params.qrId;
        const qrInfo = await QRCodeModel.findOne({ qrId });
        
        if (!qrInfo || !qrInfo.hasFile) {
            return res.status(404).send('文件不存在');
        }
        
        res.sendFile(path.join(uploadDir, qrInfo.filename));
    } catch (error) {
        console.error(error);
        res.status(500).send('服务器错误');
    }
});

// 处理二维码扫描
app.get('/qr/:qrId', async (req, res) => {
    try {
        const qrId = req.params.qrId;
        const qrInfo = await QRCodeModel.findOne({ qrId });
        
        if (!qrInfo) {
            return res.status(404).send('二维码不存在');
        }
        
        if (qrInfo.hasFile) {
            // 如果已经上传了文件，显示预览页面
            res.render('preview', { 
                filename: qrInfo.filename,
                qrId: qrId,
                originalFilename: qrInfo.originalFilename
            });
        } else {
            // 如果还没有上传文件，显示上传页面
            res.render('upload', { qrId });
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('服务器错误');
    }
});

// 主页路由 - 添加登录验证
app.get('/', requireLogin, async (req, res) => {
    try {
        // 获取统计数据
        const totalQRCodes = await QRCodeModel.countDocuments();
        const usedQRCodes = await QRCodeModel.countDocuments({ hasFile: true });
        const unusedQRCodes = totalQRCodes - usedQRCodes;

        // 获取最近上传的文件
        const recentUploads = await QRCodeModel.find({ hasFile: true })
            .sort({ createdAt: -1 })
            .limit(10);

        // 获取最近创建的二维码
        const qrCodes = await QRCodeModel.find()
            .sort({ createdAt: -1 })
            .limit(20);

        res.render('index', {
            totalQRCodes,
            usedQRCodes,
            unusedQRCodes,
            recentUploads,
            qrCodes,
            req
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('服务器错误');
    }
});

app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
    console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
}); 