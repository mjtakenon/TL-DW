// タグを表示する処理
console.log("showTags")

// 元のタグ要素を取得
className = "super-title style-scope ytd-video-primary-info-renderer";

innerHTML = document.getElementsByClassName(className)[0].innerHTML;
for (let key in res) {
  // 元のタグ要素に取得してきたタグを連結して追加
  innerHTML += '<a class="yt-simple-endpoint style-scope yt-formatted-string">#' + key + '</a>';
}
document.getElementsByClassName(className)[0].innerHTML = innerHTML;