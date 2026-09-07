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
  >
    <template #range
      ><ElDatePicker
        v-model="draft.range"
        type="daterange"
        value-format="YYYY-MM-DD"
        :shortcuts="reportDateShortcuts"
        :clearable="true"
        :id="[`${controlId}-start`, `${controlId}-end`]"
        popper-class="merchant-date-popper"
        start-placeholder="開始日期"
        end-placeholder="結束日期"
    /></template>
  </ArtSearchBar>
  <ArtTable
    class="merchant-scoped-table"
    :data="paged"
    row-key="id"
    :show-table-header="false"
    height="auto"
    empty-height="280px"
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
      <template #default="{ row }">
        <ElTag
          v-if="['status', 'credentialStatus'].includes(column.key)"
          :type="merchantStatusType(row[column.key])"
          effect="plain"
          >{{ display(row, column.key) }}</ElTag
        >
        <template v-else>{{ display(row, column.key) }}</template>
      </template>
    </ElTableColumn>
    <ElTableColumn v-if="$slots.actions" label="操作" width="110" fixed="right"
      ><template #default="{ row }"><slot name="actions" :row="row" /></template
    ></ElTableColumn>
  </ArtTable>
</template>
<script setup lang="ts">
  import { reportDateShortcuts } from '@/utils/reportDateShortcuts'
  import { useId } from 'vue'
  import { merchantField, merchantStatusType } from '@/utils/merchantDisplay'
  import { useFinanceSettingsStore } from '@/store/modules/financeSettings'
  const settings = useFinanceSettingsStore()
  const props = defineProps<{
    rows: object[]
    columns: { key: string; label: string; width?: number }[]
    filterKeys?: string[]
    dateKey?: string
    initialRange?: string[]
  }>()
  const controlId = useId()
  const draft = reactive<Record<string, string | string[] | null>>({
    keyword: '',
    range: [...(props.initialRange || [])]
  })
  const applied = reactive<Record<string, string | string[] | null>>({
    range: [...(props.initialRange || [])]
  })
  const keyword = ref('')
  const page = ref(1)
  const size = ref(20)
  const searchItems = computed(() => [
    ...(props.dateKey ? [{ key: 'range', label: '期間（Asia/Taipei）', span: 12 }] : []),
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
          .map((value) => ({ label: String(merchantField({ [key]: value }, key, () => 2)), value }))
      }
    }))
  ])
  const filtered = computed(() =>
    props.rows.filter(
      (row) =>
        props.columns.some((column) =>
          `${(row as Record<string, unknown>)[column.key] ?? ''} ${display(row, column.key)}`
            .toLowerCase()
            .includes(keyword.value.toLowerCase())
        ) &&
        (!props.dateKey ||
          !Array.isArray(applied.range) ||
          applied.range.length !== 2 ||
          (String((row as Record<string, unknown>)[props.dateKey]).slice(0, 10) >=
            applied.range[0] &&
            String((row as Record<string, unknown>)[props.dateKey]).slice(0, 10) <=
              applied.range[1])) &&
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
  const display = (row: object, key: string) =>
    merchantField(
      row,
      key,
      (currency) => settings.currencies.find((item) => item.code === currency)?.decimalPlaces ?? 2
    )
  function search() {
    keyword.value = String(draft.keyword || '')
    Object.assign(applied, draft, { range: Array.isArray(draft.range) ? [...draft.range] : [] })
    page.value = 1
  }
  function reset() {
    for (const key of Object.keys(draft)) draft[key] = ''
    draft.range = []
    search()
  }
  function changeSize(value: number) {
    size.value = value
    page.value = 1
  }
</script>
<style lang="scss">
  @use '../date-picker';
</style>
