<template>
  <div class="text-model-management">
    <div class="header">
      <h2>文字模型管理</h2>
      <p class="description">管理AI文本生成模型配置</p>
    </div>

    <!-- 操作栏 -->
    <div class="toolbar">
      <el-button type="primary" @click="showAddDialog">
        <el-icon><Plus /></el-icon>
        添加文本模型
      </el-button>
      <el-button @click="loadModels">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
    </div>

    <!-- 模型列表 -->
    <el-table
      v-loading="loading"
      :data="models"
      stripe
      style="width: 100%"
    >
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="display_name" label="前端展示名称" width="180" />
      <el-table-column prop="model_name" label="模型调用名称" width="150" />
      <el-table-column prop="api_url" label="API地址" min-width="200" show-overflow-tooltip />
      <el-table-column prop="role_name" label="Role名称" width="120" />
      <el-table-column label="是否启用" width="100" align="center">
        <template #default="{ row }">
          <el-switch
            v-model="row.is_active"
            :disabled="true"
          />
        </template>
      </el-table-column>
      <el-table-column label="默认模型" width="100" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.is_default" type="success" size="small">默认</el-tag>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="180">
        <template #default="{ row }">
          {{ formatTime(row.created_at) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="showEditDialog(row)">编辑</el-button>
          <el-button
            v-if="!row.is_default"
            size="small"
            type="success"
            @click="handleSetDefault(row.id)"
          >
            设为默认
          </el-button>
          <el-button
            size="small"
            type="danger"
            :disabled="row.is_default"
            @click="handleDelete(row.id)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 添加/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑文本模型' : '添加文本模型'"
      width="700px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="120px"
      >
        <el-form-item label="前端展示名称" prop="display_name">
          <el-input
            v-model="formData.display_name"
            placeholder="例如：GPT-4提示词生成器"
          />
        </el-form-item>

        <el-form-item label="模型调用名称" prop="model_name">
          <el-input
            v-model="formData.model_name"
            placeholder="例如：gpt-4-turbo"
          />
        </el-form-item>

        <el-form-item label="API地址" prop="api_url">
          <el-input
            v-model="formData.api_url"
            placeholder="例如：https://api.openai.com/v1/chat/completions"
          />
        </el-form-item>

        <el-form-item label="API密钥" prop="api_key">
          <el-input
            v-model="formData.api_key"
            type="password"
            show-password
            placeholder="例如：sk-xxx"
          />
        </el-form-item>

        <el-form-item label="Role名称" prop="role_name">
          <el-input
            v-model="formData.role_name"
            placeholder="例如：提示词专家"
          />
        </el-form-item>

        <el-form-item label="Role内容" prop="role_content">
          <el-input
            v-model="formData.role_content"
            type="textarea"
            :rows="6"
            placeholder="系统提示词，描述AI的角色和任务..."
          />
        </el-form-item>

        <el-form-item label="是否启用">
          <el-switch v-model="formData.is_active" />
        </el-form-item>

        <el-form-item label="设为默认">
          <el-switch v-model="formData.is_default" />
          <span style="margin-left: 8px; font-size: 12px; color: #909399;">
            设为默认后，其他模型的默认状态将被取消
          </span>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'
import {
  getAllTextModels,
  addTextModel,
  updateTextModel,
  deleteTextModel,
  setDefaultTextModel
} from '../api/textModelApi'

// 状态
const loading = ref(false)
const models = ref([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref(null)

// 表单数据
const formData = reactive({
  id: null,
  display_name: '',
  model_name: '',
  api_url: '',
  api_key: '',
  role_name: '',
  role_content: '',
  is_active: true,
  is_default: false
})

// 表单验证规则
const formRules = {
  display_name: [
    { required: true, message: '请输入前端展示名称', trigger: 'blur' }
  ],
  model_name: [
    { required: true, message: '请输入模型调用名称', trigger: 'blur' }
  ],
  api_url: [
    { required: true, message: '请输入API地址', trigger: 'blur' },
    { type: 'url', message: '请输入有效的URL', trigger: 'blur' }
  ],
  api_key: [
    { required: true, message: '请输入API密钥', trigger: 'blur' }
  ],
  role_name: [
    { required: true, message: '请输入Role名称', trigger: 'blur' }
  ],
  role_content: [
    { required: true, message: '请输入Role内容', trigger: 'blur' }
  ]
}

// 加载模型列表
const loadModels = async () => {
  try {
    loading.value = true
    const response = await getAllTextModels()
    // 转换数据库的数字类型为布尔值
    const data = response.data.data || []
    models.value = data.map(model => ({
      ...model,
      is_active: Boolean(model.is_active),
      is_default: Boolean(model.is_default)
    }))
  } catch (error) {
    console.error('加载模型列表失败:', error)
    ElMessage.error('加载模型列表失败')
  } finally {
    loading.value = false
  }
}

// 显示添加对话框
const showAddDialog = () => {
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

// 显示编辑对话框
const showEditDialog = (row) => {
  isEdit.value = true
  Object.assign(formData, {
    id: row.id,
    display_name: row.display_name,
    model_name: row.model_name,
    api_url: row.api_url,
    api_key: row.api_key,
    role_name: row.role_name,
    role_content: row.role_content,
    is_active: Boolean(row.is_active),
    is_default: Boolean(row.is_default)
  })
  dialogVisible.value = true
}

// 重置表单
const resetForm = () => {
  Object.assign(formData, {
    id: null,
    display_name: '',
    model_name: '',
    api_url: '',
    api_key: '',
    role_name: '',
    role_content: '',
    is_active: true,
    is_default: false
  })
  formRef.value?.clearValidate()
}

// 提交表单
const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    submitting.value = true

    const data = {
      display_name: formData.display_name,
      model_name: formData.model_name,
      api_url: formData.api_url,
      api_key: formData.api_key,
      role_name: formData.role_name,
      role_content: formData.role_content,
      is_active: formData.is_active,
      is_default: formData.is_default
    }

    if (isEdit.value) {
      await updateTextModel(formData.id, data)
      ElMessage.success('更新成功')
    } else {
      await addTextModel(data)
      ElMessage.success('添加成功')
    }

    dialogVisible.value = false
    loadModels()
  } catch (error) {
    if (error !== false) {
      console.error('提交失败:', error)
      ElMessage.error('操作失败')
    }
  } finally {
    submitting.value = false
  }
}

// 设置默认模型
const handleSetDefault = async (id) => {
  try {
    await ElMessageBox.confirm('确定要将此模型设为默认吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await setDefaultTextModel(id)
    ElMessage.success('设置成功')
    loadModels()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('设置失败:', error)
      ElMessage.error('设置失败')
    }
  }
}

// 删除模型
const handleDelete = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除此模型吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await deleteTextModel(id)
    ElMessage.success('删除成功')
    loadModels()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      const errorMsg = error.response?.data?.error || '删除失败'
      ElMessage.error(errorMsg)
    }
  }
}

// 格式化时间
const formatTime = (time) => {
  if (!time) return ''
  const date = new Date(time)
  return date.toLocaleString('zh-CN')
}

// 初始化
onMounted(() => {
  loadModels()
})
</script>

<style scoped>
.text-model-management {
  padding: 20px;
}

.header {
  margin-bottom: 20px;
}

.header h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  color: #303133;
}

.header .description {
  margin: 0;
  font-size: 14px;
  color: #909399;
}

.toolbar {
  margin-bottom: 16px;
  display: flex;
  gap: 8px;
}
</style>
