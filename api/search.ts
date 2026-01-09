import { GoogleGenAI } from "@google/genai";

export const config = {
    runtime: 'edge',
};

export default async function handler(request: Request) {
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const { companyName, cnpj } = await request.json();
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'Server configuration error: Missing API Key' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const ai = new GoogleGenAI({ apiKey });

        const prompt = `Descreva de forma direta a atividade principal da empresa "${companyName}" ${cnpj ? `(identificada pelo CNPJ ${cnpj})` : ''
            }.

REGRAS OBRIGATÓRIAS:
    1. Responda em no máximo 2 frases curtas.
    2. NÃO use asteriscos (**) ou qualquer formatação especial.
    3. NÃO repita o CNPJ ou o nome da empresa se não for estritamente necessário para o sentido.
    4. Foque apenas no setor de atuação e no que ela produz ou oferece.
    5. Responda apenas o texto puro em Português do Brasil.`;

        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash-exp",
            contents: prompt,
        });

        let text = response.text || "Informação não encontrada.";
        text = text.replace(/\*/g, '').trim();

        return new Response(JSON.stringify({ text, sources: [] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error("API Error detailed:", error);
        return new Response(JSON.stringify({
            error: error.message || 'Internal Server Error',
            details: error.stack || 'No stack trace'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
