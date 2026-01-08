/**
 * 豆包 API 连接诊断脚本
 * 用于测试豆包视频生成 API 的连接和配置
 */

const axios = require('axios');
const mysql = require('mysql2/promise');
const config = require('./server/config');

async function testDoubaoAPI() {
  console.log('\n🔍 开始诊断豆包 API 连接...\n');

  try {
    // 1. 连接数据库
    console.log('📊 步骤 1: 连接数据库...');
    const connection = await mysql.createConnection({
      host: config.database.host,
      user: config.database.user,
      password: config.database.password,
      database: config.database.database
    });
    console.log('✅ 数据库连接成功');

    // 2. 获取豆包模型配置
    console.log('\n📊 步骤 2: 获取豆包模型配置...');
    const [models] = await connection.execute(
      'SELECT * FROM video_models WHERE provider = ? AND is_active = 1',
      ['doubao']
    );

    if (models.length === 0) {
      console.error('❌ 未找到活跃的豆包模型配置');
      process.exit(1);
    }

    console.log(`✅ 找到 ${models.length} 个豆包模型配置`);
    
    // 3. 遍历测试每个模型
    for (const model of models) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📝 测试模型: ${model.name} (ID: ${model.id})`);
      console.log(`${'='.repeat(60)}`);
      console.log('配置信息:', {
        model_id: model.model_id,
        api_url: model.api_url,
        api_key_length: model.api_key?.length || 0,
        api_key_preview: model.api_key ? `${model.api_key.substring(0, 10)}...` : 'null',
        mode: model.mode
      });

      // 4. 测试 API 连接（使用一个简单的 GET 请求）
      console.log('\n🌐 步骤 3: 测试 API 连接...');
      
      try {
        // 尝试获取 API 状态或任意合法的 GET 端点
        const testUrl = `${model.api_url}/v2/videos/generations`;
        console.log('请求 URL:', testUrl);
        
        // 测试基本连接
        const testResponse = await axios.head(testUrl, {
          headers: {
            'Authorization': `Bearer ${model.api_key}`
          },
          timeout: 10000,
          validateStatus: (status) => status < 500 // 允许 4xx 错误（说明连接成功）
        }).catch(err => {
          if (err.response) {
            return err.response; // 有响应说明连接成功
          }
          throw err;
        });
        
        console.log('✅ API 可访问，状态码:', testResponse.status);
        
      } catch (apiError) {
        console.error('❌ API 连接失败:', {
          message: apiError.message,
          code: apiError.code,
          errno: apiError.errno,
          syscall: apiError.syscall
        });
        
        // 网络相关错误
        if (apiError.code === 'ECONNRESET') {
          console.log('\n⚠️  诊断建议:');
          console.log('   - ECONNRESET 表示连接被远程服务器重置');
          console.log('   - 可能是 API Key 无效或已过期');
          console.log('   - 可能是 API URL 不正确');
          console.log('   - 可能是网络防火墙限制');
          console.log('   - 建议检查豆包 API 文档和密钥配置');
        } else if (apiError.code === 'ENOTFOUND') {
          console.log('\n⚠️  诊断建议:');
          console.log('   - DNS 解析失败，无法找到主机');
          console.log('   - 请检查 API URL 是否正确');
        } else if (apiError.code === 'ETIMEDOUT') {
          console.log('\n⚠️  诊断建议:');
          console.log('   - 连接超时');
          console.log('   - 可能是网络问题或服务器响应慢');
        }
      }

      // 5. 显示完整的请求示例
      console.log('\n📤 完整请求示例:');
      const sampleRequest = {
        url: `${model.api_url}/v2/videos/generations`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${model.api_key?.substring(0, 20)}...`
        },
        data: {
          prompt: '测试提示词',
          model: model.model_id,
          images: ['https://example.com/image.jpg']
        }
      };
      console.log(JSON.stringify(sampleRequest, null, 2));
    }

    // 6. 关闭数据库连接
    await connection.end();
    console.log('\n✅ 诊断完成');

  } catch (error) {
    console.error('\n❌ 诊断过程出错:', error);
    process.exit(1);
  }
}

// 运行诊断
testDoubaoAPI().catch(console.error);


