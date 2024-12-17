const express = require('express');
const multer = require('multer');
const path = require('path');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const connectDB = require('./config/db');
const QRCodeModel = require('./models/QRCode');

// 连接数据库
connectDB();

const app = express();
const port = 3000;

// 设置模板引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 存储上传文件的目录
const uploadDir = path.join(__dirname, 'uploads');
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

const upload = multer({ storage: storage });

// 生成新的二维码
app.get('/generate', async (req, res) => {
    try {
        const qrId = uuidv4();
        const qrUrl = `${req.protocol}://${req.get('host')}/qr/${qrId}`;
        const qrImage = await QRCode.toDataURL(qrUrl);
        
        // 在数据库中创建新记录
        await QRCodeModel.create({
            qrId: qrId,
            hasFile: false
        });
        
        res.render('generate', { qrImage, qrUrl });
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

app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
}); 