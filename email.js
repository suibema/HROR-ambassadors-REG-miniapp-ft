const YC_FUNCTION_URL = "https://functions.yandexcloud.net/d4e7pfk9fl0iaft2dv4d";

const errorEl = document.getElementById("reg-error");

function getTelegramUserId() {
  if (window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe) {
    const user = Telegram.WebApp.initDataUnsafe.user;
    if (user && user.id) return user.id;
  }
  return null;
}

document.addEventListener("DOMContentLoaded", () => {
  if (window.Telegram?.WebApp) {
    Telegram.WebApp.ready();
    const id = getTelegramUserId();
    const startParam = Telegram.WebApp.initDataUnsafe?.start_param;
    console.log("tg-id:", id);
    window.tgUserId = id;
    window.tgUserStartParam = startParam;
  } else {
    console.warn("Telegram WebApp не найден — страница не в Telegram WebView?");
    window.tgUserId = null;
    window.tgUserStartParam = null;
  }
});

document.getElementById("email-form").addEventListener("submit", async function (e) {
  e.preventDefault();
  const errorEl = document.getElementById("email-error");

  const tgId = window.tgUserId;
  if (!tgId) {
    errorEl.textContent = "Не удалось получить твой Telegram ID. Открой эту страницу из Telegram-бота.";
    return;
  }

  try {
    const resp = await fetch(YC_FUNCTION_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "lookup", tgId }),
    });

    const data = await resp.json();
    if (!resp.ok || !data.ok) throw new Error(data.error || "Lookup failed");

    if (!data.found) {
      errorEl.textContent =
        "Не нашли тебя в базе регистрации! Пожалуйста, зарегистрируйся через форму в боте или напиши нам с вопросом";
      return;
    }

    // В supabase было: .neq('Результат теста', -1) => значит если результат не -1, то уже получили
    // Здесь: если testResult === -1 => ещё нет результата (или “не обработан”)
    // Если в таблице пусто — data.testResult будет null. Это тоже “ещё нет результата”.
    const testResult = data.testResult; // number|null
    if (testResult !== null && !Number.isNaN(testResult) && testResult !== -1) {
      errorEl.textContent = "Мы уже получили результат твоего теста и скоро вернёмся с ответом 😊";
      return;
    }

    localStorage.setItem("test_tg_id", String(tgId));
    window.location.href = "test.html";
  } catch (err) {
    console.error(err);
    errorEl.textContent = "Ошибка сервера. Повтори попытку позже";
  }
});
