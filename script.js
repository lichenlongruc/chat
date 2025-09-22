document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.getElementById('chat-container');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const cotToggle = document.getElementById('cot-toggle');

    // 智谱清言 API 配置
    const API_KEY = "7b5c7afb6f54726077a539c7d2a0b764.JOFYYlJJoYmJc6pJ"; // <--- 在这里替换你的 API Key
    const API_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

    // --- 工具函数 ---

    // 创建消息气泡的 DOM 元素
    function createMessageElement(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `flex ${role === 'user' ? 'justify-end' : 'justify-start'}`;

        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = `max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-lg shadow ${
            role === 'user' 
                ? 'bg-indigo-500 text-white' 
                : 'bg-gray-200 text-gray-800'
        }`;
        
        // 使用 marked.js 解析 Markdown
        bubbleDiv.innerHTML = marked.parse(content);
        
        messageDiv.appendChild(bubbleDiv);
        return messageDiv;
    }

    // 创建思维链消息的 DOM 元素
    function createCotMessageElement(thinking, answer) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'flex justify-start w-full';

        const outerBubbleDiv = document.createElement('div');
        outerBubbleDiv.className = 'max-w-xs md:max-w-md lg:max-w-lg w-full bg-white border border-gray-300 rounded-lg shadow-md overflow-hidden';

        // 思维链部分
        if (thinking) {
            const thinkingDiv = document.createElement('div');
            thinkingDiv.className = 'bg-yellow-50 border-b border-yellow-200 p-4';
            const thinkingTitle = document.createElement('h4');
            thinkingTitle.className = 'font-semibold text-yellow-800 mb-2';
            thinkingTitle.textContent = '推理过程 (Thinking Process)';
            const thinkingContent = document.createElement('div');
            thinkingContent.className = 'text-sm text-yellow-700 whitespace-pre-wrap'; // 保留换行
            thinkingContent.innerHTML = marked.parse(thinking);
            thinkingDiv.appendChild(thinkingTitle);
            thinkingDiv.appendChild(thinkingContent);
            outerBubbleDiv.appendChild(thinkingDiv);
        }

        // 最终答案部分
        const answerDiv = document.createElement('div');
        answerDiv.className = 'p-4';
        const answerTitle = document.createElement('h4');
        answerTitle.className = 'font-semibold text-gray-800 mb-2';
        answerTitle.textContent = '最终答案 (Final Answer)';
        const answerContent = document.createElement('div');
        answerContent.className = 'text-gray-700';
        answerContent.innerHTML = marked.parse(answer);
        answerDiv.appendChild(answerTitle);
        answerDiv.appendChild(answerContent);
        outerBubbleDiv.appendChild(answerDiv);
        
        messageDiv.appendChild(outerBubbleDiv);
        return messageDiv;
    }

    // 显示加载动画
    function showLoadingIndicator() {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'loading-indicator';
        loadingDiv.className = 'flex justify-start';
        loadingDiv.innerHTML = `
            <div class="bg-gray-200 text-gray-500 px-4 py-2 rounded-lg shadow flex items-center space-x-2">
                <div class="animate-pulse flex space-x-1">
                    <div class="w-2 h-2 bg-gray-500 rounded-full"></div>
                    <div class="w-2 h-2 bg-gray-500 rounded-full"></div>
                    <div class="w-2 h-2 bg-gray-500 rounded-full"></div>
                </div>
                <span>AI 正在思考...</span>
            </div>
        `;
        chatContainer.appendChild(loadingDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    // 移除加载动画
    function removeLoadingIndicator() {
        const indicator = document.getElementById('loading-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    // 显示错误信息
    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'flex justify-center';
        errorDiv.innerHTML = `
            <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow max-w-md">
                <strong>错误：</strong> ${message}
            </div>
        `;
        chatContainer.appendChild(errorDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    // --- 核心逻辑 ---

    // 发送消息
    async function sendMessage() {
        const userMessage = userInput.value.trim();
        if (!userMessage || !API_KEY || API_KEY === "YOUR_API_KEY") {
            if (!API_KEY || API_KEY === "YOUR_API_KEY") {
                showError("请先在 script.js 中配置你的 API Key。");
            }
            return;
        }

        // 禁用输入和按钮
        userInput.disabled = true;
        sendButton.disabled = true;

        // 添加用户消息到界面
        const userMessageElement = createMessageElement('user', userMessage);
        chatContainer.appendChild(userMessageElement);
        userInput.value = '';

        // 显示加载动画
        showLoadingIndicator();

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                },
                body: JSON.stringify({
                    model: "glm-z1-flash", // 确保模型名称正确
                    messages: [
                        { role: "user", content: userMessage }
                    ],
                    // 关键：思维链参数
                    // 如果开关打开，我们要求模型输出特定格式
                    ...(cotToggle.checked && {
                        "tools": [{
                            "type": "思维链",
                            "function": {
                                "name": "chain_of_thought",
                                "description": "用于解决复杂问题的思维链工具，请在回复时严格按照以下格式：\n<thinking>\n[你的推理过程]\n</thinking>\n<answer>\n[你的最终答案]\n</answer>"
                            }
                        }]
                    })
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API 请求失败: ${response.status} - ${errorData.error?.message || '未知错误'}`);
            }

            const data = await response.json();
            const assistantMessage = data.choices[0].message.content;

            removeLoadingIndicator();

            // 解析思维链
            if (cotToggle.checked) {
                const thinkingMatch = assistantMessage.match(/<thinking>([\s\S]*?)<\/thinking>/);
                const answerMatch = assistantMessage.match(/<answer>([\s\S]*?)<\/answer>/);

                const thinking = thinkingMatch ? thinkingMatch[1].trim() : null;
                const answer = answerMatch ? answerMatch[1].trim() : assistantMessage; // 如果没找到标签，则显示全部内容

                const cotMessageElement = createCotMessageElement(thinking, answer);
                chatContainer.appendChild(cotMessageElement);

            } else {
                // 不显示思维链，直接显示回答
                const assistantMessageElement = createMessageElement('assistant', assistantMessage);
                chatContainer.appendChild(assistantMessageElement);
            }

        } catch (error) {
            removeLoadingIndicator();
            console.error("Error:", error);
            showError(error.message);
        } finally {
            // 重新启用输入和按钮
            userInput.disabled = false;
            sendButton.disabled = false;
            userInput.focus();
        }

        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    // 绑定事件监听器
    sendButton.addEventListener('click', sendMessage);
    
    // 全局函数，供 HTML 的 onkeydown 调用
    window.sendMessage = sendMessage;
});
