// タグを表示する処理
console.log("showTags")
// 元のタグ要素を取得
className = "super-title style-scope ytd-video-primary-info-renderer";

innerHTML = document.getElementsByClassName(className)[0].innerHTML;

if (url.indexOf("&t=") !== -1) {
  url = url.substring(0,url.indexOf("&t="))
}

for (let itr in tagList) {
  // 秒数が分からない場合
  if (tagList[itr][2] === null) {
    innerHTML += ' <div class="yt-simple-endpoint style-scope yt-formatted-string tl-dw-tag">#' + tagList[itr][0] + '</a> ';
  } else {
    // 元のタグ要素に取得してきたタグを連結して追加
    innerHTML += ' <a href="'+url+'&t='+tagList[itr][2]+'s"class="yt-simple-endpoint style-scope yt-formatted-string tl-dw-tag">#' + tagList[itr][0] + '</a> ';
  }

}
document.getElementsByClassName(className)[0].innerHTML = innerHTML;