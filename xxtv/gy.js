// gyg_final_v6.js
// ✅ 适配 gyg.si 最新结构
// ✅ 支持 _obj.inlist (分类页) + _obj.cblist (影片页)
// ✅ 作者: ChatGPT for upup

const cheerio = createCheerio()
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36'

const DEBUG = true
function log(msg) {
  if (DEBUG) $print(`[GYG] ${msg}`)
}

const appConfig = {
  ver: 20251111,
  title: 'GYG.SI',
  site: 'https://www.gyg.si',
  tabs: [
    { name: '电影', ext: { id: '/mv' } },
    { name: '剧集', ext: { id: '/tv' } },
    { name: '动漫', ext: { id: '/ac' } },
  ],
}

// ① 配置
async function getConfig() {
  return jsonify(appConfig)
}

// ② 分类页 —— 从 _obj.inlist 中取数据
async function getCards(ext) {
  ext = argsify(ext)
  let { id, page = 1 } = ext
  const url = page > 1 ? `${appConfig.site}${id}/page/${page}` : `${appConfig.site}${id}`
  log(`请求分类页: ${url}`)

  const { data } = await $fetch.get(url, { headers: { 'User-Agent': UA } })
  const cards = []

  try {
    // 匹配 _obj.inlist = { ... };
    const match = data.match(/_obj\.inlist\s*=\s*(\{[\s\S]*?\});/)
    if (!match) throw new Error('未找到 _obj.inlist')

    const json = JSON.parse(match[1])
    const ids = json.i || []
    const titles = json.t || []
    const remarks = json.q || []
    const dir = json.ty || 'mv'

    ids.forEach((vid, i) => {
      const name = titles[i] || '未知影片'
      const remark = (remarks[i] && remarks[i][0]) || ''
      const link = `${appConfig.site}/${dir}/${vid}`
      const img = `${appConfig.site}/res/img/${vid}.jpg`

      cards.push({
        vod_id: link,
        vod_name: name,
        vod_pic: img,
        vod_remarks: remark,
        ext: { url: link },
      })
    })

    log(`✅ 从 _obj.inlist 解析到 ${cards.length} 条影片`)
  } catch (e) {
    log(`❌ getCards 错误: ${e}`)
    $utils.toastError('未解析到影片，请检查网页结构')
  }

  return jsonify({ list: cards })
}

// ③ 影片详情页 —— 解析 _obj.cblist
async function getTracks(ext) {
  ext = argsify(ext)
  const { url } = ext
  if (!url) return jsonify({ list: [] })

  log(`请求影片详情页: ${url}`)
  const { data } = await $fetch.get(url, { headers: { 'User-Agent': UA } })
  const tracks = []

  try {
    const match = data.match(/_obj\.cblist\s*=\s*(\{[\s\S]*?\});/)
    if (match) {
      const json = JSON.parse(match[1])
      const titles = json.t || []
      const urls = json.u || []
      log(`解析到 ${titles.length} 个资源项`)
      titles.forEach((t, i) => {
        const u = urls[i]
        if (u) {
          const resUrl = `${appConfig.site}/res/downurl/${u}`
          tracks.push({
            name: t || `资源${i + 1}`,
            pan: '',
            ext: { url: resUrl },
          })
        }
      })
    } else {
      throw new Error('未找到 _obj.cblist')
    }
  } catch (e) {
    log(`❌ getTracks 错误: ${e}`)
    $utils.toastError('未找到影片资源')
  }

  return jsonify({
    list: [{ title: '默认分组', tracks }],
  })
}

// ④ 播放页 —— 直接返回 downurl 地址
async function getPlayinfo(ext) {
  ext = argsify(ext)
  const { url } = ext
  return jsonify({ urls: [url], headers: [{ 'User-Agent': UA }] })
}

// ⑤ 搜索
async function search(ext) {
  ext = argsify(ext)
  const text = encodeURIComponent(ext.text || '')
  const page = ext.page || 1
  const url = `${appConfig.site}/s/1---${page}/${text}`
  log(`搜索地址: ${url}`)

  const { data } = await $fetch.get(url, { headers: { 'User-Agent': UA } })
  const $ = cheerio.load(data)
  const cards = []

  $('.v5d, .video-item, .search-item, .module-item').each((_, e) => {
    const a = $(e).find('a')
    const name =
      a.attr('title') ||
      a.find('img').attr('alt') ||
      $(e).find('b, .title').text().trim() ||
      '未知影片'
    const img =
      a.find('img').attr('data-src') ||
      a.find('img').attr('src') ||
      $(e).find('img').attr('src') ||
      ''
    const href = a.attr('href') || ''
    const remarks = $(e).find('p, .meta, .video-serial').text().trim()
    const fullUrl = href.startsWith('http') ? href : `${appConfig.site}${href}`

    cards.push({
      vod_id: fullUrl,
      vod_name: name,
      vod_pic: img,
      vod_remarks: remarks,
      ext: { url: fullUrl },
    })
  })

  log(`搜索结果: ${cards.length} 条`)
  return jsonify({ list: cards })
}
