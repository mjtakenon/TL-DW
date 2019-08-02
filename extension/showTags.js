
// タグを取ってくる処理を書く

console.log("show tags.");

// 元のタグ要素を取得
className = "super-title style-scope ytd-video-primary-info-renderer"
defaultHTML = document.getElementsByClassName(className)[0].innerHTML
// 元のタグ要素に取得してきたタグを連結して追加
document.getElementsByClassName(className)[0].innerHTML = defaultHTML + " " + str
// chrome.extension.onRequest.addListener( onRequest ) ;