require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { AssemblyAI } = require('assemblyai');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize AssemblyAI Client for Transcription
const aai = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY
});

// Setup Multer to keep the incoming audio file in memory
const upload = multer(); 

// 1. Serve HTML files directly from the CURRENT folder
app.use(express.static(__dirname));

// 2. SECURE PROXY ROUTE: Chatbot (Powered by GEMINI 1.5 FLASH)
app.post('/api/ai-chat', async (req, res) => {
    try {
        // Intercept the frontend request and force it to use the free Gemini Flash model
        const payload = { ...req.body, model: 'gemini-1.5-flash' };

        // Point to Google's special OpenAI-compatible endpoint!
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GEMINI_API_KEY}` 
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) throw new Error(await response.text());
        
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error("Gemini Chat Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// 3. SECURE PROXY ROUTE: Dispatcher (Powered by GEMINI 1.5 FLASH)
app.post('/api/ai-dispatch', async (req, res) => {
    try {
        const payload = { ...req.body, model: 'gemini-1.5-flash' };

        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GEMINI_API_KEY}` 
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) throw new Error(await response.text());

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error("Gemini Dispatch Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// 4. SECURE PROXY ROUTE: Audio Transcription (ASSEMBLY AI)
app.post('/api/ai-transcribe', upload.single('file'), async (req, res) => {
    try {
        console.log("🎙️ Sending audio to AssemblyAI...");

        const transcript = await aai.transcripts.transcribe({
            audio: req.file.buffer,
            language_detection: true 
        });

        if (transcript.status === 'error') {
            throw new Error(`AssemblyAI Transcription failed: ${transcript.error}`);
        }

        console.log("✅ Transcription complete:", transcript.text);
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
