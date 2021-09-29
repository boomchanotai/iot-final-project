// More API functions here:
// https://github.com/googlecreativelab/teachablemachine-community/tree/master/libraries/pose

// the link to your model provided by Teachable Machine export panel
const URL = "https://teachablemachine.withgoogle.com/models/rJErrLQSC/";
let model, webcam, ctx, labelContainer, maxPredictions;

let stateOn = 0;
let stateOff = 0;
let stateTemp = 0;

let config = {
  mqtt_server: "driver.cloudmqtt.com",
  mqtt_websockets_port: 38672,
  mqtt_user: "qurygeum",
  mqtt_password: "vDKjrZ5FpIHJ",
};

client = new Paho.MQTT.Client(
  config.mqtt_server,
  config.mqtt_websockets_port,
  "web_" + parseInt(Math.random() * 100, 10)
);

client.connect({
  useSSL: true,
  userName: config.mqtt_user,
  password: config.mqtt_password,
  onSuccess: function () {
    console.log("Connect");
    client.subscribe("/Boomzaza/temperature");
    client.subscribe("/Boomzaza/humidity");
    mqttSend("/Boomzaza", "Connected");
  },
  onFailure: function (e) {
    console.log(e);
  },
});

client.onConnectionLost = function (responseObject) {
  if (responseObject.errorCode !== 0) {
    setTimeout(function () {
      client.connect();
    }, 1000);
  }
};

client.onMessageArrived = function (message) {
  if (message.destinationName.includes("temperature")) {
    document.querySelector("#temp").innerHTML = message.payloadString;
    return;
  }
  if (message.destinationName.includes("humidity")) {
    document.querySelector("#humidity").innerHTML = message.payloadString;
    return;
  }
};

function mqttSend(topic, msg) {
  let message = new Paho.MQTT.Message(msg);
  message.destinationName = topic;
  client.send(message);
}

async function init() {
  const modelURL = URL + "model.json";
  const metadataURL = URL + "metadata.json";

  // load the model and metadata
  // Refer to tmImage.loadFromFiles() in the API to support files from a file picker
  // Note: the pose library adds a tmPose object to your window (window.tmPose)
  model = await tmPose.load(modelURL, metadataURL);
  maxPredictions = model.getTotalClasses();

  // Convenience function to setup a webcam
  const size = {
    width: 640,
    height: 480,
  };
  const flip = true; // whether to flip the webcam
  webcam = new tmPose.Webcam(size.width, size.height, flip); // width, height, flip
  await webcam.setup(); // request access to the webcam
  await webcam.play();
  window.requestAnimationFrame(loop);

  // append/get elements to the DOM
  const canvas = document.getElementById("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  ctx = canvas.getContext("2d");
  // labelContainer = document.getElementById("label-container");
  // for (let i = 0; i < maxPredictions; i++) {
  //   // and class labels
  //   labelContainer.appendChild(document.createElement("div"));
  // }

  document.querySelector(".container-items").style.display = "block";
  document.querySelector(".loading").style.display = "none";
}

init();

async function loop(timestamp) {
  webcam.update(); // update the webcam frame
  await predict();
  window.requestAnimationFrame(loop);
}

async function predict() {
  // Prediction #1: run input through posenet
  // estimatePose can take in an image, video or canvas html element
  const { pose, posenetOutput } = await model.estimatePose(webcam.canvas);
  // Prediction 2: run input through teachable machine classification model
  const prediction = await model.predict(posenetOutput);

  // for (let i = 0; i < maxPredictions; i++) {
  //   const classPrediction =
  //     prediction[i].className + ": " + prediction[i].probability.toFixed(2);
  //   labelContainer.childNodes[i].innerHTML = classPrediction;
  // }

  // turn on
  if (prediction[0].probability.toFixed(2) > 0.8) {
    document.querySelector("#tube").style.height = "100%";
    if (stateOn == 0) {
      stateOff = 0;
      mqttSend("/Boomzaza", "relay1_on");
      stateOn = 1;
    }
  }

  // turn off
  if (prediction[1].probability.toFixed(2) > 0.8) {
    document.querySelector("#tube").style.height = "0%";
    if (stateOff == 0) {
      stateOn = 0;
      mqttSend("/Boomzaza", "relay1_off");
      stateOff = 1;
    }
  }

  // temp
  if (prediction[2].probability.toFixed(2) > 0.8) {
    document.querySelector("#temp_hum_box").style.display = "block";
  } else {
    document.querySelector("#temp_hum_box").style.display = "none";
  }

  // finally draw the poses
  drawPose(pose);
}

function drawPose(pose) {
  if (webcam.canvas) {
    ctx.drawImage(webcam.canvas, 0, 0);
    // draw the keypoints and skeleton
    if (pose) {
      const minPartConfidence = 0.5;
      tmPose.drawKeypoints(pose.keypoints, minPartConfidence, ctx);
      tmPose.drawSkeleton(pose.keypoints, minPartConfidence, ctx);
    }
  }
}
