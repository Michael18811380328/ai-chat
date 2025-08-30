const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Conversation = require('./Conversation');

const Message = sequelize.define('Message', {
  record_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  conversation_id: {
    type: DataTypes.STRING(36),
    allowNull: false,
    references: {
      model: Conversation,
      key: 'conversation_id'
    }
  },
  message_sender: {
    type: DataTypes.ENUM('用户', 'AI'),
    allowNull: false
  },
  message_content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  message_send_time: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'conversation_history',
  timestamps: false
});

// 建立关联关系
Conversation.hasMany(Message, { foreignKey: 'conversation_id' });
Message.belongsTo(Conversation, { foreignKey: 'conversation_id' });

module.exports = Message;
