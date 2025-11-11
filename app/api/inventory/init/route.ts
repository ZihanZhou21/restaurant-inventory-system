import { NextRequest, NextResponse } from 'next/server'
import { kv, KV_KEYS, generateId, Item, InventoryRecord, PurchaseOrder } from '@/lib/kv'
import { startOfDay, parseISO, subDays, format } from 'date-fns'

// 初始化指定日期的库存记录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date } = body

    if (!date) {
      return NextResponse.json(
        { error: '日期是必填项' },
        { status: 400 }
      )
    }

    const targetDate = startOfDay(parseISO(date))
    const yesterday = startOfDay(subDays(targetDate, 1))
    const dateKey = format(targetDate, 'yyyy-MM-dd')
    const yesterdayKey = format(yesterday, 'yyyy-MM-dd')

    // 获取所有物料
    const itemsList = await kv.smembers(KV_KEYS.itemsList())
    const items = await Promise.all(
      itemsList.map(async (id) => await kv.get<Item | null>(KV_KEYS.item(id as string)))
    )
    const validItems = items.filter((item): item is Item => item !== null)

    const records = await Promise.all(
      validItems.map(async (item) => {
        const inventoryLookupKey = KV_KEYS.inventoryByDateAndItem(dateKey, item.id)
        
        // 检查记录是否已存在
        const existingRecordId = await kv.get<string | null>(inventoryLookupKey)
        if (existingRecordId) {
          const existingRecord = await kv.get<InventoryRecord | null>(KV_KEYS.inventory(existingRecordId))
          if (existingRecord) {
            return existingRecord
          }
        }

        // 获取昨天的记录来计算今天的期初库存
        const yesterdayLookupKey = KV_KEYS.inventoryByDateAndItem(yesterdayKey, item.id)
        const yesterdayRecordId = await kv.get<string | null>(yesterdayLookupKey)
        let yesterdayRecord: InventoryRecord | null = null
        if (yesterdayRecordId) {
          yesterdayRecord = await kv.get<InventoryRecord | null>(KV_KEYS.inventory(yesterdayRecordId))
        }

        // 期初库存 = 昨日的期末库存（如果昨天已盘点）
        const startQty = yesterdayRecord?.endQty ?? 0

        // 检查今天是否有采购记录
        const purchaseLookupKey = KV_KEYS.purchaseByDateAndItem(dateKey, item.id)
        const purchaseId = await kv.get<string | null>(purchaseLookupKey)
        let receivedQty = 0
        if (purchaseId) {
          const purchase = await kv.get<PurchaseOrder | null>(KV_KEYS.purchase(purchaseId))
          if (purchase) {
            receivedQty = purchase.actualQty ?? purchase.plannedQty ?? 0
          }
        }

        // 创建今天的库存记录
        const recordId = generateId()
        const now = new Date().toISOString()
        const record = {
          id: recordId,
          date: targetDate.toISOString(),
          itemId: item.id,
          startQty,
          receivedQty,
          endQty: null,
          usage: null,
          confirmed: false,
          createdAt: now,
          updatedAt: now,
        }

        // 保存记录
        await kv.set(KV_KEYS.inventory(recordId), record)
        await kv.set(inventoryLookupKey, recordId)
        await kv.sadd(KV_KEYS.inventoriesByDate(dateKey), recordId)
        await kv.sadd(KV_KEYS.inventoriesList(), recordId)

        return record
      })
    )

    return NextResponse.json({
      success: true,
      count: records.length,
      records,
    })
  } catch (error) {
    console.error('初始化库存记录失败:', error)
    return NextResponse.json(
      { error: '初始化库存记录失败' },
      { status: 500 }
    )
  }
}
