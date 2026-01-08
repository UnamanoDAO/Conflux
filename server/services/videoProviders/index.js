/**
 * 视频生成适配器工厂
 * 根据不同的厂商返回相应的适配器实例
 */

/**
 * 获取指定厂商的视频生成适配器
 * @param {string} providerName - 厂商名称
 * @returns {Object} 适配器实例
 */
function getProvider(providerName) {
  switch (providerName.toLowerCase()) {
    case 'doubao':
      return require('./doubaoProvider');
    case 'google':
      return require('./googleVeoProvider');
    case 'ali':
    case 'aliwan':
      return require('./aliWanProvider');
    case 'sora':
    case 'openai':
      return require('./soraProvider');
    default:
      throw new Error(`不支持的视频生成厂商: ${providerName}`);
  }
}

/**
 * 获取支持的厂商列表
 * @returns {Array} 厂商列表
 */
function getSupportedProviders() {
  return [
    {
      id: 'doubao',
      name: '豆包(Doubao)',
      description: '火山引擎的Seedance视频生成模型',
      supported: true
    },
    {
      id: 'google',
      name: 'Google VEO3',
      description: 'Google的视频生成模型',
      supported: true
    },
    {
      id: 'ali',
      name: '阿里万相(Wan)',
      description: '阿里巴巴通义万相视频生成模型',
      supported: true
    },
    {
      id: 'sora',
      name: 'OpenAI Sora2',
      description: 'OpenAI的Sora2视频生成模型，支持HD和长时长',
      supported: true
    }
  ];
}

module.exports = {
  getProvider,
  getSupportedProviders
};

