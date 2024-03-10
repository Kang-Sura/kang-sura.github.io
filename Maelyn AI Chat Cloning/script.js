async function MaelynAI(query) {
  try {
    const response = await axios.post("https://bing.maelyn.my.id/chat", {
      query: query,
    });
    return response.data.response;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}
