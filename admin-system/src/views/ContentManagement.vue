<template>
  <div class="content-management">
    <!-- 固定头部区域 -->
    <div class="fixed-header">
      <!-- 用户选择器 -->
      <div class="user-selector-row">
        <div class="user-selector-left">
          <span class="selector-label">选择用户:</span>
          <el-select
            v-model="selectedUserId"
            placeholder="选择用户查看其内容"
            clearable
            @change="onUserChange"
            style="width: 300px"
          >
            <el-option
              v-for="user in users"
              :key="user.id"
              :label="`${user.username} (${user.email})`"
              :value="user.id"
            />
          </el-select>
        </div>
        <div v-if="selectedUser" class="selected-user-info">
          <el-tag type="info">
            当前选择: {{ selectedUser.username }} ({{ selectedUser.email }})
          </el-tag>
        </div>
      </div>
      
      <!-- 自定义标签页头部 -->
      <div class="custom-tabs-header">
        <div 
          class="tab-item" 
          :class="{ active: activeTab === 'prompts' }"
          @click="activeTab = 'prompts'"
        >
          提示词管理
        </div>
        <div 
          class="tab-item" 
          :class="{ active: activeTab === 'images' }"
          @click="activeTab = 'images'"
        >
          参考图片管理
        </div>
        <div 
          class="tab-item" 
          :class="{ active: activeTab === 'generations' }"
          @click="activeTab = 'generations'"
        >
          生成作品管理
        </div>
      </div>
    </div>
    
    <!-- 可滚动内容区域 -->
    <div class="scrollable-content">
      <!-- 提示词管理 -->
      <div v-show="activeTab === 'prompts'" class="tab-content">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>常用提示词</span>
              <el-button type="primary" @click="showAddPromptDialog">
                <el-icon><Plus /></el-icon>
                添加提示词
              </el-button>
            </div>
          </template>
          
          <el-table
            v-loading="promptsLoading"
            :data="prompts"
            stripe
          >
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="name" label="名称" width="150" />
            <el-table-column prop="content" label="内容" min-width="300" />
            <el-table-column prop="category" label="分类" width="120" />
            <el-table-column prop="username" label="用户" width="120" />
            <el-table-column prop="usage_count" label="使用次数" width="100" />
            <el-table-column label="操作" width="150">
              <template #default="{ row }">
                <el-button size="small" @click="editPrompt(row)">编辑</el-button>
                <el-button size="small" type="danger" @click="deletePrompt(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </div>
      
      <!-- 参考图片管理 -->
      <div v-show="activeTab === 'images'" class="tab-content">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>参考图片</span>
              <el-button type="primary" @click="showAddImageDialog">
                <el-icon><Plus /></el-icon>
                添加图片
              </el-button>
            </div>
          </template>
          
          <div class="image-grid">
            <div
              v-for="image in referenceImages"
              :key="image.id"
              class="image-item"
            >
              <el-image
                :src="image.url"
                :preview-src-list="referenceImages.map(img => img.url)"
                fit="cover"
                class="image"
              />
              <div class="image-info">
                <p>{{ image.name }}</p>
                <p class="user-info">{{ image.username || '未知用户' }}</p>
                <div class="image-actions">
                  <el-button size="small" @click="editImage(image)">编辑</el-button>
                  <el-button size="small" type="danger" @click="deleteImage(image)">删除</el-button>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </div>
      
      <!-- 生成作品管理 -->
      <div v-show="activeTab === 'generations'" class="tab-content">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>用户生成作品</span>
              <div class="header-actions">
                <el-input
                  v-model="generationSearchKeyword"
                  placeholder="搜索提示词内容"
                  style="width: 200px; margin-right: 10px"
                  @input="handleGenerationSearch"
                />
                <el-button type="primary" @click="refreshGenerations">
                  <el-icon><Refresh /></el-icon>
                  刷新
                </el-button>
              </div>
            </div>
          </template>
          
          <el-table
            v-loading="generationsLoading"
            :data="generations"
            stripe
            style="width: 100%"
          >
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="prompt" label="提示词" min-width="200" show-overflow-tooltip />
            <el-table-column prop="mode" label="模式" width="120">
              <template #default="{ row }">
                <el-tag :type="row.mode === 'text-to-image' ? 'primary' : 'success'">
                  {{ row.mode === 'text-to-image' ? '文生图' : '图生图' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="size" label="尺寸" width="100" />
            <el-table-column prop="quantity" label="数量" width="80" />
            <el-table-column prop="username" label="用户" width="120" />
            <el-table-column prop="createdAt" label="生成时间" width="180" />
            <el-table-column label="生成图片" width="120">
              <template #default="{ row }">
                <el-button size="small" type="primary" @click="viewGeneratedImages(row)">
                  查看图片({{ row.generatedImages ? row.generatedImages.length : 0 }})
                </el-button>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template #default="{ row }">
                <el-button size="small" type="danger" @click="deleteGeneration(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          
          <!-- 分页 -->
          <div class="pagination">
            <el-pagination
              v-model:current-page="generationPagination.page"
              v-model:page-size="generationPagination.pageSize"
              :page-sizes="[10, 20, 50, 100]"
              :total="generationPagination.total"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="handleGenerationSizeChange"
              @current-change="handleGenerationCurrentChange"
            />
          </div>
        </el-card>
      </div>
    </div>
    
    <!-- 添加/编辑提示词对话框 -->
    <el-dialog
      v-model="promptDialogVisible"
      :title="isEditPrompt ? '编辑提示词' : '添加提示词'"
      width="600px"
    >
      <el-form :model="promptForm" :rules="promptRules" ref="promptFormRef" label-width="80px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="promptForm.name" placeholder="请输入提示词名称" />
        </el-form-item>
        
        <el-form-item label="内容" prop="content">
          <el-input
            v-model="promptForm.content"
            type="textarea"
            :rows="4"
            placeholder="请输入提示词内容"
          />
        </el-form-item>
        
        <el-form-item label="分类" prop="category">
          <el-input v-model="promptForm.category" placeholder="请输入分类" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="promptDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="savePrompt">确定</el-button>
      </template>
    </el-dialog>
    
    <!-- 添加/编辑图片对话框 -->
    <el-dialog
      v-model="imageDialogVisible"
      :title="isEditImage ? '编辑图片' : '添加图片'"
      width="500px"
    >
      <el-form :model="imageForm" :rules="imageRules" ref="imageFormRef" label-width="80px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="imageForm.name" placeholder="请输入图片名称" />
        </el-form-item>
        
        <el-form-item label="图片" prop="file">
          <el-upload
            v-model:file-list="imageForm.fileList"
            :auto-upload="false"
            :on-change="handleImageChange"
            accept="image/*"
            list-type="picture-card"
            :limit="1"
          >
            <el-icon><Plus /></el-icon>
          </el-upload>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="imageDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveImage">确定</el-button>
      </template>
    </el-dialog>
    
    <!-- 查看生成图片对话框 -->
    <el-dialog
      v-model="generatedImagesDialogVisible"
      title="生成图片"
      width="80%"
      :before-close="closeGeneratedImagesDialog"
    >
      <div v-if="currentGeneration" class="generation-info">
        <h3>生成信息</h3>
        <p><strong>提示词:</strong> {{ currentGeneration.prompt }}</p>
        <p><strong>模式:</strong> {{ currentGeneration.mode === 'text-to-image' ? '文生图' : '图生图' }}</p>
        <p><strong>尺寸:</strong> {{ currentGeneration.size }}</p>
        <p><strong>数量:</strong> {{ currentGeneration.quantity }}</p>
        <p><strong>生成时间:</strong> {{ currentGeneration.createdAt }}</p>
      </div>
      
      <div class="generated-images-grid">
        <div
          v-for="(image, index) in currentGenerationImages"
          :key="index"
          class="generated-image-item"
        >
          <el-image
            :src="image.url"
            :preview-src-list="currentGenerationImages.map(img => img.url)"
            :initial-index="index"
            fit="cover"
            class="generated-image"
          />
          <div class="image-info">
            <p>{{ image.url }}</p>
            <el-button size="small" @click="downloadImage(image.url)">下载</el-button>
          </div>
        </div>
      </div>
      
      <template #footer>
        <el-button @click="generatedImagesDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '../api/index.js'
import { useRoute } from 'vue-router'

export default {
  name: 'ContentManagement',
  setup() {
    const route = useRoute()
    const activeTab = ref('prompts')
    const promptsLoading = ref(false)
    const prompts = ref([])
    const referenceImages = ref([])
    
    // 用户管理相关
    const users = ref([])
    const selectedUserId = ref(null)
    const selectedUser = ref(null)
    
    // 提示词相关
    const promptDialogVisible = ref(false)
    const isEditPrompt = ref(false)
    const promptFormRef = ref()
    const promptForm = reactive({
      id: null,
      name: '',
      content: '',
      category: ''
    })
    
    const promptRules = {
      name: [{ required: true, message: '请输入提示词名称', trigger: 'blur' }],
      content: [{ required: true, message: '请输入提示词内容', trigger: 'blur' }],
      category: [{ required: true, message: '请输入分类', trigger: 'blur' }]
    }
    
    // 图片相关
    const imageDialogVisible = ref(false)
    const isEditImage = ref(false)
    const imageFormRef = ref()
    const imageForm = reactive({
      id: null,
      name: '',
      fileList: []
    })
    
    const imageRules = {
      name: [{ required: true, message: '请输入图片名称', trigger: 'blur' }],
      file: [{ required: true, message: '请选择图片', trigger: 'change' }]
    }
    
    // 生成作品相关
    const generations = ref([])
    const generationsLoading = ref(false)
    const generationSearchKeyword = ref('')
    const generationPagination = reactive({
      page: 1,
      pageSize: 20,
      total: 0
    })
    
    // 查看生成图片对话框相关
    const generatedImagesDialogVisible = ref(false)
    const currentGeneration = ref(null)
    const currentGenerationImages = ref([])
    
    // 获取用户列表
    const fetchUsers = async () => {
      try {
        const response = await api.get('/users')
        
        if (response.data.success) {
          users.value = response.data.users
        } else {
          ElMessage.error('获取用户列表失败')
        }
      } catch (error) {
        console.error('获取用户列表失败:', error)
        ElMessage.error('获取用户列表失败')
      }
    }
    
    // 用户选择变化处理
    const onUserChange = () => {
      selectedUser.value = users.value.find(user => user.id === selectedUserId.value)
      fetchPrompts()
      fetchReferenceImages()
      fetchGenerations()
    }
    
    const fetchPrompts = async () => {
      try {
        promptsLoading.value = true
        const params = selectedUserId.value ? { userId: selectedUserId.value } : {}
        const response = await api.get('/prompts', { params })
        
        if (response.data.success) {
          prompts.value = response.data.prompts
        } else {
          ElMessage.error('获取提示词失败')
        }
      } catch (error) {
        console.error('获取提示词失败:', error)
        ElMessage.error('获取提示词失败')
      } finally {
        promptsLoading.value = false
      }
    }
    
    const fetchReferenceImages = async () => {
      try {
        const params = selectedUserId.value ? { userId: selectedUserId.value } : {}
        const response = await api.get('/reference-images', { params })
        
        if (response.data.success) {
          referenceImages.value = response.data.images
        } else {
          ElMessage.error('获取参考图片失败')
        }
      } catch (error) {
        console.error('获取参考图片失败:', error)
        ElMessage.error('获取参考图片失败')
      }
    }
    
    const showAddPromptDialog = () => {
      isEditPrompt.value = false
      promptForm.id = null
      promptForm.name = ''
      promptForm.content = ''
      promptForm.category = ''
      promptDialogVisible.value = true
    }
    
    const editPrompt = (prompt) => {
      isEditPrompt.value = true
      promptForm.id = prompt.id
      promptForm.name = prompt.name
      promptForm.content = prompt.content
      promptForm.category = prompt.category
      promptDialogVisible.value = true
    }
    
    const savePrompt = async () => {
      if (!promptFormRef.value) return
      
      try {
        const valid = await promptFormRef.value.validate()
        if (!valid) return
        
        const url = isEditPrompt.value ? `/prompts/${promptForm.id}` : '/prompts'
        const method = isEditPrompt.value ? 'put' : 'post'
        
        const response = await api[method](url, {
          name: promptForm.name,
          content: promptForm.content,
          category: promptForm.category
        })
        
        if (response.data.success) {
          ElMessage.success(isEditPrompt.value ? '提示词更新成功' : '提示词添加成功')
          promptDialogVisible.value = false
          fetchPrompts()
        } else {
          ElMessage.error('操作失败')
        }
      } catch (error) {
        console.error('保存提示词失败:', error)
        ElMessage.error('操作失败')
      }
    }
    
    const deletePrompt = async (prompt) => {
      try {
        await ElMessageBox.confirm(
          `确定要删除提示词 "${prompt.name}" 吗？`,
          '确认删除',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        
        const response = await api.delete(`/prompts/${prompt.id}`)
        
        if (response.data.success) {
          ElMessage.success('提示词删除成功')
          fetchPrompts()
        } else {
          ElMessage.error('删除失败')
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('删除提示词失败:', error)
          ElMessage.error('删除失败')
        }
      }
    }
    
    const showAddImageDialog = () => {
      isEditImage.value = false
      imageForm.id = null
      imageForm.name = ''
      imageForm.fileList = []
      imageDialogVisible.value = true
    }
    
    const editImage = (image) => {
      isEditImage.value = true
      imageForm.id = image.id
      imageForm.name = image.name
      imageForm.fileList = []
      imageDialogVisible.value = true
    }
    
    const handleImageChange = (file) => {
      imageForm.fileList = [file]
    }
    
    const saveImage = async () => {
      if (!imageFormRef.value) return
      
      try {
        const valid = await imageFormRef.value.validate()
        if (!valid) return
        
        if (imageForm.fileList.length === 0) {
          ElMessage.error('请选择图片')
          return
        }
        
        const formData = new FormData()
        formData.append('name', imageForm.name)
        formData.append('image', imageForm.fileList[0].raw)
        
        const url = isEditImage.value ? `/reference-images/${imageForm.id}` : '/reference-images'
        const method = isEditImage.value ? 'put' : 'post'
        
        const response = await api[method](url, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        
        if (response.data.success) {
          ElMessage.success(isEditImage.value ? '图片更新成功' : '图片添加成功')
          imageDialogVisible.value = false
          fetchReferenceImages()
        } else {
          ElMessage.error('操作失败')
        }
      } catch (error) {
        console.error('保存图片失败:', error)
        ElMessage.error('操作失败')
      }
    }
    
    const deleteImage = async (image) => {
      try {
        await ElMessageBox.confirm(
          `确定要删除图片 "${image.name}" 吗？`,
          '确认删除',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        
        const response = await api.delete(`/reference-images/${image.id}`)
        
        if (response.data.success) {
          ElMessage.success('图片删除成功')
          fetchReferenceImages()
        } else {
          ElMessage.error('删除失败')
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('删除图片失败:', error)
          ElMessage.error('删除失败')
        }
      }
    }
    
    // 生成作品管理相关方法
    const fetchGenerations = async () => {
      try {
        generationsLoading.value = true
        const params = {
          page: generationPagination.page,
          pageSize: generationPagination.pageSize,
          search: generationSearchKeyword.value
        }
        
        if (selectedUserId.value) {
          params.userId = selectedUserId.value
        }
        
        const response = await api.get('/generations', { params })
        
        if (response.data.success) {
          generations.value = response.data.records || []
          generationPagination.total = response.data.pagination?.total || 0
        } else {
          ElMessage.error('获取生成作品失败')
        }
      } catch (error) {
        console.error('获取生成作品失败:', error)
        ElMessage.error('获取生成作品失败')
      } finally {
        generationsLoading.value = false
      }
    }
    
    const handleGenerationSearch = () => {
      generationPagination.page = 1
      fetchGenerations()
    }
    
    const handleGenerationSizeChange = (size) => {
      generationPagination.pageSize = size
      generationPagination.page = 1
      fetchGenerations()
    }
    
    const handleGenerationCurrentChange = (page) => {
      generationPagination.page = page
      fetchGenerations()
    }
    
    const refreshGenerations = () => {
      fetchGenerations()
    }
    
    const viewGeneratedImages = (generation) => {
      currentGeneration.value = generation
      currentGenerationImages.value = generation.generatedImages || []
      generatedImagesDialogVisible.value = true
    }
    
    const closeGeneratedImagesDialog = () => {
      generatedImagesDialogVisible.value = false
      currentGeneration.value = null
      currentGenerationImages.value = []
    }
    
    const downloadImage = (url) => {
      const link = document.createElement('a')
      link.href = url
      link.download = url.split('/').pop() || 'image.png'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
    
    const deleteGeneration = async (generation) => {
      try {
        await ElMessageBox.confirm(
          `确定要删除这条生成记录吗？`,
          '确认删除',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        
        const response = await api.delete(`/generations/${generation.id}`)
        
        if (response.data.success) {
          ElMessage.success('删除成功')
          fetchGenerations()
        } else {
          ElMessage.error('删除失败')
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('删除生成记录失败:', error)
          ElMessage.error('删除失败')
        }
      }
    }
    
    onMounted(() => {
      fetchUsers()
      
      // 检查是否从用户管理页面跳转过来
      const selectedUserData = sessionStorage.getItem('selectedUserForContent')
      if (selectedUserData) {
        try {
          const userData = JSON.parse(selectedUserData)
          selectedUserId.value = userData.id
          selectedUser.value = userData
          
          // 清除sessionStorage中的数据
          sessionStorage.removeItem('selectedUserForContent')
          
          // 加载该用户的内容
          fetchPrompts()
          fetchReferenceImages()
          fetchGenerations()
        } catch (error) {
          console.error('解析用户数据失败:', error)
        }
      } else {
        // 如果没有指定用户，加载所有内容
        fetchPrompts()
        fetchReferenceImages()
        fetchGenerations()
      }
      
      // 检查URL参数中的标签页
      if (route.query.tab) {
        activeTab.value = route.query.tab
      }
    })
    
    return {
      activeTab,
      promptsLoading,
      prompts,
      referenceImages,
      users,
      selectedUserId,
      selectedUser,
      promptDialogVisible,
      isEditPrompt,
      promptFormRef,
      promptForm,
      promptRules,
      imageDialogVisible,
      isEditImage,
      imageFormRef,
      imageForm,
      imageRules,
      generations,
      generationsLoading,
      generationSearchKeyword,
      generationPagination,
      generatedImagesDialogVisible,
      currentGeneration,
      currentGenerationImages,
      fetchUsers,
      onUserChange,
      showAddPromptDialog,
      editPrompt,
      savePrompt,
      deletePrompt,
      showAddImageDialog,
      editImage,
      handleImageChange,
      saveImage,
      deleteImage,
      fetchGenerations,
      handleGenerationSearch,
      handleGenerationSizeChange,
      handleGenerationCurrentChange,
      refreshGenerations,
      viewGeneratedImages,
      closeGeneratedImagesDialog,
      downloadImage,
      deleteGeneration
    }
  }
}
</script>

<style scoped>
.content-management {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.fixed-header {
  background: white;
  padding: 15px 20px;
  border-bottom: 1px solid #e6e6e6;
  flex-shrink: 0;
}

.user-selector-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 15px;
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e6e6e6;
}

.user-selector-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.selector-label {
  font-weight: 500;
  color: #606266;
  white-space: nowrap;
}

.selected-user-info {
  margin-left: 20px;
}

.tabs-header {
  margin-top: 10px;
}

.custom-tabs-header {
  display: flex;
  margin-top: 10px;
  border-bottom: 1px solid #e6e6e6;
}

.tab-item {
  padding: 12px 20px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  color: #606266;
  font-weight: 500;
  transition: all 0.3s;
}

.tab-item:hover {
  color: #409eff;
}

.tab-item.active {
  color: #409eff;
  border-bottom-color: #409eff;
}

.scrollable-content {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  background-color: transparent;
}

.tab-content {
  margin: 0 auto;
  padding: 20px;
  width: 100%;
  max-width: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  align-items: center;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

.image-item {
  border: 1px solid #e6e6e6;
  border-radius: 8px;
  overflow: hidden;
}

.image {
  width: 100%;
  height: 150px;
}

.image-info {
  padding: 10px;
}

.image-info p {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #303133;
}

.user-info {
  font-size: 12px !important;
  color: #909399 !important;
  margin: 0 0 10px 0 !important;
}

.image-actions {
  display: flex;
  gap: 8px;
}

/* 生成作品管理样式 */
.generation-info {
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f5f5f5;
  border-radius: 8px;
}

.generation-info h3 {
  margin: 0 0 10px 0;
  color: #409eff;
}

.generation-info p {
  margin: 5px 0;
  color: #606266;
}

.generated-images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

.generated-image-item {
  border: 1px solid #e6e6e6;
  border-radius: 8px;
  overflow: hidden;
}

.generated-image {
  width: 100%;
  height: 150px;
}

.generated-image-item .image-info {
  padding: 10px;
  background-color: #fafafa;
}

.generated-image-item .image-info p {
  margin: 0 0 8px 0;
  font-size: 12px;
  color: #909399;
  word-break: break-all;
}

:deep(.el-card) {
  border: none;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

:deep(.el-card__body) {
  padding: 20px;
}

:deep(.el-tabs__content) {
  padding-top: 20px;
}
</style>

