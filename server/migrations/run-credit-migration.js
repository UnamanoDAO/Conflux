/**
 * 运行积分系统数据库迁移
 */

const { getConnection } = require('../database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const connection = getConnection();

  try {
    console.log('开始运行积分系统迁移...');

    // 读取SQL文件
    const sqlFile = path.join(__dirname, '007_add_credit_system.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // 先删除注释行，然后分割SQL语句
    const sqlWithoutComments = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');

    // 分割SQL语句（以分号为分隔）
    const statements = sqlWithoutComments
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // 执行每条语句
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const preview = statement.substring(0, 80).replace(/\s+/g, ' ');

      try {
        await connection.execute(statement);
        console.log(`✓ 语句 ${i + 1}/${statements.length} 执行成功: ${preview}...`);
      } catch (error) {
        // 忽略表已存在的错误
        if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.code === 'ER_DUP_ENTRY') {
          console.log(`⊙ 语句 ${i + 1}/${statements.length} 已存在，跳过: ${preview}...`);
        } else {
          console.error(`✗ 语句 ${i + 1}/${statements.length} 执行失败: ${preview}...`);
          console.error('错误:', error.message);
          throw error;
        }
      }
    }

    console.log('\n✓ 积分系统迁移完成!');
    console.log('\n已创建的表:');
    console.log('  - user_credits (用户积分余额表)');
    console.log('  - credit_transactions (积分交易记录表)');
    console.log('  - recharge_orders (充值订单表)');
    console.log('  - model_pricing (模型价格配置表)');
    console.log('\n已初始化的数据:');
    console.log('  - 图像模型价格配置 (7个模型)');
    console.log('  - 视频模型价格配置 (8个模型)');
    console.log('  - 现有用户积分账户初始化');

    process.exit(0);
  } catch (error) {
    console.error('\n✗ 迁移失败:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// 运行迁移
runMigration();
