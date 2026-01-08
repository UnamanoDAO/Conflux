const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
const config = require('./config');

async function runMigration() {
  let connection;
  
  try {
    console.log('🔌 连接数据库...');
    connection = await mysql.createConnection({
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.database,
      multipleStatements: true
    });

    console.log('✅ 数据库连接成功');
    
    // 读取SQL文件
    const sqlPath = path.join(__dirname, 'migrations', 'add-work-likes-table.sql');
    const sql = await fs.readFile(sqlPath, 'utf8');
    
    console.log('📝 执行迁移脚本...');
    await connection.query(sql);
    
    console.log('✅ work_likes 表创建成功！');
    
    // 验证表是否创建
    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'work_likes'"
    );
    
    if (tables.length > 0) {
      console.log('✅ 表验证成功');
      
      // 显示表结构
      const [columns] = await connection.query('DESCRIBE work_likes');
      console.log('\n📋 表结构：');
      console.table(columns);
    } else {
      console.log('❌ 表验证失败');
    }
    
  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 运行迁移
runMigration()
  .then(() => {
    console.log('\n✨ 迁移完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 迁移失败:', error);
    process.exit(1);
  });




