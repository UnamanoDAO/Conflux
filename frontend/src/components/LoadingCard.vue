<template>
  <div class="loading-card" :class="cardClass">
    <div class="loading-content">
      <div class="loading-spinner">
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
      </div>
      <div class="loading-text">
        <p class="loading-title">{{ title || '加载中...' }}</p>
        <p v-if="subtitle" class="loading-subtitle">{{ subtitle }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: '加载中...'
  },
  subtitle: {
    type: String,
    default: ''
  },
  size: {
    type: String,
    default: 'medium', // small, medium, large
    validator: (value) => ['small', 'medium', 'large'].includes(value)
  },
  variant: {
    type: String,
    default: 'card', // card, inline, overlay
    validator: (value) => ['card', 'inline', 'overlay'].includes(value)
  }
})

const cardClass = computed(() => {
  return [
    `loading-card--${props.size}`,
    `loading-card--${props.variant}`
  ]
})
</script>

<style scoped>
.loading-card {
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e0e0e0;
  transition: all 0.3s ease;
}

.loading-card--card {
  aspect-ratio: 1;
  width: 100%;
}

.loading-card--inline {
  padding: 20px;
  min-height: 100px;
  width: 100%;
}

.loading-card--overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(4px);
  z-index: 10;
}

.loading-card--small {
  min-height: 120px;
}

.loading-card--medium {
  min-height: 200px;
}

.loading-card--large {
  min-height: 300px;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.loading-spinner {
  position: relative;
  width: 40px;
  height: 40px;
}

.spinner-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 3px solid transparent;
  border-top: 3px solid #409eff;
  border-radius: 50%;
  animation: spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
}

.spinner-ring:nth-child(1) {
  animation-delay: -0.45s;
}

.spinner-ring:nth-child(2) {
  animation-delay: -0.3s;
}

.spinner-ring:nth-child(3) {
  animation-delay: -0.15s;
}

.spinner-ring:nth-child(4) {
  animation-delay: 0s;
}

.loading-text {
  text-align: center;
}

.loading-title {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 500;
  color: #409eff;
}

.loading-subtitle {
  margin: 0;
  font-size: 12px;
  color: #999;
  line-height: 1.4;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* 响应式调整 */
@media (max-width: 768px) {
  .loading-card--small {
    min-height: 100px;
  }
  
  .loading-card--medium {
    min-height: 150px;
  }
  
  .loading-card--large {
    min-height: 200px;
  }
  
  .loading-spinner {
    width: 32px;
    height: 32px;
  }
  
  .loading-title {
    font-size: 13px;
  }
  
  .loading-subtitle {
    font-size: 11px;
  }
}
</style>

