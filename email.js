const SUPABASE_URL = 'https://supa.fut.ru';


const errorEl = document.getElementById('reg-error');



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
    console.warn('Telegram WebApp не найден — страница не в Telegram WebView?');
    window.tgUserId = null;
    window.tgUserStartParam = null;
  }
});

document.getElementById('email-form').addEventListener('submit', async function (e) {
  e.preventDefault();
  const errorEl = document.getElementById('email-error');

  const tgId = window.tgUserId;
  if (!tgId) {
    errorEl.textContent = 'Не удалось получить твой Telegram ID. Открой эту страницу из Telegram-бота.';
    return;
  }

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzU0MzM0MDAwLCJleHAiOjE5MTIxMDA0MDB9.GdP0c64JUT_I_81xXg5gbEU7ZtAxiD3jAMlTLvhE1oY';
const TABLE = 'Регистрация_база_амб'

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    const existsQ = await supabase
      .from(TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('tg-id', tgId);

    if (existsQ.error) throw existsQ.error;

    if ((existsQ.count ?? 0) === 0) {
      errorEl.textContent = 'Не нашли тебя в базе регистрации! Пожалуйста, зарегистрируйся через форму в боте или напиши нам с вопросом';
      return;
    }

    const kotResultQ = await supabase
      .from(TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('tg-id', tgId)
      .neq('Результат теста', -1);

    if (kotResultQ.error) throw kotResultQ.error;

    if ((kotResultQ.count ?? 0) > 0) {
      errorEl.textContent = 'Мы уже получили результат твоего теста и скоро вернёмся с ответом 😊';
      return;
    }

    localStorage.setItem('test_tg_id', String(tgId));
    window.location.href = 'test.html';
  } catch (err) {
    console.error(err);
    errorEl.textContent = 'Ошибка сервера. Повтори попытку позже';
  }
});

