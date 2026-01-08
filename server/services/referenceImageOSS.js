const OSS = require('ali-oss');
const config = require('../config');
const path = require('path');
const sharp = require('sharp');

class ReferenceImageOSS {
  constructor() {
    this.client = new OSS({
      region: config.oss.region,
      accessKeyId: config.oss.accessKeyId,
      accessKeySecret: config.oss.accessKeySecret,
      bucket: config.oss.bucket,
      endpoint: config.oss.endpoint
    });
  }

  /**
   * 上传参考图到OSS
   * @param {Buffer} fileBuffer - 文件缓冲区
   * @param {string} fileName - 原始文件名
   * @param {string} userId - 用户ID
   * @param {Object} options - 选项
   * @returns {Promise<{url: string, key: string, compressedSize: number}>}
   */
  async uploadReferenceImage(fileBuffer, fileName, userId, options = {}) {
    try {
      const {
        compress = true,
        maxWidth = 1200,
        quality = 0.85,
        generateThumbnail = true
      } = options;

      // 生成唯一的文件名
      const timestamp = Date.now();
      const ext = path.extname(fileName).toLowerCase();
      const baseName = path.basename(fileName, ext);
      const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_');
      const uniqueFileName = `reference-images/${userId}/${timestamp}_${sanitizedBaseName}${ext}`;

      let processedBuffer = fileBuffer;
      let compressedSize = fileBuffer.length;

      // 压缩图片
      if (compress) {
        const compressionResult = await this.compressImage(fileBuffer, maxWidth, quality);
        processedBuffer = compressionResult.buffer;
        compressedSize = compressionResult.buffer.length;
      }

      // 上传原图到OSS
      const result = await this.client.put(uniqueFileName, processedBuffer, {
        headers: {
          'Content-Type': this.getMimeType(ext),
          'Cache-Control': 'public, max-age=31536000' // 1年缓存
        }
      });

      const uploadResult = {
        url: result.url,
        key: uniqueFileName,
        compressedSize: compressedSize,
        originalSize: fileBuffer.length
      };

      // 生成缩略图
      if (generateThumbnail) {
        try {
          const thumbnailKey = uniqueFileName.replace(ext, `_thumb${ext}`);
          const thumbnailBuffer = await this.generateThumbnail(fileBuffer, 300, 0.8);
          
          await this.client.put(thumbnailKey, thumbnailBuffer, {
            headers: {
              'Content-Type': this.getMimeType(ext),
              'Cache-Control': 'public, max-age=31536000'
            }
          });

          uploadResult.thumbnailUrl = result.url.replace(uniqueFileName, thumbnailKey);
          uploadResult.thumbnailKey = thumbnailKey;
        } catch (thumbError) {
          console.warn('缩略图生成失败:', thumbError);
        }
      }

      return uploadResult;
    } catch (error) {
      console.error('OSS上传失败:', error);
      throw new Error(`参考图上传失败: ${error.message}`);
    }
  }

  /**
   * 批量上传参考图
   * @param {Array} files - 文件数组 [{buffer, fileName}]
   * @param {string} userId - 用户ID
   * @param {Object} options - 选项
   * @returns {Promise<Array>}
   */
  async uploadMultipleReferenceImages(files, userId, options = {}) {
    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        const result = await this.uploadReferenceImage(
          file.buffer, 
          file.fileName, 
          userId, 
          options
        );
        results.push({
          success: true,
          ...result,
          originalName: file.fileName
        });
      } catch (error) {
        errors.push({
          fileName: file.fileName,
          error: error.message
        });
      }
    }

    return {
      success: results.length > 0,
      results,
      errors,
      summary: {
        total: files.length,
        success: results.length,
        failed: errors.length
      }
    };
  }

  /**
   * 删除参考图
   * @param {string} key - OSS文件key
   * @param {string} thumbnailKey - 缩略图key（可选）
   * @returns {Promise<boolean>}
   */
  async deleteReferenceImage(key, thumbnailKey = null) {
    try {
      const deletePromises = [this.client.delete(key)];
      
      if (thumbnailKey) {
        deletePromises.push(this.client.delete(thumbnailKey));
      }

      await Promise.all(deletePromises);
      return true;
    } catch (error) {
      console.error('OSS删除失败:', error);
      return false;
    }
  }

  /**
   * 批量删除参考图
   * @param {Array} keys - OSS文件key数组
   * @returns {Promise<{success: number, failed: number}>}
   */
  async deleteMultipleReferenceImages(keys) {
    try {
      const results = await this.client.deleteMulti(keys);
      return {
        success: results.deleted.length,
        failed: results.errors.length,
        errors: results.errors
      };
    } catch (error) {
      console.error('批量删除失败:', error);
      throw error;
    }
  }

  /**
   * 生成预签名URL（用于前端直传）
   * @param {string} fileName - 文件名
   * @param {string} userId - 用户ID
   * @param {number} expires - 过期时间（秒）
   * @returns {Promise<{url: string, key: string, fields: object}>}
   */
  async generatePresignedUrl(fileName, userId, expires = 3600) {
    try {
      const timestamp = Date.now();
      const ext = path.extname(fileName).toLowerCase();
      const baseName = path.basename(fileName, ext);
      const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_');
      const uniqueFileName = `reference-images/${userId}/${timestamp}_${sanitizedBaseName}${ext}`;

      const url = this.client.signatureUrl(uniqueFileName, {
        expires: expires,
        method: 'PUT'
      });

      return {
        url: url,
        key: uniqueFileName,
        fields: {
          key: uniqueFileName,
          'Content-Type': this.getMimeType(ext)
        }
      };
    } catch (error) {
      console.error('生成预签名URL失败:', error);
      throw new Error(`生成上传链接失败: ${error.message}`);
    }
  }

  /**
   * 压缩图片
   * @param {Buffer} imageBuffer - 原始图片缓冲区
   * @param {number} maxWidth - 最大宽度
   * @param {number} quality - 压缩质量 (0-1)
   * @returns {Promise<{buffer: Buffer, format: string, mimeType: string}>}
   */
  async compressImage(imageBuffer, maxWidth = 1200, quality = 0.85) {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      let width = metadata.width;
      let height = metadata.height;
      const originalFormat = metadata.format;
      
      console.log(`参考图格式检测: ${originalFormat}, 尺寸: ${width}x${height}`);

      // 如果图片宽度超过最大宽度，按比例缩放
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      let compressedBuffer;
      let outputFormat = originalFormat;
      let mimeType;

      // 根据原始格式选择压缩方式
      switch (originalFormat) {
        case 'png':
          compressedBuffer = await sharp(imageBuffer)
            .resize(width, height, { 
              fit: 'inside', 
              withoutEnlargement: true 
            })
            .png({ 
              quality: Math.round(quality * 100),
              compressionLevel: 9,
              adaptiveFiltering: true
            })
            .toBuffer();
          mimeType = 'image/png';
          break;
        case 'webp':
          compressedBuffer = await sharp(imageBuffer)
            .resize(width, height, { 
              fit: 'inside', 
              withoutEnlargement: true 
            })
            .webp({ quality: Math.round(quality * 100) })
            .toBuffer();
          mimeType = 'image/webp';
          break;
        case 'gif':
          // GIF保持原样，不进行压缩
          compressedBuffer = imageBuffer;
          mimeType = 'image/gif';
          break;
        case 'jpeg':
        case 'jpg':
          console.log('使用JPEG格式压缩');
          compressedBuffer = await sharp(imageBuffer)
            .resize(width, height, { 
              fit: 'inside', 
              withoutEnlargement: true 
            })
            .jpeg({ 
              quality: Math.round(quality * 100),
              progressive: true,
              mozjpeg: true
            })
            .toBuffer();
          outputFormat = 'jpeg';
          mimeType = 'image/jpeg';
          break;
        default:
          console.log(`未知格式 ${originalFormat}，尝试保持原格式或使用PNG`);
          // 对于未知格式，尝试保持原格式，如果失败则使用PNG
          try {
            // 尝试不转换格式，直接调整尺寸
            compressedBuffer = await sharp(imageBuffer)
              .resize(width, height, { 
                fit: 'inside', 
                withoutEnlargement: true 
              })
              .toBuffer();
            mimeType = `image/${originalFormat}`;
            console.log(`成功保持原格式: ${originalFormat}`);
          } catch (formatError) {
            console.log(`保持原格式失败，转换为PNG: ${formatError.message}`);
            // 如果保持原格式失败，转换为PNG而不是JPEG
            compressedBuffer = await sharp(imageBuffer)
              .resize(width, height, { 
                fit: 'inside', 
                withoutEnlargement: true 
              })
              .png({ 
                quality: Math.round(quality * 100),
                compressionLevel: 9,
                adaptiveFiltering: true
              })
              .toBuffer();
            outputFormat = 'png';
            mimeType = 'image/png';
          }
          break;
      }

      return {
        buffer: compressedBuffer,
        format: outputFormat,
        mimeType: mimeType
      };
    } catch (error) {
      console.error('图片压缩失败:', error);
      // 压缩失败返回原图，尝试检测原始格式
      try {
        const sharp = require('sharp');
        const metadata = await sharp(imageBuffer).metadata();
        const originalFormat = metadata.format || 'unknown';
        console.log(`压缩失败，返回原图，格式: ${originalFormat}`);
        return {
          buffer: imageBuffer,
          format: originalFormat,
          mimeType: `image/${originalFormat}`
        };
      } catch (detectionError) {
        console.error('格式检测也失败:', detectionError);
        return {
          buffer: imageBuffer,
          format: 'unknown',
          mimeType: 'application/octet-stream'
        };
      }
    }
  }

  /**
   * 生成缩略图
   * @param {Buffer} imageBuffer - 原始图片缓冲区
   * @param {number} size - 缩略图尺寸
   * @param {number} quality - 压缩质量
   * @returns {Promise<Buffer>}
   */
  async generateThumbnail(imageBuffer, size = 300, quality = 0.8) {
    try {
      return await sharp(imageBuffer)
        .resize(size, size, { 
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ 
          quality: Math.round(quality * 100),
          progressive: true
        })
        .toBuffer();
    } catch (error) {
      console.error('缩略图生成失败:', error);
      throw error;
    }
  }

  /**
   * 获取MIME类型
   * @param {string} ext - 文件扩展名
   * @returns {string}
   */
  getMimeType(ext) {
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp'
    };
    return mimeTypes[ext.toLowerCase()] || 'image/jpeg';
  }

  /**
   * 检查文件是否为支持的图片格式
   * @param {string} fileName - 文件名
   * @returns {boolean}
   */
  isSupportedImageFormat(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    const supportedFormats = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    return supportedFormats.includes(ext);
  }

  /**
   * 获取文件大小限制（字节）
   * @returns {number}
   */
  getMaxFileSize() {
    return 10 * 1024 * 1024; // 10MB
  }
}

/**
 * 上传文件到OSS（通用函数）
 * @param {Buffer|Stream} fileData - 文件数据
 * @param {string} filename - 文件名
 * @param {string} contentType - 内容类型
 * @returns {Promise<string>} OSS URL
 */
async function uploadToOSS(fileData, filename, contentType) {
  try {
    const instance = new ReferenceImageOSS();
    const result = await instance.client.put(filename, fileData, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000'
      }
    });
    return result.url;
  } catch (error) {
    console.error('OSS上传失败:', error);
    throw new Error(`文件上传失败: ${error.message}`);
  }
}

module.exports = new ReferenceImageOSS();
module.exports.uploadToOSS = uploadToOSS;


