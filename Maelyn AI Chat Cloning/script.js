document.getElementById('chatForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    const query = document.getElementById('query').value;
    const response = await fetch('/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
    });
    const data = await response.json();
    document.getElementById('response').innerText = data.response;
});
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
