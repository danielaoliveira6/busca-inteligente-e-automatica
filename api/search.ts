export const config = {
    runtime: 'edge',
};

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    try {
        const { companyName, cnpj, manualApiKey } = await req.json();
        let apiKey = manualApiKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

        if (apiKey) {
            apiKey = apiKey.trim();
            // Caso o usuário cole a linha inteira "CHAVE=valor"
            if (apiKey.includes('=')) {
                apiKey = apiKey.split('=').pop()?.trim() || apiKey;
            }
        }

        // Diagnóstico: Nomes das chaves encontradas (não loga o valor!)
        const envKeys = Object.keys(process.env || {}).filter(k => k.includes('GEMINI') || k.includes('VITE'));
        if (manualApiKey) envKeys.push('MANUAL_API_KEY');
        console.log('Vercel Env:', process.env.VERCEL_ENV || 'desconhecido');
        console.log('Variáveis visíveis:', envKeys);

        if (!apiKey) {
            console.error('Erro de Configuração: GEMINI_API_KEY ou VITE_GEMINI_API_KEY não encontrados.');
            return new Response(JSON.stringify({
                error: 'Chave de API não configurada. Verifique as variáveis de ambiente no Vercel (GEMINI_API_KEY).'
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const prompt = `Descreva de forma direta a atividade principal da empresa "${companyName}" ${cnpj ? `(identificada pelo CNPJ ${cnpj})` : ''
            }.

REGRAS OBRIGATÓRIAS:
    1. Responda em no máximo 2 frases curtas.
    2. NÃO use asteriscos (**) ou qualquer formatação especial.
    3. NÃO repita o CNPJ ou o nome da empresa se não for estritamente necessário para o sentido.
    4. Foque apenas no setor de atuação e no que ela produz ou oferece.
    5. Responda apenas o texto puro em Português do Brasil.`;

        const apiResp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                }),
            }
        );

        let data: any;
        const contentType = apiResp.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await apiResp.json();
        } else {
            const text = await apiResp.text();
            console.error('Resposta não-JSON da API do Google:', text);
            return new Response(JSON.stringify({
                error: 'Resposta inválida do Google (não-JSON).',
                details: text
            }), { status: 502 });
        }

        if (!apiResp.ok) {
            console.error('Erro na API do Google:', data);
            return new Response(JSON.stringify({
                error: data.error?.message || 'Erro na API do Google',
                details: data
            }), {
                status: apiResp.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Informação não encontrada.";
        const cleanText = text.replace(/\*/g, '').trim();

        return new Response(JSON.stringify({ text: cleanText, sources: [] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error('Erro interno na API search:', error);
        return new Response(JSON.stringify({
            error: 'Erro interno ao processar a busca.',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
