/**
 * 环境配置相关工具函数
 */

// 判断当前是否为生产环境
const isProduction = () => process.env.NODE_ENV === 'production';

// 检查必要的环境变量
const checkRequiredEnvVars = () => {
    const requiredVars = [
        'PORT',
        'STORAGE_BUCKET',
        'SESSION_SECRET',
        'ADMIN_USERNAME',
        'ADMIN_PASSWORD',
        'MAX_FILE_SIZE',
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY',
        'NODE_ENV'
    ];
    
    const missingVars = [];
    
    requiredVars.forEach(varName => {
        if (!process.env[varName]) {
            missingVars.push(varName);
        }
    });
    
    if (missingVars.length > 0) {
        console.error('错误: 缺少以下必要的环境变量:');
        missingVars.forEach(varName => {
            console.error(`- ${varName}`);
        });
        console.error('请在 .env 文件中设置这些变量或通过环境配置提供这些变量。');
        process.exit(1); // 退出程序
    }
};

module.exports = {
    isProduction,
    checkRequiredEnvVars
}; 