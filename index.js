const express = require('express');
const multer = require('multer');
const path = require('path');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

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

// 存储二维码和文件的映射关系
const qrCodeMap = new Map();

// 生成新的二维码
app.get('/generate', async (req, res) => {
    const qrId = uuidv4();
    const qrUrl = `${req.protocol}://${req.get('host')}/qr/${qrId}`;
    const qrImage = await QRCode.toDataURL(qrUrl);
    
    qrCodeMap.set(qrId, {
        hasFile: false,
        filename: null
    });
    
    res.render('generate', { qrImage, qrUrl });
});

// 处理二维码扫描
app.get('/qr/:qrId', (req, res) => {
    const qrId = req.params.qrId;
    const qrInfo = qrCodeMap.get(qrId);
    
    if (!qrInfo) {
        return res.status(404).send('二维码不存在');
    }
    
    if (qrInfo.hasFile) {
        // 如果已经上传了文件，显示预览页面
        res.render('preview', { 
            filename: qrInfo.filename,
            qrId: qrId
        });
    } else {
        // 如果还没有上传文件，显示上传页面
        res.render('upload', { qrId });
    }
});

// 处理文件上传
app.post('/upload/:qrId', upload.single('file'), (req, res) => {
    const qrId = req.params.qrId;
    const qrInfo = qrCodeMap.get(qrId);
    
    if (!qrInfo) {
        return res.status(404).send('二维码不存在');
    }
    
    if (qrInfo.hasFile) {
        return res.status(400).send('该二维码已经上传过文件');
    }
    
    qrCodeMap.set(qrId, {
        hasFile: true,
        filename: req.file.filename
    });
    
    res.redirect(`/qr/${qrId}`);
});

// 文件预览/下载
app.get('/file/:qrId', (req, res) => {
    const qrId = req.params.qrId;
    const qrInfo = qrCodeMap.get(qrId);
    
    if (!qrInfo || !qrInfo.hasFile) {
        return res.status(404).send('文件不存在');
    }
    
    res.sendFile(path.join(uploadDir, qrInfo.filename));
});

app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
}); 