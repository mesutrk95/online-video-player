import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";

function timeToMilliseconds(time) {
  // Split the time string into components
  let parts = time.split(":");
  let hours = parseInt(parts[0], 10);
  let minutes = parseInt(parts[1], 10);
  let secondsAndMilliseconds = parts[2].split(",");
  let seconds = parseInt(secondsAndMilliseconds[0], 10);
  let milliseconds = parseInt(secondsAndMilliseconds[1], 10);

  // Calculate the total milliseconds
  let totalMilliseconds =
    hours * 3600 * 1000 + minutes * 60 * 1000 + seconds * 1000 + milliseconds;

  return totalMilliseconds;
}

function parseSrt(str) {
  //SRT format
  var pattern =
    /(\d+)\n([\d:,]+)\s+-{2}\>\s+([\d:,]+)\n([\s\S]*?(?=\n{2}|$))/gm;
  var _regExp = new RegExp(pattern);

  var toLineObj = function (group) {
    return {
      line: group[1],
      startTime: timeToMilliseconds(group[2]),
      endTime: timeToMilliseconds(group[3]),
      text: group[4],
    };
  };
  if (typeof str != "string") throw "Sorry, Parser accept string only.";

  var result = [];

  str = str.replace(/\r\n|\r|\n/g, "\n");
  let matches;
  while ((matches = pattern.exec(str)) != null) {
    result.push(toLineObj(matches));
  }
  return result;
}

async function getSubtitle(url) {
  const result = await (await fetch(url)).text();
  //   var text= windows1256.encode(result);
  // console.log(text);
  return parseSrt(result);
}
function findCurrentSubtitleText(subtitles, time) {
  for (let i = 0; i < subtitles.length; i++) {
    let subtitle = subtitles[i];
    if (time >= subtitle.startTime && time <= subtitle.endTime) {
      return subtitle.text;
    }
  }
  return ""; // Return an empty string if no subtitle is found for the current time
}
function App() {
  const [video, setVideo] = useState(null);
  // { "video": "http://185.81.98.76/Click_2006_10bit_720p_x265_BrRip_30nama_30NAMA.mkv", "srt": "http://185.81.98.76/06. Click (2006).srt"}
  const [subtitle, setSubtitle] = useState([]);
  const [currentSubtitleText, setCurrentSubtitleText] = useState("");
  const [inputSrc, setInputSrc] = useState("");

  useEffect(() => {
    const input = localStorage.getItem("inputSrc");
    if (input) {
      setInputSrc(input);
    }
  }, []);

  useEffect(() => {
    if (!video?.srt) return;
    async function load() {
      const sub = await getSubtitle(video?.srt);
      setSubtitle(sub);
    }
    load();
  }, [video?.srt]);

  const videoElem = useRef(null);
  useEffect(() => {
    if (!videoElem.current || !subtitle) return;

    function timeupdate({ target }) {
      const currentTimeInSeconds = target.currentTime;
      const currentTimeInMilliseconds = currentTimeInSeconds * 1000;
      const text = findCurrentSubtitleText(subtitle, currentTimeInMilliseconds);
      setCurrentSubtitleText(text);
    }
    videoElem.current.addEventListener("timeupdate", timeupdate);
    return () => {
      videoElem.current.removeEventListener("timeupdate", timeupdate);
    };
  }, [videoElem.current, subtitle]);

  const play = useCallback(() => {
    try {
      localStorage.setItem("inputSrc", inputSrc);
      const inputs = JSON.parse(inputSrc);
      setVideo(inputs);
    } catch (error) {
      window.alert(error.toString());
    }
  });

  if (!video?.url) {
    return (
      <div className="form">
        <textarea
          rows="4"
          cols="50"
          onChange={(e) => setInputSrc(e.target.value)}
          defaultValue={inputSrc}
        />
        <div className="btn" onClick={(e) => play()}>
          Play!
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <div className="video-container">
        <video ref={videoElem} controls autoPlay>
          <source src={video.url} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
      <div className="subtitle-wrapper">
        <div
          className="subtitle"
          dangerouslySetInnerHTML={{ __html: currentSubtitleText }}
        ></div>
      </div>
    </div>
  );
}

export default App;
