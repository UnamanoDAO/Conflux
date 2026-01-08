#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re

# 读取文件
with open('frontend/src/App.vue', 'r', encoding='utf-8') as f:
    content = f.read()

# 修复所有缺少引号的el-tab-pane标签
# 第一个问题已经修复了，现在修复剩余的
content = re.sub(r'label="[^"]*?\s+name="image-to-image"', r'label="图生图" name="image-to-image"', content)

# 保存文件
with open('frontend/src/App.vue', 'w', encoding='utf-8') as f:
    f.write(content)

print("文件已修复")