Page({
  data: {
    selectedImages: [],
    currentIndex: 0,
    title: '',
    categories: [],
    tags: '',
    uploading: false,
    uploadProgress: '',
    uploaded: false,
    uploadResults: []
  },

  onLoad() {
    const CATEGORIES = require('../../utils/categories.js')
    this.setData({
      categories: CATEGORIES.map(name => ({ name, selected: false }))
    })
  },

  // 选择图片（支持多选）
  chooseImage() {
    const remain = 9 - this.data.selectedImages.length
    if (remain <= 0) {
      wx.showToast({ title: '最多选择9张', icon: 'none' })
      return
    }
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newImages = []
        let pending = res.tempFiles.length

        res.tempFiles.forEach((file) => {
          wx.getImageInfo({
            src: file.tempFilePath,
            success: (info) => {
              newImages.push({
                tempFilePath: file.tempFilePath,
                width: info.width,
                height: info.height,
                ratio: (info.height / info.width * 100).toFixed(2)
              })
              pending--
              if (pending === 0) {
                this.setData({
                  selectedImages: [...this.data.selectedImages, ...newImages]
                })
              }
            },
            fail: () => {
              pending--
              if (pending === 0) {
                this.setData({
                  selectedImages: [...this.data.selectedImages, ...newImages]
                })
              }
            }
          })
        })
      }
    })
  },

  // 滑动切换
  onSwiperChange(e) {
    this.setData({ currentIndex: e.detail.current })
  },

  // 删除当前图片
  removeCurrent() {
    const index = this.data.currentIndex
    const list = [...this.data.selectedImages]
    list.splice(index, 1)
    const currentIndex = list.length === 0 ? 0 : Math.min(index, list.length - 1)
    this.setData({ selectedImages: list, currentIndex })
  },

  onTitleInput(e) { this.setData({ title: e.detail.value }) },
  // 切换分类（多选）
  onCategoryToggle(e) {
    const cat = e.currentTarget.dataset.category
    const index = this.data.categories.findIndex(item => item.name === cat)
    if (index === -1) return

    const key = `categories[${index}].selected`
    this.setData({ [key]: !this.data.categories[index].selected })
  },
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

  // 上传图片（逐个上传）
  async uploadImage() {
    if (!this.data.selectedImages.length) {
      wx.showToast({ title: '请选择图片', icon: 'none' })
      return
    }
    const selectedCategories = this.data.categories.filter(item => item.selected).map(item => item.name)
    if (!selectedCategories.length) {
      wx.showToast({ title: '请选择分类', icon: 'none' })
      return
    }

    const list = this.data.selectedImages
    this.setData({ uploading: true })
    let successCount = 0

    const updatedImages = list.map(item => ({ ...item, id: '' }))

    try {
      for (let i = 0; i < list.length; i++) {
        const item = list[i]

        // 1. 生成缩略图
        this.setData({ uploadProgress: `正在上传第 ${i + 1}/${list.length} 张：生成缩略图...` })
        const thumbnailPath = await this.generateThumbnail(item.tempFilePath)

        // 2. 上传原图
        this.setData({ uploadProgress: `正在上传第 ${i + 1}/${list.length} 张：上传原图...` })
        const timestamp = Date.now()
        const random = Math.random().toString(36).substr(2, 9)

        const originalUpload = await wx.cloud.uploadFile({
          cloudPath: `images/original/${timestamp}-${random}.jpg`,
          filePath: item.tempFilePath
        })

        // 3. 上传缩略图
        this.setData({ uploadProgress: `正在上传第 ${i + 1}/${list.length} 张：上传缩略图...` })
        const thumbnailUpload = await wx.cloud.uploadFile({
          cloudPath: `images/thumbnails/${timestamp}-${random}.jpg`,
          filePath: thumbnailPath
        })

        // 4. 调用云函数保存记录
        this.setData({ uploadProgress: `正在上传第 ${i + 1}/${list.length} 张：保存记录...` })
        const tagsArray = this.data.tags.split(/[,，\s]+/).filter(t => t)

        const res = await wx.cloud.callFunction({
          name: 'uploadImage',
          data: {
            fileID: originalUpload.fileID,
            thumbnailFileID: thumbnailUpload.fileID,
            title: this.data.title || '未命名',
            categories: selectedCategories,
            tags: tagsArray,
            width: item.width,
            height: item.height
          }
        })

        if (res.result.code === 0) {
          successCount++
          updatedImages[i].id = res.result.imageId
        }
      }
    } catch (err) {
      console.error('上传失败:', err)
    }

    this.setData({ uploading: false, uploadProgress: '', selectedImages: updatedImages })

    if (successCount > 0) {
      getApp().globalData.needRefreshList = true
      wx.showToast({
        title: successCount === list.length ? `上传成功 ${successCount} 张` : `成功 ${successCount} 张，失败 ${list.length - successCount} 张`,
        icon: 'success'
      })
      this.setData({ uploaded: true })
    } else {
      wx.showToast({ title: '上传失败', icon: 'none' })
    }
  },

  // 复制图片id
  copyId(e) {
    const id = e.currentTarget.dataset.id
    wx.setClipboardData({
      data: id,
      success: () => {
        wx.showToast({ title: '已复制', icon: 'success' })
      }
    })
  },

  // 复制全部ID
  copyAllIds() {
    const ids = this.data.selectedImages.filter(item => item.id).map(item => item.id).join('\n')
    if (!ids) return
    wx.setClipboardData({
      data: ids,
      success: () => {
        wx.showToast({ title: '已复制全部ID', icon: 'success' })
      }
    })
  },

  // 完成返回
  finishUpload() {
    wx.navigateBack()
  },

  previewImage() {
    if (this.data.selectedImages.length > 0) {
      wx.previewImage({
        urls: this.data.selectedImages.map(item => item.tempFilePath),
        current: this.data.selectedImages[this.data.currentIndex].tempFilePath
      })
    }
  }
})