import React, { useState, useEffect, useRef } from 'react';
import { IoAdd, IoTrash, IoSend, IoRefresh } from 'react-icons/io5';

const API_BASE_URL = 'http://127.0.0.1:3000';

const App = () => {
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [ws, setWs] = useState(null);
  const messagesEndRef = useRef(null);

  // 初始化 - 获取所有对话
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/conversations`)
      .then(res => res.json())
      .then(data => {
        setConversations(data);
        if (data.length > 0) {
          setCurrentConversationId(data[0].conversation_id);
        }
      })
      .catch(err => console.error('获取对话列表失败:', err));
  }, []);

  // 切换当前对话时加载历史消息并建立WebSocket连接
  useEffect(() => {
    if (!currentConversationId) return;

    // 加载历史消息
    fetch(`${API_BASE_URL}/api/conversations/${currentConversationId}/history`)
      .then(res => res.json())
      .then(data => setMessages(data))
      .catch(err => console.error('获取对话历史失败:', err));

    // 关闭现有WebSocket连接
    if (ws) {
      ws.close();
    }

    // 建立新的WebSocket连接
    const newWs = new WebSocket(`ws://localhost:3000/conversationId=${currentConversationId}`);
    
    newWs.onopen = () => {
      console.log('WebSocket连接已建立');
      setWs(newWs);
    };

    newWs.onerror = (error) => {
      console.error('WebSocket错误:', error);
    };

    newWs.onclose = () => {
      console.log('WebSocket连接已关闭');
      // 尝试重新连接
      setTimeout(() => {
        if (currentConversationId) {
          console.log('正在尝试重新连接...');
          setWs(null);
        }
      }, 3000);
    };

    // 处理WebSocket消息
    newWs.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'message') {
        setMessages(prev => [...prev, data.data]);
        setIsLoading(false);
      } else if (data.type === 'error') {
        console.error('WebSocket错误:', data.message);
        setIsLoading(false);
      }
    };

    // 清理函数 - 组件卸载时关闭连接
    return () => {
      newWs.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentConversationId]);

  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 创建新对话
  const handleCreateConversation = () => {
    fetch(`${API_BASE_URL}/api/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '新对话' })
    })
      .then(res => res.json())
      .then(newConversation => {
        setConversations(prev => [...prev, newConversation]);
        setCurrentConversationId(newConversation.conversation_id);
        setMessages([]);
      })
      .catch(err => console.error('创建对话失败:', err));
  };

  // 删除对话
  const handleDeleteConversation = (id) => {
    if (window.confirm('确定要删除这个对话吗？')) {
      fetch(`${API_BASE_URL}/api/conversations/${id}`, { method: 'DELETE' })
        .then(() => {
          setConversations(prev => prev.filter(c => c.conversation_id !== id));
          if (currentConversationId === id) {
            const remainingConversations = conversations.filter(c => c.conversation_id !== id);
            if (remainingConversations.length > 0) {
              setCurrentConversationId(remainingConversations[0].conversation_id);
            } else {
              setCurrentConversationId(null);
              setMessages([]);
            }
          }
        })
        .catch(err => console.error('删除对话失败:', err));
    }
  };

  // 发送消息
  const handleSendMessage = () => {
    if (!input.trim() || !ws || isLoading) return;
    const message = { content: input.trim() };    
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      setInput('');
      setIsLoading(true);
    } else {
      console.error('WebSocket is not connected');
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 overflow-hidden">
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-slate-600">AI 问答助手</h1>
        </div>
        <button
          onClick={handleCreateConversation}
          className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 hover:bg-gray-50 transition-colors w-full text-left"
        >
          <IoAdd className="text-slate-500 h-5 w-5" />
          <span>新建对话</span>
        </button>
        <div className="flex-1 overflow-y-auto">
          {conversations.map(conversation => (
            <div
              key={conversation.conversation_id}
              className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${currentConversationId === conversation.conversation_id ? 'bg-slate-50 border-l-4 border-slate-500' : 'hover:bg-gray-50'}`}
              onClick={() => setCurrentConversationId(conversation.conversation_id)}
            >
              <div className="truncate max-w-[180px]">
                {conversation.conversation_title || `对话 ${conversation.conversation_id.slice(0, 8)}`}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteConversation(conversation.conversation_id);
                }}
                className="text-gray-400 hover:text-red-500 transition-colors p-1"
              >
                <IoTrash className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col h-full">
        {currentConversationId ? (
          <>
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <p>开始您的对话吧</p>
                  <p className="text-sm mt-1">输入问题，AI 将为您解答</p>
                </div>
              ) : (
                messages.map(message => (
                  <div 
                    key={message.record_id}
                    className={`mb-6 max-w-3xl ${message.message_sender === '用户' ? 'ml-auto' : 'mr-auto'}`}
                  >
                    <div className={`p-3 rounded-lg shadow-sm ${message.message_sender === '用户' ? 'bg-slate-500 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none border border-gray-200'}`}>
                      <p>{message.message_content}</p>
                    </div>
                    <div className={`text-xs text-gray-400 mt-1 ${message.message_sender === '用户' ? 'text-right' : ''}`}>
                      {new Date(message.message_send_time).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />              
              {isLoading && (
                <div className="flex items-center justify-center mb-6">
                  <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 rounded-bl-none">
                    <IoRefresh className="h-5 w-5 text-gray-400 animate-spin" />
                  </div>
                </div>
              )}
            </div>            
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="输入您的问题..."
                  className="flex-1 border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent resize-none min-h-[80px] max-h-[200px] overflow-y-auto"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isLoading}
                  className={`p-3 rounded-lg transition-colors ${input.trim() && !isLoading ? 'bg-slate-500 text-white hover:bg-slate-600' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                >
                  <IoSend className="h-5 w-5" />
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">
                按 Enter 发送消息，Shift+Enter 换行
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <p>请创建或选择一个对话</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
