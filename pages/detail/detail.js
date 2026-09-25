Page({
  data: {
    imageInfo: {},
    loading: false,
    pageLoading: false,
    uploading: false,
    showOriginal: false,
    showDownloadMask: false,
    downloadProgress: 0
  },

  onLoad(options) {
    if (!options.id) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      return
    }

    if (options.thumbnail || options.original) {
      // 有完整参数：直接使用
      const imageInfo = {
        id: options.id,
        thumbnail: decodeURIComponent(options.thumbnail || ''),
        original: decodeURIComponent(options.original || ''),
        title: options.title || '未命名',
        width: parseInt(options.width) || 0,
        height: parseInt(options.height) || 0,
        openid: options.openid || ''
      }
      this.setData({ imageInfo })
    } else {
      // 只有 id：从数据库加载
      this.loadById(options.id)
    }
  },

  // 按 id 从数据库加载
  async loadById(id) {
    this.setData({ pageLoading: true })

    try {
      const db = wx.cloud.database()
      const res = await db.collection('images').doc(id).get()
      const data = res.data

      const imageInfo = {
        id: id,
        thumbnail: data.thumbnailFileID || '',
        original: data.originalFileID || '',
        title: data.title || '未命名',
        width: data.width || 0,
        height: data.height || 0,
        openid: data._openid || ''
      }
      this.setData({ imageInfo })
    } catch (err) {
      console.error('加载图片失败:', err)
      wx.showToast({ title: '图片不存在或已删除', icon: 'none' })
    } finally {
      this.setData({ pageLoading: false })
    }
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
    this.setData({ loading: true, showDownloadMask: true, downloadProgress: 0 })

    const downloadTask = wx.cloud.downloadFile({
      fileID: this.data.imageInfo.original,
      success: (downloadRes) => {
        this.saveToAlbumSuccess(downloadRes.tempFilePath)
      },
      fail: () => {
        this.finishDownload(null, '下载失败')
      }
    })

    // 下载进度回调
    if (downloadTask && downloadTask.onProgressUpdate) {
      downloadTask.onProgressUpdate((progressRes) => {
        const progress = progressRes.progress || 0
        this.setData({ downloadProgress: Math.floor(progress) })
      })
    }
  },

  saveToAlbumSuccess(tempFilePath) {
    if (!tempFilePath) {
      this.finishDownload(null, '下载失败')
      return
    }
    wx.saveImageToPhotosAlbum({
      filePath: tempFilePath,
      success: () => {
        // 下载成功，增加下载次数
        const db = wx.cloud.database()
        db.collection('images').doc(this.data.imageInfo.id).update({
          data: { downloads: db.command.inc(1) }
        })
        this.finishDownload(true, '下载成功')
      },
      fail: (err) => {
        if (err.errMsg.includes('auth deny') || err.errMsg.includes('authorize')) {
          this.finishDownload(null, '', true)
          this.showAuthModal()
        } else {
          this.finishDownload(null, '保存失败')
        }
      }
    })
  },

  finishDownload(success, message, needAuth) {
    this.setData({ loading: false, showDownloadMask: false, downloadProgress: 0 })
    if (!needAuth && message) {
      wx.showToast({
        title: message,
        icon: success ? 'success' : 'none'
      })
    }
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
