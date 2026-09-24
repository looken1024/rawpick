Page({
  data: {
    userInfo: {
      avatarUrl: '',
      nickName: ''
    },
    isLoggedIn: false,
    logining: false,
    isAdmin: false,
    userStats: {
      points: 0,
      uploadCount: 0,
      approvedCount: 0,
      downloadCount: 0
    }
  },

  onLoad() {
    this.checkLogin()
  },

  onShow() {
    if (this.data.isLoggedIn) {
      this.loadUserInfo()
    }
  },

  checkLogin() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo && userInfo.nickName) {
      this.setData({
        userInfo: userInfo,
        isLoggedIn: true
      })
      this.loadUserInfo()
    }
  },

  loadUserInfo() {
    const db = wx.cloud.database()
    const _ = db.command
    
    db.collection('users').where({
      _openid: '{openid}'
    }).get().then(res => {
      if (res.data.length > 0) {
        const user = res.data[0]
        const myOpenid = user._openid
        
        // 查询审核通过的图片数量
        db.collection('images').where({
          _openid: myOpenid,
          status: 1
        }).get().then(imgRes => {
          console.log('审核通过图片:', imgRes.data.length, imgRes.data)
          this.setData({
            'userInfo.nickName': user.nickName || '',
            'userInfo.avatarUrl': user.avatarUrl || '',
            isAdmin: user.nickName === 'mooncun',
            userStats: {
              points: user.points || 0,
              uploadCount: user.uploadCount || 0,
              approvedCount: imgRes.data.length || 0,
              downloadCount: user.downloadCount || 0
            }
          })
        })
      }
    })
  },

  // 登录
  login() {
    this.setData({ logining: true })
    const db = wx.cloud.database()
    
    // 检查用户是否已存在
    db.collection('users').where({
      _openid: '{openid}'
    }).get().then(res => {
      if (res.data.length > 0) {
        // 用户已存在，直接登录
        const user = res.data[0]
        const userInfo = {
          avatarUrl: user.avatarUrl || '',
          nickName: user.nickName || '微信用户'
        }
        wx.setStorageSync('userInfo', userInfo)
        this.setData({
          userInfo: userInfo,
          isLoggedIn: true,
          logining: false
        })
        this.loadUserInfo()
      } else {
        // 新用户，创建记录
        const userInfo = {
          avatarUrl: '',
          nickName: '微信用户'
        }
        wx.setStorageSync('userInfo', userInfo)
        
        db.collection('users').add({
          data: {
            nickName: '微信用户',
            avatarUrl: '',
            points: 10,
            uploadCount: 0,
            downloadCount: 0,
            createTime: db.serverDate()
          }
        }).then(() => {
          this.setData({
            userInfo: userInfo,
            isLoggedIn: true,
            logining: false,
            userStats: {
              points: 10,
              uploadCount: 0,
              downloadCount: 0
            }
          })
          wx.showToast({ title: '注册成功，赠送100积分', icon: 'success' })
        })
      }
    }).catch(() => {
      this.setData({ logining: false })
      wx.showToast({ title: '登录失败', icon: 'none' })
    })
  },

  // 选择头像
  chooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        
        // 上传到云存储
        wx.showLoading({ title: '上传中...' })
        const timestamp = Date.now()
        const random = Math.random().toString(36).substr(2, 9)
        const cloudPath = `avatars/${timestamp}-${random}.jpg`

        wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: tempFilePath,
          success: (uploadRes) => {
            this.setData({ 'userInfo.avatarUrl': uploadRes.fileID })
            this.updateUserToCloud()
            wx.hideLoading()
            wx.showToast({ title: '头像更新成功', icon: 'success' })
          },
          fail: () => {
            wx.hideLoading()
            wx.showToast({ title: '上传失败', icon: 'none' })
          }
        })
      }
    })
  },

  // 输入昵称
  onNicknameBlur(e) {
    const nickName = e.detail.value || ''
    this.setData({ 'userInfo.nickName': nickName })
    if (this.data.isLoggedIn) {
      this.updateUserToCloud()
    }
  },

  // 更新用户信息到云数据库
  updateUserToCloud() {
    const { avatarUrl, nickName } = this.data.userInfo
    const db = wx.cloud.database()

    wx.setStorageSync('userInfo', this.data.userInfo)

    db.collection('users').where({
      _openid: '{openid}'
    }).get().then(res => {
      if (res.data.length > 0) {
        db.collection('users').doc(res.data[0]._id).update({
          data: {
            nickName: nickName,
            avatarUrl: avatarUrl
          }
        })
      }
    })
  },

  goToUpload() {
    if (!this.data.isLoggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: '/pages/upload/upload'
    })
  },

  goToReview() {
    wx.navigateTo({
      url: '/pages/review/review'
    })
  },

  onLogout() {
    wx.removeStorageSync('userInfo')
    this.setData({
      userInfo: {
        avatarUrl: '',
        nickName: ''
      },
      isLoggedIn: false,
      isAdmin: false,
      userStats: {
        points: 0,
        uploadCount: 0,
        approvedCount: 0,
        downloadCount: 0
      }
    })
  }
})
