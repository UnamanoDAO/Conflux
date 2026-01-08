/**
 * 测试代理接口
 */

const axios = require('axios');

async function testProxyAPI() {
  console.log('\n🧪 测试代理接口...\n');
  
  // 1. 测试后端服务器是否运行
  console.log('1️⃣ 检查后端服务器...');
  try {
    const healthCheck = await axios.get('http://localhost:3001/api/health', {
      timeout: 2000
    }).catch(() => null);
    
    if (!healthCheck) {
      console.error('❌ 后端服务器未运行（端口3001）');
      console.log('\n请先启动后端服务器：');
      console.log('  cd server');
      console.log('  npm run dev\n');
      return;
    }
    
    console.log('✅ 后端服务器运行正常\n');
  } catch (error) {
    console.error('❌ 后端服务器检查失败:', error.message);
    return;
  }
  
  // 2. 测试代理接口（需要token）
  console.log('2️⃣ 测试代理接口...');
  
  const testImageUrl = 'https://creatimage.oss-cn-beijing.aliyuncs.com/reference-images/2/1757681637936_mmexport1757469016035.jpeg';
  
  // 首先需要登录获取token
  console.log('   登录获取token...');
  try {
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      username: 'xj406085521',
      password: 'xj406085521'
    });
    
    if (!loginResponse.data.token) {
      console.error('❌ 登录失败，无法获取token');
      return;
    }
    
    const token = loginResponse.data.token;
    console.log('   ✅ 登录成功，token:', token.substring(0, 20) + '...\n');
    
    // 测试代理接口
    console.log('   测试代理接口...');
    const proxyResponse = await axios.get('http://localhost:3001/api/proxy-image', {
      params: { url: testImageUrl },
      headers: {
        'Authorization': `Bearer ${token}`
      },
      responseType: 'arraybuffer',
      timeout: 10000
    });
    
    if (proxyResponse.status === 200) {
      console.log('   ✅ 代理接口工作正常');
      console.log('   响应类型:', proxyResponse.headers['content-type']);
      console.log('   响应大小:', proxyResponse.data.length, 'bytes');
    } else {
      console.error('   ❌ 代理接口返回异常状态:', proxyResponse.status);
    }
    
  } catch (error) {
    console.error('❌ 代理接口测试失败:');
    if (error.response) {
      console.error('   状态码:', error.response.status);
      console.error('   错误信息:', error.response.data);
    } else {
      console.error('   错误:', error.message);
    }
  }
  
  console.log('\n✅ 测试完成\n');
}

testProxyAPI().catch(console.error);

