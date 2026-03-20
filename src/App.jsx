import { useState, useEffect, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

function App() {
  const [text, setText] = useState("");
  const [words, setWords] = useState([]);
  const [index, setIndex] = useState(0);
  const [speed, setSpeed] = useState(
    Number(localStorage.getItem("speed")) || 300
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [bgAnimated, setBgAnimated] = useState(true);
  const [sessionWords, setSessionWords] = useState(0);
  const [sessionTime, setSessionTime] = useState(0);
  const [showStats, setShowStats] = useState(false);

  const startTimeRef = useRef(null);

  const animationStyles = `
    @keyframes fadeIn {
      0% { opacity: 0; transform: translateY(10px); }
      100% { opacity: 1; transform: translateY(0); }
    }

    @keyframes gradientMove {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
  `;

  function processText(input) {
    const cleanWords = input.trim().split(/\s+/);
    setText(input);
    setWords(cleanWords);

    setIndex(0);
    setIsPlaying(false);
    setShowStats(false);
    setSessionWords(0);
    setSessionTime(0);
  }

  function handleChange(e) {
    processText(e.target.value);
  }


  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const fileType = file.type;

    if (fileType === "text/plain") {
      const reader = new FileReader();
      reader.onload = (event) => processText(event.target.result);
      reader.readAsText(file);
      return;
    }

    if (fileType === "application/pdf") {
      const reader = new FileReader();

      reader.onload = async function () {
        try {
          const typedArray = new Uint8Array(this.result);
          const pdf = await pdfjsLib.getDocument(typedArray).promise;

          let fullText = "";

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const strings = content.items.map((item) => item.str);
            fullText += strings.join(" ") + " ";
          }

          processText(fullText);
        } catch (error) {
          console.error("PDF parsing error:", error);
        }
      };

      reader.readAsArrayBuffer(file);
    }
  }

  useEffect(() => {
    localStorage.setItem("speed", speed);
  }, [speed]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) setIsPlaying(false);
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  useEffect(() => {
    if (!isPlaying || words.length === 0) return;

    if (!startTimeRef.current) startTimeRef.current = Date.now();

    const currentWord = words[index];
    let delay = 60000 / speed;

    if (/[.!?]$/.test(currentWord)) delay *= 2;
    else if (/,$/.test(currentWord)) delay *= 1.5;

    const timeout = setTimeout(() => {
      setIndex((prev) => {
        if (prev < words.length - 1) {
          setSessionWords((w) => w + 1);
          return prev + 1;
        } else {
          setIsPlaying(false);
          const totalTime = (Date.now() - startTimeRef.current) / 1000;
          setSessionTime(totalTime);
          setShowStats(true);
          startTimeRef.current = null;
          return prev;
        }
      });
    }, delay);

    return () => clearTimeout(timeout);
  }, [isPlaying, speed, index, words]);

  function highlightWord(word) {
    if (!word) return "";
    const pivot = Math.min(Math.round(word.length * 0.35), word.length - 1);

    return (
      <>
        {word.slice(0, pivot)}
        <span style={{ color: "red" }}>{word[pivot]}</span>
        {word.slice(pivot + 1)}
      </>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        width: "100vw",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial',
        colorScheme: "dark",
        background:
          "linear-gradient(-45deg, #0f172a, #1e293b, #111827, #1f2937)",
        backgroundSize: "400% 400%",
        animation: bgAnimated ? "gradientMove 15s ease infinite" : "none",
        color: "#e2e8f0",
      }}
    >
      <style>{animationStyles}</style>
      <style>{`
        .sr-button {
          padding: 10px 16px;
          border-radius: 999px;
          border: 1px solid rgba(51, 65, 85, 0.9);
          background: rgba(15, 23, 42, 0.55);
          color: #e2e8f0;
          cursor: pointer;
          transition: background-color 160ms ease, border-color 160ms ease, transform 120ms ease, box-shadow 160ms ease;
          font-size: 14px;
          line-height: 1.2;
          font-weight: 600;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.25);
          user-select: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 40px;
        }
        .sr-button:hover {
          background: rgba(17, 24, 39, 0.75);
          border-color: rgba(71, 85, 105, 0.95);
          box-shadow: 0 14px 30px rgba(0, 0, 0, 0.33);
        }
        .sr-button:active {
          transform: translateY(1px);
        }
        .sr-button:focus-visible {
          outline: 2px solid rgba(148, 163, 184, 0.85);
          outline-offset: 3px;
        }

        .sr-range {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 26px; /* gives room for thumb */
          background: transparent;
        }

        /* WebKit track */
        .sr-range::-webkit-slider-runnable-track {
          height: 8px;
          border-radius: 999px;
          background: linear-gradient(
            90deg,
            rgba(51, 65, 85, 0.85) 0%,
            rgba(51, 65, 85, 0.55) 55%,
            rgba(51, 65, 85, 0.85) 100%
          );
          border: 1px solid rgba(71, 85, 105, 0.75);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
        }

        /* WebKit thumb */
        .sr-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: rgba(226, 232, 240, 0.98);
          border: 1px solid rgba(71, 85, 105, 0.85);
          box-shadow:
            0 10px 24px rgba(0, 0, 0, 0.35),
            inset 0 1px 0 rgba(255, 255, 255, 0.25);
          transform: translateY(0);
          transition: transform 120ms ease, box-shadow 160ms ease, background-color 160ms ease;
          margin-top: -5px; /* centers thumb over 8px track */
        }

        .sr-range:hover::-webkit-slider-thumb {
          transform: scale(1.06);
          box-shadow:
            0 14px 30px rgba(0, 0, 0, 0.45),
            inset 0 1px 0 rgba(255, 255, 255, 0.25);
        }

        .sr-range:focus-visible {
          outline: none;
        }

        .sr-range:focus-visible::-webkit-slider-thumb {
          box-shadow:
            0 16px 34px rgba(0, 0, 0, 0.5),
            0 0 0 4px rgba(148, 163, 184, 0.25),
            inset 0 1px 0 rgba(255, 255, 255, 0.25);
        }

        /* Firefox track */
        .sr-range::-moz-range-track {
          height: 8px;
          border-radius: 999px;
          background: linear-gradient(
            90deg,
            rgba(51, 65, 85, 0.85) 0%,
            rgba(51, 65, 85, 0.55) 55%,
            rgba(51, 65, 85, 0.85) 100%
          );
          border: 1px solid rgba(71, 85, 105, 0.75);
        }

        /* Firefox thumb */
        .sr-range::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: rgba(226, 232, 240, 0.98);
          border: 1px solid rgba(71, 85, 105, 0.85);
          box-shadow:
            0 10px 24px rgba(0, 0, 0, 0.35),
            inset 0 1px 0 rgba(255, 255, 255, 0.25);
          transition: transform 120ms ease, box-shadow 160ms ease, background-color 160ms ease;
        }

        .sr-range:hover::-moz-range-thumb {
          transform: scale(1.06);
          box-shadow:
            0 14px 30px rgba(0, 0, 0, 0.45),
            inset 0 1px 0 rgba(255, 255, 255, 0.25);
        }

        .sr-range:focus-visible::-moz-range-thumb {
          box-shadow:
            0 16px 34px rgba(0, 0, 0, 0.5),
            0 0 0 4px rgba(148, 163, 184, 0.25),
            inset 0 1px 0 rgba(255, 255, 255, 0.25);
        }

        .sr-textarea {
          background: rgba(2, 6, 23, 0.45);
          border: 1px solid #334155;
          border-radius: 12px;
          padding: 14px;
          color: #e2e8f0;
          width: 100%;
          max-width: 720px;
          margin: 0 auto;
          resize: vertical;
        }
        .sr-textarea:focus-visible {
          outline: 2px solid #94a3b8;
          outline-offset: 2px;
          border-color: #475569;
        }

        .sr-file {
          width: 100%;
          max-width: 720px;
          margin: 0 auto;
          background: rgba(2, 6, 23, 0.45);
          border: 1px solid #334155;
          border-radius: 12px;
          padding: 10px 12px;
          color: #e2e8f0;
        }
        .sr-file:focus-visible {
          outline: 2px solid #94a3b8;
          outline-offset: 2px;
          border-color: #475569;
        }

        /* Style the native "Choose file" button across browsers */
        .sr-file::file-selector-button {
          appearance: none;
          background: rgba(15, 23, 42, 0.75);
          color: #e2e8f0;
          border: 1px solid rgba(71, 85, 105, 0.85);
          border-radius: 999px;
          padding: 10px 14px;
          margin-right: 10px;
          cursor: pointer;
          transition: background-color 160ms ease, border-color 160ms ease, box-shadow 160ms ease,
            transform 120ms ease;
          font-weight: 600;
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.25);
        }

        .sr-file::file-selector-button:hover {
          background: rgba(17, 24, 39, 0.9);
          border-color: rgba(71, 85, 105, 0.98);
          box-shadow: 0 14px 28px rgba(0, 0, 0, 0.33);
        }

        .sr-file::file-selector-button:active {
          transform: translateY(1px);
        }

        /* Chromium/Safari fallback */
        .sr-file::-webkit-file-upload-button {
          appearance: none;
          background: rgba(15, 23, 42, 0.75);
          color: #e2e8f0;
          border: 1px solid rgba(71, 85, 105, 0.85);
          border-radius: 999px;
          padding: 10px 14px;
          margin-right: 10px;
          cursor: pointer;
          transition: background-color 160ms ease, border-color 160ms ease, box-shadow 160ms ease,
            transform 120ms ease;
          font-weight: 600;
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.25);
        }

        .sr-file::-webkit-file-upload-button:hover {
          background: rgba(17, 24, 39, 0.9);
          border-color: rgba(71, 85, 105, 0.98);
          box-shadow: 0 14px 28px rgba(0, 0, 0, 0.33);
        }

        .sr-file::-webkit-file-upload-button:active {
          transform: translateY(1px);
        }

        /* Centered custom "Choose file" control (keeps same input/handler) */
        .sr-file-label {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 10px 16px;
          border-radius: 999px;
          border: 1px solid rgba(71, 85, 105, 0.95);
          background: rgba(15, 23, 42, 0.65);
          color: #e2e8f0;
          cursor: pointer;
          font-weight: 600;
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.28);
          transition: background-color 160ms ease, border-color 160ms ease, box-shadow 160ms ease, transform 120ms ease;
          user-select: none;
        }

        .sr-file-label:hover {
          background: rgba(17, 24, 39, 0.85);
          border-color: rgba(71, 85, 105, 1);
          box-shadow: 0 16px 30px rgba(0, 0, 0, 0.36);
        }

        .sr-file-label:active {
          transform: translateY(1px);
        }

        .sr-file-hidden {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        .sr-card {
          background: rgba(2, 6, 23, 0.35);
          border: 1px solid #334155;
          border-radius: 16px;
        }

        .sr-muted {
          color: #9ca3af;
          margin: 0;
        }

        .sr-meta {
          margin: 0 0 10px 0;
          color: #9ca3af;
          font-size: 14px;
          text-align: center;
        }
      `}</style>

      <div
        style={{
          width: "100%",
          maxWidth: "800px",
          padding: "28px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "18px",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "28px",
            fontWeight: 800,
            letterSpacing: "1.8px",
            textAlign: "center",
          }}
        >
          Red <span style={{ color: "red" }}>A</span>nchor
        </h1>

        {/* INPUT */}
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            alignItems: "center",
          }}
        >
          <textarea
            rows="4"
            value={text}
            onChange={handleChange}
            className="sr-textarea"
          />

          <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
            <label className="sr-file-label">
              Choose file
              <input
                type="file"
                accept=".txt,.pdf"
                onChange={handleFileUpload}
                className="sr-file-hidden"
              />
            </label>
          </div>
        </div>

        {/* READER */}
        <div className="sr-card" style={{ width: "100%", padding: "22px", marginTop: "10px" }}>
          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <div
              style={{
                fontSize: "clamp(44px, 6.5vw, 72px)",
                fontWeight: 800,
                height: "150px",
                width: "100%",
                maxWidth: "600px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                lineHeight: 1.05,
                letterSpacing: "0.2px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              <div
                key={index}
                style={{ animation: "fadeIn 0.25s ease-in-out" }}
              >
                {highlightWord(words[index])}
              </div>
            </div>

            {words.length > 0 && (
              <>
                <p className="sr-meta">
                  {index + 1} / {words.length}
                </p>

                <input
                  type="range"
                  min="0"
                  max={words.length - 1}
                  value={index}
                  onChange={(e) => {
                    setIndex(Number(e.target.value));
                    setIsPlaying(false);
                  }}
                  className="sr-range"
                />
              </>
            )}
          </div>
        </div>

        {/* CONTROLS */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "14px", alignItems: "center" }}>
          {/* SPEED CONTROL */}
          <div className="sr-card" style={{ width: "100%", maxWidth: "420px", padding: "14px 16px" }}>
            <input
              type="range"
              min="100"
              max="800"
              step="10"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="sr-range"
            />
            <p className="sr-muted" style={{ textAlign: "center", marginTop: "10px" }}>
              {speed} WPM
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
            <button className="sr-button" onClick={() => setIsPlaying(!isPlaying)}>
              {isPlaying ? "Pause" : "Start"}
            </button>

            <button
              className="sr-button"
              onClick={() => setIndex((prev) => Math.max(prev - 1, 0))}
            >
              ⬅ Prev
            </button>

            <button
              className="sr-button"
              onClick={() =>
                setIndex((prev) => Math.min(prev + 1, words.length - 1))
              }
            >
              Next ➡
            </button>

            <button
              className="sr-button"
              onClick={() => setBgAnimated((prev) => !prev)}
            >
              Toggle Background
            </button>
          </div>
        </div>

        {showStats && (
          <div className="sr-card" style={{ width: "100%", padding: "16px 18px" }}>
            <h3 style={{ margin: 0, fontSize: "18px" }}>Session Complete 🎉</h3>
            <p className="sr-muted" style={{ marginTop: "8px" }}>
              Words Read: {sessionWords}
            </p>
            <p className="sr-muted" style={{ marginTop: "6px" }}>
              Time Spent: {sessionTime.toFixed(2)} sec
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;