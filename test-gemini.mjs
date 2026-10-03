import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const res = await ai.models.generateContent({
  model: process.env.GEMINI_MODEL,
  contents: 'Reply with the single word: ready',
});
console.log(res.text);