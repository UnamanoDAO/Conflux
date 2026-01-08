/**
 * 添加 VEO3.1 视频模型到数据库
 * Google 最新的高级人工智能视频生成模型
 */

const mysql = require('mysql2/promise');
const config = require('./config');

// VEO3.1 模型配置
const VEO31_MODELS = [
  // veo3.1-pro - 高质量模式（支持首尾帧）
  {
    name: 'VEO3.1 Pro-文生视频',
    description: 'Google VEO3.1 Pro 高质量模式，支持音频生成',
    provider: 'google',
    model_type: 'text-to-video',
    model_id: 'veo3.1-pro',
    api_url: 'https://api.bltcy.ai',
    api_key: 'sk-BN4GTJpp8Kcx7xEF59Fd605c216d493cB8D81e205f7220De',
    is_active: true
  },
  {
    name: 'VEO3.1 Pro-图生视频（首尾帧）',
    description: 'Google VEO3.1 Pro 高质量模式，支持首尾帧，支持音频生成',
    provider: 'google',
    model_type: 'image-to-video-both',
    model_id: 'veo3.1-pro',
    api_url: 'https://api.bltcy.ai',
    api_key: 'sk-BN4GTJpp8Kcx7xEF59Fd605c216d493cB8D81e205f7220De',
    is_active: true
  },
  
  // veo3.1 - 快速模式（支持首尾帧）
  {
    name: 'VEO3.1-文生视频',
    description: 'Google VEO3.1 快速模式，支持音频生成，性价比最高',
    provider: 'google',
    model_type: 'text-to-video',
    model_id: 'veo3.1',
    api_url: 'https://api.bltcy.ai',
    api_key: 'sk-BN4GTJpp8Kcx7xEF59Fd605c216d493cB8D81e205f7220De',
    is_active: true
  },
  {
    name: 'VEO3.1-图生视频（首尾帧）',
    description: 'Google VEO3.1 快速模式，支持首尾帧，支持音频生成，性价比最高',
    provider: 'google',
    model_type: 'image-to-video-both',
    model_id: 'veo3.1',
    api_url: 'https://api.bltcy.ai',
    api_key: 'sk-BN4GTJpp8Kcx7xEF59Fd605c216d493cB8D81e205f7220De',
    is_active: true
  },
  
  // veo3.1-components - 快速模式（支持多图融合 1-3张）
  {
    name: 'VEO3.1 Components-文生视频',
    description: 'Google VEO3.1 Components 快速模式，支持音频生成',
    provider: 'google',
    model_type: 'text-to-video',
    model_id: 'veo3.1-components',
    api_url: 'https://api.bltcy.ai',
    api_key: 'sk-BN4GTJpp8Kcx7xEF59Fd605c216d493cB8D81e205f7220De',
    is_active: true
  },
  {
    name: 'VEO3.1 Components-图生视频（多图融合）',
    description: 'Google VEO3.1 Components 快速模式，支持1-3张图片融合，支持音频生成',
    provider: 'google',
    model_type: 'image-to-video-first',
    model_id: 'veo3.1-components',
    api_url: 'https://api.bltcy.ai',
    api_key: 'sk-BN4GTJpp8Kcx7xEF59Fd605c216d493cB8D81e205f7220De',
    is_active: true
  }
];

async function addVeo31Models() {
  let connection;
  
  try {
    console.log('================================================');
    console.log('正在添加 VEO3.1 模型到数据库...');
    console.log('================================================\n');
    
    console.log(`数据库: ${config.database.database}`);
    console.log(`主机: ${config.database.host}`);
    console.log(`用户: ${config.database.user}\n`);
    
    // 创建数据库连接
    console.log('📡 正在连接数据库...');
    connection = await mysql.createConnection({
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.database
    });
    console.log('✅ 数据库连接成功\n');
    
    // 检查是否已存在 VEO3.1 模型
    console.log('🔍 检查现有 VEO3.1 模型...');
    const [existingModels] = await connection.execute(
      'SELECT id, name, model_id, model_type FROM video_models WHERE provider = ? AND model_id LIKE ?',
      ['google', 'veo3.1%']
    );
    
    if (existingModels.length > 0) {
      console.log(`⚠️  发现 ${existingModels.length} 个已存在的 VEO3.1 模型:`);
      existingModels.forEach(model => {
        console.log(`   - ${model.name} (ID: ${model.id}, model_id: ${model.model_id}, type: ${model.model_type})`);
      });
      console.log('\n⏭️  跳过已存在的模型，只添加新模型...\n');
    } else {
      console.log('✅ 未发现已存在的 VEO3.1 模型\n');
    }
    
    // 添加模型
    let addedCount = 0;
    let skippedCount = 0;
    
    console.log('📝 开始添加模型...\n');
    
    for (const model of VEO31_MODELS) {
      // 检查是否已存在（根据 name 或 model_id + model_type）
      const [existing] = await connection.execute(
        'SELECT id FROM video_models WHERE name = ? OR (model_id = ? AND model_type = ?)',
        [model.name, model.model_id, model.model_type]
      );
      
      if (existing.length > 0) {
        console.log(`⏭️  跳过: ${model.name} (已存在)`);
        skippedCount++;
        continue;
      }
      
      // 插入模型
      try {
        const [result] = await connection.execute(
          `INSERT INTO video_models 
           (name, provider, model_type, model_id, api_url, api_key, is_active) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            model.name,
            model.provider,
            model.model_type,
            model.model_id,
            model.api_url,
            model.api_key,
            model.is_active
          ]
        );
        
        console.log(`✅ 添加成功: ${model.name} (ID: ${result.insertId})`);
        if (model.description) {
          console.log(`   说明: ${model.description}`);
        }
        addedCount++;
      } catch (error) {
        console.error(`❌ 添加失败: ${model.name}`);
        console.error(`   错误: ${error.message}`);
      }
    }
    
    console.log('\n================================================');
    console.log('添加完成！');
    console.log('================================================');
    console.log(`✅ 成功添加: ${addedCount} 个模型`);
    console.log(`⏭️  跳过: ${skippedCount} 个模型`);
    console.log(`📊 总计: ${VEO31_MODELS.length} 个模型\n`);
    
    // 查询所有 VEO3.1 模型
    console.log('📋 当前所有 VEO3.1 模型:');
    const [allVeo31Models] = await connection.execute(
      `SELECT id, name, model_type, model_id, is_active 
       FROM video_models 
       WHERE provider = 'google' AND model_id LIKE 'veo3.1%'
       ORDER BY model_id, model_type`
    );
    
    if (allVeo31Models.length > 0) {
      console.log('');
      
      // 按 model_id 分组显示
      const groupedModels = {};
      allVeo31Models.forEach(model => {
        if (!groupedModels[model.model_id]) {
          groupedModels[model.model_id] = [];
        }
        groupedModels[model.model_id].push(model);
      });
      
      let index = 1;
      Object.keys(groupedModels).sort().forEach(modelId => {
        console.log(`\n【${modelId}】`);
        groupedModels[modelId].forEach(model => {
          const status = model.is_active ? '✓ 启用' : '✗ 禁用';
          const typeLabel = model.model_type === 'text-to-video' ? '文生视频' : 
                           model.model_type === 'image-to-video-both' ? '图生视频(首尾帧)' :
                           '图生视频(首帧)';
          console.log(`${index}. ${model.name}`);
          console.log(`   ID: ${model.id} | 类型: ${typeLabel} | 状态: ${status}`);
          index++;
        });
      });
    } else {
      console.log('   (无)');
    }
    
    console.log('\n');
    console.log('================================================');
    console.log('📌 模型特点说明');
    console.log('================================================');
    console.log('');
    console.log('🌟 veo3.1-pro (高质量模式)');
    console.log('   • 质量超高，价格也超高');
    console.log('   • 支持首尾帧');
    console.log('   • 自动生成配套音频');
    console.log('   • 适合：追求极致质量的专业场景');
    console.log('');
    console.log('⚡ veo3.1 (快速模式 - 推荐)');
    console.log('   • 性价比最高的选择');
    console.log('   • 质量高，价格很低');
    console.log('   • 支持首尾帧');
    console.log('   • 自动生成配套音频');
    console.log('   • 适合：日常使用和大批量生成');
    console.log('');
    console.log('🎨 veo3.1-components (多图融合)');
    console.log('   • 快速模式');
    console.log('   • 支持1-3张图片融合参考');
    console.log('   • 自动生成配套音频');
    console.log('   • 适合：需要多图引导的创意场景');
    console.log('');
    console.log('🎉 VEO3.1 模型配置完成！可以开始使用了。\n');
    
  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    console.error('\n详细错误信息:');
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 数据库连接已关闭\n');
    }
  }
}

// 运行脚本
if (require.main === module) {
  addVeo31Models()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { addVeo31Models };

