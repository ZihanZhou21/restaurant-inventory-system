import { kv } from '@vercel/kv'

export { kv }

// 键名规范
export const KV_KEYS = {
  // 物料相关
  item: (id: string) => `item:${id}`,
  itemsList: () => 'items:list',
  
  // 采购计划相关
  purchase: (id: string) => `purchase:${id}`,
  purchaseByDateAndItem: (date: string, itemId: string) => `purchase:${date}:${itemId}`,
  purchasesByDate: (date: string) => `purchases:date:${date}`,
  purchasesList: () => 'purchases:list',
  
  // 库存记录相关
  inventory: (id: string) => `inventory:${id}`,
  inventoryByDateAndItem: (date: string, itemId: string) => `inventory:${date}:${itemId}`,
  inventoriesByDate: (date: string) => `inventories:date:${date}`,
  inventoriesList: () => 'inventories:list',
}

// 生成唯一ID（类似 cuid）
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export { generateId }

