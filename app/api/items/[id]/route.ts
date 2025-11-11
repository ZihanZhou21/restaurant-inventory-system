import { NextRequest, NextResponse } from 'next/server'
import { kv, KV_KEYS, Item } from '@/lib/kv'

// 更新物料
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name, unit, parLevel, safetyStock } = body

    // 获取现有物料
    const existingItem = await kv.get<Item | null>(KV_KEYS.item(params.id))
    if (!existingItem) {
      return NextResponse.json(
        { error: '物料不存在' },
        { status: 404 }
      )
    }

    // 验证必填字段
    if (name !== undefined && name.trim() === '') {
      return NextResponse.json(
        { error: '物料名称不能为空' },
        { status: 400 }
      )
    }
    if (unit !== undefined && unit.trim() === '') {
      return NextResponse.json(
        { error: '单位不能为空' },
        { status: 400 }
      )
    }

    // 构建更新数据对象
    const updatedItem = {
      ...existingItem,
      ...(name !== undefined && { name: name.trim() }),
      ...(unit !== undefined && { unit: unit.trim() }),
      ...(parLevel !== undefined && { parLevel: parseFloat(String(parLevel)) || 0 }),
      ...(safetyStock !== undefined && { safetyStock: parseFloat(String(safetyStock)) || 0 }),
      updatedAt: new Date().toISOString(),
    }

    await kv.set(KV_KEYS.item(params.id), updatedItem)

    return NextResponse.json(updatedItem)
  } catch (error) {
    console.error('更新物料失败:', error)
    return NextResponse.json(
      { error: '更新物料失败' },
      { status: 500 }
    )
  }
}

// 删除物料
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 检查物料是否存在
    const item = await kv.get<Item | null>(KV_KEYS.item(params.id))
    if (!item) {
      return NextResponse.json(
        { error: '物料不存在' },
        { status: 404 }
      )
    }

    // 删除物料
    await kv.del(KV_KEYS.item(params.id))
    
    // 从物料列表中移除
    await kv.srem(KV_KEYS.itemsList(), params.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除物料失败:', error)
    return NextResponse.json(
      { error: '删除物料失败' },
      { status: 500 }
    )
  }
}

