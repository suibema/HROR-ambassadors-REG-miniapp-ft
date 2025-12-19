const form = document.getElementById('reg-form');
const SUPABASE_URL = 'https://supa.fut.ru';


const errorEl = document.getElementById('reg-error');
const resultEl = document.getElementById('reg-ok');

function getTelegramUserId() {
  if (window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe) {
    const user = Telegram.WebApp.initDataUnsafe.user;
    if (user && user.id) {
      return user.id;
    }
  }
  return null;
}

document.addEventListener("DOMContentLoaded", () => {
  Telegram.WebApp.ready();
  const id = getTelegramUserId();
  const startParam = Telegram.WebApp.initDataUnsafe?.start_param;
  console.log("tg-id:", id);
  window.tgUserId = id;
  window.tgUserStartParam = startParam;
});

document.addEventListener('DOMContentLoaded', () => {
  const select = document.getElementById('city');
  const otherInput = document.getElementById('city-other');

  select.addEventListener('change', () => {
    if (select.value === 'Другой') {
      otherInput.style.display = 'block';
    } else {
      otherInput.style.display = 'none';
    }
  });
});

document.addEventListener('DOMContentLoaded', () => {
  const select = document.getElementById('citizen');
  const otherInput = document.getElementById('citizen-other');

  select.addEventListener('change', () => {
    if (select.value === 'Другое') {
      otherInput.style.display = 'block';
    } else {
      otherInput.style.display = 'none';
    }
  });
});

document.addEventListener('DOMContentLoaded', () => {
    const select = document.getElementById('foreign_phone_yes');
    const otherInput = document.getElementById('foreign_phone_type');
  
    select.addEventListener('change', () => {
      if (select.checked) {
        otherInput.style.display = 'block';
      } else {
        otherInput.style.display = 'none';
      }
    });
  });

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzU0MzM0MDAwLCJleHAiOjE5MTIxMDA0MDB9.GdP0c64JUT_I_81xXg5gbEU7ZtAxiD3jAMlTLvhE1oY';
const TABLE = 'Регистрация_база_амб'

const questionNames = ['surname', 'name', 'email', 'phone', 'city', 'city-other', 
  'citizen', 'citizen-other', 'vuz', 'specialty', 'study', 'finished', 'smz'];
function saveForm() {
  const formData = new FormData(form);
  const data = {};
  questionNames.forEach(qName => {
    data[qName] = formData.get(qName) || '';
  });
  localStorage.setItem('test_data', JSON.stringify(data));
}

function restoreForm() {
  const saved = JSON.parse(localStorage.getItem('test_data') || '{}');
  questionNames.forEach(qName => {
    const input = form.elements[qName];
    if (input) input.value = saved[qName] || '';
  });
}

function getSelectedCheckboxValues(name) {
  const checkboxes = document.querySelectorAll(`input[name="${name}"]:checked`);
  return Array.from(checkboxes).map(cb => cb.value);
}

// helper: показать сообщение вместо alert()
function showError(msg) { errorEl.textContent = msg; }
function showOk(msg)    { resultEl.textContent = msg; }

async function handleSubmitSupabase(data, selectedReadyToCommute) {
  const email = data.email;
  const phone = data.phone;
  const tgId  = window.tgUserId;

  try {
    const [qEmail, qPhone, qTg] = await Promise.all([
      supabase
        .from(TABLE)
        .select('*', { count: 'exact', head: true })
        .eq('E-mail', email),

      supabase
        .from(TABLE)
        .select('*', { count: 'exact', head: true })
        .eq('Номер телефона', phone),

      supabase
        .from(TABLE)
        .select('*', { count: 'exact', head: true })
        .eq('tg-id', tgId),
    ]);

    const emailCount = qEmail.count ?? 0;
    const phoneCount = qPhone.count ?? 0;
    const tgCount    = qTg.count ?? 0;

    if (emailCount > 0 || phoneCount > 0 || tgCount > 0) {
      showError('Ты уже зарегистрирован. Свяжись с нами через бота, если это не так или если ты хочешь изменить данные');
      return;
    }
  } catch (err) {
    console.error(err);
    showError('Ошибка сервера. Повтори попытку позже');
    return;
  }

  if (data.city === 'Другой')   data.city   = data.city_other;
  if (data.citizen === 'Другое') data.citizen = data.citizen_other;

  
  let approved_first = 'ок';
  if (
    (data.study === 'Среднее общее (школа)') ||
    (data.finished === '2024 и ранее' || data.finished === '2029 и позднее') ||
    (data.citizen != 'Россия') ||
    (data.smz === 'Нет')
  ) {
    approved_first = 'отказ';
  }

  try {
    const payload = {
      'E-mail': data.email,
      'Фамилия': data.surname,
      'Имя': data.name,
      'Номер телефона': data.phone,
      'ВУЗ': data.vuz,
      'Направление подготовки': data.specialty,
      'Степень образования': data.study,
      'Год выпуска': data.finished,
      'Страна проживания': data.citizen,
      'Город проживания': data.city,
      'Скрининг итог': approved_first,
      'tg-id': window.tgUserId,
      'start-param': window.tgUserStartParam,
      'Самозанятость': data.smz
    };

    const { data: inserted, error } = await supabase
      .from(TABLE)
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Ошибка при вставке:', error);
      showError('Ошибка сервера. Повтори попытку позже');
      return;
    }

    console.log('Данные вставлены:', inserted);
    showOk('Анкета сохранена. Спасибо!');
    if (approved_first === 'ок') {
    window.location.href = 'index copy.html';
    localStorage.setItem('to_test', 'yes');
  } else {
    window.location.href = 'bye.html'
  }
  } catch (err) {
    console.error(err);
    showError('Ошибка сервера. Повтори попытку позже');
  }
}

form.addEventListener('submit', async (e) => {
  const formData = new FormData(form);
  const selectedReadyToCommute = getSelectedCheckboxValues("msc_commute_yes");
  const data = {
    surname: formData.get('surname'),
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    city: formData.get('city'),
    city_other: formData.get('city-other'),
    citizen: formData.get('citizen'),
    citizen_other: formData.get('citizen-other'),
    vuz: formData.get('vuz'),
    specialty: formData.get('specialty'),
    study: formData.get('study'),
    finished: formData.get('finished'),
    smz: formData.get('smz')
  };
  e.preventDefault();

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'ОТПРАВЛЯЕТСЯ...'
  submitBtn.style.backgroundColor = '#ccc';
  submitBtn.style.color = '#666';
  setTimeout(() => {
    submitBtn.disabled = false;
    submitBtn.textContent = 'ОТПРАВИТЬ'
    submitBtn.style.backgroundColor = '';
    submitBtn.style.color = '';
  }, 9000);

  const phone_check = formData.get('phone');
  const foreign_phone = formData.get('foreign_phone_type');
  if (foreign_phone) {
    data.phone = foreign_phone;
  } else if (!/^[7]\d{10}$/.test(phone_check)) {
    errorEl.textContent = 'Телефон должен состоять из 11 цифр, формат: 7XXXXXXXXXX';
    return;
  }

  if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(data.email)) {
  errorEl.textContent = 'Введи корректный e-mail (напр., user@domain.com)';
  return;
  }
  

  await handleSubmitSupabase(data, selectedReadyToCommute);

});



form.addEventListener('input', saveForm);

restoreForm();



