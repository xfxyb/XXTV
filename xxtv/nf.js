// netflixgc_auto.js
// ✅ 自动检测后端 API 接口（适配动态站）
// ✅ 作者: ChatGPT for upup (教学版)

const cheerio = createCheerio()
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36'

const appConfig = {
  ver: 20251112,
  title: 'NetflixGC',
  site: 'https://www.netflixgc.com',
  tabs: [
    { name: '电影', ext: { id: 1 } },
    { name: '剧集', ext: { id: 2 } },
    { name: '动漫', ext: { id: 4 } },
  ],
}

async function getConfig() {
  return jsonify(appConfig)
}

async function getCards(ext) {
  ext = argsify(ext)
  const { id, page = 1 } = ext
  let apiUrl = ''

  // 步骤①：请求主页，查找隐藏 API
  const { data } = await $fetch.get(appConfig.site, {
    headers: { 'User-Agent': UA },
  })

  if (data.includes('/ajax/') || data.includes('/api/')) {
    const match = data.match(/(\/index\.php\/ajax\/[a-zA-Z_\/]+|\/api\/v1\/vod\/list)/)
    apiUrl = match ? match[1] : ''
  }

  if (!apiUrl) {
    $utils.toastError('未找到后台接口，可能需人工适配')
    return jsonify({ list: [] })
  }

  // 步骤②：拼接完整接口地址
  if (!apiUrl.startsWith('http')) apiUrl = `${appConfig.site}${apiUrl}`

  const params = {
    id,
    page,
    limit: 24,
  }

  // 步骤③：请求接口（尝试POST或GET）
  let res
  try {
    res = await $fetch.post(apiUrl, params, { headers: { 'User-Agent': UA } })
  } catch {
    res = await $fetch.get(`${apiUrl}?id=${id}&page=${page}`, {
      headers: { 'User-Agent': UA },
    })
  }

  // 步骤④：尝试解析 JSON
  let json
  try {
    json = JSON.parse(res.data)
  } catch {
    try {
      json = argsify(res.data)
    } catch {
      $utils.toastError('接口数据非JSON格式')
      return jsonify({ list: [] })
    }
  }

  const list = []
  const items = json.list || json.data || json.vodlist || []

  items.forEach((v) => {
    list.push({
      vod_id: v.vod_id || v.id,
      vod_name: v.vod_name || v.title,
      vod_pic: v.vod_pic || v.pic,
      vod_remarks: v.vod_remarks || v.note || '',
      ext: { url: `${appConfig.site}/vodplay/${v.vod_id}.html` },
    })
  })

  if (list.length === 0) {
    $utils.toastError('未解析到影片，请检查接口')
  } else {
    $utils.toastInfo(`解析成功 ${list.length} 条`)
  }

  return jsonify({ list })
}

async function getTracks(ext) {
  ext = argsify(ext)
  const { url } = ext
  if (!url) return jsonify({ list: [] })

  const { data } = await $fetch.get(url, { headers: { 'User-Agent': UA } })
  const $ = cheerio.load(data)
  const tracks = []

  $('.module-play-list a, .play_list a').each((_, a) => {
    const name = $(a).text().trim()
    const href = $(a).attr('href') || ''
    const fullUrl = href.startsWith('http')
      ? href
      : `${appConfig.site}${href}`
    tracks.push({ name, pan: '', ext: { url: fullUrl } })
  })

  if (tracks.length === 0) $utils.toastError('未找到播放资源')

  return jsonify({ list: [{ title: '默认分组', tracks }] })
}

async function getPlayinfo(ext) {
  ext = argsify(ext)
  return jsonify({ urls: [ext.url] })
}

async function search(ext) {
  ext = argsify(ext)
  const text = encodeURIComponent(ext.text || '')
  const url = `${appConfig.site}/vodsearch/${text}----------1---.html`
  const { data } = await $fetch.get(url, { headers: { 'User-Agent': UA } })
  const $ = cheerio.load(data)
  const list = []

  $('.module-item').each((_, e) => {
    const a = $(e).find('a')
    const name = $(e).find('.module-item-title').text().trim()
    const img = a.find('img').attr('data-original') || a.find('img').attr('src')
    const href = a.attr('href') || ''
    const fullUrl = href.startsWith('http')
      ? href
      : `${appConfig.site}${href}`
    list.push({
      vod_id: fullUrl,
      vod_name: name,
      vod_pic: img,
      vod_remarks: '',
      ext: { url: fullUrl },
    })
  })

  return jsonify({ list })
}
