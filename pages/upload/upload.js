Page({
  data: {
    tempFilePath: '',
    imageInfo: null,
    title: '',
    category: '',
    categories: ['风景', '美女', '动漫', '美食', '宠物', '建筑', '壁纸'],
    tags: '',
    uploading: false,
    previewUrl: '',
    uploadProgress: ''
  },

  // 选择图片
  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath

        wx.getImageInfo({
          src: tempFilePath,
          success: (info) => {
            if (info.width < 500 || info.height < 500) {
              wx.showToast({ title: '图片尺寸太小，宽高需大于500px', icon: 'none' })
              return
            }

            this.setData({
              tempFilePath: tempFilePath,
              imageInfo: {
                width: info.width,
                height: info.height,
                ratio: (info.height / info.width * 100).toFixed(2)
              },
              previewUrl: tempFilePath
            })
          }
        })
      }
    })
  },

  onTitleInput(e) { this.setData({ title: e.detail.value }) },
  onCategoryChange(e) { this.setData({ category: this.data.categories[e.detail.value] }) },
  onTagsInput(e) { this.setData({ tags: e.detail.value }) },

  // 生成缩略图
  generateThumbnail(filePath) {
    return new Promise((resolve, reject) => {
      const query = wx.createSelectorQuery()
      query.select('#thumbnailCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res[0] || !res[0].node) {
            reject(new Error('canvas not found'))
            return
          }

          const canvas = res[0].node
          const ctx = canvas.getContext('2d')

          wx.getImageInfo({
            src: filePath,
            success: (imgInfo) => {
              const maxSize = 400
              let width = imgInfo.width
              let height = imgInfo.height

              if (width > height) {
                if (width > maxSize) {
                  height = Math.round(height * (maxSize / width))
                  width = maxSize
                }
              } else {
                if (height > maxSize) {
                  width = Math.round(width * (maxSize / height))
                  height = maxSize
                }
              }

              canvas.width = width
              canvas.height = height

              const img = canvas.createImage()
              img.onload = () => {
                ctx.drawImage(img, 0, 0, width, height)
                wx.canvasToTempFilePath({
                  canvas: canvas,
                  fileType: 'jpg',
                  quality: 0.8,
                  success: (result) => {
                    resolve(result.tempFilePath)
                  },
                  fail: reject
                })
              }
              img.onerror = reject
              img.src = filePath
            },
            fail: reject
          })
        })
    })
  },

  // 上传图片
  async uploadImage() {
    if (!this.data.tempFilePath) {
      wx.showToast({ title: '请选择图片', icon: 'none' })
      return
    }
    if (!this.data.category) {
      wx.showToast({ title: '请选择分类', icon: 'none' })
      return
    }

    this.setData({ uploading: true })

    try {
      // 1. 生成缩略图
      this.setData({ uploadProgress: '生成缩略图...' })
      const thumbnailPath = await this.generateThumbnail(this.data.tempFilePath)

      // 2. 上传原图
      this.setData({ uploadProgress: '上传原图...' })
      const timestamp = Date.now()
      const random = Math.random().toString(36).substr(2, 9)

      const originalUpload = await wx.cloud.uploadFile({
        cloudPath: `images/original/${timestamp}-${random}.jpg`,
        filePath: this.data.tempFilePath
      })

      // 3. 上传缩略图
      this.setData({ uploadProgress: '上传缩略图...' })
      const thumbnailUpload = await wx.cloud.uploadFile({
        cloudPath: `images/thumbnails/${timestamp}-${random}.jpg`,
        filePath: thumbnailPath
      })

      // 4. 调用云函数保存记录
      this.setData({ uploadProgress: '保存记录...' })
      const tagsArray = this.data.tags.split(/[,，\s]+/).filter(t => t)

      const res = await wx.cloud.callFunction({
        name: 'uploadImage',
        data: {
          fileID: originalUpload.fileID,
          thumbnailFileID: thumbnailUpload.fileID,
          title: this.data.title || '未命名',
          category: this.data.category,
          tags: tagsArray,
          width: this.data.imageInfo.width,
          height: this.data.imageInfo.height
        }
      })

      if (res.result.code === 0) {
        wx.showToast({ title: '上传成功，等待审核', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 1500)
      } else {
        wx.showToast({ title: '上传失败', icon: 'none' })
      }
    } catch (err) {
      console.error('上传失败:', err)
      wx.showToast({ title: '上传失败: ' + err.message, icon: 'none' })
    } finally {
      this.setData({ uploading: false, uploadProgress: '' })
    }
  },

  previewImage() {
    if (this.data.previewUrl) {
      wx.previewImage({ urls: [this.data.previewUrl] })
    }
  }
})
