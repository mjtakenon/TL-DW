

// HTMLフォームの形式にデータを変換する
// https://so-zou.jp/web-app/tech/programming/javascript/ajax/post.htm
function encodeHTMLForm( data )
{
    var params = []
    for( var name in data )
    {
        var value = data[ name ]
        var param = encodeURIComponent( name ) + '=' + encodeURIComponent( value )
        params.push( param )
    }
    return params.join( '&' ).replace( /%20/g, '+' )
}

// 現在表示しているURLを取得
async function getCurrentURL() {
  return new Promise(function(resolve) {
    chrome.tabs.getSelected(null, function(tab) { resolve(tab.url) })
  })
}

// 外部ファイル読み込み
async function readFile(filename) {
  return new Promise(function(resolve) {
    let xhr = new XMLHttpRequest()
    xhr.open('GET', chrome.extension.getURL(filename), true)
    xhr.send()
    xhr.onreadystatechange = function() {
      if(xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
        resolve(xhr.responseText)
      }
      else if (xhr.readyState == XMLHttpRequest.DONE && xhr.status != 200) {
        console.error(xhr)
        console.error(xhr.responseText)
        console.error(filename+"を開けません.")
        resolve(null)
      }
    }
  })
}

async function getExtensionID() {
  return new Promise(function(resolve) {
    chrome.management.getAll(function(result) {
      const extension = result.filter(result => {
        return result.description === "a extention for getting words from Youtube videos";
      })
      if (extension === null || extension === undefined) {
        resolve(null)
      } else {
        resolve(extension[0].id)
      }
    })
  })
}

function toCountDict(array,W){
  let dict = [];
  for(let key of array){
    let count_word = []
    count_word.push(key)
    let count = Math.log(W) * array.filter(function(x){return x==key}).length * Math.log(key.length);
    count_word.push(count)
    dict.push(count_word)
  }
  return dict;
}

var ngram = function(array, n) {
  var i;
  var grams = [];
  for(i = 0; i <= array.length-n; i++) {
    var n_text = array[i];
    for (j = 1; j < n; j++){
      n_text += array[i + j]
    }
    grams.push(n_text)
  }
  return grams;
}

var ngram_exception_words = function(array,ex_word, n) {
  var i;
  var grams = [];
  for(i = 0; i <= array.length-n; i++) {
    var n_text = array[i];
    if (ex_word.indexOf(array[i]) >= 0 || ex_word.indexOf(array[i + n - 1]) >= 0){
      continue
    }else{
      for (j = 1; j < n; j++){
        n_text += array[i + j]
      }
    }
    grams.push(n_text)
  }
  return grams;
}
function pushTwoDimensionalArray(array1, array2, axis){
  if(axis != 1) axis = 0;
  if(axis == 0){  //　縦方向の追加
    for(var i = 0; i < array2.length; i++){
      array1.push(array2[i]);
    }
  }
  else{  //　横方向の追加
    for(var i = 0; i < array1.length; i++){
      Array.prototype.push.apply(array1[i], array2[i]);
    }
  }
}
// YahooAPIアクセス関連
// Yahoo!APIにアクセスしてキーワードを取得
async function getKeyword(appId,sentence) {
  return new Promise(function(resolve) {
    let xhr = new XMLHttpRequest()
    xhr.open('POST', 'https://jlp.yahooapis.jp/KeyphraseService/V1/extract', true)
    let data = { appid: appId, sentence: sentence, output: 'json' }
    xhr.setRequestHeader('content-type', 'application/x-www-form-urlencoded;charset=UTF-8')
    xhr.send(encodeHTMLForm(data))
    xhr.onreadystatechange = function() {
      if(xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
        resolve(xhr)
      }
      else if (xhr.readyState == XMLHttpRequest.DONE && xhr.status != 200) {
        console.error(xhr)
        console.error(xhr.responseText)
        console.error("Yahoo!APIにアクセスできません.")
        resolve(null)
      }
    }
  })
}

// Yahoo!APIにアクセスして形態素解析を実行
async function getMorphologicalAnalysisResults(appId,sentence) {
  return new Promise(function(resolve) {
    let xhr = new XMLHttpRequest()
    xhr.open('POST', 'https://jlp.yahooapis.jp/MAService/V1/parse', true)
    let data = { appid: appId, sentence: sentence, results: 'ma' }
    xhr.setRequestHeader('content-type', 'application/x-www-form-urlencoded;charset=UTF-8')
    xhr.send(encodeHTMLForm(data))
    xhr.onreadystatechange = function() {
      if(xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
        resolve(xhr)
      }
      else if (xhr.readyState == XMLHttpRequest.DONE && xhr.status != 200) {
        console.error(xhr)
        console.error(xhr.responseText)
        resolve(null)
      }
    }
  })
}

// Yahoo!APIよりキーワードを抽出してリストで返却
async function getKeywordAndParse(str) {
  // appId取得
  let appId = await readFile("key/yahoo_api_key.txt")
  // キーワード取得
  let keyword = await getKeyword(appId,str)
  return JSON.parse(keyword.responseText)
}

// 各解析結果をまとめて1つのリストにする
async function createTagList(keyword, analizedStringList, subTitleList) {
  let all_list = []
  if (keyword !== null) {
    for (let itr of Object.keys(keyword)) {
      all_list.push([itr, keyword[itr]])
    }
  }

  // 2つの語句をつなげて検索する
  // TODO 重複なら追加しない
  if(subTitleList !== null) {
    let subTitleListConnect = []
    for(let itr = 0; itr < subTitleList.length-1; itr++) {
      subTitleListConnect.push([subTitleList[itr][0] + subTitleList[itr+1][0],subTitleList[itr][1],itr])
    }
    all_list = all_list.concat(analizedStringList)
    for(let itr of Object.keys(all_list)) {
      // 字幕があれば時間を計算
      all_list[itr].push(searchTime(all_list[itr][0], subTitleListConnect))
    }
  } else {
    for(let itr of Object.keys(all_list)) {
      // 字幕がないと時間が計算できない
      all_list[itr].push(null)
    }
  }
  return all_list
}

// 語句が出てくる動画の時間を検索する
function searchTime(word, subTitleListConnect) {


  // 単語でフィルタリング
  var filterdList = subTitleListConnect.filter(function(element) {
    return (element[0].indexOf(word) !== -1)
  });

  // console.log(filterdList)

  if (filterdList.length === 0) {
    return null
  } else {
    // 時間を秒に変換
    time = filterdList[0][1].split(".")[0].split(":")
    return parseInt(time[0])*3600 + parseInt(time[1])*60 + parseInt(time[2])
  }
}

async function analizeString(str) {
  // appId取得
  let appId = await readFile("key/yahoo_api_key.txt")

  let ma = await getMorphologicalAnalysisResults(appId,str)
  let parser = new DOMParser()
  ma = parser.parseFromString(ma.responseText, "text/xml")
  let words = ma.getElementsByTagName("word")
  let wordList = []
  let wordList_noun = []
  let wordList_exception = []
  let wordList_impression_verb = []
  for(let itr of Object.keys(words)) {
    if(words[itr].children[0].innerHTML == "、" || words[itr].children[0].innerHTML == "。"){
    }else{
      if (words[itr].children[2].innerHTML == "名詞"){
        wordList_noun.push(words[itr].children[0].innerHTML)
      }else if(words[itr].children[2].innerHTML == "助詞" || words[itr].children[2].innerHTML == "特殊" || words[itr].children[2].innerHTML == "助動詞"){
         wordList_exception.push(words[itr].children[0].innerHTML)
      }
      if(words[itr].children[0].innerHTML !== " " && words[itr].children[0].innerHTML !== "　" && words[itr].children[0].innerHTML !== "\n"){
        wordList.push(words[itr].children[0].innerHTML)
      }
    }
  }
  // var merge_count = Object.assign(toCountDict(ngram(wordList_noun,1),1),toCountDict(ngram_exception_words(wordList,wordList_exception,2),2),toCountDict(ngram_exception_words(wordList,wordList_exception,3),3), toCountDict(ngram_exception_words(wordList,wordList_exception,4),4));
  let merge_count = toCountDict(ngram(wordList_noun,1),1);
  const MAX_N_GRAM = 10;
  for (let i = 2; i <= MAX_N_GRAM; i++) {
    pushTwoDimensionalArray(merge_count,toCountDict(ngram_exception_words(wordList,wordList_exception,i),i),0)
  }
  merge_count.sort((a, b) => b[1] - a[1]);
  for (let i = 1; i < merge_count.length; i++) {
    for (let j = 0; j < i; j++) {
      if (merge_count[j][0].indexOf(merge_count[i][0]) != -1) {
        merge_count.splice(i, 1);
        i--;
        break;
      }
    }
  }
  for (let i = merge_count.length-1; i >= 0; --i){
    merge_count[i][1] = merge_count[i][1] * 100 / merge_count[0][1]
  }
  let threshold = 0.75;
  merge_count = merge_count.slice(0,150);
  for(let i = 0; i < merge_count.length; i++){
    for (let j = i + 1; j < merge_count.length; j++) {
      if (merge_count[j][0].indexOf(merge_count[i][0]) >= 0) {
        if(merge_count[i][0].length / merge_count[j][0].length > threshold){
          merge_count[j][1] = merge_count[j][1] / 4;
        }
      }
    }
  }
  merge_count.sort((a, b) => b[1] - a[1]);
  console.log(merge_count)
  // 20以上のスコアのものだけ利用
    let filterd_merge_count = merge_count.filter(el => {
    return el[1] >= 20;
  })
  // 最大で10語まで返す
  if (filterd_merge_count.length >= 10) {
    filterd_merge_count = filterd_merge_count.slice(0, 10)
  }
  return filterd_merge_count
}

// タグを生成
async function showTags(tab, tagList){
  // 以前生成されたタグがあったら消しとく(うまくいかない)
  // chrome.tabs.sendMessage(tab.id, "clearTags");
  chrome.tabs.sendMessage(tab.id, ["showTags",await getCurrentURL(),tagList]);
  // // chrome.tabs.executeScript({
  // //   file: "clearTags.js"
  // // });
  // // タグを表示
  // chrome.tabs.executeScript(tab.id, {
  //   code: 'let currentURL = ' + JSON.stringify(await getCurrentURL()) + ';\
  //          let tagList = ' + JSON.stringify(tagList)
  //   }, () => {
  //     chrome.tabs.sendMessage(tab.id, "showTags");
  //   // chrome.tabs.executeScript(tab.id, {
  //   //   file: "showTags.js",
  //   // })
  // })
}

// タグを読み込み
async function loadTags(tab) {
  console.log("load tags.")
  tagList = JSON.parse(localStorage.getItem("prevTagList"))
  await showTags(tab, tagList)
}

// ページ遷移の結果同じ動画であればタグを読み込む
async function checkSamePageAndLoadTags(tab, info) {
  // ページ読み込み開始時には全部タグを消す
  // if (info["status"] === "loading") {
  //   chrome.tabs.executeScript({
  //     file: "clearTags.js"
  //   });
  //   return
  //   // どちらでもなければ何もしない
  // } else if (info["status"] !== "complete") {
  //   return
  // }
  // 読み込み中または読み込み完了ではない更新だったら
  if (!(info["status"] === "loading" || info["status"] === "complete")) {
    return
  }
  let currentURL = await getCurrentURL()
  let currentVideoID = ""
  if (currentURL.indexOf("&") === -1) {
    currentVideoID = currentURL.substring(currentURL.indexOf("v=")+2)
  } else {
    currentVideoID = currentURL.substring(currentURL.indexOf("v=")+2,currentURL.indexOf("&"))
  }

  // リロードして同じ動画であれば
  if (localStorage.getItem("prev_vid") === currentVideoID) {
    console.log("same movie")
    // 完了時にタグ読み込み
    if (info["status"] === "complete") {
      await loadTags(tab)
    }
  // 違う動画であれば
  } else {
    console.log("not same movie")
    // 読み込み中にはタグを全部消す
    if (info["status"] === "loading") {

      chrome.tabs.sendMessage(tab.id, "clearAllTags");
        // chrome.tabs.executeScript({
        //   // file: "clearAllTags.js"
        //   file: "clearTags.js"
        // });
    // 読み込み完了時に新しいURLをセットしタグを消す
    } else if (info["status"] === "complete") {
      localStorage.setItem("prev_vid", currentVideoID)
      localStorage.removeItem("prevTagList")
    }
  }
}

// GoogleのOAuth認証関連
// https://himakan.net/websites/how_to_google_oauth
// https://qiita.com/tkt989/items/8c0e316dcf8345efd0fb
// ログインダイアログを表示しコードを取得
async function getCode(client_id,redirect_uri,scope) {
  return new Promise(function(resolve) {

    chrome.identity.launchWebAuthFlow({
      url: 'https://accounts.google.com/o/oauth2/auth?response_type=code&client_id='+client_id+'&redirect_uri='+redirect_uri+'&scope='+scope+'&access_type=offline&approval_prompt=force',
      interactive: true
    }, responseUrl => {
      // console.log(responseUrl)
      let url = new URL(responseUrl)
      let code = url.searchParams.get("code")
      resolve(code)
    })
  })
}

// コードを利用してトークンとリフレッシュトークンを取得
async function getToken(code, client_id, client_secret, redirect_uri) {
  return new Promise(function(resolve) {
    let xhr = new XMLHttpRequest()
    xhr.open('POST', 'https://www.googleapis.com/oauth2/v4/token', true)
    let data = {  code: code,
                  client_id: client_id,
                  client_secret: client_secret,
                  redirect_uri: redirect_uri,
                  grant_type: "authorization_code",
                  access_type: "offline" }
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
    xhr.send(encodeHTMLForm(data))
    xhr.onreadystatechange = function() {
      if(xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
        parsedText = JSON.parse(xhr.responseText)
        resolve(parsedText)
      }
      else if (xhr.readyState == XMLHttpRequest.DONE && xhr.status != 200) {
        console.error(xhr)
        console.error(xhr.responseText)
        console.error("トークンが取得できませんでした.")
        resolve(null)
      }
    }
  })
}

// リフレッシュトークンを利用して更新
async function refreshToken(refresh_token, client_id, client_secret) {
  return new Promise(function(resolve) {
    let xhr = new XMLHttpRequest()
    xhr.open('POST', 'https://www.googleapis.com/oauth2/v4/token', true)
    let data = {  refresh_token: refresh_token,
                  client_id: client_id,
                  client_secret: client_secret,
                  grant_type: "refresh_token" }
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
    xhr.send(encodeHTMLForm(data))
    xhr.onreadystatechange = function() {
      if(xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
        parsedText = JSON.parse(xhr.responseText)
        resolve(parsedText)
      }
      else if (xhr.readyState == XMLHttpRequest.DONE && xhr.status != 200) {
        console.error(xhr)
        console.error(xhr.responseText)
        console.error("リフレッシュトークンの更新に失敗しました.")
        resolve(null)
      }
    }
  })
}


// Youtubeから字幕IDを取得
async function getYoutubeSubtitleID(video_id,api_key) {
  return new Promise(function(resolve) {
    let xhr = new XMLHttpRequest()

    xhr.open('GET', 'https://www.googleapis.com/youtube/v3/captions?part=snippet&fields=items&videoId='+video_id+'&key='+api_key, true)
    xhr.setRequestHeader('content-type', 'application/x-www-form-urlencoded')
    xhr.send(encodeHTMLForm())
    xhr.onreadystatechange = function() {
      if(xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
        parsedText = JSON.parse(xhr.responseText)
        let asr_text = null
        let foreign_text = null
        for(let itr of Object.keys(parsedText["items"])) {
          // 日本語の字幕があれば返す
          if (parsedText["items"][itr]["snippet"]["language"] === "ja" && parsedText["items"][itr]["snippet"]["trackKind"] === "standard") {
            // 日本語の手動字幕が一番
            resolve([parsedText["items"][itr]["id"],"ja"])
          } else if ( parsedText["items"][itr]["snippet"]["language"] === "ja" && parsedText["items"][itr]["snippet"]["trackKind"] === "ASR") {
            asr_text = parsedText["items"][itr]["id"]
          } else if (parsedText["items"][itr]["snippet"]["language"] === "en" || foreign_text === null) {
            // 英語だったらそちらを優先
            foreign_text = [parsedText["items"][itr]["id"], parsedText["items"][itr]["snippet"]["language"]]
          }
        }
        if (asr_text !== null) {
          resolve([asr_text,"asr"])
        } else if (foreign_text !== null) {
          resolve(foreign_text)
        } else {
          // 無ければ処理を行わない
          resolve(null)
        }
      }
      else if (xhr.readyState == XMLHttpRequest.DONE && xhr.status != 200) {
        console.error(xhr)
        console.error(xhr.responseText)
        console.error("字幕IDが取得できません.")
        resolve(null)
      }
    }
  })
}

// Youtubeから字幕を取得
async function getYoutubeSubtitle(movie_subtitle_id,api_key,access_token,need_translate) {
  return new Promise(function(resolve) {
    let xhr = new XMLHttpRequest()
    if (need_translate) {
      xhr.open('GET', 'https://www.googleapis.com/youtube/v3/captions/'+movie_subtitle_id+'?tfmt=ttml&tlang=ja&key='+api_key, true)
    } else {
      xhr.open('GET', 'https://www.googleapis.com/youtube/v3/captions/'+movie_subtitle_id+'?tfmt=ttml&key='+api_key, true)
    }
    xhr.setRequestHeader('Authorization', ' Bearer '+access_token)
    xhr.send(encodeHTMLForm())
    xhr.onreadystatechange = function() {
      if(xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
        // console.log(xhr)
        let parser = new DOMParser()
        xhr = parser.parseFromString(xhr.responseText, "text/xml")
        resolve(xhr)
      } else if (xhr.readyState == XMLHttpRequest.DONE && xhr.status != 200) {
        console.error(xhr)
        console.error(xhr.responseText)
        console.error("字幕情報がをとる許可がありません.")
        resolve(null)
      }
    }
  })
}

// 認証キーを取得・更新
async function googleIdenfity(client_id, client_secret, redirect_uri, scope, forceIdenfity) {
  // 認証キーを取る
  let refresh_token = localStorage.getItem("refresh_token")
  let token_expires_date = new Date(localStorage.getItem("token_expires_date"))

  if (localStorage.getItem("token_expires_date") === null || forceIdenfity) {
    // コードを取得(拡張機能初使用時)
    code = await getCode(client_id, redirect_uri, scope)
    localStorage.setItem("code_google",code)
    // トークンを取得
    token = await getToken(code, client_id, client_secret, redirect_uri)
    localStorage.setItem("access_token", token["access_token"])
    localStorage.setItem("refresh_token", token["refresh_token"])
    // トークンの有効期限セット(1時間)
    token_expires_date = new Date()
    token_expires_date.setSeconds(token_expires_date.getSeconds()+token["expires_in"])
    localStorage.setItem("token_expires_date", token_expires_date)
  }

  // トークンの有効期限が切れていたら
  if (token_expires_date.getTime() < new Date().getTime()) {
    // トークンを更新
    token = await refreshToken(refresh_token, client_id, client_secret)
    if (token === null) {
      return null
    }
    localStorage.setItem("access_token", token["access_token"])
    // 新トークンの有効期限セット
    let dt = new Date()
    dt.setSeconds(dt.getSeconds()+token["expires_in"])
    localStorage.setItem("token_expires_date", dt)
  }
}


async function getVideoID() {
  let video_url = await getCurrentURL()
  if (video_url === null) {
    return null
  }
  let video_id = ""
  if (video_url.indexOf("&") === -1) {
    video_id = video_url.substring(video_url.indexOf("v=")+2)
  } else {
    video_id = video_url.substring(video_url.indexOf("v=")+2, video_url.indexOf("&"))
  }
  return video_id
}

// 動画字幕を取得
async function getSubtitles(api_key) {
  let access_token = localStorage.getItem("access_token")
  // 動画の字幕ID
  let video_id = await getVideoID()
  if (video_id == null) {
    console.error("video_idが取得できません.")
    return null
  }
  const movie_subtitle_info = await getYoutubeSubtitleID(video_id, api_key)
  if (movie_subtitle_info === null) {
    console.error("movie_subtitle_idが取得できません.")
    return null
  }
  let movie_subtitle_id = movie_subtitle_info[0]
  if (movie_subtitle_info[1] === "asr") {
    console.warn("自動字幕を利用するためタグの精度が低い可能性があります")
  } else {
    console.warn("外国語字幕("+movie_subtitle_info[1]+")を翻訳するためタグの精度が低い可能性があります")
  }
  // ここで403エラーが発生する場合、その動画がサードパーティーの字幕投稿を許可していないかららしい
  // https://stackoverflow.com/questions/30653865/downloading-captions-always-returns-a-403
  let subTitleList = []
  let subTitleElements = await getYoutubeSubtitle(movie_subtitle_id, api_key, access_token, movie_subtitle_info[1]==="fo")
  if (subTitleElements === null) {
    return null
  } else {
    subTitleElements = subTitleElements.getElementsByTagName("p")
    for(let itr of Object.keys(subTitleElements)) {
      outerHTML = subTitleElements[itr].outerHTML
      l = []
      l.push(subTitleElements[itr].innerHTML.replace(/<.*?>/g, ''))
      l.push(outerHTML.substring(outerHTML.indexOf("begin=")+7, outerHTML.indexOf("begin=")+19))
      l.push(outerHTML.substring(outerHTML.indexOf("end=")+5, outerHTML.indexOf("end=")+17))
      subTitleList.push(l)
    }
    console.log(subTitleList)
  }
  return subTitleList
}

// コメント取得
async function getComments(api_key,max_results) {
  let video_id = await getVideoID()
  if (video_id == null) {
    console.error("video_idが取得できません.")
    return null
  }
    return new Promise(function(resolve) {
    let xhr = new XMLHttpRequest()
    xhr.open('GET', 'https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&fields=items/snippet/topLevelComment/snippet/textOriginal&videoId='+video_id+'&key='+api_key+'&maxResults='+max_results+'&order=relevance', true)

    xhr.setRequestHeader('content-type', 'application/x-www-form-urlencoded')
    xhr.send(encodeHTMLForm())
    xhr.onreadystatechange = function() {
      if(xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
        let parsedXhr = JSON.parse(xhr.responseText)
        let list = []
        for(let itr of Object.keys(parsedXhr["items"])) {
          list.push(parsedXhr["items"][itr]["snippet"]["topLevelComment"]["snippet"]["textOriginal"])
        }
        console.log(list)
        resolve(list)
      }
      else if (xhr.readyState == XMLHttpRequest.DONE && xhr.status != 200) {
        console.error(xhr)
        console.error(xhr.responseText)
        console.error("コメントを取得できません.")
        resolve(null)
      }
    }
  })
}

// 翻訳(Google Apps Script利用)
async function doTranslate(str) {
  return new Promise(function(resolve) {
    let xhr = new XMLHttpRequest()
    xhr.open('POST', "https://script.google.com/macros/s/AKfycbyCl1i6R5VVdzJ4NO4ydpizaa27K9JS_6JZTTDMd9w9WnuJFeM/exec", true)
    data = { text:   str,
            target: "ja" }
    xhr.setRequestHeader('content-type', 'application/x-www-form-urlencoded')
    xhr.send(encodeHTMLForm(data))
    xhr.onreadystatechange = function() {
      if(xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
        // let parsedXhr = JSON.parse(xhr.responseText)
        resolve(xhr.responseText)
      }
      else if (xhr.readyState == XMLHttpRequest.DONE && xhr.status != 200) {
        console.error(xhr)
        console.error(xhr.responseText)
        console.error("翻訳に失敗しました.")
        resolve(null)
      }
    }
  })
}

// ライブチャット取得
async function getLiveChat(live_chat_id) {
  return new Promise(function(resolve) {
    let access_token = localStorage.getItem("access_token")
    let xhr = new XMLHttpRequest()
    // xhr.open('GET', 'https://www.googleapis.com/youtube/v3/liveChat/messages?part=snippet&liveChatId=razqq6dAieE', true)
    xhr.open('GET', 'https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet&liveChatId=razqq6dAieE', true)
    xhr.setRequestHeader('Authorization', ' Bearer '+access_token)
    xhr.send(encodeHTMLForm())
    xhr.onreadystatechange = function() {
      if(xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
        let parser = new DOMParser()
        xhr = parser.parseFromString(xhr.responseText, "text/xml")
        resolve(xhr)
      }
      else if (xhr.readyState == XMLHttpRequest.DONE && xhr.status != 200) {
        console.error(xhr)
        console.error(xhr.responseText)
        console.error("チャット情報がをとる許可がありません.")
        resolve(null)
      }
    }
  })
}

async function main(tab) {
  // URLを保存
  // localStorage.setItem("current_url",await getCurrentURL())
  // https://console.developers.google.com にて生成
  const client_id = await readFile("key/client_id.txt")
  const client_secret = await readFile("key/client_secret.txt")
  // chromeアプリのIDを利用
  const redirect_uri = "https://"+await getExtensionID()+".chromiumapp.org"
  console.log(redirect_uri)
  // https://kiahobelgfhachbmpbmkijpgokajlnii.chromiumapp.org
  // 許可するスコープ
  const scope = "https://www.googleapis.com/auth/youtube.force-ssl"

  // APIキー
  const api_key = await readFile("key/youtube_api_key.txt")

  // 認証
  if (await googleIdenfity(client_id, client_secret, redirect_uri, scope, false) === null) {
    if (await googleIdenfity(client_id, client_secret, redirect_uri, scope, true) === null) {
      console.error("認証に失敗しました")
      return null
    }
  }

  // 最終的に食わせる文字列
  let str = ""

  // コメント取得
  let comment = ""
  let commentsList = await getComments(api_key,20)
  if (commentsList !== null) {
    for(let itr of Object.keys(commentsList)) {
      comment += commentsList[itr] + " "
    }
    // console.log(comment)
    comment.replace("\n"," ")
    comment = await doTranslate(comment) + "\n"
    str += comment
  }

  // 字幕取得
  let subTitleList = await getSubtitles(api_key)

  let subTitle = ""
  if (subTitleList === null) {
    console.error("字幕の取得に失敗しました.")
  } else {
    // 字幕から1文に作成
    for(let itr of Object.keys(subTitleList)) {
      subTitle += subTitleList[itr][0] + "\n"
    }
    // console.log(subTitle)
    subTitle.replace("\n"," ")
    str += subTitle
  }

  let tagList = await createTagList(await getKeywordAndParse(str) , await analizeString(str), subTitleList)
  // タグの保存と表示
  console.log(tagList)
  localStorage.setItem("prevTagList", JSON.stringify(tagList))
  await showTags(tab, tagList)
  // // Youtube Live Chat 取得
  // let liveChatList = await getLiveChat()
  // console.log(liveChatList)
}

//
// chrome.browserAction.onClicked.addListener(function(tab) {
//   console.log("chrome.browserAction.onClicked")
//   // addListenerをawaitにできないのでこれで代用
//   main(tab)
//   return
// })
function onClickedAnalyze() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    console.log("onclickedAnalyze")
    console.log(tabs)
    main(tabs[0])
  })
}

// 別動画に遷移したときに，表示していたタグを削除
chrome.tabs.onUpdated.addListener((tabid, info, tab) => {
  // console.log(info)
  // ページ読み込み完了時に前のURLと同じであればタグをロードする
  checkSamePageAndLoadTags(tab, info)
});


// https://qiita.com/january108/items/5388799531c1ace8324e
function clickedWordCloud() {
  var DATA_FILE_PATH = './tmp.json'; // 読み込みデータファイル
  var TARGET_ELEMENT_ID = '#cloud'; // 描画先
  let tagList = JSON.parse(localStorage.getItem("prevTagList"))
  console.log(tagList)
  let data = "["
  for(itr of Object.keys(tagList)) {
    data += "{" + '"word":"' + tagList[itr][0] +'","count":'+ tagList[itr][1] +'}'
    if (itr != tagList.length-1) {
      data += ','
    }
  }
  data += "]"
  data = JSON.parse(data)
  // d3.json(DATA_FILE_PATH).then(function(data) { // v5
  var h = 490;
  var w = 600;

  var random = d3.randomIrwinHall(2);
  var countMax = d3.max(data, function(d){ return d.count} );
  var sizeScale = d3.scaleLinear().domain([0, countMax]).range([10, 100])

  var words = data.map(function(d) {
    return {
    text: d.word,
    size: sizeScale(d.count) //頻出カウントを文字サイズに反映
    };
  });

  d3.layout.cloud().size([w, h])
    .words(words)
    .rotate(function() { return (~~(Math.random() * 6) - 3) * 30; })
    .font("Impact")
    .fontSize(function(d) { return d.size; })
    .on("end", draw) //描画関数の読み込み
    .start();

  // wordcloud 描画
  function draw(words) {
    d3.select(TARGET_ELEMENT_ID)
      .append("svg")
        .attr("class", "ui fluid image") // style using semantic ui
        .attr("viewBox", "0 0 " + w + " " + h )  // ViewBox : x, y, width, height
        .attr("width", "100%")    // 表示サイズの設定
        .attr("height", "100%")   // 表示サイズの設定
      .append("g")
        .attr("transform", "translate(" + w / 2 + "," + h / 2 + ")")
      .selectAll("text")
        .data(words)
      .enter().append("text")
        .style("font-size", function(d) { return d.size + "px"; })
        .style("font-family", "Impact")
        .style("fill", function(d, i) { return d3.schemeCategory10[i % 10]; })
        .attr("text-anchor", "middle")
        .attr("transform", function(d) {
          return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
        })
        .text(function(d) { return d.text; });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('analyze').addEventListener('click', onClickedAnalyze);
  document.getElementById('word-cloud').addEventListener('click', clickedWordCloud);
  // document.getElementById('info').addEventListener('click', clickedInfo);
});