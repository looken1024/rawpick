Page({
  data: {
    imageInfo: {},
    loading: false,
    uploading: false,
    showOriginal: false
  },

  onLoad(options) {
    const imageInfo = {
      id: options.id,
      thumbnail: decodeURIComponent(options.thumbnail),
      original: decodeURIComponent(options.original),
      title: options.title,
      width: parseInt(options.width),
      height: parseInt(options.height),
      openid: options.openid || ''
    }
    this.setData({ imageInfo })
  },

  // 预览原图
  previewImage() {
    this.setData({ showOriginal: true })
  },

  // 关闭原图预览
  closeOriginal() {
    this.setData({ showOriginal: false })
  },

  // 免费下载
  saveToAlbum() {
    this.setData({ loading: true })

    wx.cloud.getTempFileURL({
      fileList: [this.data.imageInfo.original]
    }).then(res => {
      const tempUrl = res.fileList[0].tempFileURL

      wx.downloadFile({
        url: tempUrl,
        success: (downloadRes) => {
          if (downloadRes.statusCode === 200) {
            wx.saveImageToPhotosAlbum({
              filePath: downloadRes.tempFilePath,
              success: () => {
                // 下载成功，增加下载次数
                const db = wx.cloud.database()
                db.collection('images').doc(this.data.imageInfo.id).update({
                  data: { downloads: db.command.inc(1) }
                })
                wx.showToast({ title: '下载成功', icon: 'success' })
              },
              fail: (err) => {
                if (err.errMsg.includes('auth deny') || err.errMsg.includes('authorize')) {
                  this.showAuthModal()
                } else {
                  wx.showToast({ title: '保存失败', icon: 'none' })
                }
              }
            })
          }
        },
        fail: () => {
          wx.showToast({ title: '下载失败', icon: 'none' })
        },
        complete: () => {
          this.setData({ loading: false })
        }
      })
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
