import { NextRequest, NextResponse } from 'next/server'
import { kv, KV_KEYS } from '@/lib/kv'
import { startOfDay, parseISO, format } from 'date-fns'

// 获取所有物料的当前库存
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dateStr = searchParams.get('date')
    
    // 获取指定日期或今天的库存
    const targetDate = dateStr 
      ? startOfDay(parseISO(dateStr))
      : startOfDay(new Date())

    // 获取所有物料
    const itemsList = await kv.smembers(KV_KEYS.itemsList())
    const items = await Promise.all(
      itemsList.map(async (id) => await kv.get(KV_KEYS.item(id)))
    )
    const validItems = items
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => a.name.localeCompare(b.name))

    // 获取每个物料的当前库存
    const currentStocks = await Promise.all(
      validItems.map(async (item) => {
        // 获取所有库存记录ID
        const allInventoryIds = await kv.smembers(KV_KEYS.inventoriesList())
        
        // 查找该物料在目标日期或之前的最近一条记录
        let latestRecord = null
        let latestDate = null
        
        for (const id of allInventoryIds) {
          const record = await kv.get(KV_KEYS.inventory(id as string))
          if (record && record.itemId === item.id) {
            const recordDate = parseISO(record.date)
            if (recordDate <= targetDate) {
              if (!latestDate || recordDate > latestDate) {
                latestDate = recordDate
                latestRecord = record
              }
            }
          }
        }

        // 如果有记录，使用期末库存；否则为0
        let currentStock = 0
        if (latestRecord) {
          if (latestRecord.endQty !== null && latestRecord.endQty !== undefined) {
            currentStock = latestRecord.endQty
          } else {
            // 如果还未盘点，使用期初+采购量
            currentStock = (latestRecord.startQty || 0) + (latestRecord.receivedQty || 0)
          }
        }

        return {
          itemId: item.id,
          currentStock,
        }
      })
    )

    return NextResponse.json(currentStocks)
  } catch (error) {
    console.error('获取当前库存失败:', error)
    return NextResponse.json(
      { error: '获取当前库存失败' },
      { status: 500 }
    )
  }
}
