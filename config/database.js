const { Sequelize } = require('sequelize');
const log4js = require('log4js');

log4js.configure({
  appenders: {
    fileAppender: {
      type: 'file',
      filename: 'ai-chat-dababase.log',
      maxLogSize: 10485760, // 10MB
      backups: 5,
      layout: {
        type: 'pattern',
        pattern: '%d{yyyy-MM-dd hh:mm:ss.SSS} [%p] %m%n'
      }
    }
  },
  categories: {
    default: {
      appenders: ['fileAppender'],
      level: 'info'
    }
  }
});

const logger = log4js.getLogger();

// 数据库配置
const sequelize = new Sequelize(
  'ai_chat_db',  // 数据库名
  'root',        // 用户名
  'db_dev',    // 密码
  {
    host: 'localhost',
    dialect: 'mysql',
    logging: false // 关闭SQL日志输出，生产环境建议开启
  }
);

// 测试数据库连接
async function testConnection() {
  try {
    await sequelize.authenticate();
    logger.info('数据库连接成功');
  } catch (error) {
    logger.error('数据库连接失败:', error);
  }
}

testConnection();

module.exports = sequelize;
