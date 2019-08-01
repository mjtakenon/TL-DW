
// タグを取ってくる処理を書く
function getTags() {
  return " " + "#名取さな #ヌォンタート";
}

console.log("show tags.");

// 元のタグ要素を取得
defaultHTML = document.getElementsByClassName("super-title style-scope ytd-video-primary-info-renderer")[0].innerHTML
// 元のタグ要素に取得してきたタグを連結して追加
document.getElementsByClassName("super-title style-scope ytd-video-primary-info-renderer")[0].innerHTML = defaultHTML + getTags()