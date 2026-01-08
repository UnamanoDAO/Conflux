
#!/bin/bash
# 执行添加千问和快手可灵模型的SQL脚本

# 数据库配置
DB_HOST="rm-2ze58tvrta52qmyz1lo.mysql.rds.aliyuncs.com"
DB_USER="sousoujuan"
DB_PASSWORD="Xj196210*"
DB_NAME="creatimage"

echo "正在连接阿里云RDS数据库..."
echo "执行SQL脚本: add-qwen-kling-models.sql"

# 执行SQL脚本
mysql -h ${DB_HOST} -u ${DB_USER} -p${DB_PASSWORD} ${DB_NAME} < add-qwen-kling-models.sql

if [ $? -eq 0 ]; then
    echo "✅ SQL脚本执行成功！"
    echo "已添加5个模型：2个Qwen + 3个Kling"
else
    echo "❌ SQL脚本执行失败，请检查错误信息"
fi

