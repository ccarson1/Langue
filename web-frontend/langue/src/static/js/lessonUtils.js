// lessonUtils.js

export function setupLanguageMenu(buttonId, menuId) {
  const button = document.getElementById(buttonId);
  const menu = document.getElementById(menuId);

  button.addEventListener("click", () => {
    menu.classList.toggle("hidden");
  });

  document.addEventListener("click", (e) => {
    if (!button.contains(e.target) && !menu.contains(e.target)) {
      menu.classList.add("hidden");
    }
  });
}

export function loadLessonData(onWordClick, onAudioChange) {
  let rows = [];
  let index = 0;
  let lessonLength = 0;

  const currentAudioElement = document.getElementById("current-audio");

  function populateLessonWords() {
    const wordContainer = document.getElementById("lesson-word-container");
    wordContainer.innerHTML = '';

    const rowText = rows[index].join(', ').split("|")[2].split(" ");
    const audioFileName = rows[index].join(', ').split("|")[0].split(" ");
    currentAudioElement.textContent = audioFileName;

    for (const word of rowText) {
      const tempDiv = document.createElement("div");
      tempDiv.className = "word";
      tempDiv.textContent = word;
      tempDiv.addEventListener("click", () => onWordClick(word));
      wordContainer.appendChild(tempDiv);
    }

    if (onAudioChange) onAudioChange(currentAudioElement.textContent);
  }

  function indexNext() {
    if (index < lessonLength - 1) {
      index++;
      populateLessonWords();
    }
  }

  function indexBack() {
    if (index > 0) {
      index--;
      populateLessonWords();
    }
  }

  function playAudio(currentAudio) {
    fetch(`http://localhost:8000/media/data/audio/${currentAudio}`)
      .then(res => res.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play();
      })
      .catch(err => console.error("Audio error:", err));
  }

  return fetch('http://localhost:8000/media/data/metadata.csv')
    .then(res => res.text())
    .then(csv => {
      rows = csv.trim().split('\n').map(row => row.split(','));
      lessonLength = rows.length;
      populateLessonWords();

      document.getElementById("btn-next").onclick = indexNext;
      document.getElementById("btn-back").onclick = indexBack;
      document.getElementById("btn-play-audio").onclick = () => {
        playAudio(currentAudioElement.textContent);
      };
    });
}
