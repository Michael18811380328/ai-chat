const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Conversation = sequelize.define('Conversation', {
  conversation_id: {
    type: DataTypes.STRING(36),
    primaryKey: true,
    allowNull: false
  },
  conversation_create_time: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  conversation_title: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'conversation_list',
  timestamps: false
});

module.exports = Conversation;
