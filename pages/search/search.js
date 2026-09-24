Page({
  data: {
    keyword: '',
    statusBarHeight: 20,
    categories: ['风景', '美女', '动漫', '美食', '宠物', '建筑', '壁纸'],
    hotSearchList: [],
    searchHistory: [],
    allHotKeywords: [
      '风景', '美女', '动漫', '美食', '宠物', '建筑', '壁纸',
      '高清', '4K', '手机壁纸', '电脑壁纸', '风景图片', '可爱',
      '治愈', '简约', '二次元', '古风', '夜景', '海边', '山川'
    ]
  },

  onLoad() {
    const systemInfo = wx.getSystemInfoSync()
    const menuButton = wx.getMenuButtonBoundingClientRect()
    const statusBarHeight = systemInfo.statusBarHeight || 20
    this.setData({
      statusBarHeight: statusBarHeight,
      menuButtonTop: menuButton.top,
      headerPaddingRight: (systemInfo.windowWidth - menuButton.left + 4) + 'px'
    })
    this.loadSearchHistory()
    this.refreshHotSearch()
  },

  // 返回
  goBack() {
    wx.navigateBack()
  },

  // 输入
  onInput(e) {
    this.setData({ keyword: e.detail.value })
  },

  // 搜索
  onSearch() {
    const keyword = this.data.keyword.trim()
    if (!keyword) return

    this.saveHistory(keyword)
    this.doSearch(keyword)
  },

  // 执行搜索
  doSearch(keyword) {
    // 返回上一页并传递搜索关键词
    const pages = getCurrentPages()
    const prevPage = pages[pages.length - 2]
    if (prevPage) {
      prevPage.setData({
        searchKeyword: keyword,
        images: [],
        hasMore: true
      })
      prevPage.loadImages()
    }
    wx.navigateBack()
  },

  // 点击分类
  onCategoryTap(e) {
    const category = e.currentTarget.dataset.category
    const categoryId = e.currentTarget.dataset.id
    this.setData({ keyword: category })
    this.saveHistory(category)

    // 返回上一页并切换分类
    const pages = getCurrentPages()
    const prevPage = pages[pages.length - 2]
    if (prevPage) {
      prevPage.setData({
        currentCategoryId: categoryId,
        searchKeyword: '',
        images: [],
        hasMore: true
      })
      prevPage.loadImages()
    }
    wx.navigateBack()
  },

  // 点击热门搜索
  onHotTap(e) {
    const keyword = e.currentTarget.dataset.keyword
    this.setData({ keyword: keyword })
    this.saveHistory(keyword)
    this.doSearch(keyword)
  },

  // 点击历史记录
  onHistoryTap(e) {
    const keyword = e.currentTarget.dataset.keyword
    this.setData({ keyword: keyword })
    this.doSearch(keyword)
  },

  // 换一换热门搜索
  refreshHotSearch() {
    const allKeywords = [...this.data.allHotKeywords]
    const hotList = []

    // 随机选6个
    for (let i = 0; i < 6 && allKeywords.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * allKeywords.length)
      hotList.push(allKeywords.splice(randomIndex, 1)[0])
    }

    this.setData({ hotSearchList: hotList })
  },

  // 清空关键词
  clearKeyword() {
    this.setData({ keyword: '' })
  },

  // 加载搜索历史
  loadSearchHistory() {
    const history = wx.getStorageSync('searchHistory') || []
    this.setData({ searchHistory: history.slice(0, 10) })
  },

  // 保存搜索历史
  saveHistory(keyword) {
    let history = wx.getStorageSync('searchHistory') || []
    // 移除重复
    history = history.filter(item => item !== keyword)
    // 添加到最前面
    history.unshift(keyword)
    // 最多保留10条
    history = history.slice(0, 10)
    wx.setStorageSync('searchHistory', history)
    this.setData({ searchHistory: history })
  },

  // 清空历史
  clearHistory() {
    wx.showModal({
      title: '提示',
      content: '确定清空搜索历史吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('searchHistory')
          this.setData({ searchHistory: [] })
        }
      }
    })
  }
})
