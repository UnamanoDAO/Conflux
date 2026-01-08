const jwt = require('jsonwebtoken');
const config = require('../config');

// JWT密钥，使用统一的配置
const JWT_SECRET = config.jwt.secret;

/**
 * JWT认证中间件
 * 验证请求头中的Authorization token
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: '访问令牌缺失'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: '访问令牌无效或已过期'
      });
    }

    // 统一用户对象格式：将 userId 映射为 id
    req.user = {
      id: decoded.userId,
      userId: decoded.userId,
      username: decoded.username,
      email: decoded.email
    };
    next();
  });
};

/**
 * 生成JWT令牌
 * @param {Object} payload - 用户信息
 * @returns {string} JWT令牌
 */
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: '7d' // 7天过期
  });
};

/**
 * 验证JWT令牌（不抛出错误）
 * @param {string} token - JWT令牌
 * @returns {Object|null} 解码后的用户信息或null
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
};

module.exports = {
  authenticateToken,
  generateToken,
  verifyToken
};
