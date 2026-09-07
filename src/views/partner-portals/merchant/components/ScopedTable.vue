<template>
  <ArtSearchBar
    :model-value="draft"
    @update:model-value="Object.assign(draft, $event)"
    :items="searchItems"
    label-position="top"
    :show-expand="false"
    :is-expand="true"
    @search="search"
    @reset="reset"
  />
  <ArtTable
    :data="paged"
    row-key="id"
    :show-table-header="false"
    height="auto"
    empty-height="180px"
    empty-text="沒有符合條件的資料"
    :pagination="{ current: page, size, total: filtered.length }"
    :pagination-options="{ pageSizes: [20, 50, 100] }"
    @pagination:current-change="page = $event"
    @pagination:size-change="changeSize"
    scrollbar-always-on
  >
    <ElTableColumn
      v-for="column in columns"
      :key="column.key"
      :prop="column.key"
      :label="column.label"
      :min-width="column.width || 150"
      show-overflow-tooltip
    >
      <template #default="{ row }">{{ display(row[column.key]) }}</template>
    </ElTableColumn>
    <ElTableColumn v-if="$slots.actions" label="操作" width="110" fixed="right"
      ><template #default="{ row }"><slot name="actions" :row="row" /></template
    ></ElTableColumn>
  </ArtTable>
</template>
<script setup lang="ts">
  const props = defineProps<{
    rows: object[]
    columns: { key: string; label: string; width?: number }[]
    filterKeys?: string[]
  }>()
  const draft = reactive<Record<string, string>>({ keyword: '' })
  const applied = reactive<Record<string, string>>({})
  const keyword = ref('')
  const page = ref(1)
  const size = ref(20)
  const searchItems = computed(() => [
    {
      key: 'keyword',
      label: '關鍵字',
      type: 'input',
      props: { placeholder: '搜尋列表欄位', clearable: true },
      span: 12
    },
    ...(props.filterKeys || []).map((key) => ({
      key,
      label: props.columns.find((column) => column.key === key)?.label || key,
      type: 'select',
      span: 6,
      props: {
        clearable: true,
        options: [
          ...new Set(props.rows.map((row) => String((row as Record<string, unknown>)[key] ?? '')))
        ]
          .filter(Boolean)
          .sort()
          .map((value) => ({ label: value, value }))
      }
    }))
  ])
  const filtered = computed(() =>
    props.rows.filter(
      (row) =>
        props.columns.some((column) =>
          String((row as Record<string, unknown>)[column.key] ?? '')
            .toLowerCase()
            .includes(keyword.value.toLowerCase())
        ) &&
        (props.filterKeys || []).every(
          (key) => !applied[key] || String((row as Record<string, unknown>)[key]) === applied[key]
        )
    )
  )
  const paged = computed(() =>
    filtered.value.slice((page.value - 1) * size.value, page.value * size.value)
  )
  watch(
    () => props.rows,
    () => {
      if ((page.value - 1) * size.value >= filtered.value.length) page.value = 1
    }
  )
  const display = (value: unknown) =>
    value === undefined || value === null || value === ''
      ? '未提供'
      : typeof value === 'boolean'
        ? value
          ? '是'
          : '否'
        : value
  function search() {
    keyword.value = draft.keyword
    Object.assign(applied, draft)
    page.value = 1
  }
  function reset() {
    for (const key of Object.keys(draft)) draft[key] = ''
    search()
  }
  function changeSize(value: number) {
    size.value = value
    page.value = 1
  }
</script>
