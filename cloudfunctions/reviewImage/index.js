const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const imagesCollection = db.collection('images')
const usersCollection = db.collection('users')

exports.main = async (event, context) => {
  const { imageId, action } = event // action: 'approve' or 'reject'
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    // 验证管理员权限
    const userRes = await usersCollection.where({ _openid: openid }).get()
    if (userRes.data.length === 0 || userRes.data[0].nickName !== 'mooncun') {
      return { code: -1, message: '无管理员权限' }
    }

    // 获取图片信息
    const imageRes = await imagesCollection.doc(imageId).get()
    const image = imageRes.data
    const newStatus = action === 'approve' ? 1 : 2

    // 更新图片状态
    await imagesCollection.doc(imageId).update({
      data: {
        status: newStatus,
        reviewer: openid,
        reviewTime: db.serverDate()
      }
    })

    // 如果审核通过，给上传者增加积分
    if (action === 'approve') {
      await usersCollection.where({ _openid: image._openid }).update({
        data: {
          points: db.command.inc(1)
        }
      })
    }

    return {
      code: 0,
      message: action === 'approve' ? '审核通过' : '已拒绝'
    }
  } catch (err) {
    return {
      code: -1,
      message: err.message
    }
  }
}
