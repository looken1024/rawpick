const db = wx.cloud.database()
const _ = db.command
const BASE_CATEGORIES = require('../../utils/categories.js')

Page({
  data: {
    categories: ['全部', ...BASE_CATEGORIES],
    currentCategoryId: 0,
    columns: [[], [], [], []],
    searchKeyword: '',
    imageLoaded: {},
    showDropdown: false,
    selectedRatio: 'all',
    currentRatio: 'all',
    ratioOptions: [
      { label: '全部', value: 'all' },
      { label: '16:9', value: '16:9' },
      { label: '9:16', value: '9:16' },
      { label: '1:1', value: '1:1' },
      { label: '4:3', value: '4:3' },
      { label: '3:4', value: '3:4' }
    ],
    images: [],
    loading: false,
    hasMore: true,
    isAdmin: false,
    statusBarHeight: 20,
    searchMaxWidth: '',
    scrollHeight: '',
    refreshing: false
  },

  onLoad() {
    const windowInfo = wx.getWindowInfo()
    const menuButton = wx.getMenuButtonBoundingClientRect()
    // 搜索框最大宽度 = 屏幕宽度 - 左侧padding - 分享按钮宽度 - 间距 - 胶囊按钮宽度 - 右侧间距
    const maxWidth = windowInfo.windowWidth - 20 - 30 - 16 - menuButton.width - 10
    // 列表高度 = 窗口高度 - 状态栏 - 导航(44px) - 分类tab(44px) - 间距(8px)
    const scrollHeight = (windowInfo.windowHeight - windowInfo.statusBarHeight - 96)
    this.setData({
      statusBarHeight: windowInfo.statusBarHeight || 20,
      searchMaxWidth: maxWidth + 'px',
      scrollHeight: scrollHeight + 'px'
    })
    this.checkAdmin()
    this.loadImages()
  },

  onShow() {
    if (getApp().globalData.needRefreshList) {
      getApp().globalData.needRefreshList = false
      this.loadImages(true)
    } else if (this.data.images.length === 0 && this.data.searchKeyword) {
      this.loadImages()
    }
  },

  checkAdmin() {
    const db = wx.cloud.database()
    db.collection('users').where({
      _openid: '{openid}'
    }).get().then(res => {
      if (res.data.length > 0 && res.data[0].nickName === 'mooncun') {
        this.setData({ isAdmin: true })
      }
    })
  },

  onPullDownRefresh() {
    this.setData({ refreshing: true })
    this.loadImages(true).then(() => {
      this.setData({ refreshing: false })
    })
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadImages()
    }
  },

  // 内容不足一屏时自动补页（scrolltolower 无法触发的情况）
  checkFillMore() {
    if (this.data.loading || !this.data.hasMore) return

    const query = wx.createSelectorQuery()
    query.select('.list-scroll')
      .fields({ size: true, scrollOffset: true })
      .exec((res) => {
        if (!res[0]) return
        const scrollHeight = res[0].scrollHeight || 0
        const viewportHeight = res[0].height || 0
        if (scrollHeight <= viewportHeight + 50) {
          this.loadImages()
        }
      })
  },

  // 从云数据库加载图片
  async loadImages(reset) {
    if (this.data.loading && !reset) return
    this.setData({ loading: true })

    try {
      const categoryId = this.data.currentCategoryId
      const keyword = this.data.searchKeyword.trim()
      const pageSize = 20
      const skip = reset ? 0 : this.data.images.length

      let query = db.collection('images')

      // 分类筛选：优先匹配 categories 数组（多选），兼容旧 category 字符串
      if (categoryId !== 0) {
        const category = this.data.categories[categoryId]
        query = query.where(_.or([
          { categories: category },
          { category: category }
        ]))
      }

      // 关键词搜索
      if (keyword) {
        query = query.where(_.or([
          { title: db.RegExp({ regexp: keyword, options: 'i' }) },
          { tags: db.RegExp({ regexp: keyword, options: 'i' }) }
        ]))
      }

      const res = await query
        .orderBy('uploadTime', 'desc')
        .skip(skip)
        .limit(pageSize)
        .get()

      const newImages = res.data
      const allImages = reset ? newImages : [...this.data.images, ...newImages]

      this.setData({
        images: allImages,
        hasMore: newImages.length === pageSize,
        loading: false
      })

      this.renderWaterfall(allImages)

      // 若内容不足一屏，自动继续加载下一页
      if (newImages.length === pageSize) {
        setTimeout(() => this.checkFillMore(), 300)
      }
    } catch (err) {
      console.error('加载失败:', err)
      this.setData({ loading: false })
    }
  },

  // 渲染瀑布流
  renderWaterfall(images) {
    const columns = [[], [], [], []]
    const columnHeights = [0, 0, 0, 0]

    const screenWidth = wx.getWindowInfo().windowWidth
    const columnWidth = (screenWidth - 30) / 4
    const currentRatio = this.data.currentRatio

    // 根据比例筛选图片
    let filteredImages = images
    if (currentRatio !== 'all') {
      const [targetW, targetH] = currentRatio.split(':').map(Number)
      const targetRatio = targetW / targetH
      const tolerance = 0.1

      filteredImages = images.filter(item => {
        const imageRatio = item.width / item.height
        const diff = Math.abs(imageRatio - targetRatio)
        return diff < tolerance
      })
    }

    // 按原始比例展示
    filteredImages.forEach(item => {
      const ratio = item.height / item.width
      const imageHeight = columnWidth * ratio

      // 找出最短列
      let shortest = 0
      for (let i = 1; i < 4; i++) {
        if (columnHeights[i] < columnHeights[shortest]) {
          shortest = i
        }
      }
      columns[shortest].push({ ...item, displayHeight: imageHeight })
      columnHeights[shortest] += imageHeight + 10
    })

    this.setData({ columns })
  },

  // 分类切换
  onCategoryTap(e) {
    const categoryId = e.currentTarget.dataset.id
    this.setData({
      currentCategoryId: categoryId,
      images: [],
      hasMore: true
    })
    this.loadImages()
  },

  // 分享（暂未开放）
  onShareTap() {
    wx.showToast({ title: '分享功能暂未开放', icon: 'none' })
  },

  // 转发给朋友
  onShareAppMessage() {
    return {
      title: 'rawpick - 高清原图下载',
      path: '/pages/index/index',
      imageUrl: '/icons/head.png'
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: 'rawpick - 高清原图下载',
      query: '',
      imageUrl: '/icons/head.png'
    }
  },

  // 跳转搜索页
  goToSearch() {
    wx.navigateTo({
      url: '/pages/search/search'
    })
  },

  // 跳转上传页（仅管理员）
  goToUpload() {
    if (!this.data.isAdmin) return
    wx.navigateTo({
      url: '/pages/upload/upload'
    })
  },

  // 设置
  onSettingsTap() {
    this.setData({ showDropdown: !this.data.showDropdown })
  },

  onMaskTap() {
    this.setData({ showDropdown: false, selectedRatio: this.data.currentRatio })
  },

  onRatioTap(e) {
    const value = e.currentTarget.dataset.value
    this.setData({ selectedRatio: value })
  },

  onRatioReset() {
    this.setData({ selectedRatio: 'all' })
  },

  onRatioConfirm() {
    this.setData({
      currentRatio: this.data.selectedRatio,
      showDropdown: false
    })
    this.renderWaterfall(this.data.images)
  },

  // 图片加载
  onImageLoad(e) {
    const id = e.currentTarget.dataset.id
    this.setData({
      [`imageLoaded.${id}`]: true
    })
  },

  // 点击图片进入详情
  onImageTap(e) {
    const { id, thumbnailfileid, originalfileid, title, width, height, openid } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}&thumbnail=${encodeURIComponent(thumbnailfileid)}&original=${encodeURIComponent(originalfileid)}&title=${title}&width=${width}&height=${height}&openid=${openid}`
    })
  },

  // 长按图片（管理员删除）
  onImageLongPress(e) {
    if (!this.data.isAdmin) return

    const imageId = e.currentTarget.dataset.id
    wx.showActionSheet({
      itemList: ['删除图片'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.deleteImage(imageId)
        }
      }
    })
  },

  // 删除图片
  deleteImage(imageId) {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这张图片吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' })

          const db = wx.cloud.database()
          db.collection('images').doc(imageId).remove().then(() => {
            // 从本地数据中移除
            const images = this.data.images.filter(item => item._id !== imageId)
            this.setData({ images })
            // 重新渲染瀑布流
            this.renderWaterfall(images)
            wx.hideLoading()
            wx.showToast({ title: '删除成功', icon: 'success' })
          }).catch(() => {
            wx.hideLoading()
            wx.showToast({ title: '删除失败', icon: 'none' })
          })
        }
      }
    })
  }
})
