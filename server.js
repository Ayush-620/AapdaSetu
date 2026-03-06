require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { AssemblyAI } = require('assemblyai');

const app = express();
app.use(cors());
app.use(express.json());

// Setup Multer to keep the incoming audio file in memory
const upload = multer(); 

// Safely initialize AssemblyAI (Won't crash if key is temporarily missing on boot)
const aaiKey = process.env.ASSEMBLYAI_API_KEY;
const aai = aaiKey ? new AssemblyAI({ apiKey: aaiKey }) : null;

// 1. Serve HTML files directly from the CURRENT folder
app.use(express.static(__dirname));

// 2. SECURE PROXY ROUTE: Chatbot (GEMINI 1.5 FLASH)
app.post('/api/ai-chat', async (req, res) => {
    try {
        if (!process.env.GEMINI_API_KEY) throw new Error("CRITICAL: GEMINI_API_KEY is missing on Render!");
        
        console.log("🤖 Forwarding chat to Google Gemini...");
        const payload = { ...req.body, model: 'gemini-2.5-flash' };

        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GEMINI_API_KEY}` 
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Google API Rejected Request: ${response.status} - ${errText}`);
        }
        
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error("❌ Gemini Chat Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// 3. SECURE PROXY ROUTE: Dispatcher (GEMINI 1.5 FLASH)
app.post('/api/ai-dispatch', async (req, res) => {
    try {
        if (!process.env.GEMINI_API_KEY) throw new Error("CRITICAL: GEMINI_API_KEY is missing on Render!");
        
        console.log("🚑 Forwarding dispatch to Google Gemini...");
        const payload = { ...req.body, model: 'gemini-2.5-flash' };

        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GEMINI_API_KEY}` 
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Google API Rejected Request: ${response.status} - ${errText}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error("❌ Gemini Dispatch Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// 4. SECURE PROXY ROUTE: Audio Transcription (ASSEMBLY AI)
app.post('/api/ai-transcribe', upload.single('file'), async (req, res) => {
    try {
        if (!aai) throw new Error("CRITICAL: ASSEMBLYAI_API_KEY is missing on Render!");
        if (!req.file) throw new Error("Upload Failed: No audio file received from the frontend.");

        console.log("🎙️ Step 1: Uploading buffer to AssemblyAI...");
        const uploadUrl = await aai.files.upload(req.file.buffer);
        
        console.log("✅ Step 2: Uploaded. Transcribing...");
        const transcript = await aai.transcripts.transcribe({
            audio: uploadUrl, 
            language_detection: true,
            speech_models: ["universal-3-pro", "universal-2"] // 👈 THE FIX!
        });

        if (transcript.status === 'error') {
            throw new Error(`AssemblyAI Engine Failed: ${transcript.error}`);
        }

        console.log("✅ Step 3: Transcription complete:", transcript.text);
        res.json({ text: transcript.text });
        
    } catch (error) {
        console.error("❌ Transcription Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ AapdaSetu Web Server running on port ${PORT}`);
});
