const db = wx.cloud.database()
const _ = db.command

Page({
  data: {
    categories: ['全部', '风景', '美女', '动漫', '美食', '宠物', '建筑', '壁纸'],
    currentCategoryId: 0,
    leftColumn: [],
    rightColumn: [],
    searchKeyword: '',
    imageLoaded: {},
    showDropdown: false,
    selectedRatio: 'other',
    currentRatio: 'other',
    ratioOptions: [
      { label: '16:9', value: '16:9' },
      { label: '9:16', value: '9:16' },
      { label: '1:1', value: '1:1' },
      { label: '4:3', value: '4:3' },
      { label: '3:4', value: '3:4' },
      { label: '其他', value: 'other' }
    ],
    images: [],
    loading: false,
    hasMore: true,
    isAdmin: false,
    statusBarHeight: 20,
    searchMaxWidth: ''
  },

  onLoad() {
    const systemInfo = wx.getSystemInfoSync()
    const menuButton = wx.getMenuButtonBoundingClientRect()
    // 搜索框最大宽度 = 屏幕宽度 - 左侧padding - 分享按钮宽度 - 间距 - 胶囊按钮宽度 - 右侧间距
    const maxWidth = systemInfo.windowWidth - 20 - 30 - 16 - menuButton.width - 10
    this.setData({
      statusBarHeight: systemInfo.statusBarHeight || 20,
      searchMaxWidth: maxWidth + 'px'
    })
    this.checkAdmin()
    this.loadImages()
  },

  onShow() {
    if (this.data.images.length > 0) {
      this.setData({ images: [], hasMore: true })
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
    this.setData({ images: [], hasMore: true })
    this.loadImages().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadImages()
    }
  },

  // 从云数据库加载图片
  async loadImages() {
    if (this.data.loading) return
    this.setData({ loading: true })

    try {
      const categoryId = this.data.currentCategoryId
      const keyword = this.data.searchKeyword.trim()
      const pageSize = 20
      const skip = this.data.images.length

      let query = db.collection('images').where({ status: 1 })

      // 分类筛选
      if (categoryId !== 0) {
        const category = this.data.categories[categoryId]
        query = query.where({ category: category })
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
      const allImages = [...this.data.images, ...newImages]

      this.setData({
        images: allImages,
        hasMore: newImages.length === pageSize,
        loading: false
      })

      this.renderWaterfall(allImages)
    } catch (err) {
      console.error('加载失败:', err)
      this.setData({ loading: false })
    }
  },

  // 渲染瀑布流
  renderWaterfall(images) {
    const leftColumn = []
    const rightColumn = []
    let leftHeight = 0
    let rightHeight = 0

    const screenWidth = wx.getSystemInfoSync().windowWidth
    const columnWidth = (screenWidth - 30) / 2
    const currentRatio = this.data.currentRatio

    // 根据比例筛选图片
    let filteredImages = images
    if (currentRatio !== 'other') {
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

      if (leftHeight <= rightHeight) {
        leftColumn.push({ ...item, displayHeight: imageHeight })
        leftHeight += imageHeight + 10
      } else {
        rightColumn.push({ ...item, displayHeight: imageHeight })
        rightHeight += imageHeight + 10
      }
    })

    this.setData({
      leftColumn,
      rightColumn
    })
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

  // 分享
  onShareTap() {
    // 触发分享菜单
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
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
    this.setData({ selectedRatio: 'other' })
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
