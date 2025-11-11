import { NextRequest, NextResponse } from 'next/server'
import { kv, KV_KEYS, generateId, Item } from '@/lib/kv'

// 获取所有物料
export async function GET() {
  try {
    const itemsList = await kv.smembers(KV_KEYS.itemsList())
    const items = await Promise.all(
      itemsList.map(async (id) => {
        const item = await kv.get<Item | null>(KV_KEYS.item(id as string))
        return item
      })
    )

    // 过滤掉 null 值并排序
    const validItems = items
      .filter((item): item is Item => item !== null)
      .sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json(validItems)
  } catch (error) {
    console.error('获取物料列表失败:', error)
    return NextResponse.json({ error: '获取物料列表失败' }, { status: 500 })
  }
}

// 创建新物料
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, unit, parLevel, safetyStock } = body

    if (!name || !unit) {
      return NextResponse.json(
        { error: '物料名称和单位是必填项' },
        { status: 400 }
      )
    }

    const id = generateId()
    const now = new Date().toISOString()

    const item = {
      id,
      name,
      unit,
      parLevel: parLevel || 0,
      safetyStock: safetyStock || 0,
      createdAt: now,
      updatedAt: now,
    }

    // 保存物料
    await kv.set(KV_KEYS.item(id), item)

    // 添加到物料列表
    await kv.sadd(KV_KEYS.itemsList(), id)

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('创建物料失败:', error)
    return NextResponse.json({ error: '创建物料失败' }, { status: 500 })
  }
}
