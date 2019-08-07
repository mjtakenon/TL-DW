
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
    }
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
    }
  })
}



// タグを生成
async function getTags(tab, str){
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
        console.log(parsedText)
        for(let itr of Object.keys(parsedText["items"])) {
          // 日本語の字幕があれば返す
          if(parsedText["items"][itr]["snippet"]["language"] === "ja") {
            resolve(parsedText["items"][itr]["id"])
          }
        }
        // 無ければ処理を行わない
        resolve(false)
      }
    }
  })
}

// Youtubeから字幕を取得
async function getYoutubeData(movie_subtitle_id,api_key,access_token) {
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
    }
  })
}


// 動画字幕を取得
async function getSubtitles() {
  // https://console.developers.google.com にて生成
  const client_id = await readFile("key/client_id.txt")
  const client_secret = await readFile("key/client_secret.txt")
  // chromeアプリのIDを利用
  const redirect_uri = "https://lopgmmlmjfellhcdgdbjpdflolgffkei.chromiumapp.org"
  // 許可するスコープ
  const scope = "https://www.googleapis.com/auth/youtube.force-ssl"

  // APIキー
  const api_key = await readFile("key/youtube_api_key.txt")

  // 認証キーを取る
  let access_token = localStorage.getItem("access_token")
  let refresh_token = localStorage.getItem("refresh_token")
  let token_expires_date = new Date(localStorage.getItem("token_expires_date"))

  if (token_expires_date === null) {
    // コードを取得(拡張機能初使用時)
    code = await getCode(client_id, redirect_uri, scope)
    localStorage.setItem("code_google",code)
    // トークンを取得
    token = await getToken(code, client_id, client_secret, redirect_uri)
    console.log(token)
    localStorage.setItem("access_token", token["access_token"])
    localStorage.setItem("refresh_token", token["refresh_token"])
    // トークンの有効期限セット(1時間)
    token_expires_date = new Date()
    token_expires_date.setSeconds(dt.getSeconds()+token["expires_in"])
    localStorage.setItem("token_expires_date", token_expires_date)
  }

  // トークンの有効期限が切れていたら
  if (token_expires_date.getTime() < new Date().getTime()) {
    // トークンを更新
    token = await refresh_token(refresh_token, client_id, client_secret)
    localStorage.setItem("access_token", token["access_token"])
    // 新トークンの有効期限セット
    let dt = new Date()
    dt.setSeconds(dt.getSeconds()+token["expires_in"])
    localStorage.setItem("token_expires_date", dt)
  }
  
  // 動画の字幕ID
  let video_url = await getCurrentURL()
  let video_id = ""
  if (video_url.indexOf("&") === -1) {
    video_id = video_url.substring(video_url.indexOf("v=")+2)
  } else {
    video_id = video_url.substring(video_url.indexOf("v=")+2, video_url.indexOf("&"))
  }
  const movie_subtitle_id = await getYoutubeSubtitleID(video_id, api_key)
  if (movie_subtitle_id === false) { 
    console.log("日本語の字幕は取得できませんでした.")
    return
  }
  // ここで403エラーが発生する場合、その動画がサードパーティーの字幕投稿を許可していないかららしい
  // https://stackoverflow.com/questions/30653865/downloading-captions-always-returns-a-403
  let subTitleElements = await getYoutubeData(movie_subtitle_id, api_key, access_token)
  subTitleElements = subTitleElements.getElementsByTagName("p")
  var subTitleList = []
  for(let itr of Object.keys(subTitleElements)) {
    outerHTML = subTitleElements[itr].outerHTML
    l = []
    l.push(subTitleElements[itr].innerHTML)
    l.push(outerHTML.substring(outerHTML.indexOf("begin")+7, outerHTML.indexOf("begin")+19))
    l.push(outerHTML.substring(outerHTML.indexOf("end")+5, outerHTML.indexOf("end")+17))
    subTitleList.push(l)
  }
  console.log(subTitleList)
  // console.log(subTitleList[0])
}

// 
chrome.browserAction.onClicked.addListener(function(tab) {
  console.log("chrome.browserAction.onClicked")
  getSubtitles()

  // dammy data
  // const str = "私は元NHK職員、NHKから国民を守る党代表の政治家YouTuber立花孝志でございます。今からまぁまぁ面白い政見放送をしますので、みなさん録画をしてYouTubeにアップロードしてください。この放送に著作権は無いのでどんどんYouTubeにアップロードして拡散してください。NHKから国民を守る党の公約はただ一つ、それはもちろん「NHKをぶっ壊す！」でございます。さぁ、テレビの前のあなたもご一緒に、NHKをぶっ壊す！スタジオにいるNHK職員のみなさんもご一緒にNHKをぶっ壊す！やるわけないですね。NHKをぶっ壊すとは、NHKに受信料を支払わない方には、NHKの電波をストップするということです。専門的な言葉を使うとNHKスクランブル放送の実現です。NHKをぶっ壊す！なぜNHKをぶっ壊さないといけないのか。それはNHKの男女のアナウンサーが不倫路上カーセックスをしたのにNHKはその事実を隠蔽しているからです。みなさん、不倫、路上、カーセックスですよ。夕方のまるごと山梨というニュース番組のキャスターをしていた男性アナウンサーと女子アナが放送終了後、不倫路上カーセックスをしていた事実を写真週刊誌が報道しました。しかし、NHKはいまだにこの事件を隠蔽しているのです。3年前の出来事です。男性アナウンサーはそのまま今もNHKの職員をしておりますが、女性アナウンサーの方はクビになっているようです。これは明らかにセクハラでもありますし、パワハラですよね。こんな不祥事をNHKはいまだに視聴者に説明をせず、事件発覚の翌日に不倫路上カーセックスをしたキャスター2人を降板させ、不倫路上カーセックスをしていないと思われるキャスターに差し替えました。キャスターを差し替えた理由を視聴者に説明せず、まぁよくもこんな重大な事件を視聴者に説明もせず、しれーっといてられるなと思います。不倫ですよ。路上ですよ。カーセックスですよ。みなさん許せますか。もう一回言いますよ。不倫ですよ。路上ですよ。カーセックスですよ。まだ言いますよ。不倫路上、カーセックスですよ。とにかく不倫路上カーセックスを隠蔽しているNHKをぶっ壊す！私は2005年にNHKを退職して以来10年間、NHKに受信料を支払っていません。NHKから20万円ぐらいの請求書が届いていますが、全て踏み倒しています。もちろん、NHKから国民を守る党所属の27名の現職政治家も全員、NHK受信料を支払っていません。NHKの受信料を不払いしていても政治家ができるのです。さぁ、あなたも一緒にNHK受信料を踏み倒しましょう。NHKをぶっ壊す！もうすでにNHKの受信料を支払っているというあなたも遅くありません。銀行などの自動引き落としでお支払いのあなたも大丈夫です。NHK受信料を不払いする方法をご紹介させていただきますね。まず、NHKフリーダイヤル0120151515に電話してあなたの住所とお名前、電話番号を伝えてください。そして、自動引き落としから継続振込に変更してください。これだけ言えばOKです。そうすると自動引き落としは止まり、NHKから納付書が送られてきますが、そのまま無視してください。NHKの受信料を支払わなかったら、集金人がやってきて怖いとお考えの方、たくさんいらっしゃると思います。でも大丈夫です。NHK撃退シールというものがあります。NHK集金人の訪問がピタリと止まるNHK撃退シール、全国のみなさまに無料でお配りをさせていただいております。また、私、立花孝志の名前を使ってください。NHK集金人には、私の名前を言うだけで「立花さんに電話しますよ」って言うだけで逃げていきます。詳しくはその理由についてYouTubeをご覧いただきたいと思いますが、NHK受信料不払い専用コールセンターというのも私ども、NHKから国民を守る党には準備がございます。東京03-3696-0750こちらの方にお電話いただければ、朝の10時から夜中の11時まで5人のオペレーターが受信料不払いをサポートさせていただきます。NHKをぶっ壊す！いやぁ、このね、NHKのスタジオでNHKの受信料の不払い、受信料を踏み倒す方法をね、このスタジオで大きな声で言える。そして、これが全国のNHK、全国のテレビで流れ、さらにそれがYouTubeで何度も何度も再生される。楽しいな。もうね、NHK潰れるでしょ。ぜひ一緒にNHKをぶっ壊していきましょう。NHKをぶっ壊す！みなさんはスマートフォンをお持ちですか。私は現在51歳です。2年ほど前からスマホを利用していますが、便利ですよね。でもなんと、NHKはこのスマートフォン、iPhoneもそうですよ、ワンセグだけじゃないんです。スマホ、iPhoneも含めてパソコン、インターネットから受信料を取ろうとしています。今年、NHKのこのインターネットでNHKの放送を流すという法律が国会を通過しました。来年からはNHKの放送がみなさんのスマホやパソコンでも流れるようになります。無茶苦茶なんですよ。これね、悪いのは国会議員です。いわゆる既成政党に所属している国会議員がNHKのこのような無茶苦茶な要求をそのまま鵜呑みにしているというか、それをそのまま受けて国会でNHKの言うことをそのまま承認している状態です。だからみなさん、選挙に行ってもらわなきゃいけないんです。ぜひ、スマホやパソコンから受信料を取ろうとしているNHKをみなさんと一緒に潰していきたいと思います。NHKをぶっ壊す！そして、NHKを応援している国会議員をぶっ壊す！さて、今回NHKから国民を守る党から立候補している約40名の候補者、NHKから国民を守る党に所属している27名の現職政治家は、そのほとんどがエリートではありません。代表の私を筆頭に大学を卒業していない者が大半で、中には前科者もおります。いわゆる庶民の集まりです。一方で今のに日本の政治家は一流大学を卒業したエリートと呼べる人たちがほとんどです。頭の良いエリートが国会に集まってやっていることといえば、消費税の増税とかNHKの受信料を無理やり払わせる法律を作ったりと、先ほど申し上げた通りスマホでも受信料を取ろうとしている。ろくなことしてません。誰がスマートフォンでNHKの番組を観たがってるんですか。スマホで受信料を取る前に、国会議員は国民の声を直接聞いたらどうですか。NHKの受信料制度こそ、国民投票して決めるべきだと思います。NHKをぶっ壊す！スクランブル放送とはNHKに受信料を支払わない人に、NHKの番組をストップすることです。つまり、水道や電気、携帯電話と同じように料金を支払わなければ、その人にはそのサービスを止め、ストップする。NHKもそうすればいいのです。水が止まれば命が止まる、電気が止まれば熱中症になって倒れる人がでます。携帯電話が止まれば仕事や日常生活、災害時にも影響が出ます。NHKの放送なんて観れなくても誰も困りません。だから国会議員はNHKを観たくない人の権利を保障するために、直ちにスクランブル放送の実現に取り組むべきだと考えます。NHKをぶっ壊す！このインターネット時代、全ての国民から受信料を払わせようとしている国会議員、あまりにも時代遅れです。というよりも庶民の気持ちをあまりに理解できていません。NHKから国民を守る党は今夏の参議院選挙、令和の百姓一揆と銘打って選挙戦を戦ってまいります。エリート国会議員がお代官様で、我々庶民が百姓です。デフレで景気が悪いのに消費税を増税する、ワンセグ機能付き携帯電話と普通のテレビで同じ、同額の受信料だ。インターネットからも受信料を奪い取る。ホテルの客室は全室、受信料を払え。もういい加減にしてくださいませお代官様。そんな理不尽なお金、我々庶民は払いたくないし、払えないんです。さぁ、令和の時代に生きている庶民のみなさん、桑や鎌をスマートフォンに持ち替えて、投票という百姓一揆を起こしましょう。私が令和の大塩平八郎となって、みなさんの先頭に立たせていただきます。NHKをぶっ壊す！国会では官僚や政治家が嘘ばかりついています。私は政治家YouTuberとして森友事件の取材をしています。以前、事件発覚3ヶ月後に森友学園の園長の籠池さんと面会し、昨年3月には安倍昭恵総理夫人から直接ご連絡をいただき、森友事件について意見交換をさせていただいております。事件の当事者と思われているお二人から直接お話をお伺いしても全く事件の真相に迫ることができません。おそらく、森友学園の顧問弁護士だったSY弁護士が事件の真相を知っているはずなのに、国会も大阪府議会も森友学園の顧問弁護士だったSY弁護士を参考人としていまだに呼び出しません。政治家が真相の究明をしないから、財務省ノンキャリアの真面目な職員が自殺をされてしまったと思います。悲しすぎます。昭恵夫人も悲しんでおられました。心の病を経験した私から一言、しんどい時は休んだらいいんです。必ず元気になって世の中の役に立てる日がやってきます。ゆっくり休んでください。私は14年前までこのNHK渋谷放送センター、その辺で働いていました。私が正義感に駆られ、NHKの数々の不正経理について週刊文春で内部告発したら、上司や同僚などにこのNHK局内でいじめられました。私は子供の時に親や学校の先生に、悪いことを見つけたら注意しないといけないとか、悪いことをしたら謝らないといけないと教わりました。なぜ大人は悪いことをしても隠すのですか。正直に謝らないんですか。どうして正直に謝ろうとしている人が心の病になって自殺しなければいけないんですか。「大人になれよ」って上司や先輩から、悪魔のささやきによって正直に生きていた子供が嘘をつく大人に変わってしまうのだと思います。そして嘘をつく人間が出世し、正直者が心の病になって自殺、おかしいじゃないですか。私は他人から「ありがとう」と言われると幸せな気分になります。「ありがとう」と言われるのがうれしいと感じる人が政治家をすればいいと思います。私は大学を卒業していない馬鹿な庶民ですが、エリートといわれる政治家や官僚よりも優れている部分があります。それは弱い者いじめをしないという正義感であり、失敗を他人のせいにしない責任感であり、公のために尽くしたいという使命感です。正義感、責任感と使命感の強い人間が今の日本の政治には必要です。私をはじめ、NHKから国民を守る党の人間はNHKから被害を受けておられる国民を全力で命がけでお守りさせていただきます。他人から「ありがとう」と言われると涙があふれてくる人間の集まり、それがNHKから国民を守る党です。また、NHKから国民を守る党は「ごめんなさい」と言える人間の集まりです。政治家は失敗や悪いことをしても、「ごめんなさい」と言わず、「遺憾です」とか「申し訳ございません」としか言いません。間違った時に素直に「ごめんなさい」と言える人が政治家をすればいいと思います。NHKをぶっ壊す！私はNHKが大好きです。私はNHKが大好きだからこそ、NHKを叱っているのです。今のNHKは公共放送の役割や使命を果たしていません。NHK職員は公共放送の役割や使命を理解して仕事をしてください。NHKをぶっ壊す！今回の参議院選挙ではまだ選挙権が無いお子さまやお孫さんの意見を参考にしながらぜひ、NHKから国民を守る党の候補者に投票していただくようお願い申し上げて私の挨拶とさせていただきます。それではみなさんご一緒に、NHKをぶっ壊す！目の前の子どもたち、おじさんと一緒にNHKを・・・。お茶の間のみなさん、ぜひこの「NHKをぶっ壊す」決して危険な言葉ではありません。NHKに対して国民の思い、怒り、愛情を込めて、ぜひこの「NHKをぶっ壊す！」というワードを全国に広めていただきたいと思います。最後にもう一度、NHKを"
  // getTags(tab,str)

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