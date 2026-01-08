<template>
  <el-dialog
    v-model="visible"
    title="批量输入历史记录"
    width="700px"
    :close-on-click-modal="false"
  >
    <div v-loading="loading" class="history-panel">
      <!-- 历史记录列表 -->
      <div v-if="historyList.length === 0" class="empty-state">
        <el-icon size="48" color="#909399"><FolderOpened /></el-icon>
        <p>暂无历史记录</p>
      </div>

      <div v-else class="history-list">
        <div
          v-for="record in historyList"
          :key="record.id"
          class="history-item"
        >
          <div class="history-header">
            <div class="history-info">
              <h4>{{ record.name }}</h4>
              <div class="history-meta">
                <el-tag
                  size="small"
                  :type="record.source_type === 'ai_generated' ? 'success' : 'info'"
                >
                  {{ record.source_type === 'ai_generated' ? 'AI生成' : '手动输入' }}
                </el-tag>
                <span class="history-time">{{ formatTime(record.created_at) }}</span>
              </div>
            </div>
            <el-button
              size="small"
              type="danger"
              text
              @click="handleDelete(record.id)"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>

          <div class="history-content">
            <div class="prompt-count">
              包含 {{ record.prompt_count }} 个提示词
            </div>
          </div>

          <div class="history-actions">
            <el-button
              size="small"
              @click="toggleDetail(record.id)"
            >
              {{ expandedIds.has(record.id) ? '收起' : '查看详情' }}
            </el-button>
            <el-button
              size="small"
              type="primary"
              @click="handleLoad(record.id)"
            >
              <el-icon><Upload /></el-icon>
              加载到表单
            </el-button>
          </div>

          <!-- 详情展开区域 -->
          <el-collapse-transition>
            <div v-if="expandedIds.has(record.id)" class="history-detail">
              <div v-if="detailLoading[record.id]" class="detail-loading">
                <el-icon class="is-loading"><Loading /></el-icon>
                加载中...
              </div>
              <div v-else-if="detailData[record.id]" class="prompts-detail">
                <div
                  v-for="(prompt, index) in detailData[record.id].prompts"
                  :key="index"
                  class="prompt-item"
                >
                  <div class="prompt-index">{{ index + 1 }}.</div>
                  <div class="prompt-text">{{ prompt }}</div>
                </div>
              </div>
            </div>
          </el-collapse-transition>
        </div>
      </div>

      <!-- 分页 -->
      <div v-if="total > 0" class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="total"
          layout="prev, pager, next, total"
          small
          @current-change="loadHistory"
        />
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, watch, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  FolderOpened,
  Delete,
  Upload,
  Loading
} from '@element-plus/icons-vue'
import {
  getBatchPromptHistory,
  getBatchPromptHistoryDetail,
  deleteBatchPromptHistory
} from '@/api/aiPromptApi'

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['update:visible', 'load-prompts'])

// 状态
const visible = ref(props.visible)
const loading = ref(false)
const historyList = ref([])
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const expandedIds = ref(new Set())
const detailLoading = reactive({})
const detailData = reactive({})

// 监听visible变化
watch(() => props.visible, (newVal) => {
  visible.value = newVal
  if (newVal) {
    loadHistory()
  }
})

watch(visible, (newVal) => {
  emit('update:visible', newVal)
})

// 加载历史记录
const loadHistory = async () => {
  try {
    loading.value = true
    const response = await getBatchPromptHistory(currentPage.value, pageSize.value)
    historyList.value = response.data.list || []
    total.value = response.data.total || 0
  } catch (error) {
    console.error('加载历史记录失败:', error)
    ElMessage.error('加载历史记录失败')
  } finally {
    loading.value = false
  }
}

// 切换详情展开
const toggleDetail = async (id) => {
  if (expandedIds.value.has(id)) {
    expandedIds.value.delete(id)
  } else {
    expandedIds.value.add(id)
    // 如果还没有加载详情，则加载
    if (!detailData[id]) {
      await loadDetail(id)
    }
  }
  // 触发响应式更新
  expandedIds.value = new Set(expandedIds.value)
}

// 加载详情
const loadDetail = async (id) => {
  try {
    detailLoading[id] = true
    const response = await getBatchPromptHistoryDetail(id)
    detailData[id] = response.data
  } catch (error) {
    console.error('加载详情失败:', error)
    ElMessage.error('加载详情失败')
  } finally {
    detailLoading[id] = false
  }
}

// 删除历史记录
const handleDelete = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除这条历史记录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await deleteBatchPromptHistory(id)
    ElMessage.success('删除成功')
    loadHistory()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 加载到表单
const handleLoad = async (id) => {
  try {
    // 如果还没有加载详情，则先加载
    if (!detailData[id]) {
      await loadDetail(id)
    }

    const detail = detailData[id]
    if (detail && detail.prompts) {
      emit('load-prompts', detail.prompts)
      visible.value = false
    }
  } catch (error) {
    console.error('加载失败:', error)
    ElMessage.error('加载失败')
  }
}

// 格式化时间
const formatTime = (time) => {
  if (!time) return ''
  const date = new Date(time)
  return date.toLocaleString('zh-CN')
}
</script>

<style scoped>
.history-panel {
  min-height: 400px;
  max-height: 600px;
  display: flex;
  flex-direction: column;
}

.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 4px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #909399;
}

.empty-state p {
  margin-top: 16px;
  font-size: 14px;
}

.history-item {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  background: #fff;
  transition: all 0.3s;
}

.history-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.history-info {
  flex: 1;
}

.history-info h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #303133;
  font-weight: 600;
}

.history-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.history-time {
  font-size: 12px;
  color: #909399;
}

.history-content {
  margin-bottom: 12px;
}

.prompt-count {
  font-size: 12px;
  color: #909399;
}

.history-actions {
  display: flex;
  gap: 8px;
}

.history-detail {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e4e7ed;
}

.detail-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  color: #909399;
}

.prompts-detail {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.prompt-item {
  display: flex;
  gap: 8px;
  padding: 8px;
  background: #f5f7fa;
  border-radius: 4px;
}

.prompt-index {
  font-weight: 600;
  color: #409eff;
  min-width: 24px;
}

.prompt-text {
  flex: 1;
  color: #606266;
  line-height: 1.6;
  word-break: break-word;
}

.pagination {
  padding: 16px 0 0 0;
  display: flex;
  justify-content: center;
  border-top: 1px solid #e4e7ed;
  margin-top: auto;
}
</style>
