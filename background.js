let urlArrays = [];
let startedTabsCnt = 0;
let timerId;

const isValidUrl = urlString=> {
  var urlPattern = new RegExp('^(https?:\\/\\/)?'+ // validate protocol
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // validate domain name
    '((\\d{1,3}\\.){3}\\d{1,3}))'+ // validate OR ip (v4) address
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // validate port and path
    '(\\?[;&a-z\\d%_.~+=-]*)?'+ // validate query string
    '(\\#[-a-z\\d_]*)?$','i'); // validate fragment locator
 return !!urlPattern.test(urlString);
}

function loadUrl(tabId, index) {
  chrome.tabs.update(tabId, { url: urlArrays[index] });

  // TODO: inject after finished loading
  setTimeout(()=> injectScriptToTab(tabId, index), 5000);
}

function updateUrlDB(serverUrl) {
  fetch(serverUrl)
  .then((response) => response.text())
  .then(function(text) {
    urlArrays = text.split(/\r?\n/).filter(text => isValidUrl(text));
    console.log("urlArrays updated:" + urlArrays.length)
  });
}

// TODO: Merge with updateUrls
function updateUrlDBAndLoadFirstUrl(serverUrl, tabId) {
  fetch(serverUrl)
  .then((response) => response.text())
  .then(function(text) {
    urlArrays = text.split(/\r?\n/).filter(text => isValidUrl(text));
    loadUrl(tabId, 0);
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

  if (message.cmd === "start") {
    if (startedTabsCnt == 0) {
      // update every 10 seconds
      timerId = setInterval(updateUrlDB, 10000, message.url);
    }
    startedTabsCnt++;

    if (urlArrays.length == 0) {
      updateUrlDBAndLoadFirstUrl(message.url, message.tabId);
    } else {
      loadUrl(message.tabId, 0);
    }
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

    loadUrl(sender.tab.id, next_index);
    /*
    // load next url
    chrome.tabs.update(sender.tab.id, { url: urlArrays[next_index] });

    // TODO: inject after finished loading
    setTimeout(()=> injectScriptToTab(sender.tab.id, next_index), 5000);
    */
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
