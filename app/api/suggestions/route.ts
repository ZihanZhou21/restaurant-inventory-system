import { NextRequest, NextResponse } from 'next/server'
import { kv, KV_KEYS } from '@/lib/kv'
import { startOfDay, addDays, parseISO, format } from 'date-fns'

// 生成采购建议
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dateStr = searchParams.get('date')
    
    const targetDate = dateStr 
      ? startOfDay(parseISO(dateStr))
      : startOfDay(addDays(new Date(), 1)) // 默认生成明天的采购建议

    const today = startOfDay(new Date())
    const todayKey = format(today, 'yyyy-MM-dd')
    
    // 获取所有物料
    const itemsList = await kv.smembers(KV_KEYS.itemsList())
    const items = await Promise.all(
      itemsList.map(async (id) => await kv.get(KV_KEYS.item(id)))
    )
    const validItems = items.filter((item): item is NonNullable<typeof item> => item !== null)

    const suggestions = await Promise.all(
      validItems.map(async (item) => {
        // 获取所有库存记录
        const allInventoryIds = await kv.smembers(KV_KEYS.inventoriesList())
        const inventoryRecords = await Promise.all(
          allInventoryIds.map(async (id) => {
            const record = await kv.get(KV_KEYS.inventory(id as string))
            return record
          })
        )
        
        // 过滤出该物料的记录，按日期排序
        const itemRecords = inventoryRecords
          .filter((record): record is NonNullable<typeof record> => 
            record !== null && record.itemId === item.id
          )
          .filter((record) => {
            const recordDate = parseISO(record.date)
            return recordDate <= today
          })
          .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
          .slice(0, 30) // 获取最近30天的记录

        // 获取今天的库存记录（如果存在）
        const todayLookupKey = KV_KEYS.inventoryByDateAndItem(todayKey, item.id)
        const todayRecordId = await kv.get(todayLookupKey)
        let todayRecord = null
        if (todayRecordId) {
          todayRecord = await kv.get(KV_KEYS.inventory(todayRecordId as string))
        }

        // 计算平均日消耗量
        const recordsWithUsage = itemRecords.filter(
          (r) => r.usage !== null && r.usage !== undefined
        )
        
        const avgUsage = recordsWithUsage.length > 0
          ? recordsWithUsage.reduce((sum, r) => sum + (r.usage || 0), 0) / recordsWithUsage.length
          : 0

        // 获取当前期末库存
        let currentStock = 0
        if (todayRecord) {
          if (todayRecord.endQty !== null && todayRecord.endQty !== undefined) {
            currentStock = todayRecord.endQty
          } else {
            currentStock = (todayRecord.startQty || 0) + (todayRecord.receivedQty || 0)
          }
        } else {
          // 如果今天没有记录，获取最近一条记录的期末库存
          const lastRecord = itemRecords[0]
          if (lastRecord && lastRecord.endQty !== null && lastRecord.endQty !== undefined) {
            currentStock = lastRecord.endQty
          }
        }

        // 计算建议采购量
        let suggestedQty = 0

        // 方法1：基于Par Level
        if (item.parLevel > 0) {
          const shortage = item.parLevel - currentStock
          suggestedQty = Math.max(0, shortage)
        } 
        // 方法2：基于平均消耗量（如果没有设置Par Level）
        else if (avgUsage > 0) {
          suggestedQty = Math.max(0, avgUsage * 1.2) // 建议多采购20%作为缓冲
        }

        // 如果今天还未盘点，使用简单模式：建议采购量 = 当日消耗量（如果有历史数据）
        if (!todayRecord?.endQty && avgUsage > 0) {
          suggestedQty = avgUsage
        }

        // 判断单位是否为箱（支持多种写法）
        const unitLower = item.unit.toLowerCase().trim()
        const isBox = unitLower === '箱' || unitLower === 'box' || unitLower === '箱装'

        // 如果是箱单位，向上取整；否则保留两位小数
        let finalSuggestedQty: number
        if (isBox && suggestedQty > 0) {
          finalSuggestedQty = Math.ceil(suggestedQty)
        } else {
          finalSuggestedQty = Math.round(suggestedQty * 100) / 100 // 保留两位小数
        }

        return {
          itemId: item.id,
          itemName: item.name,
          unit: item.unit,
          currentStock,
          parLevel: item.parLevel,
          avgUsage,
          suggestedQty: finalSuggestedQty,
        }
      })
    )

    // 返回所有物料的建议（包括建议采购量为0的）
    return NextResponse.json({
      date: format(targetDate, 'yyyy-MM-dd'),
      suggestions: suggestions,
    })
  } catch (error) {
    console.error('生成采购建议失败:', error)
    return NextResponse.json(
      { error: '生成采购建议失败' },
      { status: 500 }
    )
  }
}
