// TODO(Ridhima): real Gemini calls. Keep these two export names, Samiya imports generateText.

export async function analyzeVideo(video, filePath) {
  throw new Error('Real Gemini analysis is not implemented yet. Set MOCK=true or USE_CACHE=true.')
}

export async function generateText(prompt, { json = false } = {}) {
  throw new Error('Gemini text generation is not implemented yet. Set MOCK=true.')
}