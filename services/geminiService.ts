import { GoogleGenAI } from "@google/genai";

export const getCompanyInfo = async (companyName: string, cnpj: string = '') => {
  // Usa import.meta.env para acessar variáveis de ambiente no Vite
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
  
  if (!apiKey) {
    return { 
      text: "Erro: API Key não configurada. Verifique a variável VITE_GEMINI_API_KEY", 
      sources: [] 
    };
  }
  
  const ai = new GoogleGenAI({ apiKey });

  try {
    const prompt = `Descreva de forma direta a atividade principal da empresa "${companyName}" ${
cnpj ? `(identificada pelo CNPJ ${cnpj})` : ''}.

REGRAS OBRIGATÓRIAS:
    1. Responda em no máximo 2 frases curtas.
    2. NÃO use asteriscos (**) ou qualquer formatação especial.
    3. NÃO repita o CNPJ ou o nome da empresa se não for estritamente necessário para o sentido.
    4. Foque apenas no setor de atuação e no que ela produz ou oferece.
    5. Responda apenas o texto puro em Português do Brasil.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    let text = response.text || "Informação não encontrada.";
    text = text.replace(/\*/g, '').trim();

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map((chunk: any) => chunk.web?.uri)
      .filter(Boolean) || [];

    return { text, sources };
  } catch (error) {
    console.error("Erro ao buscar informações da empresa:", error);
    return { text: "Erro ao processar busca. Verifique sua conexão.", sources: [] };
  }
};
