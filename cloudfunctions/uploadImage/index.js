const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const imagesCollection = db.collection('images')

exports.main = async (event, context) => {
  const { fileID, thumbnailFileID, title, categories, category, tags, width, height } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  const catList = Array.isArray(categories) && categories.length ? categories : (category ? [category] : [])
  const mainCategory = catList[0] || '其他'

  try {
    const imageData = {
      _openid: openid,
      thumbnailFileID: thumbnailFileID || fileID,
      originalFileID: fileID,
      title: title || '未命名',
      category: mainCategory,
      categories: catList,
      tags: tags || [],
      width: width || 0,
      height: height || 0,
      uploadTime: db.serverDate(),
      downloads: 0,
      status: 1,
      reviewer: '',
      reviewTime: null
    }

    const dbRes = await imagesCollection.add({ data: imageData })

    return {
      code: 0,
      imageId: dbRes._id,
      fileID: fileID,
      message: '上传成功'
    }
  } catch (err) {
    return { code: -1, message: err.message }
  }
}
