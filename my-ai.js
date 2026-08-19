const inputArea = document.querySelector(".input-area");
const submit = document.querySelector(".submit");
const chatArea = document.querySelector(".chat-area");
const micButton = document.querySelector(".mic-button");
const stopButton = document.querySelector(".stop-button");
const memoryButton =
    document.querySelector(".memory-button");

const historyButton =
    document.querySelector(".history-button");

const memoryPanel =
    document.querySelector(".memory-panel");

const historyPanel =
    document.querySelector(".history-panel");

const memoryList =
    document.querySelector(".memory-list");

const historyList =
    document.querySelector(".history-list");

const closeMemory =
    document.querySelector(".close-memory");

const closeHistory =
    document.querySelector(".close-history");

const clearMemory =
    document.querySelector(".clear-memory");

const clearHistory =
    document.querySelector(".clear-history");

let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

let audioContext = null;
let analyser = null;
let microphoneSource = null;
let silenceTimer = null;
let speechDetected = false;
let animationFrame = null;

const SILENCE_DELAY = 1200;
const SPEECH_THRESHOLD = 0.025;

let speechQueue = [];
let isSpeaking = false;
let femaleVoice = null;
let speechWasStopped = false;
let conversationHistory =
    JSON.parse(
        localStorage.getItem("burtwabConversation") || "[]"
    );

let longTermMemory =
    JSON.parse(
        localStorage.getItem("burtwabMemory") || "[]"
    );

console.log(
    "🧠 Long-term memory:",
    longTermMemory
);

console.log(
    "🧠 Loaded memory:",
    conversationHistory
);

function saveMemory(memory) {
    if (!memory || !memory.trim()) {
        return;
    }

    const cleanMemory =
        memory.trim();

    const lowerMemory =
        cleanMemory.toLowerCase();

    const nameMatch =
        lowerMemory.match(
            /^my name is\s+(.+)$/i
        );

    const accumulativePatterns = [
        /^i(?:'m| am)\s+learning\s+/i,
        /^i(?:'m| am)\s+studying\s+/i,
        /^i(?:'m| am)\s+working on\s+/i,
        /^i(?:'m| am)\s+building\s+/i,
        /^i prefer\s+/i,
        /^i like\s+/i,
        /^i love\s+/i
    ];

    const isAccumulative =
        accumulativePatterns.some(
            pattern =>
                pattern.test(cleanMemory)
        );

    if (nameMatch) {

        const existingIndex =
            longTermMemory.findIndex(
                item =>
                    /^my name is\s+/i.test(
                        item
                    )
            );

        if (existingIndex !== -1) {

            if (
                longTermMemory[
                    existingIndex
                ].toLowerCase() ===
                lowerMemory
            ) {
                return;
            }

            longTermMemory[
                existingIndex
            ] = cleanMemory;

        } else {

            longTermMemory.push(
                cleanMemory
            );
        }

    } else if (isAccumulative) {

        if (
            longTermMemory.some(
                item =>
                    item.toLowerCase() ===
                    lowerMemory
            )
        ) {
            return;
        }

        longTermMemory.push(
            cleanMemory
        );

    } else {

        if (
            longTermMemory.some(
                item =>
                    item.toLowerCase() ===
                    lowerMemory
            )
        ) {
            return;
        }

        longTermMemory.push(
            cleanMemory
        );
    }

    localStorage.setItem(
        "burtwabMemory",
        JSON.stringify(
            longTermMemory
        )
    );

    console.log(
        "🧠 Memory saved:",
        cleanMemory
    );
}

function detectMemory(userText) {
    if (!userText || !userText.trim()) {
        return null;
    }

    const text = userText.trim();

    const explicitPatterns = [
        /^remember(?: that| this)?\s+(.+)/i,
        /^keep in mind(?: that)?\s+(.+)/i,
        /^don't forget(?: that)?\s+(.+)/i,
        /^do not forget(?: that)?\s+(.+)/i
    ];

    for (const pattern of explicitPatterns) {
        const match = text.match(pattern);

        if (match && match[1]) {
            return match[1].trim();
        }
    }

    const automaticPatterns = [
        /^my name is\s+(.+)/i,
        /^i(?:'m| am)\s+learning\s+(.+)/i,
        /^i(?:'m| am)\s+studying\s+(.+)/i,
        /^i(?:'m| am)\s+working on\s+(.+)/i,
        /^i(?:'m| am)\s+building\s+(.+)/i,
        /^i prefer\s+(.+)/i,
        /^i like\s+(.+)/i,
        /^i love\s+(.+)/i
    ];

    for (const pattern of automaticPatterns) {
        const match = text.match(pattern);

        if (match && match[1]) {
            return text;
        }
    }

    return null;
}

function getRelevantMemories(userText) {
    if (
        !userText ||
        longTermMemory.length === 0
    ) {
        return [];
    }

    const words =
        userText
            .toLowerCase()
            .replace(/[^\w\s]/g, "")
            .split(/\s+/)
            .filter(word => word.length > 2);

    const scoredMemories =
        longTermMemory.map(memory => {

            const memoryWords =
                memory
                    .toLowerCase()
                    .replace(/[^\w\s]/g, "")
                    .split(/\s+/);

            let score = 0;

            words.forEach(word => {
                if (
                    memoryWords.includes(word)
                ) {
                    score++;
                }
            });

            return {
                memory,
                score
            };
        });

    return scoredMemories
        .filter(item => item.score > 0)
        .sort(
            (a, b) =>
                b.score - a.score
        )
        .slice(0, 5)
        .map(item => item.memory);
}

function handleMemoryRequest(userText) {
    const memory =
        detectMemory(userText);

    if (!memory) {
        return false;
    }

    const confirmed =
        confirm(
            "🧠 Save this to long-term memory?\n\n" +
            memory
        );

    if (confirmed) {
        saveMemory(memory);

        console.log(
            "🧠 User confirmed memory:",
            memory
        );
    } else {
        console.log(
            "❌ Memory request cancelled"
        );
    }

    return true;
}

function displayMemory() {
    memoryList.innerHTML = "";

    if (longTermMemory.length === 0) {
        memoryList.innerHTML =
            "<p>No long-term memories saved.</p>";
        return;
    }

    longTermMemory.forEach(
        function(memory, index) {

            const item =
                document.createElement("div");

            item.classList.add(
                "memory-item"
            );

            const text =
                document.createElement("span");

            text.textContent =
                "🧠 " + memory;

            const deleteButton =
                document.createElement("button");

            deleteButton.textContent = "🗑️";

            deleteButton.classList.add(
                "delete-memory"
            );

            deleteButton.addEventListener(
                "click",
                function() {

                    const confirmed =
                        confirm(
                            "Delete this memory?\n\n" +
                            memory
                        );

                    if (!confirmed) {
                        return;
                    }

                    longTermMemory.splice(
                        index,
                        1
                    );

                    localStorage.setItem(
                        "burtwabMemory",
                        JSON.stringify(
                            longTermMemory
                        )
                    );

                    displayMemory();

                    console.log(
                        "🗑️ Memory deleted:",
                        memory
                    );
                }
            );

            item.appendChild(text);
            item.appendChild(deleteButton);

            memoryList.appendChild(item);
        }
    );
}

function displayHistory() {
    historyList.innerHTML = "";

    if (conversationHistory.length === 0) {
        historyList.innerHTML =
            "<p>No conversation history.</p>";
        return;
    }

    conversationHistory.forEach(
        function(message) {

            const item =
                document.createElement("div");

            item.classList.add(
                "history-item"
            );

            if (message.role === "user") {
                item.textContent =
                    "👤 You: " +
                    message.content;
            } else {
                item.textContent =
                    "🤖 AI: " +
                    message.content;
            }

            historyList.appendChild(item);
        }
    );
}

function showMemory() {
    console.log(
        "🧠 Burtwab Memory:",
        longTermMemory
    );
}

function loadVoices() {
    const voices = speechSynthesis.getVoices();

    femaleVoice =
        voices.find(
            voice =>
                voice.name ===
                "Microsoft Zira - English (United States)"
        ) ||
        voices.find(
            voice =>
                voice.lang === "en-US" &&
                /female|zira|samantha/i.test(voice.name)
        ) ||
        voices.find(
            voice => voice.lang === "en-US"
        ) ||
        voices[0];

    console.log("Selected voice:", femaleVoice);
}

speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();

function speakSentence(sentence) {
    if (!sentence || !sentence.trim()) {
        return;
    }

    speechWasStopped = false;

    speechQueue.push(sentence.trim());
    speakNext();
}

function speakNext() {
    if (isSpeaking || speechQueue.length === 0) {
        return;
    }

    if (speechWasStopped) {
        return;
    }

    isSpeaking = true;

    const sentence = speechQueue.shift();

    console.log("Speaking:", sentence);

    const speech =
        new SpeechSynthesisUtterance(sentence);

    if (femaleVoice) {
        speech.voice = femaleVoice;
    }

    speech.lang = "en-US";
    speech.rate = 1;
    speech.pitch = 1;

    speech.onstart = function() {
        console.log("Speech started");
    };

    speech.onend = function() {
        console.log("Speech finished");

        isSpeaking = false;

        if (!speechWasStopped) {
            speakNext();
        }
    };

    speech.onerror = function(event) {
        console.log(
            "Speech ended:",
            event.error
        );

        isSpeaking = false;

        if (!speechWasStopped) {
            speakNext();
        }
    };

    speechSynthesis.speak(speech);
}

function stopSpeaking() {
    console.log("⏹️ AI speech stopped");

    speechWasStopped = true;

    speechQueue = [];

    speechSynthesis.cancel();

    isSpeaking = false;
}

async function startRecording() {
    if (isRecording) {
        return;
    }

    try {
        const stream =
            await navigator.mediaDevices.getUserMedia({
                audio: true
            });

        audioChunks = [];
        speechDetected = false;

        audioContext = new AudioContext();

        analyser =
            audioContext.createAnalyser();

        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.8;

        microphoneSource =
            audioContext.createMediaStreamSource(stream);

        microphoneSource.connect(analyser);

        const data =
            new Uint8Array(analyser.fftSize);

        mediaRecorder =
            new MediaRecorder(stream, {
                mimeType: "audio/webm"
            });

        mediaRecorder.ondataavailable =
            function(event) {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

        mediaRecorder.onstop =
            async function() {

                stream
                    .getTracks()
                    .forEach(track => track.stop());

                if (animationFrame) {
                    cancelAnimationFrame(
                        animationFrame
                    );
                    animationFrame = null;
                }

                if (audioContext) {
                    try {
                        await audioContext.close();
                    } catch {}
                }

                audioContext = null;
                analyser = null;
                microphoneSource = null;

                const audioBlob =
                    new Blob(audioChunks, {
                        type: "audio/webm"
                    });

                if (audioBlob.size === 0) {
                    console.log(
                        "No audio recorded"
                    );
                    return;
                }

                console.log(
                    "Recording finished"
                );

                await transcribeAudio(
                    audioBlob
                );
            };

        mediaRecorder.start();

        isRecording = true;

        micButton.classList.add(
            "recording"
        );

        console.log("🎤 Listening...");

        detectSilence(data);

    } catch (error) {
        console.error(
            "Microphone error:",
            error
        );
    }
}

function detectSilence(data) {
    if (!isRecording || !analyser) {
        return;
    }

    analyser.getByteTimeDomainData(data);

    let sum = 0;

    for (let i = 0; i < data.length; i++) {
        const normalized =
            (data[i] - 128) / 128;

        sum +=
            normalized * normalized;
    }

    const volume =
        Math.sqrt(
            sum / data.length
        );

    if (volume > SPEECH_THRESHOLD) {

        speechDetected = true;

        if (silenceTimer) {
            clearTimeout(silenceTimer);
            silenceTimer = null;
        }

    } else if (
        speechDetected &&
        !silenceTimer
    ) {

        silenceTimer =
            setTimeout(() => {

                if (isRecording) {
                    console.log(
                        "🤫 Silence detected"
                    );

                    stopRecording();
                }

            }, SILENCE_DELAY);
    }

    animationFrame =
        requestAnimationFrame(
            () => detectSilence(data)
        );
}

function stopRecording() {
    if (
        !mediaRecorder ||
        mediaRecorder.state === "inactive"
    ) {
        return;
    }

    clearTimeout(silenceTimer);
    silenceTimer = null;

    if (animationFrame) {
        cancelAnimationFrame(
            animationFrame
        );

        animationFrame = null;
    }

    isRecording = false;

    micButton.classList.remove(
        "recording"
    );

    mediaRecorder.stop();

    console.log(
        "🛑 Recording stopped"
    );
}

async function transcribeAudio(audioBlob) {
    console.log(
        "Sending audio to Whisper..."
    );

    const formData = new FormData();

    formData.append(
        "file",
        audioBlob,
        "recording.webm"
    );

    try {

        const response =
            await fetch(
                "http://127.0.0.1:8081/inference",
                {
                    method: "POST",
                    body: formData
                }
            );

        if (!response.ok) {
            const errorText =
                await response.text();

            throw new Error(
                errorText
            );
        }

        const result =
            await response.json();

        console.log(
            "Whisper response:",
            result
        );

        if (!result.text) {
            return;
        }

        const text =
            result.text.trim();

        if (!text) {
            return;
        }

        inputArea.value = text;

        await sendMessage(text);

    } catch (error) {

        console.error(
            "Whisper connection error:",
            error
        );
    }
}

async function sendMessage(userText) {
    if (!userText || !userText.trim()) {
        return;
    }

    userText = userText.trim();
    handleMemoryRequest(userText);

    const userMessage =
        document.createElement("div");

    userMessage.textContent =
        userText;

    userMessage.classList.add(
        "user-message"
    );

    chatArea.appendChild(
        userMessage
    );

    inputArea.value = "";

    const aiMessage =
        document.createElement("div");

    aiMessage.classList.add(
        "ai-message"
    );

    chatArea.appendChild(
        aiMessage
    );

    let speechBuffer = "";
    let assistantResponse = "";

    conversationHistory.push({
        role: "user",
        content: userText
    });

    localStorage.setItem(
        "burtwabConversation",
        JSON.stringify(conversationHistory)
    );

    const relevantMemories =
    getRelevantMemories(userText);

    const messagesForQwen = [];

    if (relevantMemories.length > 0) {

        messagesForQwen.push({
            role: "system",
            content:
                "You are an AI assistant.\n\n" +

                "The following are facts about the USER. " +
                "They are NOT facts about you. " +
                "Use them only when relevant to the user's question.\n\n" +

                relevantMemories
                    .map(memory => "- " + memory)
                    .join("\n")
        });
    }

    const recentConversation =
    conversationHistory.slice(-50);

    messagesForQwen.push(
        ...recentConversation
    );

    try {

        const response =
            await fetch(
                "http://127.0.0.1:8080/v1/chat/completions",
                {
                    method: "POST",

                    headers: {
                        "content-type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        messages: messagesForQwen,
                        temperature: 0.7,
                        max_tokens: 300,
                        stream: true
                    })
                }
            );

        console.log(
            "Qwen response received!"
        );

        if (!response.ok) {
            throw new Error(
                await response.text()
            );
        }

        const reader =
            response.body.getReader();

        const decoder =
            new TextDecoder();

        let buffer = "";

        while (true) {

            const {
                done,
                value
            } = await reader.read();

            if (done) {
                break;
            }

            buffer +=
                decoder.decode(
                    value,
                    {
                        stream: true
                    }
                );

            const lines =
                buffer.split("\n");

            buffer =
                lines.pop() || "";

            for (const line of lines) {

                if (
                    !line.startsWith(
                        "data: "
                    )
                ) {
                    continue;
                }

                if (
                    line.trim() ===
                    "data: [DONE]"
                ) {
                    continue;
                }

                try {

                    const json =
                        line.slice(6);

                    const parsed =
                        JSON.parse(json);

                    const content =
                        parsed
                            .choices?.[0]
                            ?.delta
                            ?.content;

                    if (!content) {
                        continue;
                    }

                    aiMessage.textContent +=
                        content;

                    speechBuffer +=
                        content;

                    assistantResponse +=
                        content;

                    chatArea.scrollTop =
                        chatArea.scrollHeight;

                    let sentenceMatch;

                    while (
                        sentenceMatch =
                            speechBuffer.match(
                                /^(.+?[.!?])(?:\s+|$)/
                            )
                    ) {

                        const sentence =
                            sentenceMatch[1]
                                .trim();

                        if (sentence) {
                            speakSentence(
                                sentence
                            );
                        }

                        speechBuffer =
                            speechBuffer
                                .slice(
                                    sentenceMatch[0]
                                        .length
                                )
                                .trimStart();
                    }

                } catch (error) {

                    console.log(
                        "Stream parsing skipped:",
                        error
                    );
                }
            }
        }

            if (speechBuffer.trim()) {
        speakSentence(
            speechBuffer.trim()
        );
        }

            if (assistantResponse.trim()) {
        conversationHistory.push({
            role: "assistant",
            content: assistantResponse.trim()
        });
    
        localStorage.setItem(
            "burtwabConversation",
            JSON.stringify(conversationHistory)
        );
    }

        console.log(
            "Qwen stream finished"
        );

        } catch (error) {

            console.error(
                "Qwen error:",
                error
            );

            aiMessage.textContent =
                "Something went wrong.";
        }
    }

    micButton.addEventListener(
        "click",
        async function() {

            if (isRecording) {
                stopRecording();
            } else {
                await startRecording();
            }
        }
    );

    stopButton.addEventListener(
        "click",
        function() {
            stopSpeaking();
        }
    );

    submit.addEventListener(
        "click",
        function() {

            const text =
                inputArea.value.trim();

            if (text) {
                sendMessage(text);
            }
        }
    );

    inputArea.addEventListener(
        "keydown",
        function(event) {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                const text =
                    inputArea.value.trim();

                if (text) {
                    sendMessage(text);
                }
            }
        }
    );

memoryButton.addEventListener(
    "click",
    function() {

        memoryPanel.classList.toggle(
            "active"
        );

        historyPanel.classList.remove(
            "active"
        );

        displayMemory();
    }
);

historyButton.addEventListener(
    "click",
    function() {

        historyPanel.classList.toggle(
            "active"
        );

        memoryPanel.classList.remove(
            "active"
        );

        displayHistory();
    }
);

closeMemory.addEventListener(
    "click",
    function() {
        memoryPanel.classList.remove(
            "active"
        );
    }
);

closeHistory.addEventListener(
    "click",
    function() {
        historyPanel.classList.remove(
            "active"
        );
    }
);

clearMemory.addEventListener(
    "click",
    function() {

        const confirmed =
            confirm(
                "Clear all long-term memories?"
            );

        if (!confirmed) {
            return;
        }

        longTermMemory = [];

        localStorage.removeItem(
            "burtwabMemory"
        );

        displayMemory();

        console.log(
            "🗑️ Long-term memory cleared"
        );
    }
);

clearHistory.addEventListener(
    "click",
    function() {

        const confirmed =
            confirm(
                "Clear conversation history?"
            );

        if (!confirmed) {
            return;
        }

        conversationHistory = [];

        localStorage.removeItem(
            "burtwabConversation"
        );

        displayHistory();

        console.log(
            "🧹 Conversation history cleared"
        );
    }
);

console.log(inputArea);
console.log(submit);
console.log(micButton);