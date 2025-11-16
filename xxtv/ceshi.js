async function getConfig() {
  return jsonify({
    title: '测试源',
    site: 'https://example.com',
    tabs: [{ name: '电影', ext: { id: '/mv' } }],
  })
}

async function getCards(ext) {
  $utils.toastInfo('分类页访问成功')
  return jsonify({
    list: [{
      vod_id: 'https://example.com/mv/123',
      vod_name: '示例影片',
      vod_pic: 'https://example.com/logo.png',
      vod_remarks: 'HD'
    }]
  })
}

async function getTracks(ext) {
  $utils.toastInfo('影片页访问成功')
  return jsonify({
    list: [{
      title: '默认分组',
      tracks: [{ name: '百度网盘', ext: { url: 'https://pan.baidu.com' } }]
    }]
  })
}

async function getPlayinfo(ext) {
  ext = argsify(ext)
  return jsonify({ urls: [ext.url] })
}
