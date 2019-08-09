// タグを表示する処理
console.log("showTags")
// 元のタグ要素を取得
className = "super-title style-scope ytd-video-primary-info-renderer";

innerHTML = document.getElementsByClassName(className)[0].innerHTML;

if (currentURL.indexOf("&t=") !== -1) {
  currentURL = currentURL.substring(currentURL.indexOf("/watch"),currentURL.indexOf("&t="))
} else {
  currentURL = currentURL.substring(currentURL.indexOf("/watch"))
}

for (let itr in tagList) {
  // 秒数が分からない場合
  if (tagList[itr][2] === null) {
    innerHTML += ' <div class="yt-simple-endpoint style-scope yt-formatted-string tl-dw-tag">#' + tagList[itr][0].replace('\n','') + '</div> ';
  } else {
    // 元のタグ要素に取得してきたタグを連結して追加
    innerHTML += ' <a href="'+currentURL+'&t='+tagList[itr][2]+'s"class="yt-simple-endpoint style-scope yt-formatted-string tl-dw-tag">#' + tagList[itr][0].replace('\n','') + '</a> ';
  }

}
document.getElementsByClassName(className)[0].innerHTML = innerHTML;