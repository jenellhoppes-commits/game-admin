<template>
  <div class="asset-card">
    <div class="asset-heading">
      <div>
        <strong>{{ label }}</strong>
        <p>{{ description }}</p>
      </div>
      <ElTag v-if="model" type="success" effect="light" size="small" round>已選擇</ElTag>
      <ElTag v-else type="info" effect="plain" size="small" round>選填</ElTag>
    </div>

    <div class="asset-preview" :class="previewClass" @dragover.prevent @drop.prevent="handleDrop">
      <img v-if="model" :src="model.url" :alt="`${label}預覽`" />
      <div v-else class="empty-preview">
        <ArtSvgIcon icon="ri:image-add-line" />
        <span>尚未選擇圖片，可拖曳至此</span>
      </div>
    </div>

    <div v-if="model" class="file-meta">
      <strong>{{ model.name }}</strong>
      <span>{{ dimensionText }} · {{ sizeText }}</span>
    </div>

    <ElAlert
      v-if="ratioWarning"
      :title="ratioWarning"
      type="warning"
      :closable="false"
      show-icon
      class="ratio-warning"
    />

    <div class="asset-actions">
      <ElUpload
        accept="image/png,image/jpeg,image/webp"
        :auto-upload="false"
        :show-file-list="false"
        :on-change="handleChange"
      >
        <ElButton>{{ model ? '更換圖片' : '選擇圖片' }}</ElButton>
      </ElUpload>
      <ElButton v-if="model" type="danger" link @click="removeAsset">移除</ElButton>
    </div>
  </div>
</template>

<script setup lang="ts">
  import type { UploadFile } from 'element-plus'
  import { ElMessage } from 'element-plus'
  import type { GameAssetRecord } from '@/types/game-provider'

  defineOptions({ name: 'GameAssetUploader' })

  const props = defineProps<{
    label: string
    description: string
    aspectRatio: number
    aspectLabel: string
    previewClass?: string
  }>()
  const model = defineModel<GameAssetRecord | undefined>()
  const ratioWarning = ref('')
  const maxSize = 5 * 1024 * 1024
  const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/webp'])

  const sizeText = computed(() => {
    if (!model.value) return ''
    return model.value.size >= 1024 * 1024
      ? `${(model.value.size / 1024 / 1024).toFixed(1)} MB`
      : `${Math.ceil(model.value.size / 1024)} KB`
  })
  const dimensionText = computed(() =>
    model.value?.width && model.value?.height
      ? `${model.value.width} × ${model.value.height}`
      : '尺寸讀取中'
  )

  const readAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('圖片讀取失敗'))
      reader.readAsDataURL(file)
    })

  const readDimensions = (url: string) =>
    new Promise<{ width: number; height: number }>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
      image.onerror = () => reject(new Error('圖片尺寸讀取失敗'))
      image.src = url
    })

  const processFile = async (file: File) => {
    if (!allowedTypes.has(file.type)) {
      ElMessage.error('只支援 PNG、JPG／JPEG 與 WebP 圖片')
      return
    }
    if (file.size > maxSize) {
      ElMessage.error('單張圖片不可超過 5 MB')
      return
    }

    try {
      const url = await readAsDataUrl(file)
      const dimensions = await readDimensions(url)
      const actualRatio = dimensions.width / dimensions.height
      const deviation = Math.abs(actualRatio - props.aspectRatio) / props.aspectRatio
      ratioWarning.value =
        deviation > 0.1
          ? `圖片比例與建議的 ${props.aspectLabel} 不同，仍可儲存但可能需要裁切。`
          : ''
      model.value = {
        name: file.name,
        mimeType: file.type,
        size: file.size,
        url,
        ...dimensions
      }
    } catch {
      ElMessage.error('圖片讀取失敗，請重新選擇檔案')
    }
  }

  const handleChange = async (uploadFile: UploadFile) => {
    if (uploadFile.raw) await processFile(uploadFile.raw)
  }

  const handleDrop = async (event: DragEvent) => {
    const file = event.dataTransfer?.files[0]
    if (file) await processFile(file)
  }

  const removeAsset = () => {
    model.value = undefined
    ratioWarning.value = ''
  }
</script>

<style scoped lang="scss">
  .asset-card {
    display: grid;
    gap: 12px;
    min-width: 0;
    padding: 14px;
    border: 1px solid var(--art-gray-200);
    border-radius: 12px;
  }

  .asset-heading {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    justify-content: space-between;

    strong {
      font-weight: 600;
    }

    p {
      margin: 4px 0 0;
      font-size: 12px;
      line-height: 1.5;
      color: var(--art-gray-500);
    }
  }

  .asset-preview {
    position: relative;
    width: 100%;
    overflow: hidden;
    background: var(--art-gray-50);
    border: 1px dashed var(--art-gray-300);
    border-radius: 10px;
    aspect-ratio: 16 / 9;

    &.icon-preview {
      width: min(100%, 170px);
      aspect-ratio: 1;
    }

    &.hero-preview {
      aspect-ratio: 21 / 9;
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .empty-preview {
    display: grid;
    width: 100%;
    height: 100%;
    color: var(--art-gray-400);
    place-content: center;
    justify-items: center;

    .art-svg-icon {
      margin-bottom: 6px;
      font-size: 26px;
    }

    span {
      font-size: 12px;
    }
  }

  .file-meta {
    display: grid;
    min-width: 0;

    strong {
      overflow: hidden;
      font-size: 13px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    span {
      margin-top: 3px;
      font-size: 12px;
      color: var(--art-gray-500);
    }
  }

  .ratio-warning :deep(.el-alert__title) {
    font-size: 12px;
    line-height: 1.45;
  }

  .asset-actions {
    display: flex;
    gap: 10px;
    align-items: center;
  }
</style>
