

// ファイルからAppIdを取得
async function getAppId() {
  var filename = "yahooAppId.txt";
  return new Promise(function(resolve) {
    var xhr = new XMLHttpRequest()
    xhr.open('GET', chrome.extension.getURL(filename), true)
    xhr.send()
    xhr.onreadystatechange = function() {
      if(xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
        resolve(xhr.responseText)
      }
    }
  })
}

// Yahoo!APIにアクセスしてキーワードを取得
async function getKeyword(appId,str) {
  return new Promise(function(resolve) {
    var xhr = new XMLHttpRequest()
    xhr.open('GET', 'https://jlp.yahooapis.jp/KeyphraseService/V1/extract?appid='+appId+'&sentence='+encodeURIComponent(str)+'&output=json', true);
    xhr.setRequestHeader('content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
    xhr.send()
    xhr.onreadystatechange = function() {
      if(xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
        resolve(xhr)
      }
    }
  })
}

// タグを生成
async function getTags(str){
  // appId取得
  appId = await getAppId()
  // キーワード取得
  res = await getKeyword(appId,str)
  console.log(JSON.parse(res.responseText))
  // タグを表示
  chrome.tabs.executeScript({
    file: "showTags.js",
  })
}

chrome.browserAction.onClicked.addListener(function(tab) {
  console.log("chrome.browserAction.onClicked")
  str = "";
  getTags(str)
  
  return;
})

// バグあり 既存のタグを消してしまう
// このコードがない場合ページ遷移をしても追加されたタグが消えない
// chrome.tabs.onUpdated.addListener(function(tabid, info, tab){
//   console.log("chrome.tabs.onUpdated")
//   chrome.tabs.executeScript({
//     file: "clearTags.js"
//   })
//   // info.url
//   // tab.url
// })