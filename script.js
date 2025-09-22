// API配置 - 在实际部署中，应该通过后端服务来保护API密钥
const API_CONFIG = {
    endpoint: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    model: "glm-z1-flash",
    temperature: 0.6,
    // 注意：在实际部署中，API密钥不应该直接暴露在前端代码中
    // 这里应该通过后端服务来代理API调用
    apiKey: "7b5c7afb6f54726077a539c7d2a0b764.JOFYYlJJoYmJc6pJ" // 请替换为您的实际API密钥
};

// DOM元素
const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');

// 存储对话历史
let conversationHistory = [
    {
        role: "system",
        content: "你是一个有用的AI助手，专门帮助用户学习和解答问题。请先思考再回答，思考过程放在<think>标签内，正式回答放在标签外。"
    }
];

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    // 发送按钮点击事件
    sendButton.addEventListener('click', sendMessage);
    
    // 输入框回车事件
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // 输入框内容变化时启用/禁用发送按钮
    userInput.addEventListener('input', function() {
        sendButton.disabled = !userInput.value.trim();
    });
});

// 发送消息函数
async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;
    
    // 添加用户消息到聊天界面
    addMessageToChat('user', message);
    
    // 清空输入框
    userInput.value = '';
    sendButton.disabled = true;
    
    // 显示"正在输入"指示器
    showTypingIndicator();
    
    try {
        // 调用API
        const response = await callGLMAPI(message);
        
        // 隐藏"正在输入"指示器
        hideTypingIndicator();
        
        // 添加AI回复到聊天界面
        addAssistantMessage(response);
        
    } catch (error) {
        // 隐藏"正在输入"指示器
        hideTypingIndicator();
        
        // 显示错误消息
        addMessageToChat('assistant', '抱歉，发生错误：' + error.message);
        console.error('API调用错误:', error);
    }
}

// 调用GLM API
async function callGLMAPI(userMessage) {
    // 添加用户消息到对话历史
    conversationHistory.push({
        role: "user",
        content: userMessage
    });
    
    const requestBody = {
        model: API_CONFIG.model,
        messages: conversationHistory,
        temperature: API_CONFIG.temperature,
        stream: false
    };
    
    const response = await fetch(API_CONFIG.endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_CONFIG.apiKey}`
        },
        body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
        throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.choices && data.choices.length > 0) {
        const assistantMessage = data.choices[0].message.content;
        
        // 添加助手消息到对话历史
        conversationHistory.push({
            role: "assistant",
            content: assistantMessage
        });
        
        return assistantMessage;
    } else {
        throw new Error('API返回数据格式异常');
    }
}

// 添加消息到聊天界面
function addMessageToChat(sender, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const avatar = document.createElement('img');
    avatar.className = 'avatar';
    avatar.src = sender === 'user' ? 'user.png' : 'assistant.png';
    avatar.alt = sender === 'user' ? '用户' : 'AI助手';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.textContent = content;
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);
    
    chatContainer.appendChild(messageDiv);
    
    // 滚动到底部
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// 添加助手消息（处理思维链）
function addAssistantMessage(content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant-message';
    
    const avatar = document.createElement('img');
    avatar.className = 'avatar';
    avatar.src = 'assistant.png';
    avatar.alt = 'AI助手';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    // 解析思维链和正式回答
    const thinkMatch = content.match(/<think>(.*?)<\/think>(.*)/s);
    
    if (thinkMatch) {
        const thinkContent = thinkMatch[1].trim();
        const formalAnswer = thinkMatch[2].trim();
        
        // 添加正式回答
        const answerSpan = document.createElement('div');
        answerSpan.textContent = formalAnswer;
        messageContent.appendChild(answerSpan);
        
        // 添加思维链切换按钮
        const thinkToggle = document.createElement('button');
        thinkToggle.className = 'think-toggle';
        thinkToggle.innerHTML = '👁️ 显示思考过程';
        
        // 添加思维链内容
        const thinkDiv = document.createElement('div');
        thinkDiv.className = 'think-content';
        thinkDiv.textContent = thinkContent;
        
        // 切换思维链显示状态
        thinkToggle.addEventListener('click', function() {
            const isShowing = thinkDiv.classList.contains('show');
            
            if (isShowing) {
                thinkDiv.classList.remove('show');
                thinkToggle.innerHTML = '👁️ 显示思考过程';
            } else {
                thinkDiv.classList.add('show');
                thinkToggle.innerHTML = '👁️ 隐藏思考过程';
            }
        });
        
        messageContent.appendChild(thinkToggle);
        messageContent.appendChild(thinkDiv);
    } else {
        // 如果没有思维链标签，直接显示内容
        messageContent.textContent = content;
    }
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);
    
    chatContainer.appendChild(messageDiv);
    
    // 滚动到底部
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// 显示"正在输入"指示器
function showTypingIndicator() {
    let typingIndicator = document.querySelector('.typing-indicator');
    
    if (!typingIndicator) {
        typingIndicator = document.createElement('div');
        typingIndicator.className = 'typing-indicator message assistant-message';
        
        const avatar = document.createElement('img');
        avatar.className = 'avatar';
        avatar.src = 'assistant.png';
        avatar.alt = 'AI助手';
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        const dotsContainer = document.createElement('div');
        dotsContainer.className = 'typing-dots';
        
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.className = 'typing-dot';
            dotsContainer.appendChild(dot);
        }
        
        messageContent.appendChild(dotsContainer);
        typingIndicator.appendChild(avatar);
        typingIndicator.appendChild(messageContent);
        
        chatContainer.appendChild(typingIndicator);
    }
    
    typingIndicator.classList.add('show');
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// 隐藏"正在输入"指示器
function hideTypingIndicator() {
    const typingIndicator = document.querySelector('.typing-indicator');
    if (typingIndicator) {
        typingIndicator.classList.remove('show');
        setTimeout(() => {
            if (typingIndicator.parentNode) {
                typingIndicator.parentNode.removeChild(typingIndicator);
            }
        }, 300);
    }
}