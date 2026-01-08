<template>
  <div class="user-management">
    <!-- 固定头部区域 -->
    <div class="fixed-header">
      <!-- 搜索和筛选 -->
      <el-card class="search-card">
        <el-form :model="searchForm" inline>
          <el-form-item label="搜索用户">
            <el-input
              v-model="searchForm.search"
              placeholder="用户名或邮箱"
              clearable
              @clear="handleSearch"
              @keyup.enter="handleSearch"
            >
              <template #append>
                <el-button @click="handleSearch">
                  <el-icon><Search /></el-icon>
                </el-button>
              </template>
            </el-input>
          </el-form-item>
          
          <el-form-item label="状态">
            <el-select v-model="searchForm.status" placeholder="选择状态" clearable @change="handleSearch">
              <el-option label="全部" value="" />
              <el-option label="启用" :value="1" />
              <el-option label="禁用" :value="0" />
            </el-select>
          </el-form-item>
          
          <el-form-item>
            <el-button type="primary" @click="handleSearch">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
            <el-button @click="resetSearch">
              <el-icon><Refresh /></el-icon>
              重置
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>
    
    <!-- 可滚动内容区域 -->
    <div class="scrollable-content">
      <!-- 用户列表 -->
      <el-card class="table-card">
        <el-table
          v-loading="loading"
          :data="users"
          stripe
          style="width: 100%"
        >
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="username" label="用户名" width="120" />
          <el-table-column prop="email" label="邮箱" min-width="200" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status ? 'success' : 'danger'">
                {{ row.status ? '启用' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="管理员" width="100">
            <template #default="{ row }">
              <el-tag :type="row.is_admin ? 'warning' : 'info'">
                {{ row.is_admin ? '是' : '否' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="imageCount" label="生成图片" width="100" />
          <el-table-column prop="promptCount" label="提示词模版" width="120" />
          <el-table-column prop="created_at" label="注册时间" width="180" />
          <el-table-column label="操作" width="400" fixed="right">
            <template #default="{ row }">
              <div class="action-buttons">
                <!-- 第一行：状态管理 -->
                <div class="action-row">
                  <el-button
                    size="small"
                    :type="row.status ? 'danger' : 'success'"
                    @click="toggleUserStatus(row)"
                    class="action-btn"
                  >
                    {{ row.status ? '禁用' : '启用' }}
                  </el-button>
                  
                  <el-button
                    size="small"
                    :type="row.is_admin ? 'info' : 'warning'"
                    @click="toggleAdminStatus(row)"
                    class="action-btn"
                  >
                    {{ row.is_admin ? '取消管理员' : '设为管理员' }}
                  </el-button>
                </div>
                
                <!-- 第二行：查看功能 -->
                <div class="action-row">
                  <el-button
                    size="small"
                    type="primary"
                    @click="viewUserPrompts(row)"
                    :disabled="row.promptCount === 0"
                    class="action-btn"
                  >
                    查看提示词({{ row.promptCount || 0 }})
                  </el-button>
                  
                  <el-button
                    size="small"
                    type="success"
                    @click="viewUserImages(row)"
                    :disabled="row.imageCount === 0"
                    class="action-btn"
                  >
                    查看参考图({{ row.imageCount || 0 }})
                  </el-button>
                  
                  <el-button
                    size="small"
                    type="warning"
                    @click="viewUserGenerations(row)"
                    :disabled="row.imageCount === 0"
                    class="action-btn"
                  >
                    查看生成作品({{ row.imageCount || 0 }})
                  </el-button>
                </div>
                
                <!-- 第三行：删除操作 -->
                <div class="action-row">
                  <el-button
                    size="small"
                    type="danger"
                    @click="deleteUser(row)"
                    class="action-btn action-btn-danger"
                  >
                    删除用户
                  </el-button>
                </div>
              </div>
            </template>
          </el-table-column>
        </el-table>
        
        <!-- 分页 -->
        <div class="pagination">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </el-card>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '../api/index.js'
import { useRouter } from 'vue-router'

export default {
  name: 'UserManagement',
  setup() {
    const loading = ref(false)
    const users = ref([])
    const router = useRouter()
    
    const searchForm = reactive({
      search: '',
      status: ''
    })
    
    const pagination = reactive({
      page: 1,
      pageSize: 20,
      total: 0
    })
    
    const fetchUsers = async () => {
      try {
        loading.value = true
        const params = {
          page: pagination.page,
          pageSize: pagination.pageSize,
          search: searchForm.search,
          status: searchForm.status
        }
        
        const response = await api.get('/users', { params })
        
        if (response.data.success) {
          users.value = response.data.users
          pagination.total = response.data.total
        } else {
          ElMessage.error('获取用户列表失败')
        }
      } catch (error) {
        console.error('获取用户列表失败:', error)
        ElMessage.error('获取用户列表失败')
      } finally {
        loading.value = false
      }
    }
    
    const handleSearch = () => {
      pagination.page = 1
      fetchUsers()
    }
    
    const resetSearch = () => {
      searchForm.search = ''
      searchForm.status = ''
      pagination.page = 1
      fetchUsers()
    }
    
    const handleSizeChange = (val) => {
      pagination.pageSize = val
      pagination.page = 1
      fetchUsers()
    }
    
    const handleCurrentChange = (val) => {
      pagination.page = val
      fetchUsers()
    }
    
    const toggleUserStatus = async (user) => {
      try {
        const newStatus = !user.status
        const response = await api.put(`/users/${user.id}/status`, {
          is_active: newStatus
        })
        
        if (response.data.success) {
          user.status = newStatus
          ElMessage.success(`用户已${newStatus ? '启用' : '禁用'}`)
        } else {
          ElMessage.error('操作失败')
        }
      } catch (error) {
        console.error('切换用户状态失败:', error)
        ElMessage.error('操作失败')
      }
    }
    
    const toggleAdminStatus = async (user) => {
      try {
        const newAdminStatus = !user.is_admin
        const response = await api.put(`/users/${user.id}/admin`, {
          is_admin: newAdminStatus
        })
        
        if (response.data.success) {
          user.is_admin = newAdminStatus
          ElMessage.success(`用户${newAdminStatus ? '已设为管理员' : '已取消管理员权限'}`)
        } else {
          ElMessage.error('操作失败')
        }
      } catch (error) {
        console.error('切换管理员状态失败:', error)
        ElMessage.error('操作失败')
      }
    }
    
    const deleteUser = async (user) => {
      try {
        await ElMessageBox.confirm(
          `确定要删除用户 "${user.username}" 吗？此操作不可恢复！`,
          '确认删除',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        
        const response = await api.delete(`/users/${user.id}`)
        
        if (response.data.success) {
          ElMessage.success('用户删除成功')
          fetchUsers()
        } else {
          ElMessage.error('删除失败')
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('删除用户失败:', error)
          ElMessage.error('删除失败')
        }
      }
    }
    
    // 查看用户提示词
    const viewUserPrompts = (user) => {
      // 将用户信息存储到sessionStorage，供内容管理页面使用
      sessionStorage.setItem('selectedUserForContent', JSON.stringify({
        id: user.id,
        username: user.username,
        email: user.email
      }))
      
      // 跳转到内容管理页面，并设置默认标签页为提示词
      router.push({
        path: '/content',
        query: { tab: 'prompts' }
      })
    }
    
    // 查看用户参考图
    const viewUserImages = (user) => {
      // 将用户信息存储到sessionStorage，供内容管理页面使用
      sessionStorage.setItem('selectedUserForContent', JSON.stringify({
        id: user.id,
        username: user.username,
        email: user.email
      }))
      
      // 跳转到内容管理页面，并设置默认标签页为参考图
      router.push({
        path: '/content',
        query: { tab: 'images' }
      })
    }
    
    // 查看用户生成作品
    const viewUserGenerations = (user) => {
      // 将用户信息存储到sessionStorage，供内容管理页面使用
      sessionStorage.setItem('selectedUserForContent', JSON.stringify({
        id: user.id,
        username: user.username,
        email: user.email
      }))
      
      // 跳转到内容管理页面，并设置默认标签页为生成作品
      router.push({
        path: '/content',
        query: { tab: 'generations' }
      })
    }
    
    onMounted(() => {
      fetchUsers()
    })
    
    return {
      loading,
      users,
      searchForm,
      pagination,
      fetchUsers,
      handleSearch,
      resetSearch,
      handleSizeChange,
      handleCurrentChange,
      toggleUserStatus,
      toggleAdminStatus,
      deleteUser,
      viewUserPrompts,
      viewUserImages,
      viewUserGenerations
    }
  }
}
</script>

<style scoped>
.user-management {
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

.search-card {
  margin-bottom: 0;
  border: none;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.scrollable-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background-color: #f5f5f5;
  max-width: 100%;
}

.table-card {
  border: none;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  margin: 0 auto;
  width: 100%;
}

.pagination {
  margin-top: 20px;
  text-align: right;
}

:deep(.el-card__body) {
  padding: 20px;
}

:deep(.el-table) {
  font-size: 14px;
}

:deep(.el-button + .el-button) {
  margin-left: 8px;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
}

.action-row {
  display: flex;
  gap: 6px;
  justify-content: center;
  width: 100%;
}

.action-btn {
  min-width: 80px;
  height: 28px;
  font-size: 12px;
  border-radius: 4px;
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.action-btn-danger {
  min-width: 100px;
}

:deep(.el-button-group .el-button) {
  margin-left: 0;
}

:deep(.el-button-group .el-button + .el-button) {
  margin-left: -1px;
}
</style>

