export const getCompanyInfo = async (companyName: string, cnpj: string = '') => {
  try {
    const response = await fetch('/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ companyName, cnpj }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
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


