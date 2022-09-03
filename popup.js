let start = document.getElementById("start");
let stop = document.getElementById("stop");
let linkUrl = document.getElementById("linkUrl");


start.addEventListener("click", async() => {

 let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
 
 chrome.runtime.sendMessage({cmd:'start', url: linkUrl.value, tabId: tab.id}, (response) => {
  console.log('popup Received:', response);
 });
});

stop.addEventListener("click", async() => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.runtime.sendMessage({cmd:'stop', tabId: tab.id}, (response) => {
   console.log('popup Received:', response);
  });
});