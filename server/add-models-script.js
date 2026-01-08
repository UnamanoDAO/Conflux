/**
 * 添加千问(Qwen)和快手可灵(Kling)模型到数据库
 * 执行方式: node add-models-script.js
 */

const mysql = require('mysql2/promise');
const config = require('./config');

const models = [
  {
    name: 'qwen-image-edit-2509',
    api_key: 'sk-BN4GTJpp8Kcx7xEF59Fd605c216d493cB8D81e205f7220De',
    base_url: 'https://api.bltcy.ai',
    is_default: 0,
    is_active: 1,
    description: '千问图像编辑模型2509版本，支持多图输入和编辑，增强人物、商品、文字一致性，原生支持ControlNet',
    supported_modes: 'image-to-image'  // 仅图生图
  },
  {
    name: 'qwen-image',
    api_key: 'sk-BN4GTJpp8Kcx7xEF59Fd605c216d493cB8D81e205f7220De',
    base_url: 'https://api.bltcy.ai',
    is_default: 0,
    is_active: 1,
    description: '千问文生图模型，支持文本到图像生成，支持size和aspect_ratio参数',
    supported_modes: 'both'  // 文生图和图生图都支持
  },
  {
    name: 'kling-multi-image2image',
    api_key: 'sk-BN4GTJpp8Kcx7xEF59Fd605c216d493cB8D81e205f7220De',
    base_url: 'https://api.bltcy.ai',
    is_default: 0,
    is_active: 1,
    description: '快手可灵多图参考生图模型，支持主体图和场景图，可生成高质量人物/商品/场景融合图像',
    supported_modes: 'image-to-image'  // 仅图生图
  },
  {
    name: 'kling-image-v2-1',
    api_key: 'sk-BN4GTJpp8Kcx7xEF59Fd605c216d493cB8D81e205f7220De',
    base_url: 'https://api.bltcy.ai',
    is_default: 0,
    is_active: 1,
    description: '快手可灵V2.1图像生成模型，支持文生图和图生图，支持多种宽高比',
    supported_modes: 'both'  // 文生图和图生图都支持
  },
  {
    name: 'kling-image-v2',
    api_key: 'sk-BN4GTJpp8Kcx7xEF59Fd605c216d493cB8D81e205f7220De',
    base_url: 'https://api.bltcy.ai',
    is_default: 0,
    is_active: 1,
    description: '快手可灵V2图像生成模型，支持文生图和图生图，高质量输出',
    supported_modes: 'both'  // 文生图和图生图都支持
  }
];

async function addModels() {
  let connection;
  
  try {
    console.log('🔄 正在连接数据库...');
    console.log(`   主机: ${config.database.host}`);
    console.log(`   数据库: ${config.database.database}`);
    
    // 创建数据库连接
    connection = await mysql.createConnection(config.database);
    
    console.log('✅ 数据库连接成功！\n');
    
    let addedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // 逐个添加模型
    for (const model of models) {
      try {
        // 先检查模型是否已存在
        const [existing] = await connection.execute(
          'SELECT id, name FROM ai_models WHERE name = ?',
          [model.name]
        );
        
        if (existing.length > 0) {
          console.log(`⏭️  跳过: ${model.name} (已存在, ID: ${existing[0].id})`);
          skippedCount++;
          continue;
        }
        
        // 插入新模型（包含 supported_modes 字段）
        const [result] = await connection.execute(
          `INSERT INTO ai_models (name, api_key, base_url, is_default, is_active, description, supported_modes) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [model.name, model.api_key, model.base_url, model.is_default, model.is_active, model.description, model.supported_modes || 'both']
        );
        
        console.log(`✅ 添加成功: ${model.name} (ID: ${result.insertId}, 模式: ${model.supported_modes})`);
        addedCount++;
        
      } catch (error) {
        console.error(`❌ 添加失败: ${model.name}`);
        console.error(`   错误: ${error.message}`);
        errorCount++;
      }
    }
    
    // 查询所有添加的模型
    console.log('\n📋 查询已添加的模型:');
    const [allModels] = await connection.execute(
      `SELECT id, name, supported_modes as mode, is_active, created_at 
       FROM ai_models 
       WHERE name IN ('qwen-image-edit-2509', 'qwen-image', 'kling-multi-image2image', 'kling-image-v2-1', 'kling-image-v2')
       ORDER BY id DESC`
    );
    
    console.table(allModels);
    
    // 总结
    console.log('\n📊 执行结果总结:');
    console.log(`   ✅ 成功添加: ${addedCount} 个模型`);
    console.log(`   ⏭️  已跳过: ${skippedCount} 个模型 (已存在)`);
    console.log(`   ❌ 失败: ${errorCount} 个模型`);
    console.log(`   📈 总计: ${models.length} 个模型`);
    
    if (addedCount > 0) {
      console.log('\n🎉 恭喜！模型添加成功！');
      console.log('💡 提示: 请重启后端服务以加载新模型');
    } else if (skippedCount === models.length) {
      console.log('\n✨ 所有模型已存在，无需添加');
    }
    
  } catch (error) {
    console.error('\n❌ 执行失败:');
    console.error(error);
    process.exit(1);
    
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 运行脚本
console.log('🚀 开始添加千问(Qwen)和快手可灵(Kling)模型...\n');
addModels()
  .then(() => {
    console.log('\n✅ 脚本执行完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 脚本执行失败:', error);
    process.exit(1);
  });

