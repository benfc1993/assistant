import vosk from "vosk";
import mic from "mic";
import fs from "fs";
import open from "open";
import notifier from "node-notifier";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

const MODEL_PATH = path.join(__dirname, "model");
console.log(MODEL_PATH);

const listeningNotification = {
  title: "KJ",
  message: "What can I do",
  sound: "",
  timeout: false,
};

if (!fs.existsSync(MODEL_PATH)) {
  console.log(
    "Please download the model from https://alphacephei.com/vosk/models and unpack as " +
      MODEL_PATH +
      " in the current folder.",
  );
  process.exit();
}

const audioConfig = {
  rate: 22000,
  channels: "1",
  bitDepth: 16,
};

const triggerPhrase = "kj";

let listening = false;

vosk.setLogLevel(0);
const model = new vosk.Model(MODEL_PATH);
const rec = new vosk.Recognizer({
  model,
  sampleRate: audioConfig.rate,
});

const micInstance = mic({
  rate: String(audioConfig.rate),
  channels: audioConfig.channels,
  debug: false,
  device: "default",
});

const micInputStream = micInstance.getAudioStream();

function reset() {
  listening = false;
  rec.reset();
}

function processCommand(preprocessedCommand?: string) {
  const result = preprocessedCommand ?? rec.finalResult().text;
  let validCommand = false;
  if (result.includes("search")) {
    open("https://google.com/search?q=" + result.split("search")[1], {
      background: true,
    });
    validCommand = true;
  }
  if (result.includes("stop")) {
    shutdown();
    return true;
  }

  reset();
  console.log("Waiting...");
  return validCommand;
}

micInputStream.on("data", (data: Buffer) => {
  if (rec.acceptWaveform(data)) {
    if (listening) processCommand();

    if (!listening) {
      const result = rec.result().text;

      if (result.includes(triggerPhrase.replace(/\s/g, ""))) {
        if (processCommand(result)) return;
        console.log("Listening");
        notifier.notify(listeningNotification);
        listening = true;
      }
    }
  }
});

function shutdown() {
  console.log("Good Bye");
  micInstance.stop();
}

micInputStream.on("audioProcessExitComplete", function () {
  console.log("Cleaning up");
  if (rec) rec.free();
  if (model) model.free();
});

process.on("SIGINT", function () {
  shutdown();
});

micInstance.start();
console.log("Waiting...");
