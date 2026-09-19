Page({
  data: {
    imageUrl: '',
    imageInfo: null,
    loading: false
  },

  onLoad() {
    console.log('Index Page Loaded')
  },

  // 输入图片URL
  onUrlInput(e) {
    this.setData({
      imageUrl: e.detail.value
    })
  },

  // 预览图片
  previewImage() {
    if (!this.data.imageUrl) {
      wx.showToast({
        title: '请输入图片URL',
        icon: 'none'
      })
      return
    }

    wx.previewImage({
      urls: [this.data.imageUrl],
      current: this.data.imageUrl
    })
  },

  // 下载图片
  downloadImage() {
    if (!this.data.imageUrl) {
      wx.showToast({
        title: '请输入图片URL',
        icon: 'none'
      })
      return
    }

    this.setData({ loading: true })

    wx.downloadFile({
      url: this.data.imageUrl,
      success: (res) => {
        if (res.statusCode === 200) {
          wx.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => {
              wx.showToast({
                title: '保存成功',
                icon: 'success'
              })
            },
            fail: (err) => {
              if (err.errMsg.includes('auth deny') || err.errMsg.includes('authorize')) {
                this.showAuthModal()
              } else {
                wx.showToast({
                  title: '保存失败',
                  icon: 'none'
                })
              }
            }
          })
        }
      },
      fail: () => {
        wx.showToast({
          title: '下载失败',
          icon: 'none'
        })
      },
      complete: () => {
        this.setData({ loading: false })
      }
    })
  },

  // 显示授权提示
  showAuthModal() {
    wx.showModal({
      title: '提示',
      content: '需要授权保存图片到相册',
      confirmText: '去授权',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.openSetting({
            success: (settingRes) => {
              if (settingRes.authSetting['scope.writePhotosAlbum']) {
                this.downloadImage()
              }
            }
          })
        }
      }
    })
  }
})
