<template>
  <div 
    class="multiline-tag-input"
    :class="{ 'is-focused': isFocused }"
    @click="focusTextarea"
  >
    <!-- 标签显示区域 -->
    <div 
      v-if="tags.length > 0"
      class="tags-container"
    >
      <!-- 已添加的标签 -->
      <el-tag
        v-for="(tag, index) in tags"
        :key="index"
        :closable="!disabled"
        @close="removeTag(index)"
        class="tag-item"
        size="small"
        type="info"
        effect="plain"
      >
        {{ tag }}
      </el-tag>
    </div>
    
    <!-- 文本输入区域 -->
    <div class="input-area">
      <el-input
        ref="textareaRef"
        v-model="inputText"
        type="textarea"
        :placeholder="placeholder"
        :disabled="disabled"
        :rows="minRows"
        :autosize="{ minRows: minRows, maxRows: maxRows }"
        @focus="isFocused = true"
        @blur="isFocused = false"
        @keydown="handleKeydown"
        @input="handleInput"
        class="textarea-input"
      />
    </div>
    
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { ElTag, ElInput, ElIcon, ElScrollbar } from 'element-plus'
import { InfoFilled } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  placeholder: {
    type: String,
    default: '请输入内容...'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  maxTags: {
    type: Number,
    default: 20
  },
  minRows: {
    type: Number,
    default: 3
  },
  maxRows: {
    type: Number,
    default: 8
  },
  showHint: {
    type: Boolean,
    default: true
  },
  separator: {
    type: String,
    default: ','
  },
  // 新增：是否启用自动标签转换（默认关闭，保持文本格式）
  autoConvertToTags: {
    type: Boolean,
    default: false
  },
  // 新增：标签映射对象，用于存储标签显示文本和实际内容的映射
  tagMapping: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:modelValue', 'change', 'add-tag', 'remove-tag', 'tag-removed'])

const tags = ref([...props.modelValue])
const inputText = ref('')
const isFocused = ref(false)
const textareaRef = ref()


// 计算属性：获取所有文本内容（标签 + 输入文本）
const allTextContent = computed(() => {
  // 使用映射后的标签内容
  const tagTexts = tags.value.map(tag => {
    return props.tagMapping[tag] || tag
  }).join(' ')
  const currentInput = inputText.value
  return tagTexts + (currentInput ? ' ' + currentInput : '')
})

// 监听外部值变化
watch(() => props.modelValue, (newVal) => {
  // 只有当外部值真正不同时才更新内部状态
  if (JSON.stringify(tags.value) !== JSON.stringify(newVal)) {
    tags.value = [...newVal]
  }
}, { deep: true })

// 监听标签变化，同步到父组件
watch(tags, (newTags) => {
  // 只有当标签真正不同时才触发更新
  if (JSON.stringify(props.modelValue) !== JSON.stringify(newTags)) {
    emit('update:modelValue', newTags)
    emit('change', newTags)
  }
}, { deep: true })

// 聚焦到文本域
const focusTextarea = () => {
  if (!props.disabled) {
    textareaRef.value?.focus()
  }
}

// 处理键盘事件
const handleKeydown = (event) => {
  if (props.disabled) return
  
  switch (event.key) {
    case 'Enter':
      // 只有在启用自动转换时才添加标签
      if (props.autoConvertToTags) {
        event.preventDefault()
        addTagsFromText()
      }
      // 否则保持默认行为（换行）
      break
    case 'Backspace':
      if (inputText.value === '' && tags.value.length > 0) {
        event.preventDefault()
        removeTag(tags.value.length - 1)
      }
      break
    case 'Escape':
      inputText.value = ''
      textareaRef.value?.blur()
      break
  }
}

// 处理输入事件
const handleInput = () => {
  // 只有在启用自动转换时才处理分隔符
  if (props.autoConvertToTags && props.separator && inputText.value.includes(props.separator)) {
    addTagsFromText()
  }
}

// 从文本中添加标签
const addTagsFromText = () => {
  if (!inputText.value.trim()) return
  
  const newTags = inputText.value
    .split(props.separator)
    .map(tag => tag.trim())
    .filter(tag => tag && !tags.value.includes(tag))
  
  if (newTags.length > 0) {
    // 检查是否超过最大标签数
    const remainingSlots = props.maxTags - tags.value.length
    const tagsToAdd = newTags.slice(0, remainingSlots)
    
    tags.value.push(...tagsToAdd)
    
    // 触发添加事件
    tagsToAdd.forEach(tag => {
      emit('add-tag', tag)
    })
    
    // 清空输入
    inputText.value = ''
    
    // 重新聚焦
    nextTick(() => {
      textareaRef.value?.focus()
    })
  }
}

// 删除标签
const removeTag = (index) => {
  if (props.disabled) return
  
  const removedTag = tags.value[index]
  tags.value.splice(index, 1)
  
  emit('remove-tag', removedTag)
  emit('tag-removed', removedTag) // 新增：通知父组件标签被删除
}

// 添加单个标签
const addTag = (tag) => {
  if (props.disabled || !tag || tag.trim() === '') return
  if (tags.value.includes(tag.trim())) return
  if (tags.value.length >= props.maxTags) return
  
  tags.value.push(tag.trim())
  emit('add-tag', tag.trim())
}

// 清空所有标签
const clearTags = () => {
  if (props.disabled) return
  
  tags.value = []
}

// 获取完整文本内容
const getFullText = () => {
  return allTextContent.value
}

// 获取原始标签内容（用于发送给AI）
const getOriginalTagContents = () => {
  return tags.value.map(tag => {
    return props.tagMapping[tag] || tag
  })
}

// 获取所有原始内容（标签原始内容 + 输入文本）
const getAllOriginalContent = () => {
  const originalTagTexts = getOriginalTagContents().join(' ')
  const currentInput = inputText.value
  return originalTagTexts + (currentInput ? ' ' + currentInput : '')
}

// 设置完整文本内容
const setFullText = (text) => {
  if (!props.autoConvertToTags) {
    // 如果不启用自动转换，将文本设置为输入内容
    inputText.value = text
    tags.value = []
  } else {
    // 如果启用自动转换，按分隔符分割为标签
    const newTags = text.split(props.separator)
      .map(tag => tag.trim())
      .filter(tag => tag)
    tags.value = newTags
    inputText.value = ''
  }
}

// 设置手动输入内容
const setInputText = (text) => {
  inputText.value = text || ''
  // 触发输入事件，确保组件状态正确更新
  nextTick(() => {
    handleInput()
  })
}

// 暴露方法给父组件
defineExpose({
  addTag,
  removeTag,
  clearTags,
  focus: focusTextarea,
  getFullText,
  setFullText,
  getOriginalTagContents,
  getAllOriginalContent,
  setInputText,
  // 暴露inputText属性，让父组件可以访问
  inputText
})
</script>

<style scoped>
.multiline-tag-input {
  width: 100%;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  background: #fff;
  transition: all 0.3s ease;
  cursor: text;
  min-height: 120px;
}

.multiline-tag-input:hover {
  border-color: #c0c4cc;
}

.multiline-tag-input.is-focused {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

/* 标签容器 - 完全无背景和边框 */
.tags-container {
  padding: 12px 12px 8px 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  background: none !important;
  background-color: transparent !important;
  background-image: none !important;
  border: none !important;
  border-width: 0 !important;
  border-style: none !important;
  border-color: transparent !important;
  outline: none !important;
  box-shadow: none !important;
}

.tag-item {
  margin: 0;
  max-width: 200px;
  word-break: break-all;
  background: none !important;
  background-color: transparent !important;
  background-image: none !important;
  border: 1px solid #dcdfe6 !important;
  color: #606266 !important;
  box-shadow: none !important;
}

.tag-item:hover {
  border-color: #409eff !important;
  color: #409eff !important;
  background: none !important;
  background-color: transparent !important;
  background-image: none !important;
  box-shadow: none !important;
}

/* 确保关闭按钮可见 */
.tag-item :deep(.el-tag__close) {
  color: #909399 !important;
  font-size: 12px !important;
  opacity: 1 !important;
  visibility: visible !important;
}

.tag-item :deep(.el-tag__close):hover {
  color: #f56c6c !important;
  background-color: rgba(245, 108, 108, 0.1) !important;
}

/* 输入区域 - 融合在整体容器中 */
.input-area {
  padding: 0 12px 12px 12px;
}

.textarea-input {
  width: 100%;
}

.textarea-input :deep(.el-textarea__inner) {
  border: none;
  background: transparent;
  padding: 0;
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  box-shadow: none;
  min-height: 80px;
}

.textarea-input :deep(.el-textarea__inner):focus {
  box-shadow: none;
}

/* 自定义滚动条样式 - 直接应用到textarea */
.textarea-input :deep(.el-textarea__inner) {
  /* 自定义滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: rgba(144, 147, 153, 0.3) transparent;
}

.textarea-input :deep(.el-textarea__inner)::-webkit-scrollbar {
  width: 6px;
}

.textarea-input :deep(.el-textarea__inner)::-webkit-scrollbar-track {
  background: transparent;
}

.textarea-input :deep(.el-textarea__inner)::-webkit-scrollbar-thumb {
  background-color: rgba(144, 147, 153, 0.3);
  border-radius: 4px;
  transition: background-color 0.3s;
}

.textarea-input :deep(.el-textarea__inner)::-webkit-scrollbar-thumb:hover {
  background-color: rgba(144, 147, 153, 0.5);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .multiline-tag-input {
    min-height: 100px;
  }
  
  .tags-container {
    padding: 8px 8px 6px 8px;
  }
  
  .input-area {
    padding: 0 8px 8px 8px;
  }
  
  .tag-item {
    max-width: 150px;
  }
  
  .textarea-input :deep(.el-textarea__inner) {
    min-height: 60px;
  }
}

/* 深度覆盖Element Plus标签的默认样式 */
:deep(.el-tag) {
  background: none !important;
  background-color: transparent !important;
  background-image: none !important;
  box-shadow: none !important;
}

:deep(.el-tag.el-tag--info.el-tag--plain) {
  background: none !important;
  background-color: transparent !important;
  background-image: none !important;
  box-shadow: none !important;
}

:deep(.el-tag:hover) {
  background: none !important;
  background-color: transparent !important;
  background-image: none !important;
  box-shadow: none !important;
}
</style>
