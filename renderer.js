document.getElementById("sendBtn").addEventListener("click", sendJSON);

async function sendJSON() {
  try {
    const json = JSON.parse(document.getElementById("jsonInput").value);

    const res = await window.api.submitJSON(json);

    document.getElementById("status").innerText =
      res.status === "ok" ? "Saved to: " + res.path : "Error sending JSON";
  } catch (err) {
    document.getElementById("status").innerText =
      "Invalid JSON: " + err.message;
  }
}
