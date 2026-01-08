<template>
  <el-drawer
    v-model="visible"
    title="AI生成历史"
    size="600px"
    direction="rtl"
  >
    <div class="history-panel">
      <!-- 历史记录列表 -->
      <div v-loading="loading" class="history-list">
        <div v-if="historyList.length === 0" class="empty-state">
          <el-icon size="48" color="#909399"><Document /></el-icon>
          <p>暂无历史记录</p>
        </div>

        <div
          v-for="record in historyList"
          :key="record.id"
          class="history-item"
        >
          <div class="history-header">
            <div class="history-info">
              <el-tag size="small" type="primary">{{ record.model_display_name }}</el-tag>
              <span class="history-time">{{ formatTime(record.created_at) }}</span>
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
            <div class="user-input">
              <strong>输入：</strong>{{ record.user_input }}
            </div>
            <div class="prompt-count">
              生成了 {{ record.prompt_count }} 个提示词
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
              重新使用
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
                  v-for="item in detailData[record.id].prompts"
                  :key="item.index"
                  class="prompt-item"
                >
                  <div class="prompt-index">{{ item.index }}.</div>
                  <div class="prompt-text">{{ item.prompt }}</div>
                  <el-button
                    size="small"
                    text
                    @click="copyPrompt(item.prompt)"
                  >
                    <el-icon><DocumentCopy /></el-icon>
                  </el-button>
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
          @current-change="loadHistory"
        />
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
import { ref, watch, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Document,
  Delete,
  DocumentCopy,
  Loading
} from '@element-plus/icons-vue'
import {
  getAIPromptHistory,
  getAIPromptHistoryDetail,
  deleteAIPromptHistory
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
    const response = await getAIPromptHistory(currentPage.value, pageSize.value)
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
    const response = await getAIPromptHistoryDetail(id)
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

    await deleteAIPromptHistory(id)
    ElMessage.success('删除成功')
    loadHistory()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 重新使用
const handleLoad = async (id) => {
  try {
    // 如果还没有加载详情，则先加载
    if (!detailData[id]) {
      await loadDetail(id)
    }

    const detail = detailData[id]
    if (detail && detail.prompts) {
      emit('load-prompts', detail.prompts, id)
      visible.value = false
    }
  } catch (error) {
    console.error('加载失败:', error)
    ElMessage.error('加载失败')
  }
}

// 复制提示词
const copyPrompt = async (prompt) => {
  try {
    await navigator.clipboard.writeText(prompt)
    ElMessage.success('已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败')
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
  display: flex;
  flex-direction: column;
  height: 100%;
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
  align-items: center;
  margin-bottom: 12px;
}

.history-info {
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

.user-input {
  color: #606266;
  line-height: 1.6;
  margin-bottom: 8px;
}

.user-input strong {
  color: #303133;
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
  padding: 16px 0;
  display: flex;
  justify-content: center;
  border-top: 1px solid #e4e7ed;
}
</style>
