/**
 * 添加 Sora2 视频模型到数据库
 * 使用 Node.js 脚本替代直接 MySQL 命令
 */

const mysql = require('mysql2/promise');
const config = require('./config');

const SORA2_MODELS = [
  {
    name: 'Sora2-文生视频',
    provider: 'sora',
    model_type: 'text-to-video',
    model_id: 'sora-2',
    api_url: 'https://api.bltcy.ai',
    api_key: 'sk-BN4GTJpp8Kcx7xEF59Fd605c216d493cB8D81e205f7220De',
    is_active: true
  },
  {
    name: 'Sora2 Pro-文生视频',
    provider: 'sora',
    model_type: 'text-to-video',
    model_id: 'sora-2-pro',
    api_url: 'https://api.bltcy.ai',
    api_key: 'sk-BN4GTJpp8Kcx7xEF59Fd605c216d493cB8D81e205f7220De',
    is_active: true
  },
  {
    name: 'Sora2-图生视频',
    provider: 'sora',
    model_type: 'image-to-video-first',
    model_id: 'sora-2',
    api_url: 'https://api.bltcy.ai',
    api_key: 'sk-BN4GTJpp8Kcx7xEF59Fd605c216d493cB8D81e205f7220De',
    is_active: true
  },
  {
    name: 'Sora2 Pro-图生视频',
    provider: 'sora',
    model_type: 'image-to-video-first',
    model_id: 'sora-2-pro',
    api_url: 'https://api.bltcy.ai',
    api_key: 'sk-BN4GTJpp8Kcx7xEF59Fd605c216d493cB8D81e205f7220De',
    is_active: true
  }
];

async function addSora2Models() {
  let connection;
  
  try {
    console.log('================================================');
    console.log('正在添加 Sora2 模型到数据库...');
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
    
    // 检查是否已存在 Sora2 模型
    console.log('🔍 检查现有 Sora2 模型...');
    const [existingModels] = await connection.execute(
      'SELECT id, name, model_id FROM video_models WHERE provider = ?',
      ['sora']
    );
    
    if (existingModels.length > 0) {
      console.log(`⚠️  发现 ${existingModels.length} 个已存在的 Sora2 模型:`);
      existingModels.forEach(model => {
        console.log(`   - ${model.name} (ID: ${model.id}, model_id: ${model.model_id})`);
      });
      
      // 询问是否继续（自动跳过）
      console.log('\n⏭️  跳过已存在的模型，只添加新模型...\n');
    } else {
      console.log('✅ 未发现已存在的 Sora2 模型\n');
    }
    
    // 获取已存在的 model_id 和 model_type 组合
    const existingKeys = new Set(
      existingModels.map(m => `${m.model_id}`)
    );
    
    // 添加模型
    let addedCount = 0;
    let skippedCount = 0;
    
    console.log('📝 开始添加模型...\n');
    
    for (const model of SORA2_MODELS) {
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
    console.log(`📊 总计: ${SORA2_MODELS.length} 个模型\n`);
    
    // 查询所有 Sora2 模型
    console.log('📋 当前所有 Sora2 模型:');
    const [allSoraModels] = await connection.execute(
      `SELECT id, name, model_type, model_id, is_active 
       FROM video_models 
       WHERE provider = 'sora' 
       ORDER BY id DESC`
    );
    
    if (allSoraModels.length > 0) {
      console.log('');
      allSoraModels.forEach((model, index) => {
        const status = model.is_active ? '✓ 启用' : '✗ 禁用';
        console.log(`${index + 1}. ${model.name}`);
        console.log(`   ID: ${model.id} | model_id: ${model.model_id} | 类型: ${model.model_type} | 状态: ${status}`);
      });
    } else {
      console.log('   (无)');
    }
    
    console.log('\n🎉 Sora2 模型配置完成！可以开始使用了。\n');
    
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
  addSora2Models()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { addSora2Models };

