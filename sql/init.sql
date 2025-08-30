CREATE DATABASE IF NOT EXISTS ai_chat_db;

USE ai_chat_db;

CREATE TABLE IF NOT EXISTS conversation_list (
    conversation_id VARCHAR(36) NOT NULL PRIMARY KEY,
    conversation_create_time DATETIME NOT NULL,
    conversation_title VARCHAR(255) DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS conversation_history (
    record_id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    conversation_id VARCHAR(36) NOT NULL,
    message_sender ENUM('用户', 'AI') NOT NULL,
    message_content TEXT NOT NULL,
    message_send_time DATETIME NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversation_list(conversation_id)
);
