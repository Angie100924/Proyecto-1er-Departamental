const API_URL = "http://localhost:3000"; // cambia cuando desplegues

async function fetchScoresFromServer() {
  try {
    const res = await fetch(`${API_URL}/scores`);
    if (!res.ok) throw new Error("No response");
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    // fallback
    const local = JSON.parse(localStorage.getItem("runner_local_scores") || "[]");
    return local;
  }
}

async function saveScoreToServer(payload) {
  try {
    const res = await fetch(`${API_URL}/scores`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Server error");
    return await res.json();
  } catch (err) {
    // fallback: save in localStorage
    const local = JSON.parse(localStorage.getItem("runner_local_scores") || "[]");
    local.push(payload);
    local.sort((a, b) => b.score - a.score);
    localStorage.setItem("runner_local_scores", JSON.stringify(local));
    return { fallback: true };
  }
}
