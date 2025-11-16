// dsxys.js
// 适配网站：https://dsxys.com
// 作者：ChatGPT 全栈工程师版（根据 HTML 实测结构生成）
// 最后更新：2025-11-12

const cheerio = createCheerio()
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
           "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
const headers = {
  'User-Agent': UA,
  'Referer': 'https://dsxys.com/',
  'Origin': 'https://dsxys.com'
}

const appConfig = {
  ver: 1,
  title: "大师兄影视",
  site: "https://dsxys.com",
  tabs: [
    { name: "首页", ext: { url: "https://dsxys.com/" } },
    { name: "电影", ext: { url: "https://dsxys.com/type/1.html?page={page}" } },
    { name: "连续剧", ext: { url: "https://dsxys.com/type/2.html?page={page}" } },
    { name: "综艺", ext: { url: "https://dsxys.com/type/3.html?page={page}" } },
    { name: "动漫", ext: { url: "https://dsxys.com/type/4.html?page={page}" } },
  ]
}

function jsonify(obj) {
  return JSON.stringify(obj)
}
function argsify(str) {
  try { return JSON.parse(str) } catch { return {} }
}
function abs(base, url) {
  if (!url) return ""
  if (url.startsWith("http")) return url
  if (url.startsWith("//")) return "https:" + url
  if (url.startsWith("/")) return base + url
  return base + "/" + url
}

async function getConfig() {
  return jsonify(appConfig)
}

// ---------------- 视频列表页 ----------------
async function getCards(ext) {
  ext = argsify(ext)
  const page = ext.page || 1
  let url = ext.url || appConfig.site
  url = url.replace("{page}", page)
  const { data } = await $fetch.get(url, { headers })
  const $ = cheerio.load(data)
  const cards = []

  $(".module-poster-item").each((_, el) => {
    const $el = $(el)
    const href = $el.attr("href")
    const title = $el.attr("title") || $el.find(".module-poster-item-title").text()
    const pic = $el.find("img").attr("data-original") || $el.find("img").attr("src")
    const remark = $el.find(".module-item-note").text().trim()
    if (href && title) {
      cards.push({
        vod_id: href,
        vod_name: title.trim(),
        vod_pic: abs(appConfig.site, pic),
        vod_remarks: remark,
        ext: { url: abs(appConfig.site, href) }
      })
    }
  })

  return jsonify({ list: cards })
}

// ---------------- 剧集/选集页 ----------------
async function getTracks(ext) {
  ext = argsify(ext)
  const url = ext.url
  if (!url) return jsonify({ list: [] })
  const { data } = await $fetch.get(url, { headers })
  const $ = cheerio.load(data)

  const groups = []
  $(".module-play-list").each((i, el) => {
    const $el = $(el)
    const title = $el.find(".module-play-list-name").text() || `播放源${i + 1}`
    const tracks = []
    $el.find("a").each((_, a) => {
      const $a = $(a)
      const name = $a.text().trim()
      const href = $a.attr("href")
      if (href) {
        tracks.push({
          name: name || `第${tracks.length + 1}集`,
          ext: { url: abs(appConfig.site, href) }
        })
      }
    })
    if (tracks.length > 0) groups.push({ title, tracks })
  })

  return jsonify({ list: groups })
}

// ---------------- 播放页提取视频链接 ----------------
async function getPlayinfo(ext) {
  ext = argsify(ext)
  const url = ext.url
  if (!url) return jsonify({ urls: [] })

  const { data } = await $fetch.get(url, { headers })
  const $ = cheerio.load(data)
  const scripts = $("script")

  // 寻找播放器 JSON
  for (let i = 0; i < scripts.length; i++) {
    const text = $(scripts[i]).html() || ""
    if (text.includes("player_aaaa")) {
      try {
        const match = text.match(/player_aaaa\s*=\s*(\{[\s\S]*?\});/)
        if (match) {
          const obj = JSON.parse(match[1])
          if (obj.url) {
            const playUrl = decodeURIComponent(obj.url)
            if (playUrl.includes(".m3u8")) {
              return jsonify({ urls: [playUrl] })
            }
          }
        }
      } catch {}
    }
  }

  // 通用匹配 m3u8
  const match = data.match(/https?:\/\/[^\s'"]+\.m3u8[^\s'"]*/i)
  if (match) return jsonify({ urls: [match[0]] })

  return jsonify({ urls: [] })
}

// ---------------- 搜索功能 ----------------
async function search(ext) {
  ext = argsify(ext)
  const wd = ext.text || ""
  const url = `${appConfig.site}/index.php/vod/search.html?wd=${encodeURIComponent(wd)}`
  const { data } = await $fetch.get(url, { headers })
  const $ = cheerio.load(data)
  const list = []
  $(".module-poster-item").each((_, el) => {
    const $el = $(el)
    const href = $el.attr("href")
    const title = $el.attr("title")
    const img = $el.find("img").attr("data-original") || $el.find("img").attr("src")
    const remark = $el.find(".module-item-note").text().trim()
    if (href) {
      list.push({
        vod_id: href,
        vod_name: title,
        vod_pic: abs(appConfig.site, img),
        vod_remarks: remark,
        ext: { url: abs(appConfig.site, href) }
      })
    }
  })
  return jsonify({ list })
}
