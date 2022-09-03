let urlArrays = [];
let startedTabsCnt = 0;
let timerId;

function updateUrls(url) {
  fetch(url)
  .then((response) => response.text())
  .then(function(text) {
    urlArrays = text.split(/\r?\n/);
    console.log("urlArrays updated:" + urlArrays.length)
  });
}

function injectScriptToTab(tabId, index) {
  console.log("injectScriptToTab:" + tabId + "/" + index);
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: injectVideo,
    args : [index]
   });
}

/*
    chrome.tabs.sendMessage(tabId,
      {cmd: "update", urls: urlArrays}, (response) => {
      console.log('background received', response);
    });
*/

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(message);

  if (message.cmd === "start") {//, 
    if (startedTabsCnt == 0) {
      // update every 10 seconds
      timerId = setInterval(updateUrls, 10000, message.url);
    }
    if (urlArrays.length == 0)
      updateUrls(message.url);

    startedTabsCnt++;

    injectScriptToTab(message.tabId, 0);
    sendResponse("done-start:" + timerId);

  } else if (message.cmd === "stop") {
    startedTabsCnt--;
    if (startedTabsCnt == 0) {
      clearInterval(timerId);
    }

    // TODO: When received stop, we should remove event listener.
    sendResponse("done-stop:");
  } else if (message.cmd === "video_ended") {
    if (urlArrays.length == 0)
      return;

    let next_index = message.last_played_index + 1;
    if (urlArrays.length <= next_index)
      next_index = 0;

    sendResponse("done-video-ended:" + next_index);

    // load next url
    chrome.tabs.update(sender.tab.id, { url: urlArrays[next_index] });

    // TODO: inject after finished loading
    setTimeout(()=> injectScriptToTab(sender.tab.id, next_index), 5000);
  }
});

function injectVideo(index) {
  console.log("injected:" + index);

  document.querySelectorAll("video").forEach((video)=> {
    video.addEventListener("ended",  () => {
      console.log("ended");
      chrome.runtime.sendMessage({cmd:'video_ended', last_played_index: index}, (response) => {
        console.log('content Received:', response);
       });
    }, false);
  });
}