App({
  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({
        env: 'cloud1-d9gkyv32i776bf4cc',
        traceUser: true
      })
      // 首次运行初始化数据库（运行一次后可删除）
      wx.cloud.callFunction({ name: 'initDatabase' }).then(res => {
        console.log('数据库初始化:', res.result)
      })
    }
  },
  globalData: {
    userInfo: null
  }
})
