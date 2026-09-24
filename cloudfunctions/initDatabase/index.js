const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    // 创建 images 集合
    try {
      await db.createCollection('images')
    } catch (e) {
      console.log('images collection exists')
    }

    // 创建 users 集合
    try {
      await db.createCollection('users')
    } catch (e) {
      console.log('users collection exists')
    }

    // 创建 indexes
    try {
      await db.collection('images').createIndex({
        category: 1,
        uploadTime: -1
      })
    } catch (e) {
      console.log('index exists')
    }

    try {
      await db.collection('images').createIndex({
        width: 1,
        height: 1
      })
    } catch (e) {
      console.log('index exists')
    }

    try {
      await db.collection('images').createIndex({
        tags: 1
      })
    } catch (e) {
      console.log('index exists')
    }

    return {
      code: 0,
      message: 'Database initialized successfully'
    }
  } catch (err) {
    return {
      code: -1,
      message: err.message
    }
  }
}
