<template>
  <div class="video-model-management">
    <el-card class="header-card">
      <div class="header-content">
        <h2>视频模型管理</h2>
        <el-button type="primary" @click="showAddDialog">
          <el-icon><Plus /></el-icon>
          添加视频模型
        </el-button>
      </div>
    </el-card>

    <!-- 模型列表 -->
    <el-card class="table-card">
      <el-table 
        :data="modelList" 
        stripe 
        v-loading="loading"
        style="width: 100%">
        
        <el-table-column prop="id" label="ID" width="60" />
        
        <el-table-column prop="name" label="模型名称" width="200">
          <template #default="{ row }">
            <el-tag>{{ row.name }}</el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="provider" label="厂商" width="120">
          <template #default="{ row }">
            <el-tag type="info">{{ getProviderName(row.provider) }}</el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="model_type" label="模型类型" width="180">
          <template #default="{ row }">
            <el-tag :type="getModelTypeColor(row.model_type)">
              {{ getModelTypeName(row.model_type) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="model_id" label="模型ID" width="250" show-overflow-tooltip />
        
        <el-table-column prop="api_url" label="API地址" width="200" show-overflow-tooltip />
        
        <el-table-column prop="is_active" label="状态" width="100">
          <template #default="{ row }">
            <el-switch 
              v-model="row.is_active" 
              :active-value="1" 
              :inactive-value="0"
              @change="toggleActive(row)" />
          </template>
        </el-table-column>
        
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="editModel(row)">
              <el-icon><Edit /></el-icon> 编辑
            </el-button>
            <el-button link type="danger" @click="deleteModel(row)">
              <el-icon><Delete /></el-icon> 删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加/编辑模型对话框 -->
    <el-dialog 
      :title="dialogTitle" 
      v-model="dialogVisible" 
      width="600px"
      @close="resetForm">
      
      <el-form 
        :model="formData" 
        :rules="formRules" 
        ref="formRef" 
        label-width="120px">
        
        <el-form-item label="模型名称" prop="name">
          <el-input v-model="formData.name" placeholder="例如：豆包-文生视频" />
        </el-form-item>
        
        <el-form-item label="功能类型" prop="model_type">
          <el-select v-model="formData.model_type" placeholder="请选择功能类型">
            <el-option label="文生视频" value="text-to-video" />
            <el-option label="图生视频(首帧)" value="image-to-video-first" />
            <el-option label="图生视频(首尾帧)" value="image-to-video-both" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="模型厂商" prop="provider">
          <el-select v-model="formData.provider" placeholder="请选择模型厂商">
            <el-option 
              v-for="provider in supportedProviders" 
              :key="provider.id"
              :label="provider.name" 
              :value="provider.id"
              :disabled="!provider.supported" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="模型型号" prop="model_id">
          <el-input 
            v-model="formData.model_id" 
            placeholder="例如：doubao-seedance-1-0-lite-t2v-250428" />
          <span class="form-tip">API调用时使用的模型ID</span>
        </el-form-item>
        
        <el-form-item label="API地址" prop="api_url">
          <el-input 
            v-model="formData.api_url" 
            placeholder="https://api.example.com" />
        </el-form-item>
        
        <el-form-item label="API Key" prop="api_key">
          <el-input 
            v-model="formData.api_key" 
            type="password"
            show-password
            placeholder="sk-xxxxxxxxxxxxx" />
        </el-form-item>
        
        <el-form-item label="是否启用" prop="is_active">
          <el-switch v-model="formData.is_active" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import api from '../api'

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const modelList = ref([])
const supportedProviders = ref([])
const isEdit = ref(false)
const currentEditId = ref(null)
const formRef = ref(null)

const dialogTitle = computed(() => isEdit.value ? '编辑视频模型' : '添加视频模型')

const formData = ref({
  name: '',
  provider: 'doubao',
  model_type: 'text-to-video',
  model_id: '',
  api_url: '',
  api_key: '',
  is_active: true
})

const formRules = {
  name: [{ required: true, message: '请输入模型名称', trigger: 'blur' }],
  provider: [{ required: true, message: '请选择模型厂商', trigger: 'change' }],
  model_type: [{ required: true, message: '请选择功能类型', trigger: 'change' }],
  model_id: [{ required: true, message: '请输入模型型号', trigger: 'blur' }],
  api_url: [
    { required: true, message: '请输入API地址', trigger: 'blur' },
    { type: 'url', message: '请输入有效的URL', trigger: 'blur' }
  ],
  api_key: [{ required: true, message: '请输入API Key', trigger: 'blur' }]
}

// 获取模型列表
const fetchModels = async () => {
  loading.value = true
  try {
    const response = await api.getVideoModels()
    if (response.data.success) {
      modelList.value = response.data.data
    }
  } catch (error) {
    ElMessage.error('获取模型列表失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

// 获取支持的厂商列表
const fetchProviders = async () => {
  try {
    const response = await api.getVideoProviders()
    if (response.data.success) {
      supportedProviders.value = response.data.data
    }
  } catch (error) {
    console.error('获取厂商列表失败:', error)
    // 使用默认厂商
    supportedProviders.value = [
      { id: 'doubao', name: '豆包(Doubao)', supported: true },
      { id: 'google', name: 'Google VEO3', supported: false }
    ]
  }
}

// 显示添加对话框
const showAddDialog = () => {
  isEdit.value = false
  dialogVisible.value = true
}

// 编辑模型
const editModel = (row) => {
  isEdit.value = true
  currentEditId.value = row.id
  formData.value = {
    name: row.name,
    provider: row.provider,
    model_type: row.model_type,
    model_id: row.model_id,
    api_url: row.api_url,
    api_key: row.api_key,
    is_active: row.is_active === 1
  }
  dialogVisible.value = true
}

// 删除模型
const deleteModel = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除模型 "${row.name}" 吗？此操作不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const response = await api.deleteVideoModel(row.id)
    if (response.data.success) {
      ElMessage.success('删除成功')
      fetchModels()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败: ' + error.message)
    }
  }
}

// 切换启用状态
const toggleActive = async (row) => {
  try {
    const response = await api.toggleVideoModel(row.id)
    if (response.data.success) {
      ElMessage.success(row.is_active ? '已启用' : '已禁用')
    } else {
      // 恢复原状态
      row.is_active = row.is_active === 1 ? 0 : 1
      ElMessage.error('操作失败')
    }
  } catch (error) {
    // 恢复原状态
    row.is_active = row.is_active === 1 ? 0 : 1
    ElMessage.error('操作失败: ' + error.message)
  }
}

// 提交表单
const submitForm = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    
    submitting.value = true
    try {
      const submitData = {
        ...formData.value,
        is_active: formData.value.is_active ? 1 : 0
      }
      
      let response
      if (isEdit.value) {
        response = await api.updateVideoModel(currentEditId.value, submitData)
      } else {
        response = await api.addVideoModel(submitData)
      }
      
      if (response.data.success) {
        ElMessage.success(isEdit.value ? '更新成功' : '添加成功')
        dialogVisible.value = false
        fetchModels()
      }
    } catch (error) {
      ElMessage.error('操作失败: ' + error.message)
    } finally {
      submitting.value = false
    }
  })
}

// 重置表单
const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields()
  }
  formData.value = {
    name: '',
    provider: 'doubao',
    model_type: 'text-to-video',
    model_id: '',
    api_url: '',
    api_key: '',
    is_active: true
  }
  currentEditId.value = null
}

// 工具函数
const getProviderName = (provider) => {
  const names = {
    'doubao': '豆包',
    'google': 'Google'
  }
  return names[provider] || provider
}

const getModelTypeName = (type) => {
  const names = {
    'text-to-video': '文生视频',
    'image-to-video-first': '图生视频(首帧)',
    'image-to-video-both': '图生视频(首尾帧)'
  }
  return names[type] || type
}

const getModelTypeColor = (type) => {
  const colors = {
    'text-to-video': 'success',
    'image-to-video-first': 'warning',
    'image-to-video-both': 'danger'
  }
  return colors[type] || 'info'
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN')
}

// 组件挂载时获取数据
onMounted(() => {
  fetchModels()
  fetchProviders()
})
</script>

<style scoped>
.video-model-management {
  padding: 20px;
}

.header-card {
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content h2 {
  margin: 0;
  font-size: 24px;
  color: #303133;
}

.table-card {
  margin-top: 20px;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  display: block;
}
</style>

