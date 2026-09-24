Page({
  data: {
    imagePath: '',
    currentFilter: '',
    isCircle: false,
    showCrop: false,
    cropSize: 200,
    filters: [
      { name: '原图', value: '' },
      { name: '黑白', value: 'filter-grayscale' },
      { name: '复古', value: 'filter-sepia' },
      { name: '模糊', value: 'filter-blur' },
      { name: '明亮', value: 'filter-brightness' },
      { name: '对比', value: 'filter-contrast' },
      { name: '饱和', value: 'filter-saturate' },
      { name: '色相', value: 'filter-hue' },
      { name: '反转', value: 'filter-invert' }
    ]
  },

  onLoad() {
    const systemInfo = wx.getSystemInfoSync()
    this.setData({
      cropSize: Math.min(systemInfo.windowWidth - 40, 300)
    })
  },

  // 选择图片
  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({
          imagePath: res.tempFiles[0].tempFilePath
        })
      }
    })
  },

  // 选择滤镜
  onFilterTap(e) {
    const filter = e.currentTarget.dataset.value
    this.setData({ currentFilter: filter })
  },

  // 选择形状
  onShapeTap(e) {
    const isCircle = e.currentTarget.dataset.circle === 'true'
    this.setData({ isCircle })
  },

  // 保存图片
  saveImage() {
    if (!this.data.imagePath) return

    wx.showLoading({ title: '保存中...' })

    const query = wx.createSelectorQuery()
    query.select('#saveCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0] || !res[0].node) {
          wx.hideLoading()
          wx.showToast({ title: '保存失败', icon: 'none' })
          return
        }

        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        const size = 400

        canvas.width = size
        canvas.height = size

        wx.getImageInfo({
          src: this.data.imagePath,
          success: (imgInfo) => {
            // 绘制背景
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(0, 0, size, size)

            // 计算裁切区域（居中正方形）
            let sx = 0, sy = 0, sw = imgInfo.width, sh = imgInfo.height
            if (imgInfo.width > imgInfo.height) {
              sx = (imgInfo.width - imgInfo.height) / 2
              sw = imgInfo.height
            } else {
              sy = (imgInfo.height - imgInfo.width) / 2
              sh = imgInfo.width
            }

            // 应用滤镜
            ctx.filter = this.getFilterCSS()

            // 如果是圆形，创建圆形裁切
            if (this.data.isCircle) {
              ctx.beginPath()
              ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
              ctx.clip()
            }

            // 绘制图片
            const img = canvas.createImage()
            img.onload = () => {
              ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size)

              wx.canvasToTempFilePath({
                canvas: canvas,
                fileType: 'jpg',
                quality: 0.9,
                success: (result) => {
                  // 保存到相册
                  wx.saveImageToPhotosAlbum({
                    filePath: result.tempFilePath,
                    success: () => {
                      wx.hideLoading()
                      wx.showToast({ title: '保存成功', icon: 'success' })
                    },
                    fail: (err) => {
                      wx.hideLoading()
                      if (err.errMsg.includes('auth deny')) {
                        this.showAuthModal()
                      } else {
                        wx.showToast({ title: '保存失败', icon: 'none' })
                      }
                    }
                  })
                },
                fail: () => {
                  wx.hideLoading()
                  wx.showToast({ title: '生成图片失败', icon: 'none' })
                }
              })
            }
            img.src = this.data.imagePath
          }
        })
      })
  },

  // 获取滤镜CSS
  getFilterCSS() {
    const filterMap = {
      'filter-grayscale': 'grayscale(100%)',
      'filter-sepia': 'sepia(80%)',
      'filter-blur': 'blur(3px)',
      'filter-brightness': 'brightness(130%)',
      'filter-contrast': 'contrast(150%)',
      'filter-saturate': 'saturate(200%)',
      'filter-hue': 'hue-rotate(90deg)',
      'filter-invert': 'invert(100%)'
    }
    return filterMap[this.data.currentFilter] || 'none'
  },

  // 设为头像
  setAsAvatar() {
    if (!this.data.imagePath) return

    wx.showModal({
      title: '提示',
      content: '确定将此图片设置为头像吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '上传中...' })

          // 上传到云存储
          const timestamp = Date.now()
          const random = Math.random().toString(36).substr(2, 9)
          const cloudPath = `avatars/${timestamp}-${random}.jpg`

          // 先生成图片
          const query = wx.createSelectorQuery()
          query.select('#saveCanvas')
            .fields({ node: true, size: true })
            .exec((canvasRes) => {
              const canvas = canvasRes[0].node
              const ctx = canvas.getContext('2d')
              const size = 400

              canvas.width = size
              canvas.height = size

              wx.getImageInfo({
                src: this.data.imagePath,
                success: (imgInfo) => {
                  ctx.fillStyle = '#ffffff'
                  ctx.fillRect(0, 0, size, size)

                  let sx = 0, sy = 0, sw = imgInfo.width, sh = imgInfo.height
                  if (imgInfo.width > imgInfo.height) {
                    sx = (imgInfo.width - imgInfo.height) / 2
                    sw = imgInfo.height
                  } else {
                    sy = (imgInfo.height - imgInfo.width) / 2
                    sh = imgInfo.width
                  }

                  ctx.filter = this.getFilterCSS()

                  if (this.data.isCircle) {
                    ctx.beginPath()
                    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
                    ctx.clip()
                  }

                  const img = canvas.createImage()
                  img.onload = () => {
                    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size)

                    wx.canvasToTempFilePath({
                      canvas: canvas,
                      fileType: 'jpg',
                      quality: 0.9,
                      success: (tempRes) => {
                        wx.cloud.uploadFile({
                          cloudPath: cloudPath,
                          filePath: tempRes.tempFilePath,
                          success: (uploadRes) => {
                            // 更新用户头像
                            const db = wx.cloud.database()
                            db.collection('users').where({
                              _openid: '{openid}'
                            }).get().then(userRes => {
                              if (userRes.data.length > 0) {
                                db.collection('users').doc(userRes.data[0]._id).update({
                                  data: { avatarUrl: uploadRes.fileID }
                                })
                              }
                            })

                            // 更新本地缓存
                            const userInfo = wx.getStorageSync('userInfo') || {}
                            userInfo.avatarUrl = uploadRes.fileID
                            wx.setStorageSync('userInfo', userInfo)

                            wx.hideLoading()
                            wx.showToast({ title: '头像设置成功', icon: 'success' })
                          },
                          fail: () => {
                            wx.hideLoading()
                            wx.showToast({ title: '上传失败', icon: 'none' })
                          }
                        })
                      }
                    })
                  }
                  img.src = this.data.imagePath
                }
              })
            })
        }
      }
    })
  },

  showAuthModal() {
    wx.showModal({
      title: '提示',
      content: '需要授权保存图片到相册',
      confirmText: '去授权',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.openSetting()
        }
      }
    })
  }
})
