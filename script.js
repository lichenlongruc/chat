// API配置 - 在实际部署中，应该通过后端服务来保护API密钥
const API_CONFIG = {
    endpoint: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    model: "glm-z1-flash",
    temperature: 0.6,
    // 注意：在实际部署中，API密钥不应该直接暴露在前端代码中
    // 这里应该通过后端服务来代理API调用
    apiKey: "API_KEY" // 请替换为您的实际API密钥
};

// 配置marked（Markdown解析器）
marked.setOptions({
    highlight: function(code, lang) {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlight(code, { language }).value;
    },
    langPrefix: 'hljs language-',
    breaks: true,
    gfm: true
});

// DOM元素
const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');

// 存储对话历史
let conversationHistory = [
    {
        role: "system",
        content: "你是一个AI4MIS助手，专门帮助用户学习和解答管理信息系统学科相关问题。有一个关于MIS的知识库：Management Information System（MIS）的中文是管理信息系统：MIS主要观点：1985年，被誉为MIS创始人的美国明尼苏达大学卡尔森管理学院的G.B.戴维斯(Gordon B.Davis)将管理信息系统定义为一个综合利用计算机软硬件资源与手工操作，通过运用分析、计划、控制和决策模型以及数据库人机系统，旨在提供支持企业或组织运营管理和决策的信息。1984年，哈尔滨工业大学黄梯云编著出版了中国在该领域的第一部正式教材《管理信息系统》将MIS定义为应用计算机进行管理信息收集、传递、储存、加工、维护和使用，辅助企业管理的系统。2000年，复旦大学薛华成进一步阐释了MI概念，认为管理信息系统是一个以人为主导，利用计算机硬件、软件、网络通信设备以及其他办公设备，进行信息的收集、传输、加工、储存、更新和维护的系统。该系统以提升企业战略竞争优势、效益和效率为目标，支持企业高层的决策、中层的控制以及基层的日常运作，形成了一个集成化的人机系统。清华大学经济管理学院的陈国青提出了关于“信息系统”的“造”和“用”的观点，强调了管理信息系统领域内专业教育的两个关键方向。计算机科学与技术、软件工程，以及信息管理与信息系统专业的目标应定位在信息系统的“造”，即信息系统的开发。这包括管理信息系统的开发方式、方法，以及开发过程、步骤和技术，特别是在系统的分析、设计和实施过程中融入管理思想。相对地，一般的管理专业则侧重于信息系统的“用”，即在理解管理软件开发的基础上，学习管理软件的功能，掌握解决问题的能力，以及如何将先进的管理理念和方法整合到管理软件之中。MIS发展阶段：随着计算机的问世和发展，信息系统经历了由单机到网络、由简单到复杂，由数据处理到智能处理的转变。这一进程主要分为四个阶段:电子数据处理系统(electronic data processing systems; EDPS)、管理信息系统(MIS)、决策支持系统(decision support system; Dss)和人工智能(artificial inteligence;Al)。20世纪70年代未至80年代初，管理信息系统的概念被引入中国，最初在大学计算机,应用专业中开设了系统分析与设计课程，内容由最初的信息系统分析和设计逐步扩展到覆盖管理信息系统全生命周期的各个阶段，包括系统规划、分析、设计、实施、维护及评价。请先思考再回答，思考过程放在<think>标签内，正式回答放在标签外。请使用Markdown格式来格式化你的回答，例如使用**加粗**、###标题、`代码`等。"
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
    
    // 初始禁用发送按钮
    sendButton.disabled = true;
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
    
    // 用户消息直接显示文本
    if (sender === 'user') {
        messageContent.textContent = content;
    } else {
        // AI消息使用Markdown渲染
        messageContent.innerHTML = marked.parse(content);
    }
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);
    
    chatContainer.appendChild(messageDiv);
    
    // 滚动到底部
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// 添加助手消息（处理思维链和Markdown）
function addAssistantMessage(content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant-message';
    
    const avatar = document.createElement('img');
    avatar.className = 'avatar';
    avatar.src = 'assistant.png';
    avatar.alt = 'AI助手';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    // 改进的思维链提取逻辑 - 更严格地匹配<think>标签
    const thinkMatch = extractThinkContent(content);
    
    if (thinkMatch) {
        const thinkContent = thinkMatch.thinkContent;
        const formalAnswer = thinkMatch.formalAnswer;
        
        // 添加正式回答（使用Markdown渲染）
        const answerDiv = document.createElement('div');
        answerDiv.innerHTML = marked.parse(formalAnswer);
        messageContent.appendChild(answerDiv);
        
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
        // 如果没有思维链标签，直接显示内容（使用Markdown渲染）
        messageContent.innerHTML = marked.parse(content);
    }
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);
    
    chatContainer.appendChild(messageDiv);
    
    // 滚动到底部
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    // 高亮代码块
    document.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
    });
}

// 改进的思维链提取函数
function extractThinkContent(content) {
    // 更严格的正则表达式匹配<think>标签
    const thinkRegex = /<think>([\s\S]*?)<\/think>([\s\S]*)/;
    const match = content.match(thinkRegex);
    
    if (match && match.length >= 3) {
        return {
            thinkContent: match[1].trim(),
            formalAnswer: match[2].trim()
        };
    }
    
    // 如果没有匹配到标准的<think>标签，尝试其他可能的格式
    const thinkStart = content.indexOf('<think>');
    const thinkEnd = content.indexOf('</think>');
    
    if (thinkStart !== -1 && thinkEnd !== -1 && thinkEnd > thinkStart) {
        return {
            thinkContent: content.substring(thinkStart + 7, thinkEnd).trim(),
            formalAnswer: content.substring(thinkEnd + 8).trim()
        };
    }
    
    return null;
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