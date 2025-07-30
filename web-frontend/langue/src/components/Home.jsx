import React, { useEffect, useState } from "react";
import "../static/css/index.css";
import "../static/css/spinner.css";


//import { fetchLessonData } from "../static/js/lessonUtils.js";

export default function Home() {
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [languageMenuVisible, setLanguageMenuVisible] = useState(false);
  const [translatedText, setTranslatedText] = useState("Pikta");
  // const [rows, setRows] = useState([]);
  // const [index, setIndex] = useState(0);

  useEffect(() => {
    let index = 0;
    let lessonLength = 0;
    let rows = [];
    let currentAudio;

    let button = document.getElementById("language-button");
    let menu = document.getElementById("language-menu");


    let dotCount = 0;
    let maxDots = 3;
    let animating = true;


    console.log("page is fully loaded");
    currentAudio = document.getElementById("current-audio").textContent;




    function animateDots() {
      let t_text = document.getElementById('translated-text');
      let p_speech = document.getElementById('part-of-speech');
      let w_def = document.getElementById('word-definition');

      if (!animating) return;
      dotCount = (dotCount + 1) % (maxDots + 1);
      t_text.textContent = '.'.repeat(dotCount) || '.';
      p_speech.textContent = '.'.repeat(dotCount) || '.';
      w_def.textContent = '.'.repeat(dotCount) || '.';
      setTimeout(animateDots, 500);
    }

    fetch('http://localhost:8000/media/data/metadata.csv').then(response => {
      if (!response.ok) throw new Error('Network response was not ok');
      return response.text();
    })
      .then(csvText => {
        console.log(csvText)
        rows = csvText.trim().split('\n').map(row => row.split(','));

        populateLessonWords();
        let btnPlayAudio = document.getElementById("btn-play-audio");
        currentAudio = document.getElementById("current-audio").textContent;
        let btnBack = document.getElementById('btn-back');
        let btnNext = document.getElementById('btn-next');
        lessonLength = rows.length;

        btnBack.addEventListener("click", function () {
          indexBack();
        })

        btnNext.addEventListener("click", function () {
          indexNext();
        })

        btnPlayAudio.addEventListener("click", function () {
          playAudio();
        });

      })
      .catch(error => {
        console.error('Error fetching CSV:', error);
      });


    function populateLessonWords() {
      let wordContainer = document.getElementById("lesson-word-container");
      let audioContainer = document.getElementById("current-audio")

      wordContainer.innerHTML = '';
      let rowText = rows[index].join(', ').split("|")[2].split(" ");
      let audioFileName = rows[index].join(', ').split("|")[0].split(" ");
      audioContainer.textContent = audioFileName;
      for (let r = 0; r < rowText.length; r++) {
        let tempDiv = document.createElement("div");
        tempDiv.setAttribute("class", "word");
        tempDiv.textContent = rowText[r];
        tempDiv.addEventListener("click", function () {
          console.log(this.textContent)
          document.getElementById('target-word').textContent = this.textContent
          document.getElementById('source-text').textContent = this.textContent
          callTranslation(this.textContent);
        });
        wordContainer.appendChild(tempDiv);

      }
    }

    function playAudio() {

      fetch(`http://localhost:8000/media/data/audio/${currentAudio}`)
        .then(response => {
          if (!response.ok) throw new Error('Network response was not ok');
          return response.blob();
        })
        .then(blob => {
          const audioURL = URL.createObjectURL(blob);
          const audio = new Audio(audioURL);
          audio.play();
        })
        .catch(error => {
          console.error('Error fetching or playing audio:', error);
        });
    }

    function indexBack() {
      if (index > 0) {
        index--
        populateLessonWords()
        currentAudio = document.getElementById("current-audio").textContent;
      }
      console.log(index)

    }

    function indexNext() {
      if (index < lessonLength) {
        index++
        populateLessonWords()
        currentAudio = document.getElementById("current-audio").textContent;
      }

      console.log(index)
    }

    function callTranslation(text) {
      document.getElementById("overlay").classList.remove("hidden");
      animating = true;
      animateDots();
      fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: text, native_id: 1, target_id: 2 })
      })
        .then(response => {
          if (!response.ok) {

            document.getElementById("overlay").classList.add("hidden");
            throw new Error('Translation failed');
          }
          return response.json();
        })
        .then(data => {
          console.log(data);
          document.getElementById("overlay").classList.add("hidden");
          animating = false;
          if (data.translated) {
            console.log(data.inDatabase)
            if (data.inDatabase == 0) {
              document.documentElement.style.setProperty('--status-active', 'var(--status-red)');
              document.documentElement.style.setProperty('--status-active-shadow-1', 'var(--status-red-shadow-1)');
              document.documentElement.style.setProperty('--status-active-shadow-2', 'var(--status-red-shadow-2)');
            }
            else if (data.inDatabase == 1) {
              document.documentElement.style.setProperty('--status-active', 'var(--status-green)');
              document.documentElement.style.setProperty('--status-active-shadow-1', 'var(--status-green-shadow-1)');
              document.documentElement.style.setProperty('--status-active-shadow-2', 'var(--status-green-shadow-2)');
            }
            document.getElementById('translated-text').textContent = data.translated;
          } else {
            console.error('Unexpected response:', data);
          }
        })
        .catch(error => {
          document.getElementById("overlay").classList.add("hidden");
          console.error('Error:', error);
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      const username = localStorage.getItem('username');
      if (isLoggedIn) {
        document.getElementById('login-link').style.display = 'none';
        document.getElementById('profile-link').style.display = 'display';
        document.getElementById('profile-link').textContent = username;
      }
      else {
        document.getElementById('login-link').style.display = 'display';
        document.getElementById('profile-link').style.display = 'none';

      }
    });

    document.getElementById("save-btn").addEventListener("click", function () {
      document.getElementById("overlay").classList.remove("hidden");
      this.disabled = true;
      let word = document.getElementById("source-text").textContent;
      let definition = document.getElementById("translated-text").textContent;
      let user = JSON.parse(localStorage.getItem('user'));
      let userId = user.id
      let nat_id = 1;
      let tar_id = 2

      if (!user) {
        document.getElementById("overlay").classList.add("hidden");
        alert("You must be logged in to save words.");
        return;
      }

      let payload = {
        word: word,
        definition: definition,
        user_id: user.id,
        nat_id: 1, // You might want to set these dynamically
        tar_id: 2
      };

      fetch("/api/save_word", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      })
        .then(response => response.json())
        .then(data => {
          if (data.error) {
            document.getElementById("overlay").classList.add("hidden");
            alert("Error: " + data.error);
          } else {
            document.getElementById("overlay").classList.add("hidden");
            alert("Word saved successfully!");
            document.documentElement.style.setProperty('--status-active', 'var(--status-green)');
            document.documentElement.style.setProperty('--status-active-shadow-1', 'var(--status-green-shadow-1)');
            document.documentElement.style.setProperty('--status-active-shadow-2', 'var(--status-green-shadow-2)');
            console.log(data);
          }
        })
        .catch(error => {
          document.getElementById("overlay").classList.add("hidden");
          console.error("Error saving word:", error);
        });
      this.disabled = false;
    });




    button.addEventListener("click", () => {
      menu.classList.toggle("hidden");
    });

    // Optional: Hide dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (!button.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.add("hidden");
      }
    });

  }, []);


  // Save button handler
  const onSave = () => {
    // Implement save logic here
    alert("Save clicked: " + translatedText);
  };





  return (
    <div>
      <div id="overlay" className="overlay hidden">
        <div className="spinner"></div>
      </div>

      <a
        href="/login"
        id="login-link"
        className="nav-link"
        style={{ position: "fixed", top: "2%", right: "5%" }}
      >
        Login
      </a>
      <a
        href=""
        id="profile-link"
        className="nav-link"
        style={{ position: "fixed", top: "2%", right: "5%" }}
      ></a>

      <div
        className="language-dropdown"
        style={{ position: "fixed", top: "2%", right: "12%" }}
      >
        <button id="language-button" className="nav-link">Language</button>
        <div id="language-menu" className="dropdown-menu hidden">
          <a href="#" data-lang="en"><img src="https://cdn.countryflags.com/thumbs/united-kingdom/flag-square-250.png"
            alt="" className="menu-flag"></img> English</a>
          <a href="#" data-lang="lt"><img
            src="https://www.countryflags.com/wp-content/uploads/lithuania-flag-png-large.png" alt=""
            className="menu-flag"></img> Lietuvių</a>
          <a href="#" data-lang="fr"><img src="https://cdn.countryflags.com/thumbs/france/flag-square-250.png" alt=""
            className="menu-flag"></img>Français</a>
        </div>
        {languageMenuVisible && (
          <div id="language-menu" className="dropdown-menu">
            <a href="#" data-lang="en">
              <img
                src="https://cdn.countryflags.com/thumbs/united-kingdom/flag-square-250.png"
                alt=""
                className="menu-flag"
              />{" "}
              English
            </a>
            <a href="#" data-lang="lt">
              <img
                src="https://www.countryflags.com/wp-content/uploads/lithuania-flag-png-large.png"
                alt=""
                className="menu-flag"
              />{" "}
              Lietuvių
            </a>
            <a href="#" data-lang="fr">
              <img
                src="https://cdn.countryflags.com/thumbs/france/flag-square-250.png"
                alt=""
                className="menu-flag"
              />
              Français
            </a>
          </div>
        )}
      </div>

      <div id="audio-container">
        <div>
          <p id="current-audio"></p>
          <i className="fa-solid fa-play" id="btn-play-audio"></i>
        </div>
      </div>

      <div id="lesson-word-container"></div>

      <div id="def-container">
        <div className="status-indicator"></div>
        <button id="save-btn" onClick={onSave}>
          Save
        </button>
        <div className="entry-header">
          <h1 id="target-word">Mean</h1>
          <h3 id="part-of-speech">adjective</h3>
        </div>
        <div className="translation-pair">
          <span className="source-lang">Lithuanian:</span>
          <span id="source-text">Mean</span>
        </div>
        <div className="translation-pair">
          <span className="target-lang">English:</span>
          <span
            id="translated-text"
            contentEditable
            suppressContentEditableWarning
            onInput={(e) => setTranslatedText(e.currentTarget.textContent)}
          >
            {translatedText}
          </span>
        </div>
        <div>
          <p id="word-definition">
            Unkind, spiteful, or unfair. Example: "She was mean to her classmates."
          </p>
        </div>
      </div>

      <div id="pagination-container">
        <div>
          <i className="fa-solid fa-chevron-left" id="btn-back"></i>
          <i className="fa-solid fa-chevron-right" id="btn-next"></i>
        </div>
      </div>

    </div>
  );


}
