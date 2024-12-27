require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/qrcode_db', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        const adminUser = new User({
            username: process.env.ADMIN_USERNAME || 'admin',
            password: process.env.ADMIN_PASSWORD || 'admin123'
        });

        await adminUser.save();
        console.log('管理员用户创建成功！');
        process.exit(0);
    } catch (error) {
        console.error('创建管理员用户失败:', error);
        process.exit(1);
    }
};

createAdmin(); 