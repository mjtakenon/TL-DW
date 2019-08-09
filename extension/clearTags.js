

chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
  if (request === "clearTags") {
    console.log("clearTags")
    tags = document.querySelectorAll('.tl-dw-tag');
    for (let i = 0; i < tags.length; i++) {
      tags[i].remove();
    }
  } else if (request === "clearAllTags") {
    console.log("clearAllTags")
    document.getElementsByClassName("super-title style-scope ytd-video-primary-info-renderer")[0].innerHTML = ""
  }

})
