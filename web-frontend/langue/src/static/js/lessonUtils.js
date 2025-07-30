// lessonUtils.js
let index = 0;
let lessonLength = 0;
let rows = [];
let currentAudio = "";

// State for dot animation
let dotCount = 0;
let maxDots = 3;
let animating = true;

export function animateDots(setTextStates) {
  if (!animating) return;
  dotCount = (dotCount + 1) % (maxDots + 1);
  const dots = '.'.repeat(dotCount) || '.';
  setTextStates(dots);
  setTimeout(() => animateDots(setTextStates), 500);
}

export function fetchLessonData(onDataReady) {
  fetch('http://localhost:8000/media/data/metadata.csv')
    .then(response => {
      if (!response.ok) throw new Error('Network response was not ok');
      return response.text();
    })
    .then(csvText => {
        console.log(csvText);
      rows = csvText.trim().split('\n').map(row => row.split(','));
      lessonLength = rows.length;
      onDataReady(rows, index);
    })
    .catch(error => console.error('Error fetching CSV:', error));
}

export function playAudio(audioName) {
  fetch(`http://localhost:8000/media/data/audio/${audioName}`)
    .then(response => {
      if (!response.ok) throw new Error('Network response was not ok');
      return response.blob();
    })
    .then(blob => {
      const audioURL = URL.createObjectURL(blob);
      const audio = new Audio(audioURL);
      audio.play();
    })
    .catch(error => console.error('Error playing audio:', error));
}

export function goBack(onUpdate) {
  if (index > 0) {
    index--;
    onUpdate(rows[index], index);
  }
}

export function goNext(onUpdate) {
  if (index < lessonLength - 1) {
    index++;
    onUpdate(rows[index], index);
  }
}

export function callTranslation(text, onStart, onSuccess, onError) {
  onStart();
  animating = true;

  fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, native_id: 1, target_id: 2 })
  })
    .then(response => {
      if (!response.ok) throw new Error('Translation failed');
      return response.json();
    })
    .then(data => {
      animating = false;
      onSuccess(data);
    })
    .catch(error => {
      animating = false;
      onError(error);
    });
}

export function saveWord(word, definition, user, onSuccess, onError) {
  if (!user) {
    onError("User not logged in");
    return;
  }

  const payload = {
    word,
    definition,
    user_id: user.id,
    nat_id: 1,
    tar_id: 2
  };

  fetch("/api/save_word", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) onError(data.error);
      else onSuccess(data);
    })
    .catch(error => {
      onError(error);
    });
}
