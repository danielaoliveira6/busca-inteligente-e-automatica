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
    return data;
  } catch (error) {
    console.error("Erro ao buscar informações da empresa:", error);
    return { text: "Erro ao processar busca. Tente novamente mais tarde.", sources: [] };
  }
};

