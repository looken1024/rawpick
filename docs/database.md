# 云开发数据库设计

## 1. images 集合（图片表）
字段说明：
- _id: 自动生成
- _openid: 上传者openid（自动）
- thumbnailFileID: 缩略图云存储fileID
- originalFileID: 原图云存储fileID
- title: 图片标题
- category: 分类标签（风景/美女/动漫/美食/宠物/建筑/壁纸）
- tags: 标签数组
- width: 原图宽度
- height: 原图高度
- thumbnailWidth: 缩略图宽度
- thumbnailHeight: 缩略图高度
- fileSize: 原图文件大小(bytes)
- uploadTime: 上传时间
- downloads: 下载次数
- status: 状态（0正常/1隐藏）

索引设置：
- category + uploadTime（复合索引，用于分类查询）
- width + height（复合索引，用于尺寸筛选）
- tags（单字段索引，用于标签搜索）

## 2. users 集合（用户表）
字段说明：
- _id: 自动_id
- _openid: 用户openid（自动）
- nickName: 昵称
- avatarUrl: 头像URL
- points: 积分
- uploadCount: 上传数量
- downloadCount: 下载数量
- createTime: 注册时间

## 3. uploads 集合（上传记录）
字段说明：
- _id: 自动生成
- _openid: 上传者openid
- imageId: 图片表_id
- uploadTime: 上传时间
- status: 状态
