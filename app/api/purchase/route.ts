import { NextRequest, NextResponse } from 'next/server'
import {
  kv,
  KV_KEYS,
  generateId,
  PurchaseOrder,
  Item,
  PurchaseOrderWithItem,
} from '@/lib/kv'
import { startOfDay, parseISO, addDays, format } from 'date-fns'

// 获取采购计划
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dateStr = searchParams.get('date')

    const date = dateStr
      ? startOfDay(parseISO(dateStr))
      : startOfDay(addDays(new Date(), 1)) // 默认获取明天的采购计划

    const dateKey = format(date, 'yyyy-MM-dd')
    const orderIds = await kv.smembers(KV_KEYS.purchasesByDate(dateKey))

    const orders = await Promise.all(
      orderIds.map(async (id) => {
        const order = await kv.get<PurchaseOrder | null>(
          KV_KEYS.purchase(id as string)
        )
        if (order && order.itemId) {
          const item = await kv.get<Item | null>(KV_KEYS.item(order.itemId))
          if (item) {
            return { ...order, item } as PurchaseOrderWithItem
          }
        }
        return null
      })
    )

    const validOrders: PurchaseOrderWithItem[] = orders
      .filter((order): order is PurchaseOrderWithItem => order !== null)
      .sort((a, b) => a.item.name.localeCompare(b.item.name))

    return NextResponse.json(validOrders)
  } catch (error) {
    console.error('获取采购计划失败:', error)
    return NextResponse.json({ error: '获取采购计划失败' }, { status: 500 })
  }
}

// 创建或更新采购计划
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, itemId, plannedQty, confirmed } = body

    if (!date || !itemId || plannedQty === undefined) {
      return NextResponse.json(
        { error: '日期、物料ID和计划数量是必填项' },
        { status: 400 }
      )
    }

    const orderDate = startOfDay(parseISO(date))
    const dateKey = format(orderDate, 'yyyy-MM-dd')
    const purchaseLookupKey = KV_KEYS.purchaseByDateAndItem(dateKey, itemId)

    // 检查是否已存在该日期的采购计划
    const existingOrderId = await kv.get<string | null>(purchaseLookupKey)
    const now = new Date().toISOString()

    let order: PurchaseOrder
    let orderId: string
    const isExisting = !!existingOrderId

    if (existingOrderId) {
      // 如果已存在，更新
      orderId = existingOrderId
      const existingOrder = await kv.get<PurchaseOrder | null>(
        KV_KEYS.purchase(orderId)
      )
      if (!existingOrder) {
        return NextResponse.json({ error: '采购计划数据异常' }, { status: 500 })
      }
      order = {
        ...existingOrder,
        plannedQty,
        confirmed:
          confirmed !== undefined ? confirmed : existingOrder.confirmed,
        updatedAt: now,
      }
    } else {
      // 如果不存在，创建
      orderId = generateId()
      order = {
        id: orderId,
        date: orderDate.toISOString(),
        itemId,
        plannedQty,
        confirmed: confirmed || false,
        actualQty: null,
        createdAt: now,
        updatedAt: now,
      }

      // 创建查找索引
      await kv.set(purchaseLookupKey, orderId)
      // 添加到日期索引
      await kv.sadd(KV_KEYS.purchasesByDate(dateKey), orderId)
      // 添加到总列表
      await kv.sadd(KV_KEYS.purchasesList(), orderId)
    }

    // 保存采购计划
    await kv.set(KV_KEYS.purchase(orderId), order)

    // 获取物料信息
    const item = await kv.get<Item | null>(KV_KEYS.item(itemId))
    if (!item) {
      return NextResponse.json({ error: '物料不存在' }, { status: 404 })
    }
    const orderWithItem = { ...order, item }

    return NextResponse.json(orderWithItem, { status: isExisting ? 200 : 201 })
  } catch (error) {
    console.error('创建采购计划失败:', error)
    return NextResponse.json({ error: '创建采购计划失败' }, { status: 500 })
  }
}
