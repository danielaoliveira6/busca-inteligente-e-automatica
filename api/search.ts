import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { companyName, cnpj } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'Chave API não configurada no Vercel (GEMINI_API_KEY)' });
        }

        const genAI = new GoogleGenAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `Descreva de forma direta a atividade principal da empresa "${companyName}" ${cnpj ? `(identificada pelo CNPJ ${cnpj})` : ''
            }.

REGRAS OBRIGATÓRIAS:
    1. Responda em no máximo 2 frases curtas.
    2. NÃO use asteriscos (**) ou qualquer formatação especial.
    3. NÃO repita o CNPJ ou o nome da empresa se não for estritamente necessário para o sentido.
    4. Foque apenas no setor de atuação e no que ela produz ou oferece.
    5. Responda apenas o texto puro em Português do Brasil.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        text = text.replace(/\*/g, '').trim();

        return res.status(200).json({ text, sources: [] });

    } catch (error) {
        console.error("Erro na API Search:", error);
        return res.status(500).json({
            error: error.message || 'Erro interno no servidor'
        });
    }
}
