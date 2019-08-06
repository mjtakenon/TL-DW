# 参考
# http://watagassy.hatenablog.com/entry/2018/10/08/132939
# https://qiita.com/kihoair/items/3a50454bae6c6bc6a2d6

# ここよりコピペ
# http://kawami.hatenablog.jp/entry/2018/07/30/224512
# TODO 動くようにする
from urllib import request as urllib
import json
import datetime
import requests
import codecs
from urllib.error import HTTPError

oauthuri = "https://accounts.google.com/o/oauth2/auth?client_id=[client_id]&redirect_uri=[redirect_uri]&scope=https://www.googleapis.com/auth/youtube.force-ssl&response_type=code&access_type=offline"

key = "[key]"
access_token = "[access_token]"
_refresh_token = "[refresh_token]"


def get_access_token():
    url = "https://accounts.google.com/o/oauth2/token"
    s = requests.Session()
    params = {"code": input("code>>"),
              "client_id": input("client_id>>"),
              "client_secret": input("client_secret>>"),
              "redirect_uri": input("redirect_uri>>"),
              "grant_type": "authorization_code"}
    r = s.post(url, data=params)
    print(r.text.encode("utf-8"))


def refresh_token():
    url = "https://accounts.google.com/o/oauth2/token"
    s = requests.Session()
    params = {"client_id": input("client_id>>"),
              "client_secret": input("client_secret>>"),
              "refresh_token": _refresh_token,
              "grant_type": "refresh_token"}
    r = s.post(url, data=params)
    print(r.text.encode("utf-8"))


def get_youtube_caption(ch, term_start, term_end, next):
    # チャンネルの指定期間内の動画一覧を取得
    video_id_list = []
    request = urllib.urlopen(
        "https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCaption=closedCaption&channelId=" + ch + term_start + term_end +
        "&maxResults=50&key=" + key + "&pageToken=" + next)
    response = request.read() 
    data = json.loads(response) 

    for d in data["items"]:
        if "videoId" in d["id"]:
            video_id_list.append(d["id"]["videoId"])
    if "nextPageToken" in data:
        next_page_token = data["nextPageToken"]
    else:
        next_page_token = ""

    # 取得した動画の字幕一覧を取得
    caption_id_list = []
    for video_id in video_id_list:
        request = urllib.urlopen(
            "https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=" + video_id + "&key=" + key)
        response = request.read()
        data = json.loads(response)
        for item in data["items"]:
            lang = item["snippet"]["language"]
            trackKind = item["snippet"]["trackKind"]  # "standard" -> manual, "ASR" -> auto
            # Sorry, Japanese Only.
            if lang == "ja" and trackKind == "standard":
                caption_id = item["id"]
                caption_id_list.append(caption_id)

    # 字幕をダウンロード
    caption_data = []
    for caption_id in caption_id_list:
        headers = {"Authorization": " Bearer " + access_token}
        request = urllib.Request(
            url="https://www.googleapis.com/youtube/v3/captions/" + caption_id + "?tfmt=ttml&key=" + key,
            headers=headers)
        try:
            request = urllib.urlopen(request)
            response = request.read()
            data = codecs.decode(response)
            caption_data.append((caption_id, data))
        except HTTPError as e:
            print("error{}".format(e.headers))

    return next_page_token, caption_data


def write(outputdir, caption_list):
    for caption_id, caption in caption_list:
        with open("{}/{}.ttml".format(outputdir, caption_id), "wt", encoding="utf-8") as f:
            f.write(caption)
            f.flush()


if __name__ == '__main__':
    outputdir = "./resources/kizunaai" # 出力先ディレクトリ
    channel_id = "UC4YaOt1yT-ZeyB0OmxHgolA" # 取得するチャンネルID
    num = 36
    date = datetime.datetime.now()
    for i in range(num):
        before = "&publishedBefore=" + date.strftime("%Y-%m-%dT%H:%M:%S.000Z")
        date = date - datetime.timedelta(weeks=4)
        after = "&publishedAfter=" + date.strftime("%Y-%m-%dT%H:%M:%S.000Z")
        next = ""
        while True:
            next, captions = get_youtube_caption(channel_id, after, before, next)
            write(outputdir, captions)
            if next == "":
                break