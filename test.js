const form = document.getElementById("test-form");
const resultEl = document.getElementById("result");
const errorEl = document.getElementById("error");

const YC_FUNCTION_URL = "https://functions.yandexcloud.net/d4e7pfk9fl0iaft2dv4d";

const questionTypes = {};
["q1", "q2", "q3", "q4"].forEach((q) => (questionTypes[q] = "dropdown"));

// Redirect if no id
const tg_id = localStorage.getItem("test_tg_id");
if (!tg_id) window.location.href = "index.html";

// Save form data
function saveForm() {
  const formData = new FormData(form);
  const data = {};
  for (let i = 1; i <= 4; i++) {
    const qName = `q${i}`;
    if (questionTypes[qName] === "checkbox") {
      data[qName] = Array.from(formData.getAll(qName));
    } else {
      data[qName] = formData.get(qName) || "";
    }
  }
  localStorage.setItem("test_data", JSON.stringify(data));
}

// Restore form data
function restoreForm() {
  const saved = JSON.parse(localStorage.getItem("test_data") || "{}");
  for (let i = 1; i <= 4; i++) {
    const qName = `q${i}`;
    if (questionTypes[qName] === "checkbox" && Array.isArray(saved[qName])) {
      saved[qName].forEach((value) => {
        const checkbox = document.querySelector(`input[name="${qName}"][value="${value}"]`);
        if (checkbox) checkbox.checked = true;
      });
    } else if (["dropdown", "text"].includes(questionTypes[qName]) && saved[qName]) {
      const input = form.elements[qName];
      if (input) input.value = saved[qName];
    }
  }
}

// Calculate score
function calculateScore(data) {
  let score = 0;

  if (data["q1"] === "d") score += 3;
  else if (data["q1"] === "b") score += 2;
  else if (data["q1"] === "c") score += 1;

  if (data["q2"] === "d") score += 3;
  else if (data["q2"] === "c") score += 2;
  else if (data["q2"] === "b") score += 1;

  if (data["q3"] === "d") score += 3;
  else if (data["q3"] === "c") score += 2;
  else if (data["q3"] === "a") score += 1;

  if (data["q4"] === "a") score += 3;
  else if (data["q4"] === "b") score += 2;

  return score;
}

// Submit form
async function submitForm() {
  const formData = new FormData(form);
  const data = {};

  for (let i = 1; i <= 4; i++) {
    const qName = `q${i}`;
    if (questionTypes[qName] === "checkbox") {
      data[qName] = Array.from(formData.getAll(qName));
    } else {
      data[qName] = formData.get(qName) || "";
    }
  }

  const score = calculateScore(data);
  console.log("Submitting", { tg_id, ...data, score });

  const submitBtn = document.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = "ОТПРАВЛЯЕТСЯ...";
  setTimeout(() => {
    submitBtn.disabled = false;
    submitBtn.textContent = "ЗАВЕРШИТЬ";
  }, 5000);

  try {
    const resp = await fetch(YC_FUNCTION_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "update_test_result",
        tgId: tg_id,
        score,
        answeredAtIso: new Date().toISOString(),
      }),
    });

    const out = await resp.json();
    if (!resp.ok || !out.ok) throw new Error(out.error || "Failed to update score");

    if (out.found === false) {
      errorEl.textContent = "No record found for this tg id.";
      return;
    }

    localStorage.setItem("test_submitted", "true");
    localStorage.removeItem("test_data");

    form.style.display = "none";
    resultEl.textContent = "Спасибо, твой тест успешно принят!";
    errorEl.textContent = "";

    window.location.href = "bye copy.html";
  } catch (err) {
    console.error("Submission error:", err);
    errorEl.textContent = "Ошибка отправки теста";
  }
}

// Event listeners
form.addEventListener("keydown", function (e) {
  if (e.key === "Enter") e.preventDefault();
});
form.addEventListener("input", saveForm);
form.addEventListener("submit", (e) => {
  e.preventDefault();
  errorEl.textContent = "";
  submitForm();
});

// Initialize
restoreForm();
