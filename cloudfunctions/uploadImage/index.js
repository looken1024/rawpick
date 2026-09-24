const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const imagesCollection = db.collection('images')
const usersCollection = db.collection('users')

exports.main = async (event, context) => {
  const { fileID, thumbnailFileID, title, category, tags, width, height } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    const imageData = {
      _openid: openid,
      thumbnailFileID: thumbnailFileID || fileID,
      originalFileID: fileID,
      title: title || '未命名',
      category: category || '其他',
      tags: tags || [],
      width: width || 0,
      height: height || 0,
      uploadTime: db.serverDate(),
      downloads: 0,
      status: 0,
      reviewer: '',
      reviewTime: null
    }

    const dbRes = await imagesCollection.add({ data: imageData })

    await usersCollection.where({ _openid: openid }).update({
      data: { uploadCount: db.command.inc(1) }
    }).catch(async () => {
      await usersCollection.add({
        data: {
          _openid: openid,
          nickName: '',
          avatarUrl: '',
          points: 0,
          uploadCount: 1,
          downloadCount: 0,
          createTime: db.serverDate()
        }
      })
    })

    return {
      code: 0,
      imageId: dbRes._id,
      fileID: fileID,
      message: '上传成功，等待审核'
    }
  } catch (err) {
    return { code: -1, message: err.message }
  }
}
