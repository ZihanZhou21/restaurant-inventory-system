import { NextRequest, NextResponse } from 'next/server'
import { kv, KV_KEYS } from '@/lib/kv'
import { format, parseISO } from 'date-fns'

// 更新采购计划
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { plannedQty, confirmed, actualQty } = body

    // 获取现有订单
    const existingOrder = await kv.get(KV_KEYS.purchase(params.id))
    if (!existingOrder) {
      return NextResponse.json(
        { error: '采购计划不存在' },
        { status: 404 }
      )
    }

    const updatedOrder = {
      ...existingOrder,
      ...(plannedQty !== undefined && { plannedQty: parseFloat(String(plannedQty)) || 0 }),
      ...(confirmed !== undefined && { confirmed }),
      ...(actualQty !== undefined && { actualQty: actualQty !== null ? parseFloat(String(actualQty)) : null }),
      updatedAt: new Date().toISOString(),
    }

    await kv.set(KV_KEYS.purchase(params.id), updatedOrder)

    // 获取物料信息
    const item = await kv.get(KV_KEYS.item(updatedOrder.itemId))
    const orderWithItem = { ...updatedOrder, item }

    return NextResponse.json(orderWithItem)
  } catch (error) {
    console.error('更新采购计划失败:', error)
    return NextResponse.json(
      { error: '更新采购计划失败' },
      { status: 500 }
    )
  }
}

// 删除采购计划
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 获取订单信息
    const order = await kv.get(KV_KEYS.purchase(params.id))
    if (!order) {
      return NextResponse.json(
        { error: '采购计划不存在' },
        { status: 404 }
      )
    }

    // 删除订单
    await kv.del(KV_KEYS.purchase(params.id))
    
    // 从日期索引中移除
    const dateKey = format(parseISO(order.date), 'yyyy-MM-dd')
    await kv.srem(KV_KEYS.purchasesByDate(dateKey), params.id)
    
    // 从总列表中移除
    await kv.srem(KV_KEYS.purchasesList(), params.id)
    
    // 删除查找索引
    await kv.del(KV_KEYS.purchaseByDateAndItem(dateKey, order.itemId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除采购计划失败:', error)
    return NextResponse.json(
      { error: '删除采购计划失败' },
      { status: 500 }
    )
  }
}

