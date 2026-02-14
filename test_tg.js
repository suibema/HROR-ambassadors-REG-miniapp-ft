const form = document.getElementById("reg-form");
const errorEl = document.getElementById("reg-error");
const resultEl = document.getElementById("reg-ok");

const YC_FUNCTION_URL = "https://functions.yandexcloud.net/d4e7pfk9fl0iaft2dv4d";

function getTelegramUserId() {
  const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
  return user?.id ?? null;
}

document.addEventListener("DOMContentLoaded", () => {
  if (window.Telegram?.WebApp) {
    Telegram.WebApp.ready();
    const id = getTelegramUserId();
    const startParam = Telegram.WebApp.initDataUnsafe?.start_param || "";
    console.log("tg-id:", id, "startParam:", startParam);
    window.tgUserId = id;                 
    window.tgUserStartParam = startParam;
  } else {
    console.warn("Telegram WebApp не найден — страница не в Telegram WebView?");
    window.tgUserId = null;
    window.tgUserStartParam = "";
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const select = document.getElementById("city");
  const otherInput = document.getElementById("city-other");
  select.addEventListener("change", () => {
    otherInput.style.display = select.value === "Другой" ? "block" : "none";
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const select = document.getElementById("citizen");
  const otherInput = document.getElementById("citizen-other");
  select.addEventListener("change", () => {
    otherInput.style.display = select.value === "Другое" ? "block" : "none";
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const checkbox = document.getElementById("foreign_phone_yes");
  const otherInput = document.getElementById("foreign_phone_type");
  checkbox.addEventListener("change", () => {
    otherInput.style.display = checkbox.checked ? "block" : "none";
  });
});

const questionNames = [
  "surname", "name", "email", "phone", "city", "city-other",
  "citizen", "citizen-other", "vuz", "specialty", "study", "finished", "smz"
];

function saveForm() {
  const formData = new FormData(form);
  const data = {};
  questionNames.forEach((qName) => {
    data[qName] = formData.get(qName) || "";
  });
  localStorage.setItem("test_data", JSON.stringify(data));
}

function restoreForm() {
  const saved = JSON.parse(localStorage.getItem("test_data") || "{}");
  questionNames.forEach((qName) => {
    const input = form.elements[qName];
    if (input) input.value = saved[qName] || "";
  });
}

function getSelectedCheckboxValues(name) {
  const checkboxes = document.querySelectorAll(`input[name="${name}"]:checked`);
  return Array.from(checkboxes).map((cb) => cb.value);
}

function showError(msg) { errorEl.textContent = msg; }
function showOk(msg) { resultEl.textContent = msg; }

async function handleSubmitFunction(data, selectedReadyToCommute) {
  const tgId = window.tgUserId;
  const startParam = window.tgUserStartParam || "";

  if (!tgId) {
    showError("Не удалось получить твой Telegram ID. Открой эту страницу из Telegram-бота.");
    return;
  }

  // “Другой/Другое” — у тебя в коде есть баг с city-other vs city_other.
  // Мы приводим к одному виду:
  if (data.city === "Другой") data.city_other = data["city-other"] || data.city_other || "";
  if (data.citizen === "Другое") data.citizen_other = data["citizen-other"] || data.citizen_other || "";

  try {
    const resp = await fetch(YC_FUNCTION_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "register",
        tgId,
        startParam,
        data: {
          surname: data.surname || "",
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          city: data.city || "",
          city_other: data.city_other || "",
          citizen: data.citizen || "",
          citizen_other: data.citizen_other || "",
          vuz: data.vuz || "",
          specialty: data.specialty || "",
          study: data.study || "",
          finished: data.finished || "",
          smz: data.smz || "",
          // selectedReadyToCommute — сейчас не используешь в payload, но оставил параметр.
          // Если надо записывать — добавим колонку и отправим.
        },
      }),
    });

    const out = await resp.json();
    if (!resp.ok || !out.ok) throw new Error(out.error || "Server error");

    if (out.duplicate) {
      showError("Ты уже зарегистрирован. Свяжись с нами через бота, если это не так или если ты хочешь изменить данные");
      return;
    }

    showOk("Анкета сохранена. Спасибо!");
    if (out.approved_first === "ок") {
      window.location.href = "index copy.html";
    } else {
      window.location.href = "bye.html";
    }
  } catch (err) {
    console.error(err);
    showError("Ошибка сервера. Повтори попытку позже");
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.textContent = "";
  resultEl.textContent = "";

  const formData = new FormData(form);
  const selectedReadyToCommute = getSelectedCheckboxValues("msc_commute_yes");

  const data = {
    surname: formData.get("surname"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    city: formData.get("city"),
    "city-other": formData.get("city-other"),
    citizen: formData.get("citizen"),
    "citizen-other": formData.get("citizen-other"),
    vuz: formData.get("vuz"),
    specialty: formData.get("specialty"),
    study: formData.get("study"),
    finished: formData.get("finished"),
    smz: formData.get("smz"),
  };

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = "ОТПРАВЛЯЕТСЯ...";
  submitBtn.style.backgroundColor = "#ccc";
  submitBtn.style.color = "#666";
  setTimeout(() => {
    submitBtn.disabled = false;
    submitBtn.textContent = "ОТПРАВИТЬ";
    submitBtn.style.backgroundColor = "";
    submitBtn.style.color = "";
  }, 9000);

  // Телефон: если заполнен foreign_phone_type — используем его как phone
  const foreign_phone = formData.get("foreign_phone_type");
  if (foreign_phone) {
    data.phone = foreign_phone;
  } else {
    const phone_check = String(formData.get("phone") || "");
    if (!/^[7]\d{10}$/.test(phone_check)) {
      showError("Телефон должен состоять из 11 цифр, формат: 7XXXXXXXXXX");
      return;
    }
  }

  // Email
  if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(String(data.email || ""))) {
    showError("Введи корректный e-mail (напр., user@domain.com)");
    return;
  }

  await handleSubmitFunction(data, selectedReadyToCommute);
});

form.addEventListener("input", saveForm);
restoreForm();
