// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.


// Called when the user clicks on the browser action.


chrome.browserAction.onClicked.addListener(function(tab) {
  console.log("chrome.browserAction.onClicked")
  chrome.tabs.executeScript({
    file: "showTags.js"
  })
})

// バグあり 既存のタグを消してしまう
// このコードがない場合ページ遷移をしても追加されたタグが消えない
chrome.tabs.onUpdated.addListener(function(tabid, info, tab){
  console.log("chrome.tabs.onUpdated")
  chrome.tabs.executeScript({
    file: "clearTags.js"
  })
  // info.url
  // tab.url
})