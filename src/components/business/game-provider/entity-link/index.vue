<template>
  <ElButton link type="primary" class="entity-link" @click="navigate">
    <span>{{ label }}</span>
    <small v-if="secondary">{{ secondary }}</small>
  </ElButton>
</template>

<script setup lang="ts">
  defineOptions({ name: 'EntityLink' })

  const props = defineProps<{ label: string; secondary?: string; to?: string }>()
  const emit = defineEmits<{ click: [] }>()
  const router = useRouter()

  const navigate = () => {
    emit('click')
    if (props.to) router.push(props.to)
  }
</script>

<style scoped lang="scss">
  .entity-link {
    height: auto;
    padding: 0;
    text-align: left;

    :deep(span) {
      display: grid;
      justify-items: start;
    }

    small {
      margin-top: 2px;
      font-size: 11px;
      color: var(--art-gray-500);
    }
  }
</style>
