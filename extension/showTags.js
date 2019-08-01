// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Called when the user clicks on the browser action.
chrome.browserAction.onClicked.addListener(function(tab) {
  // No tabs or host permissions needed!
  // console.log('Turning ' + tab.url + ' red!');
  console.log("start to getting words")
  chrome.tabs.executeScript({
    // code: 'document.body.style.backgroundColor="red"'
    // かわらない
    // document.getElementsByClassName("super-title style-scope ytd-video-primary-info-renderer")[0].text.runs[0].text = "#名取さな"

    code: '\
      str = " #名取さな #ヌォンタート"; \
      defaultHTML = document.getElementsByClassName("super-title style-scope ytd-video-primary-info-renderer")[0].innerHTML; \
      document.getElementsByClassName("super-title style-scope ytd-video-primary-info-renderer")[0].innerHTML = defaultHTML + str; \
    '
  });
});
