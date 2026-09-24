Page({
  data: {
    images: [],
    loading: false,
    isAdmin: false
  },

  onLoad() {
    this.checkAdmin()
  },

  onShow() {
    if (this.data.isAdmin) {
      this.loadPendingImages()
    }
  },

  checkAdmin() {
    const db = wx.cloud.database()
    db.collection('users').where({
      _openid: '{openid}'
    }).get().then(res => {
      if (res.data.length > 0 && res.data[0].nickName === 'mooncun') {
        this.setData({ isAdmin: true })
        this.loadPendingImages()
      } else {
        wx.showToast({ title: '无管理员权限', icon: 'none' })
        setTimeout(() => wx.navigateBack(), 1500)
      }
    })
  },

  loadPendingImages() {
    this.setData({ loading: true })
    const db = wx.cloud.database()

    db.collection('images').where({
      status: 0
    }).orderBy('uploadTime', 'desc').get().then(res => {
      console.log('待审核图片:', res.data)
      this.setData({
        images: res.data,
        loading: false
      })
    }).catch(err => {
      console.error('加载失败:', err)
      this.setData({ loading: false })
    })
  },

  // 审核通过
  onApprove(e) {
    const imageId = e.currentTarget.dataset.id
    this.reviewImage(imageId, 'approve')
  },

  // 审核拒绝
  onReject(e) {
    const imageId = e.currentTarget.dataset.id
    this.reviewImage(imageId, 'reject')
  },

  reviewImage(imageId, action) {
    wx.showLoading({ title: '处理中...' })

    wx.cloud.callFunction({
      name: 'reviewImage',
      data: { imageId, action }
    }).then(res => {
      wx.hideLoading()
      console.log('云函数返回:', res)
      if (res.result && res.result.code === 0) {
        wx.showToast({ title: res.result.message, icon: 'success' })
        this.loadPendingImages()
      } else {
        wx.showToast({ title: res.result ? res.result.message : '操作失败', icon: 'none' })
      }
    }).catch(err => {
      wx.hideLoading()
      console.error('云函数错误:', err)
      wx.showToast({ title: '操作失败: ' + err.message, icon: 'none' })
    })
  },

  // 预览图片
  previewImage(e) {
    const url = e.currentTarget.dataset.url
    wx.previewImage({
      urls: [url],
      current: url
    })
  }
})
