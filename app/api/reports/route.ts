import { NextRequest, NextResponse } from 'next/server'
import { kv, KV_KEYS } from '@/lib/kv'
import { startOfDay, parseISO, startOfWeek, startOfMonth, endOfWeek, endOfMonth, format } from 'date-fns'

// 获取报表数据
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || 'day' // day, week, month
    const dateStr = searchParams.get('date')
    const itemId = searchParams.get('itemId')

    const date = dateStr ? parseISO(dateStr) : new Date()

    let startDate: Date
    let endDate: Date

    switch (type) {
      case 'week':
        startDate = startOfWeek(date, { weekStartsOn: 1 }) // 周一开始
        endDate = endOfWeek(date, { weekStartsOn: 1 })
        break
      case 'month':
        startDate = startOfMonth(date)
        endDate = endOfMonth(date)
        break
      default: // day
        startDate = startOfDay(date)
        endDate = startOfDay(date)
    }

    // 获取所有库存记录
    const allInventoryIds = await kv.smembers(KV_KEYS.inventoriesList())
    const allRecords = await Promise.all(
      allInventoryIds.map(async (id) => {
        const record = await kv.get(KV_KEYS.inventory(id as string))
        if (record && record.itemId) {
          const item = await kv.get(KV_KEYS.item(record.itemId))
          return { ...record, item }
        }
        return null
      })
    )

    // 过滤记录
    const records = allRecords
      .filter((record): record is NonNullable<typeof record> => 
        record !== null && 
        record.item !== null &&
        record.usage !== null &&
        record.usage !== undefined
      )
      .filter((record) => {
        const recordDate = parseISO(record.date)
        return recordDate >= startDate && recordDate <= endDate
      })
      .filter((record) => {
        if (itemId) {
          return record.itemId === itemId
        }
        return true
      })
      .sort((a, b) => {
        const dateCompare = parseISO(a.date).getTime() - parseISO(b.date).getTime()
        if (dateCompare !== 0) return dateCompare
        return a.item.name.localeCompare(b.item.name)
      })

    // 按物料分组统计
    const itemStats = records.reduce((acc: any, record) => {
      const itemId = record.itemId
      if (!acc[itemId]) {
        acc[itemId] = {
          itemId,
          itemName: record.item.name,
          unit: record.item.unit,
          totalUsage: 0,
          totalReceivedQty: 0,
          avgUsage: 0,
          records: [],
          firstRecord: null,
          lastRecord: null,
        }
      }
      acc[itemId].totalUsage += record.usage || 0
      acc[itemId].totalReceivedQty += record.receivedQty || 0
      
      // 记录第一条和最后一条记录（用于获取期初和期末库存）
      if (!acc[itemId].firstRecord || parseISO(record.date) < parseISO(acc[itemId].firstRecord.date)) {
        acc[itemId].firstRecord = record
      }
      if (!acc[itemId].lastRecord || parseISO(record.date) > parseISO(acc[itemId].lastRecord.date)) {
        acc[itemId].lastRecord = record
      }
      
      // 日报表保留所有记录，周报表和月报表只用于汇总
      if (type === 'day') {
        acc[itemId].records.push({
          date: format(parseISO(record.date), 'yyyy-MM-dd'),
          usage: record.usage,
          startQty: record.startQty,
          receivedQty: record.receivedQty,
          endQty: record.endQty,
        })
      }
      return acc
    }, {})

    // 对于周报表和月报表，创建汇总记录
    if (type === 'week' || type === 'month') {
      Object.values(itemStats).forEach((stat: any) => {
        if (stat.firstRecord && stat.lastRecord) {
          stat.records = [{
            date: `${format(startDate, 'yyyy-MM-dd')} 至 ${format(endDate, 'yyyy-MM-dd')}`,
            usage: stat.totalUsage,
            startQty: stat.firstRecord.startQty,
            receivedQty: stat.totalReceivedQty,
            endQty: stat.lastRecord.endQty,
          }]
        } else {
          stat.records = []
        }
        // 计算平均日耗（总消耗量 / 周期天数）
        const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
        stat.avgUsage = days > 0 ? stat.totalUsage / days : 0
      })
    } else {
      // 日报表计算平均消耗量
      Object.values(itemStats).forEach((stat: any) => {
        stat.avgUsage = stat.records.length > 0
          ? stat.totalUsage / stat.records.length
          : 0
      })
    }

    return NextResponse.json({
      type,
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      stats: Object.values(itemStats),
    })
  } catch (error) {
    console.error('获取报表数据失败:', error)
    return NextResponse.json(
      { error: '获取报表数据失败' },
      { status: 500 }
    )
  }
}
