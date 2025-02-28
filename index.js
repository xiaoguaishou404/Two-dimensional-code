require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const QRCodeModel = require('./models/QRCode');
const supabase = require('./config/supabase');
const { isProduction, checkRequiredEnvVars } = require('./config/env');


const app = express();
const port = process.env.PORT;


const STORAGE_BUCKET = process.env.STORAGE_BUCKET;
// 使用环境配置模块中的isProduction函数
const productionMode = isProduction();

// 在应用启动前检查环境变量
checkRequiredEnvVars();

app.set('trust proxy', 1); // 信任第一个代理


// 使用 cookie-parser
app.use(cookieParser(process.env.SESSION_SECRET));



// Session 配置
const sessionConfig = {
    secret: process.env.SESSION_SECRET,
    name: 'sessionId',
    // 信任代理头，否则会影响secure判断。
    proxy: true, 
    cookie: {
        secure: productionMode,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax',
    }
};

app.use(session(sessionConfig));

// 配置 CORS
const corsOptions = {
    origin: true, // 允许所有来源，同时支持credentials
    credentials: true,// 允许所有来源请求携带cookie
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie']
};

app.use(cors(corsOptions));

// 添加调试中间件
app.use((req, res, next) => {
    console.log('请求路径:', req.path);
    console.log('Session ID:', req.sessionID);
    console.log('Session:', req.session);
    console.log('Cookies:', req.cookies);
    console.log('Signed Cookies:', req.signedCookies);
    console.log('Headers:', req.headers);
    next();
});

// 添加 JSON 和 form 解析中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 设置模板引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 身份验证中间件
const requireLogin = (req, res, next) => {

    if (req.session && req.session.isAdmin) {
        console.log('管理员登录通过');
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
        
        if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
            req.session.isAdmin = true;
            req.session.username = username;
            
            // 确保 session 被保存
            req.session.save((err) => {
                if (err) { return res.render('login', { error: err });}
                
                res.redirect('/root');
            });
        } else {
            res.render('login', { error: '用户名或密码错误' });
        }
    } catch (error) {
        console.error('登录捕获到错误:', error);
        res.render('login', { error });
    }
});

// 登出
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// 配置内存存储的 multer
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE)
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = {
            'image/jpeg': true,
            'image/png': true,
            'image/gif': true,
            'image/webp': true,
            'audio/mpeg': true,
            'audio/wav': true,
            'audio/ogg': true,
            'audio/mp4': true,
            'video/mp4': true,
            'video/webm': true,
            'video/ogg': true,
            'video/quicktime': true
        };

        if (allowedTypes[file.mimetype]) {
            cb(null, true);
        } else {
            cb(new Error('不支持的文件类型。只允许上传图片、音频和视频文件。'), false);
        }
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
                message: '单次最多生成 100 个二维码'
            });
        }
        
        const qrCodes = [];

        for (let i = 0; i < count; i++) {
            const qr_id = uuidv4();
            const qr_url = `${req.protocol}://${req.get('host')}/qr/${qr_id}`;
            
            // 在数据库中创建新记录
            await QRCodeModel.create({
                qr_id: qr_id,
                has_file: false
            });
            
            qrCodes.push({
                qr_id: qr_id,
                qr_url: qr_url
            });
        }
        
        res.json({
            success: true,
            data: qrCodes
        });
    } catch (error) {
        console.error('生成二维码错误:', error);
        res.status(500).json({
            success: false,
            message: '生成二维码失败'
        });
    }
});

// 获取二维码状态 API
app.get('/api/qrcode/:qr_id/status', async (req, res) => {
    try {
        const qr_id = req.params.qr_id;
        const qrInfo = await QRCodeModel.findOne({ qr_id });
        
        if (!qrInfo) {
            return res.status(404).json({
                success: false,
                message: '二维码不存在'
            });
        }
        
        res.json({
            success: true,
            data: {
                qr_id: qrInfo.qr_id,
                has_file: qrInfo.has_file,
                filename: qrInfo.original_filename,
                created_at: qrInfo.created_at
            }
        });
    } catch (error) {
        console.error('获取二维码状态错误:', error);
        res.status(500).json({
            success: false,
            message: '获取二维码状态失败'
        });
    }
});

// 处理文件上传
app.post('/upload/:qr_id', upload.single('file'), async (req, res) => {
    try {
        const qr_id = req.params.qr_id;
        const qrInfo = await QRCodeModel.findOne({ qr_id });
        
        if (!qrInfo) {
            return res.status(404).send('二维码不存在');
        }
        
        if (qrInfo.has_file) {
            return res.status(400).send('该二维码已经上传过文件');
        }

        const file = req.file;
        const file_ext = path.extname(file.originalname);
        const filename = `${qr_id}_${file_ext}`;

        // 上传到 Supabase Storage
        const { data, error } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(filename, file.buffer, {
                contentType: file.mimetype,
                upsert: true
            });

        if (error) {
            console.error('文件上传错误:', error);
            return res.status(500).send('文件上传失败');
        }

        // 获取文件的公共URL
        const { data: { publicUrl: file_url } } = supabase.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(filename);

        // 更新数据库记录
        await QRCodeModel.findOneAndUpdate(
            { qr_id },
            {
                has_file: true,
                filename: filename,
                original_filename: file.originalname,
                file_url: file_url
            }
        );
        
        res.redirect(`/qr/${qr_id}`);
    } catch (error) {
        console.error('服务器错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器处理请求时出错'
        });
    }
});

// 文件预览/下载
app.get('/file/:qr_id', async (req, res) => {
    try {
        const qr_id = req.params.qr_id;
        const qrInfo = await QRCodeModel.findOne({ qr_id });
        
        if (!qrInfo || !qrInfo.has_file) {
            return res.status(404).send('文件不存在');
        }

        // 直接重定向到文件的公共URL
        res.redirect(qrInfo.file_url);
    } catch (error) {
        console.error('获取文件URL错误:', error);
        res.status(500).json({
            success: false,
            message: '获取文件失败'
        });
    }
});

// 处理二维码扫描
app.get('/qr/:qr_id', async (req, res) => {
    try {
        const qr_id = req.params.qr_id;
        const qrInfo = await QRCodeModel.findOne({ qr_id });
        
        if (!qrInfo) {
            return res.status(404).send('二维码不存在');
        }
        
        if (qrInfo.has_file) {
            // 如果已经上传了文件，显示预览页面
            res.render('preview', { 
                filename: qrInfo.filename,
                qr_id: qr_id,
                original_filename: qrInfo.original_filename,
                max_file_size: process.env.MAX_FILE_SIZE
            });
        } else {
            // 如果还没有上传文件，显示上传页面
            res.render('upload', { 
                qr_id,
                max_file_size: process.env.MAX_FILE_SIZE
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('服务器错误');
    }
});

// 主页路由 - 欢迎页面
app.get('/', (req, res) => {
    res.render('welcome');
});

// 管理系统路由 - 添加登录验证
app.get('/root', requireLogin, async (req, res) => {
    try {
        // 获取统计数据
        const total_qr_codes = await QRCodeModel.countDocuments();
        const used_qr_codes = await QRCodeModel.countDocuments({ has_file: true });
        const unused_qr_codes = total_qr_codes - used_qr_codes;

        // 获取最近上传的文件
        const recent_uploads = await QRCodeModel.find({ 
            has_file: true,
            sort: { created_at: -1 },
            limit: 10
        });

        // 获取最近创建的二维码
        const qr_codes = await QRCodeModel.find({
            sort: { created_at: -1 },
            limit: 20
        });

        res.render('index', {
            total_qr_codes,
            used_qr_codes,
            unused_qr_codes,
            recent_uploads,
            qr_codes,
            req
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('服务器错误');
    }
});

app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
    console.log(`环境: ${process.env.NODE_ENV}`);
}); 