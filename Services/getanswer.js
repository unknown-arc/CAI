async function sendMessage(message) {
    const res = await fetch("http://localhost:5000/ask", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: message })
    });

    const data = await res.json();
    console.log(data.response);
}