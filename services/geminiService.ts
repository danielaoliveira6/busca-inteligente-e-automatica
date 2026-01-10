export const getCompanyInfo = async (companyName: string, cnpj: string = '', manualApiKey: string = '') => {
  try {
    const response = await fetch('/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ companyName, cnpj, manualApiKey }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("DEBUG - Erro do servidor (Raw):", text);
      let errorMessage = `Erro do servidor (${response.status})`;
      try {
        const errorData = JSON.parse(text);
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        // Fallback para o texto bruto se não for JSON, mas cortado se for muito longo
        errorMessage = text.slice(0, 100) || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    if (data.error) {
      return { text: `Erro técnico: ${data.error}`, sources: [] };
    }
    return data;
  } catch (error: any) {
    console.error("Erro ao buscar informações da empresa:", error);
    return { text: `Erro de conexão: ${error.message}`, sources: [] };
  }
};


