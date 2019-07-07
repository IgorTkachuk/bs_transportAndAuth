window.onload = () => {
  let trackValue;
  const track = document.querySelector(".track");
  const score = document.querySelector(".score");
  const engine = document.querySelector("#engine");
  // const restart = document.querySelector("#restart");
  const timeBeforeRace = document.querySelector(".timeBeforeRace");
  const timeRaceInProgress = document.querySelector(".timeRaceInProgress");
  const raceState = {};
  const timeForReload = 10000;

  // Get the track
  const jwt = localStorage.getItem("jwt");

  fetch("/track", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`
    }
  })
    .then(res => {
      res.json().then(body => {
        console.log(body);
        if (body.track) {
          const trackField = document.querySelector(".track");
          trackField.innerText = body.track;
          trackValue = body.track;
        }
      });
    })
    .catch(err => {
      console.log(err);
    });

  engine.addEventListener("input", e => {
    const currTrackPos = e.currentTarget.value;
    let match = trackValue.indexOf(currTrackPos);
    if (match === 0) {
      const coveredDistance = trackValue.substring(0, currTrackPos.length);
      const uncoveredDistance = trackValue.substring(currTrackPos.length);
      track.innerHTML = `<b><span style="color: green">${coveredDistance}</span>${uncoveredDistance}</b>`;

      socket.emit("updRaceProgress", {
        message: coveredDistance.length,
        token: jwt
      });
    }
  });

  // restart.addEventListener("click", e => {
  //   location.reload();
  // });

  // Socket connection
  const socket = io({
    query: {
      token: jwt
    }
  });

  socket.on("updRaceProgress", payload => {
    raceState[payload.user] = {
      score: payload.message
    };

    const pedestal = Object.keys(raceState)
      .sort((a, b) => {
        return raceState[b].score - raceState[a].score;
      })
      .map(user => {
        const li = document.createElement("li");
        let descr = `${user}: ${raceState[user].score}`;
        if (raceState[user].crashed) {
          descr += '<b style="color: red"> (crashed)</b>';
        }
        li.innerHTML = descr;
        return li;
      });

    score.innerHTML = "";
    pedestal.map(li => {
      score.appendChild(li);
    });
  });

  socket.on("timeBeforeRace", payload => {
    timeBeforeRace.innerText = `Time before race: ${payload.time / 1000} s`;
    if (payload.time === 0) {
      timeBeforeRace.innerHTML = '<b style="color: red">R U N !</b';
      engine.disabled = false;
      engine.focus();
    }
  });

  socket.on("timeRaceInProgress", payload => {
    timeRaceInProgress.innerText = `Time until the end of the race: ${payload.time /
      1000} s`;
    if (payload.time === 0) {
      timeBeforeRace.innerHTML = "";
      timeRaceInProgress.innerHTML = '<b style="color: red">Race finished!</b';
      engine.disabled = true;
      // restart.disabled = false;
      setTimeout(() => location.reload(), timeForReload);
    }
  });

  socket.on("raceFinishedByUser", payload => {
    timeBeforeRace.innerHTML = "";
    timeRaceInProgress.innerHTML =
      '<b style="color: red">Race finished by user!</b';
    engine.disabled = true;
    // restart.disabled = false;
    setTimeout(() => location.reload(), timeForReload);
  });

  socket.on("userCarCrash", payload => {
    raceState[payload.user].crashed = true;
  });
};
