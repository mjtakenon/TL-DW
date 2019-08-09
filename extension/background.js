

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

// 語句が出てくる動画の時間を検索する
function searchTime(word, subTitleList) {
  // 2つの語句をつなげたもの
  let subTitleListConnect = []
  for(let itr = 0; itr < subTitleList.length-1; itr++) {
    subTitleListConnect.push([subTitleList[itr][0] + subTitleList[itr+1][0],subTitleList[itr][1],itr])
  }
  
  // 単語でフィルタリング
  var filterdList = subTitleListConnect.filter(function(element) {
    return (element[0].indexOf(word) !== -1)
  });

  // console.log(filterdList)

  if (filterdList === []) { 
    return null
  } else {
    // 時間を秒に変換
    time = filterdList[0][1].split(".")[0].split(":")
    return time[0]*3600 + time[1]*60 + time[2]
  }
}


// タグを生成
async function showTags(tab, str, subTitleList){
  // appId取得
  let appId = await readFile("key/yahoo_api_key.txt")
  // キーワード取得
  let res = await getKeyword(appId,str)
  res = JSON.parse(res.responseText)

  // タグを表示
  // chrome.tabs.executeScript(tab.id, {
  //   code: 'let res = '+JSON.stringify(res)
  // }, () => {
  //   chrome.tabs.executeScript(tab.id, {
  //     file: "showTags.js",
  //   })
  // })

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
  console.log(merge_count)
  // console.log(toCountDict(wordList_noun))
  // 旧解析
  //   let words = ma.getElementsByTagName("word")
  //   let wordList = []
  //   for(let itr of Object.keys(words)) {
  //     l = []
  //     l.push(words[itr].children[0].innerHTML)
  //     l.push(words[itr].children[2].innerHTML)
  //     wordList.push(l)
  //   }
  //   console.log(wordList)

  // タグを表示
  // chrome.tabs.executeScript(tab.id, {
  //   code: 'let res = '+JSON.stringify(res)
  //   }, () => {
  //   chrome.tabs.executeScript(tab.id, {
  //     file: "showTags.js",
  //   })
  // })

  // searchTime("", subTitleList)

  // console.log(res)
  
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
    console.error("認証に失敗しました")
    return null
  }

  // 最終的に食わせる文字列
  let str = ""

  // コメント取得
  let comment = ""
  commentsList = await getComments(api_key,20)
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

  showTags(tab, str, subTitleList)
  // // Youtube Live Chat 取得
  // let liveChatList = await getLiveChat()
  // console.log(liveChatList)
}
//
chrome.browserAction.onClicked.addListener(function(tab) {
  console.log("chrome.browserAction.onClicked")
  // addListenerをawaitにできないのでこれで代用
  main(tab)
  return;
})

// 別動画に遷移したときに，表示していたタグを削除
chrome.tabs.onUpdated.addListener((tabid, info, tab) => {
  chrome.tabs.executeScript({
    file: "clearTags.js"
  });
});

