const { v4: uuidv4 } = require('uuid');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

async function createConversation(title = null) {
  const conversationId = uuidv4();
  
  try {
    const conversation = await Conversation.create({
      conversation_id: conversationId,
      conversation_create_time: new Date(),
      conversation_title: title
    });
    
    return conversation;
  } catch (error) {
    console.error('创建对话失败:', error);
    throw error;
  }
}

async function getAllConversations() {
  try {
    return await Conversation.findAll({
      order: [['conversation_create_time', 'DESC']]
    });
  } catch (error) {
    console.error('获取对话列表失败:', error);
    throw error;
  }
}

async function getConversationById(conversationId) {
  try {
    return await Conversation.findByPk(conversationId);
  } catch (error) {
    console.error('获取对话详情失败:', error);
    throw error;
  }
}

async function deleteConversation(conversationId) {
  try {
    // 先删除关联的消息
    await Message.destroy({
      where: { conversation_id: conversationId }
    });
    
    // 再删除对话本身
    return await Conversation.destroy({
      where: { conversation_id: conversationId }
    });
  } catch (error) {
    console.error('删除对话失败:', error);
    throw error;
  }
}

async function saveMessage(conversationId, sender, content) {
  try {
    return await Message.create({
      conversation_id: conversationId,
      message_sender: sender,
      message_content: content,
      message_send_time: new Date()
    });
  } catch (error) {
    console.error('保存消息失败:', error);
    throw error;
  }
}

async function getConversationHistory(conversationId) {
  try {
    return await Message.findAll({
      where: { conversation_id: conversationId },
      order: [['message_send_time', 'ASC']]
    });
  } catch (error) {
    console.error('获取对话历史失败:', error);
    throw error;
  }
}

module.exports = {
  createConversation,
  getAllConversations,
  getConversationById,
  deleteConversation,
  saveMessage,
  getConversationHistory
};
