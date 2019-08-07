// タグを表示する処理
console.log("showTags")

// 元のタグ要素を取得
className = "super-title style-scope ytd-video-primary-info-renderer"

for (var key in res) {
  defaultHTML = document.getElementsByClassName(className)[0].innerHTML
  // 元のタグ要素に取得してきたタグを連結して追加
  document.getElementsByClassName(className)[0].innerHTML = defaultHTML + " #" + key //str
}

