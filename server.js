const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const log4js = require('log4js');
const sequelize = require('./config/database');
const conversationService = require('./services/conversationService');
const aiService = require('./services/aiService');

log4js.configure({
  appenders: {
    fileAppender: {
      type: 'file',
      filename: 'ai-chat-server.log',
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

// 获取 logger 实例
const logger = log4js.getLogger();

// 初始化Express应用
const app = express();
const server = http.createServer(app);

// 配置CORS
app.use(cors({
  // 允许前端的域名和端口访问
  origin: 'http://localhost:3001',
  // 允许跨域请求的方法
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  // 允许跨域请求包含的头信息
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 解析JSON请求体
app.use(express.json());

// 创建 WebSocket 服务器时添加跨域配置
const wss = new WebSocket.Server({ 
  server,
  // 处理跨域问题
  verifyClient: (info, done) => {
    // 允许来自前端 3001 端口的连接
    const origin = info.origin;
    if (origin && (origin === 'http://localhost:3001' || origin.includes('localhost'))) {
      return done(true); // 允许连接
    }
    // 拒绝其他来源的连接
    done(false, 403, '不允许的跨域请求');
  }
});

// 存储WebSocket连接与对话ID的映射
const conversationConnections = new Map();

app.get('/api/ping', (req, res) => {
  res.send('pong');
});

// HTTP API路由
// 获取所有对话
app.get('/api/conversations', async (req, res) => {
  try {
    const conversations = await conversationService.getAllConversations();
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: '获取对话列表失败' });
  }
});

// 创建新对话
app.post('/api/conversations', async (req, res) => {
  try {
    const { title } = req.body;
    const conversation = await conversationService.createConversation(title);
    res.status(201).json(conversation);
  } catch (error) {
    res.status(500).json({ error: '创建对话失败' });
  }
});

// 删除对话
app.delete('/api/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await conversationService.deleteConversation(id);
    
    // 关闭对应的WebSocket连接
    const connection = conversationConnections.get(id);
    if (connection) {
      connection.close();
      conversationConnections.delete(id);
    }
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: '删除对话失败' });
  }
});

// 获取对话历史
app.get('/api/conversations/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    const history = await conversationService.getConversationHistory(id);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: '获取对话历史失败' });
  }
});


// WebSocket连接处理
wss.on('connection', async (ws, req) => {
  logger.info('新的WebSocket连接');
  
  // 从查询参数中获取对话ID
  const params = new URLSearchParams(req.url.slice(1));
  const conversationId = params.get('conversationId');

  if (!conversationId) {
    logger.warn('连接被拒绝: 缺少对话ID');
    // ws.close(1008, '缺少对话ID');
    return;
  }
  
  // 验证对话是否存在
  try {
    const conversation = await conversationService.getConversationById(conversationId);
    if (!conversation) {
      logger.warn('连接被拒绝: 对话不存在，ID:', conversationId);
      ws.close(1008, '对话不存在');
      return;
    }
    
    // 存储连接与对话ID的映射
    conversationConnections.set(conversationId, ws);
    logger.info(`对话 ${conversationId} 已建立连接`);
    
    // 发送连接成功消息给客户端
    ws.send(JSON.stringify({
      type: 'connection',
      message: 'WebSocket连接已建立'
    }));
    
    // 处理收到的消息
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        // 验证消息格式
        if (!message.content) {
          ws.send(JSON.stringify({
            type: 'error',
            message: '消息内容不能为空'
          }));
          return;
        }
        
        // 保存用户消息
        const userMessage = await conversationService.saveMessage(
          conversationId,
          '用户',
          message.content
        );
        
        // 向客户端发送确认
        ws.send(JSON.stringify({
          type: 'message',
          data: userMessage
        }));
        
        // 获取AI回复
        const aiResponse = await aiService.getAIResponse(message.content);
        
        // 保存AI回复
        const aiMessage = await conversationService.saveMessage(
          conversationId,
          'AI',
          aiResponse
        );
        
        // 向客户端发送AI回复
        ws.send(JSON.stringify({
          type: 'message',
          data: aiMessage
        }));
        
      } catch (error) {
        logger.error('处理消息错误:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: '处理消息时发生错误'
        }));
      }
    });
    
    // 连接关闭时清理
    ws.on('close', () => {
      logger.info(`对话 ${conversationId} 连接已关闭`);
      conversationConnections.delete(conversationId);
    });
    
  } catch (error) {
    logger.error('验证对话时出错:', error);
    ws.close(1011, '服务器内部错误');
  }
});

// 同步数据库模型并启动服务器
const PORT = process.env.PORT || 3000;

sequelize.sync()
  .then(() => {
    logger.info('数据库模型已同步');
    server.listen(PORT, () => {
      logger.info(`服务器运行在 http://localhost:${PORT}`);
    });
  })
  .catch(error => {
    logger.error('同步数据库模型失败:', error);
  });
