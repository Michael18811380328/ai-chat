// 模拟AI回复的服务
async function getAIResponse(message) {
  // 在实际应用中，这里会调用真实的AI服务API(OpenAI、豆包API)  
  // 简单的模拟回复逻辑
  const responses = [
    "我理解您的意思，您是说" + message + "对吗？",
    "关于这个问题，我的看法是" + message + "涉及到多个方面。",
    "您提出的" + message + "是一个很有价值的问题。",
    "让我思考一下，" + message + "这个问题可以从以下几个角度来看。"
  ];
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  // 随机返回一个模拟回复
  return responses[Math.floor(Math.random() * responses.length)];
}

module.exports = {
  getAIResponse
};
