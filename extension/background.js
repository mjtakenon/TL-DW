
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

// タグを生成
async function showTags(tab, str){
  // appId取得
  let appId = await readFile("key/yahoo_api_key.txt")
  // キーワード取得
  let res = await getKeyword(appId,str)
  res = JSON.parse(res.responseText)
  // console.log(res)
  // タグを表示
  chrome.tabs.executeScript(tab.id, {
    code: 'let res = '+JSON.stringify(res)
  }, () => {
    chrome.tabs.executeScript(tab.id, {
      file: "showTags.js",
    })
  })

  let ma = await getMorphologicalAnalysisResults(appId,str)
  let parser = new DOMParser()
  ma = parser.parseFromString(ma.responseText, "text/xml")

  let words = ma.getElementsByTagName("word")
  let wordList = []
  for(let itr of Object.keys(words)) {
    l = []
    l.push(words[itr].children[0].innerHTML)
    l.push(words[itr].children[2].innerHTML)
    wordList.push(l)
  }
  console.log(wordList)
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
    let data = {
                  refresh_token: refresh_token,
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

    xhr.open('GET', 'https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId='+video_id+'&key='+api_key, true)
    xhr.setRequestHeader('content-type', 'application/x-www-form-urlencoded')
    xhr.send(encodeHTMLForm())
    xhr.onreadystatechange = function() {
      if(xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
        parsedText = JSON.parse(xhr.responseText)
        let asr_text = null
        for(let itr of Object.keys(parsedText["items"])) {
          // 日本語の字幕があれば返す
          if( parsedText["items"][itr]["snippet"]["language"] === "ja" &&
            parsedText["items"][itr]["snippet"]["trackKind"] === "ASR") {
              asr_text = parsedText["items"][itr]["id"]
            }
          if( parsedText["items"][itr]["snippet"]["language"] === "ja" &&
              parsedText["items"][itr]["snippet"]["trackKind"] === "standard") {
            resolve(parsedText["items"][itr]["id"])
          }
        }
        if (asr_text !== null) {
          resolve(asr_text)
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
async function getYoutubeSubtitle(movie_subtitle_id,api_key,access_token) {
  return new Promise(function(resolve) {
    let xhr = new XMLHttpRequest()
    xhr.open('GET', 'https://www.googleapis.com/youtube/v3/captions/'+movie_subtitle_id+'?tfmt=ttml&key='+api_key, true)
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
        console.error("字幕情報がをとる許可がありません.")
        resolve(null)
      }
    }
  })
}

// 認証キーを取得・更新
async function googleIdenfity(client_id, client_secret, redirect_uri, scope) {
  // 認証キーを取る
  let refresh_token = localStorage.getItem("refresh_token")
  let token_expires_date = new Date(localStorage.getItem("token_expires_date"))

  if (localStorage.getItem("token_expires_date") === null) {
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
  const movie_subtitle_id = await getYoutubeSubtitleID(video_id, api_key)
  if (movie_subtitle_id === null) { 
    console.error("movie_subtitle_idが取得できません.")
    return null
  }
  // ここで403エラーが発生する場合、その動画がサードパーティーの字幕投稿を許可していないかららしい
  // https://stackoverflow.com/questions/30653865/downloading-captions-always-returns-a-403
  let subTitleList = []
  let subTitleElements = await getYoutubeSubtitle(movie_subtitle_id, api_key, access_token)
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
    xhr.open('GET', 'https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId='+video_id+'&key='+api_key+'&maxResults='+max_results+'&order=relevance&&fields=items/snippet/topLevelComment/snippet/textOriginal', true)
    
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
  if (await googleIdenfity(client_id, client_secret, redirect_uri, scope) === null) {
    console.error("認証に失敗しました")
    return null
  }

  // 字幕取得
  let subTitleList = await getSubtitles(api_key)
  let subTitle = ""
  if (subTitleList === null) {
    console.error("字幕の取得に失敗しました.")
    return null
  } else {
    // 字幕から1文に作成
    for(let itr of Object.keys(subTitleList)) {
      subTitle += subTitleList[itr][0] + "\n"
    }
  
    console.log(subTitle)
  }


  // コメント取得
  commentsList = await getComments(api_key,20)
  let comment = ""
  for(let itr of Object.keys(commentsList)) {
    comment += commentsList[itr] + "\n"
  }
  console.log(comment)
  showTags(tab,subTitle+comment)
  // // Youtube Live Chat 取得
  // let liveChatList = await getLiveChat()
  // console.log(liveChatList)
}
//
chrome.browserAction.onClicked.addListener(function(tab) {
  console.log("chrome.browserAction.onClicked")
  // addListenerをawaitにできないのでこれで代用
  main(tab)
  // 拡張機能のID表示

  console.log()
  // str = "桃から生まれたポテト侍"
  // showTags(tab, str)
  return;
})

// 別動画に遷移したときに，表示していたタグを削除
chrome.tabs.onUpdated.addListener((tabid, info, tab) => {
  chrome.tabs.executeScript({
    file: "clearTags.js"
  });
});