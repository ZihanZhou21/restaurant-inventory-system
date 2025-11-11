import { NextRequest, NextResponse } from 'next/server'
import { kv, KV_KEYS, generateId } from '@/lib/kv'
import { format, startOfDay, parseISO } from 'date-fns'

// 获取库存记录
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dateStr = searchParams.get('date')
    
    const date = dateStr 
      ? startOfDay(parseISO(dateStr))
      : startOfDay(new Date())

    const dateKey = format(date, 'yyyy-MM-dd')
    const recordIds = await kv.smembers(KV_KEYS.inventoriesByDate(dateKey))
    
    const records = await Promise.all(
      recordIds.map(async (id) => {
        const record = await kv.get(KV_KEYS.inventory(id as string))
        if (record && record.itemId) {
          const item = await kv.get(KV_KEYS.item(record.itemId))
          return { ...record, item }
        }
        return null
      })
    )

    const validRecords = records
      .filter((record): record is NonNullable<typeof record> => record !== null && record.item !== null)
      .sort((a, b) => a.item.name.localeCompare(b.item.name))

    return NextResponse.json(validRecords)
  } catch (error) {
    console.error('获取库存记录失败:', error)
    return NextResponse.json(
      { error: '获取库存记录失败' },
      { status: 500 }
    )
  }
}

// 创建或更新库存记录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, itemId, startQty, receivedQty, endQty } = body

    if (!date || !itemId) {
      return NextResponse.json(
        { error: '日期和物料ID是必填项' },
        { status: 400 }
      )
    }

    const recordDate = startOfDay(parseISO(date))
    const dateKey = format(recordDate, 'yyyy-MM-dd')
    const inventoryLookupKey = KV_KEYS.inventoryByDateAndItem(dateKey, itemId)
    
    // 计算消耗量
    let usage: number | null = null
    if (endQty !== null && endQty !== undefined) {
      usage = (startQty || 0) + (receivedQty || 0) - endQty
    }

    // 检查是否已存在记录
    const existingRecordId = await kv.get(inventoryLookupKey)
    const now = new Date().toISOString()

    let record
    let recordId: string

    if (existingRecordId) {
      // 如果已存在，更新
      recordId = existingRecordId as string
      const existingRecord = await kv.get(KV_KEYS.inventory(recordId))
      record = {
        ...existingRecord,
        startQty: startQty || 0,
        receivedQty: receivedQty || 0,
        endQty: endQty !== null && endQty !== undefined ? endQty : null,
        usage,
        updatedAt: now,
      }
    } else {
      // 如果不存在，创建
      recordId = generateId()
      record = {
        id: recordId,
        date: recordDate.toISOString(),
        itemId,
        startQty: startQty || 0,
        receivedQty: receivedQty || 0,
        endQty: endQty !== null && endQty !== undefined ? endQty : null,
        usage,
        confirmed: false,
        createdAt: now,
        updatedAt: now,
      }
      
      // 创建查找索引
      await kv.set(inventoryLookupKey, recordId)
      // 添加到日期索引
      await kv.sadd(KV_KEYS.inventoriesByDate(dateKey), recordId)
      // 添加到总列表
      await kv.sadd(KV_KEYS.inventoriesList(), recordId)
    }

    // 保存库存记录
    await kv.set(KV_KEYS.inventory(recordId), record)

    return NextResponse.json(record, { status: existingRecordId ? 200 : 201 })
  } catch (error) {
    console.error('创建库存记录失败:', error)
    return NextResponse.json(
      { error: '创建库存记录失败' },
      { status: 500 }
    )
  }
}
