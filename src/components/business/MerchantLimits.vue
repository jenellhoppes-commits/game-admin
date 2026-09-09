<template>
  <div>
    <ElForm inline label-position="top"
      ><ElFormItem label="幣別"
        ><ElSelect v-model="currency" clearable placeholder="全部幣別" style="width: 160px"
          ><ElOption v-for="c in currencies" :key="c" :value="c" /></ElSelect></ElFormItem
      ><ElFormItem label="遊戲"
        ><ElInput v-model="keyword" clearable placeholder="遊戲名稱或代碼" /></ElFormItem
    ></ElForm>
    <ElTable :data="rows" border>
      <ElTableColumn prop="currency" label="幣別" width="90" /><ElTableColumn
        prop="lineUid"
        label="線路"
        min-width="200"
      /><ElTableColumn prop="name" label="遊戲" min-width="150" />
      <ElTableColumn prop="planName" label="目前限紅方案" min-width="160" /><ElTableColumn
        prop="minBet"
        label="最低投注"
        width="110"
      /><ElTableColumn prop="maxBet" label="最高投注" width="110" /><ElTableColumn
        prop="updatedAt"
        label="更新時間"
        min-width="160"
      />
      <ElTableColumn label="操作" fixed="right" width="100"
        ><template #default="{ row }"
          ><ElButton
            link
            type="primary"
            :disabled="!plans(row.lineUid, row.gameId).length"
            @click="open(row)"
            >調整限紅</ElButton
          ></template
        ></ElTableColumn
      >
    </ElTable>
    <ElDialog v-model="visible" title="調整商戶限紅" width="min(92vw,560px)" append-to-body>
      <ElForm label-position="top"
        ><ElFormItem label="幣別線路"><ElInput :model-value="lineUid" readonly /></ElFormItem
        ><ElFormItem label="限紅方案" required
          ><ElSelect v-model="planId" style="width: 100%"
            ><ElOption
              v-for="p in plans(lineUid, gameId)"
              :key="p.id"
              :value="p.id"
              :label="
                p.name + ' · ' + p.minBet + '–' + p.maxBet + ' ' + p.currency
              " /></ElSelect></ElFormItem
        ><ElFormItem label="修改原因" required
          ><ElInput v-model="reason" type="textarea" /></ElFormItem
      ></ElForm>
      <template #footer
        ><ElButton @click="visible = false">取消</ElButton
        ><ElButton type="primary" @click="save">儲存</ElButton></template
      >
    </ElDialog>
  </div>
</template>
<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { ElMessage } from 'element-plus'
  import { useBusinessPartnerStore } from '@/store/modules/businessPartner'
  import { useGameCatalogStore } from '@/store/modules/gameCatalog'
  const props = defineProps<{ merchantId: string }>()
  const business = useBusinessPartnerStore(),
    catalog = useGameCatalogStore()
  const currency = ref(''),
    keyword = ref(''),
    visible = ref(false),
    lineUid = ref(''),
    gameId = ref(''),
    planId = ref(''),
    reason = ref('')
  const merchant = computed(() => business.findMerchant(props.merchantId))
  const currencies = computed(() => [...new Set(merchant.value?.lines.map((l) => l.currency))])
  const granted = (id: string) =>
    business
      .getMerchantGameConfigurations(props.merchantId)
      .some((c) => c.gameId === id && c.enabled)
  const plans = (uid: string, id: string) => {
    const line = merchant.value?.lines.find((l) => l.uid === uid)
    return line && granted(id)
      ? catalog.limitPlans.filter(
          (p) => p.gameId === id && p.currency === line.currency && p.status === 'Active'
        )
      : []
  }
  const rows = computed(() =>
    (merchant.value?.lines || [])
      .flatMap((line) =>
        business
          .getMerchantLineGameConfigurations(line.uid)
          .filter((c) => granted(c.gameId))
          .map((c) => {
            const p = catalog.limitPlans.find((p) => p.id === c.limitPlan)
            return {
              ...c,
              currency: line.currency,
              name: catalog.findGame(c.gameId)?.displayName || c.gameId,
              planName: p?.name || c.limitPlan,
              minBet: p?.minBet ?? '未設定',
              maxBet: p?.maxBet ?? '未設定'
            }
          })
      )
      .filter(
        (r) =>
          (!currency.value || r.currency === currency.value) &&
          (!keyword.value ||
            (r.name + r.gameId).toLowerCase().includes(keyword.value.toLowerCase()))
      )
  )
  function open(row: (typeof rows.value)[number]) {
    lineUid.value = row.lineUid
    gameId.value = row.gameId
    planId.value = plans(row.lineUid, row.gameId).some((p) => p.id === row.limitPlan)
      ? row.limitPlan
      : ''
    reason.value = ''
    visible.value = true
  }
  function save() {
    if (
      !reason.value.trim() ||
      !plans(lineUid.value, gameId.value).some((p) => p.id === planId.value)
    )
      return ElMessage.warning('請選擇有效方案並填寫原因')
    const ok = business.updateMerchantLineGameConfiguration(
      props.merchantId,
      lineUid.value,
      gameId.value,
      { limitPlan: planId.value },
      reason.value.trim(),
      'Super Admin'
    )
    if (!ok) return ElMessage.warning('方案或授權已變更，請重新選擇')
    visible.value = false
    ElMessage.success('商戶限紅已更新')
  }
</script>
