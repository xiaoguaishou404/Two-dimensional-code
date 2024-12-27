require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

if (!process.env.MONGODB_URI || !process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
    console.error('缺少必要的环境变量配置（MONGODB_URI, ADMIN_USERNAME, ADMIN_PASSWORD）');
    process.exit(1);
}

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        const adminUser = new User({
            username: process.env.ADMIN_USERNAME,
            password: process.env.ADMIN_PASSWORD
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