<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <h2>系统概览</h2>
      <p>欢迎回来，{{ user.username }}</p>
    </div>
    
    <!-- 统计卡片 -->
    <div class="stats-grid">
      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon users">
            <el-icon><User /></el-icon>
          </div>
          <div class="stat-info">
            <h3>{{ stats.totalUsers }}</h3>
            <p>总用户数</p>
          </div>
        </div>
      </el-card>
      
      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon new-users">
            <el-icon><UserFilled /></el-icon>
          </div>
          <div class="stat-info">
            <h3>{{ stats.newUsers }}</h3>
            <p>新增用户(30天)</p>
          </div>
        </div>
      </el-card>
      
      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon images">
            <el-icon><Picture /></el-icon>
          </div>
          <div class="stat-info">
            <h3>{{ stats.totalImages }}</h3>
            <p>总生成图片</p>
          </div>
        </div>
      </el-card>
      
      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon today-images">
            <el-icon><Camera /></el-icon>
          </div>
          <div class="stat-info">
            <h3>{{ stats.todayImages }}</h3>
            <p>今日生成</p>
          </div>
        </div>
      </el-card>
      
      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon active-users">
            <el-icon><Star /></el-icon>
          </div>
          <div class="stat-info">
            <h3>{{ stats.activeUsers }}</h3>
            <p>活跃用户(7天)</p>
          </div>
        </div>
      </el-card>
      
      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon admins">
            <el-icon><Avatar /></el-icon>
          </div>
          <div class="stat-info">
            <h3>{{ stats.adminCount }}</h3>
            <p>管理员数量</p>
          </div>
        </div>
      </el-card>
    </div>
    
    <!-- 快速操作 -->
    <el-card class="quick-actions">
      <template #header>
        <div class="card-header">
          <span>快速操作</span>
        </div>
      </template>
      
      <div class="action-buttons">
        <el-button type="primary" @click="$router.push('/users')">
          <el-icon><User /></el-icon>
          用户管理
        </el-button>
        
        <el-button type="success" @click="$router.push('/content')">
          <el-icon><Document /></el-icon>
          内容管理
        </el-button>
        
        <el-button type="warning" @click="$router.push('/models')">
          <el-icon><Setting /></el-icon>
          模型管理
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { api } from '../api/index.js'
import { useAuthStore } from '../utils/auth.js'

export default {
  name: 'Dashboard',
  setup() {
    const authStore = useAuthStore()
    const loading = ref(false)
    
    const stats = reactive({
      totalUsers: 0,
      newUsers: 0,
      totalImages: 0,
      todayImages: 0,
      activeUsers: 0,
      adminCount: 0
    })
    
    const user = computed(() => authStore.user)
    
    const fetchStats = async () => {
      try {
        loading.value = true
        const response = await api.get('/stats')
        
        if (response.data.success) {
          Object.assign(stats, response.data.stats)
        } else {
          ElMessage.error('获取统计数据失败')
        }
      } catch (error) {
        console.error('获取统计数据失败:', error)
        ElMessage.error('获取统计数据失败')
      } finally {
        loading.value = false
      }
    }
    
    onMounted(() => {
      fetchStats()
    })
    
    return {
      user,
      stats,
      loading
    }
  }
}
</script>

<style scoped>
.dashboard {
  height: 100%;
  overflow-y: auto;
  padding: 20px;
  background-color: #f5f5f5;
  max-width: 100%;
}

.dashboard-header {
  margin-bottom: 30px;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.dashboard-header h2 {
  color: #303133;
  margin-bottom: 10px;
  font-size: 28px;
}

.dashboard-header p {
  color: #606266;
  font-size: 16px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  border: none;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.stat-content {
  display: flex;
  align-items: center;
  padding: 10px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  font-size: 24px;
  color: white;
}

.stat-icon.users {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-icon.new-users {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-icon.images {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-icon.today-images {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-icon.active-users {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.stat-icon.admins {
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
}

.stat-info h3 {
  margin: 0 0 5px 0;
  font-size: 24px;
  color: #303133;
}

.stat-info p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.quick-actions {
  border: none;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.card-header {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.action-buttons {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.action-buttons .el-button {
  height: 40px;
  padding: 0 20px;
}

:deep(.el-card__body) {
  padding: 20px;
}
</style>

