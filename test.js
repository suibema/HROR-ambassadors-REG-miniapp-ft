const form = document.getElementById('test-form');
const resultEl = document.getElementById('result');
const errorEl = document.getElementById('error');
const SUPABASE_URL = 'https://supa.fut.ru';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzU0MzM0MDAwLCJleHAiOjE5MTIxMDA0MDB9.GdP0c64JUT_I_81xXg5gbEU7ZtAxiD3jAMlTLvhE1oY';
const MAIN_TABLE = 'Регистрация_база_амб'
const ANSWERS_TABLE = 'Ответы_на_тест_амб'
const supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const questionTypes = {};
['q1', 'q2', 'q3', 'q4'].forEach(q => questionTypes[q] = 'dropdown');
[].forEach(q => questionTypes[q] = 'text');
[].forEach(q => questionTypes[q] = 'checkbox');

// Redirect if no id
const tg_id = localStorage.getItem('test_tg_id');
if (!tg_id) window.location.href = 'index.html';

// Save form data
function saveForm() {
  const formData = new FormData(form);
  const data = {};
  for (let i = 1; i <= 4; i++) {
    const qName = `q${i}`;
    if (questionTypes[qName] === 'checkbox') {
      data[qName] = Array.from(formData.getAll(qName));
    } else {
      data[qName] = formData.get(qName) || '';
    }
  }
  localStorage.setItem('test_data', JSON.stringify(data));
}

// Restore form data
function restoreForm() {
  const saved = JSON.parse(localStorage.getItem('test_data') || '{}');
  for (let i = 1; i <= 4; i++) {
    const qName = `q${i}`;
    if (questionTypes[qName] === 'checkbox' && Array.isArray(saved[qName])) {
      saved[qName].forEach(value => {
        const checkbox = document.querySelector(`input[name="${qName}"][value="${value}"]`);
        if (checkbox) checkbox.checked = true;
      });
    } else if (['dropdown', 'text'].includes(questionTypes[qName]) && saved[qName]) {
      const input = form.elements[qName];
      if (input) input.value = saved[qName];
    }
  }
}

// Calculate score
function calculateScore(data) {
  let score = 0;
  if (data['q1'] === 'd') {
    score += 3
  } else if (data['q1'] === 'b') {
    score += 2
  } else if (data['q1'] === 'c') {
    score += 1
  }

  if (data['q2'] === 'd') {
    score += 3
  } else if (data['q2'] === 'c') {
    score += 2
  } else if (data['q2'] === 'b') {
    score += 1
  }

  if (data['q3'] === 'd') {
    score += 3
  } else if (data['q3'] === 'c') {
    score += 2
  } else if (data['q3'] === 'a') {
    score += 1
  }

  if (data['q4'] === 'a') {
    score += 3
  } else if (data['q4'] === 'b') {
    score += 2
  }
  return score;
}

// Submit form
async function submitForm(auto = false) {
  const formData = new FormData(form);
  const data = {};
  for (let i = 1; i <= 4; i++) {
    const qName = `q${i}`;
    if (questionTypes[qName] === 'checkbox') {
      data[qName] = Array.from(formData.getAll(qName));
    } else {
      data[qName] = formData.get(qName) || '';
    }
  }
  data.tg_id = tg_id;

  const score = calculateScore(data);
  console.log('Submitting', { ...data, score });

  const submitBtn = document.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'ОТПРАВЛЯЕТСЯ...'
  setTimeout(() => {
    submitBtn.disabled = false;
    submitBtn.textContent = 'ЗАВЕРШИТЬ'
  }, 5000);

  try {
    try {
      // 1) Ищем запись по tg-id в основной таблице
      const foundQ = await supa
        .from(MAIN_TABLE)
        .select('id')     
        .eq('tg-id', tg_id)
        .maybeSingle();
    
      if (foundQ.error) throw foundQ.error;
      if (!foundQ.data) {
        errorEl.textContent = 'No record found for this tg id.';
        return;
      }
      const recordId = foundQ.data.id;
    
      // 2) Обновляем счёт и дату получения ответа
      const updateQ = await supa
        .from(MAIN_TABLE)
        .update({
          'Результат теста': score,
          'Дата получения ответа на тест': new Date().toISOString()
        })
        .eq('id', recordId)    
        .select()
        .maybeSingle();
    
      if (updateQ.error) throw updateQ.error;

      const payload = {
        'tg_id': tg_id,
        'q1': formData.get('q1'),
        'q2': formData.get('q2'),
        'q3': formData.get('q3'),
        'q4': formData.get('q4')
      };
  
      const insertQ = await supa
        .from(ANSWERS_TABLE)
        .insert(payload)
        .select()
        .single();
    
    } catch (err) {
      console.error(err);
      errorEl.textContent = 'Failed to update score. Please try again.';
      return;
    }
    

    localStorage.setItem('test_submitted', 'true');
    localStorage.removeItem('test_data');

    form.style.display = 'none';
    resultEl.textContent = 'Спасибо, твой тест успешно принят!';
    window.location.href = 'bye copy.html'
    errorEl.textContent = '';
  } catch (err) {
    console.error('Submission error:', err);
    errorEl.textContent = 'Ошибка отправки теста';
  }
}

// Event listeners
form.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') {
    e.preventDefault();
  }
});
form.addEventListener('input', saveForm);
form.addEventListener('submit', (e) => {
  e.preventDefault();
  errorEl.textContent = '';
  submitForm();
});

// Initialize
restoreForm();





