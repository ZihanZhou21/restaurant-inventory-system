'use client'

import { useEffect, useState, useRef } from 'react'
import { format, addDays } from 'date-fns'

interface Item {
  id: string
  name: string
  unit: string
}

interface PurchaseOrder {
  id: string
  date: string
  itemId: string
  plannedQty: number
  confirmed: boolean
  item: Item
}

interface Suggestion {
  itemId: string
  itemName: string
  unit: string
  currentStock: number
  parLevel: number
  avgUsage: number
  suggestedQty: number
}

interface ItemWithOrder extends Item {
  order?: PurchaseOrder
  currentStock: number
  suggestedQty: number
}

export default function PurchasePage() {
  const [items, setItems] = useState<ItemWithOrder[]>([])
  const [selectedDate, setSelectedDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [selectedDate])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // 并行获取物料、采购计划、当前库存和采购建议
      const [itemsResponse, ordersResponse, stocksResponse, suggestionsResponse] = await Promise.all([
        fetch('/api/items'),
        fetch(`/api/purchase?date=${selectedDate}`),
        fetch(`/api/inventory/current?date=${selectedDate}`),
        fetch(`/api/suggestions?date=${selectedDate}`),
      ])

      const itemsData: Item[] = await itemsResponse.json()
      const ordersData: PurchaseOrder[] = await ordersResponse.json()
      const stocksData: Array<{ itemId: string; currentStock: number }> = await stocksResponse.json()
      const suggestionsData: { suggestions: Suggestion[] } = await suggestionsResponse.json()

      // 创建库存映射
      const stockMap = new Map(stocksData.map(s => [s.itemId, s.currentStock]))

      // 创建订单映射
      const orderMap = new Map(ordersData.map(o => [o.itemId, o]))

      // 创建建议映射
      const suggestionMap = new Map(suggestionsData.suggestions.map(s => [s.itemId, s.suggestedQty]))

      // 合并数据
      const itemsWithOrders: ItemWithOrder[] = itemsData.map(item => ({
        ...item,
        order: orderMap.get(item.id),
        currentStock: stockMap.get(item.id) || 0,
        suggestedQty: suggestionMap.get(item.id) || 0,
      }))

      setItems(itemsWithOrders)
    } catch (error) {
      console.error('获取数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleQuantityChange = async (itemId: string, newQty: number) => {
    if (newQty < 0) return

    const item = items.find(i => i.id === itemId)
    if (!item) return

    try {
      if (newQty === 0 && item.order) {
        // 如果数量为0且存在采购计划，删除采购计划
        const response = await fetch(`/api/purchase/${item.order.id}`, {
          method: 'DELETE',
        })

        if (response.ok) {
          fetchData()
        } else {
          alert('删除采购计划失败')
        }
      } else if (newQty > 0) {
        // 如果数量大于0，创建或更新采购计划
        const response = await fetch('/api/purchase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: selectedDate,
            itemId,
            plannedQty: newQty,
            confirmed: item.order?.confirmed || false, // 保持原有确认状态
          }),
        })

        if (response.ok) {
          fetchData()
        } else {
          alert('更新采购计划失败')
        }
      }
    } catch (error) {
      console.error('更新采购计划失败:', error)
      alert('更新采购计划失败')
    }
  }

  const handleConfirm = async (orderId: string) => {
    try {
      const response = await fetch(`/api/purchase/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmed: true,
        }),
      })

      if (response.ok) {
        fetchData()
      }
    } catch (error) {
      console.error('确认采购计划失败:', error)
      alert('确认采购计划失败')
    }
  }

  const handleCancel = async (orderId: string) => {
    try {
      const response = await fetch(`/api/purchase/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmed: false,
        }),
      })

      if (response.ok) {
        fetchData()
      }
    } catch (error) {
      console.error('取消确认失败:', error)
      alert('取消确认失败')
    }
  }

  const handleDelete = async (orderId: string) => {
    if (!confirm('确定要删除这个采购计划吗？')) return

    try {
      const response = await fetch(`/api/purchase/${orderId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchData()
      }
    } catch (error) {
      console.error('删除采购计划失败:', error)
      alert('删除采购计划失败')
    }
  }

  if (loading) {
    return <div className="p-8">加载中...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">采购登记</h1>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            采购日期
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">采购计划列表</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    物料名称
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    单位
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    当前库存
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    每日建议采购量
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    计划数量
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      暂无物料
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <PurchaseRow
                      key={item.id}
                      item={item}
                      onQuantityChange={handleQuantityChange}
                      onConfirm={handleConfirm}
                      onCancel={handleCancel}
                      onDelete={handleDelete}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

interface PurchaseRowProps {
  item: ItemWithOrder
  onQuantityChange: (itemId: string, qty: number) => void
  onConfirm: (orderId: string) => void
  onCancel: (orderId: string) => void
  onDelete: (orderId: string) => void
}

function PurchaseRow({ item, onQuantityChange, onConfirm, onCancel, onDelete }: PurchaseRowProps) {
  // 判断单位是否为箱（支持多种写法）
  const unitLower = item.unit.toLowerCase().trim()
  const isBox = unitLower === '箱' || unitLower === 'box' || unitLower === '箱装'
  const step = isBox ? 1 : 0.01

  // 获取默认值：如果有采购计划，显示计划数量；否则显示建议采购量
  const getDefaultValue = () => {
    return item.order?.plannedQty ?? item.suggestedQty
  }
  
  const [qty, setQty] = useState(() => getDefaultValue().toString())
  const isEditingRef = useRef(false)
  const prevOrderIdRef = useRef(item.order?.id)
  
  // 当订单ID变化时（创建或删除），更新输入框
  useEffect(() => {
    const currentOrderId = item.order?.id
    if (prevOrderIdRef.current !== currentOrderId) {
      if (!isEditingRef.current) {
        const newValue = getDefaultValue()
        setQty(newValue.toString())
      }
      prevOrderIdRef.current = currentOrderId
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.order?.id])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 如果已确认，不允许编辑
    if (item.order?.confirmed) {
      return
    }
    const value = e.target.value
    isEditingRef.current = true
    // 允许空值，以便用户清空输入
    setQty(value)
  }

  const handleInputBlur = () => {
    // 如果已确认，不允许编辑
    if (item.order?.confirmed) {
      return
    }
    isEditingRef.current = false
    // 如果输入为空或无效，恢复到默认值
    const numQty = parseFloat(qty)
    if (isNaN(numQty) || numQty < 0) {
      // 如果已有采购计划，保持计划数量；否则使用建议采购量
      const defaultQty = getDefaultValue()
      setQty(defaultQty.toString())
      return
    }
    
    const finalQty = Math.max(0, numQty)
    // 如果是箱，取整
    const roundedQty = isBox ? Math.floor(finalQty) : Math.round(finalQty * 100) / 100
    setQty(roundedQty.toString())
    
    // 检查数量是否发生变化
    const currentQty = item.order?.plannedQty ?? 0
    const suggestedQty = item.suggestedQty
    
    // 如果数量与当前计划数量不同，或者没有采购计划但输入了数量，或者有采购计划但输入了0
    if (Math.abs(roundedQty - currentQty) > 0.01) {
      onQuantityChange(item.id, roundedQty)
    } else if (!item.order && roundedQty > 0 && Math.abs(roundedQty - suggestedQty) > 0.01) {
      // 如果没有采购计划但输入了与建议不同的数量，创建采购计划
      onQuantityChange(item.id, roundedQty)
    }
  }
  
  const handleInputFocus = () => {
    // 如果已确认，不允许编辑
    if (item.order?.confirmed) {
      return
    }
    isEditingRef.current = true
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    }
  }

  const handleDecrease = () => {
    // 如果已确认，不允许编辑
    if (item.order?.confirmed) {
      return
    }
    const currentQty = parseFloat(qty) || 0
    const newQty = Math.max(0, currentQty - (isBox ? 1 : step))
    const roundedQty = isBox ? Math.floor(newQty) : Math.round(newQty * 100) / 100
    setQty(roundedQty.toString())
    isEditingRef.current = false // 按钮点击后立即保存
    onQuantityChange(item.id, roundedQty)
  }

  const handleIncrease = () => {
    // 如果已确认，不允许编辑
    if (item.order?.confirmed) {
      return
    }
    const currentQty = parseFloat(qty) || 0
    const newQty = currentQty + (isBox ? 1 : step)
    const roundedQty = isBox ? Math.floor(newQty) : Math.round(newQty * 100) / 100
    setQty(roundedQty.toString())
    isEditingRef.current = false // 按钮点击后立即保存
    onQuantityChange(item.id, roundedQty)
  }

  return (
    <tr key={item.id}>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        {item.name}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {item.unit}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {item.currentStock.toFixed(2)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {item.suggestedQty > 0 ? (
          <span className="text-blue-600 font-medium">
            {item.suggestedQty.toFixed(isBox ? 0 : 2)}
          </span>
        ) : (
          <span className="text-gray-400">0</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
          <button
            type="button"
            onClick={handleDecrease}
            disabled={parseFloat(qty) === 0 || (item.order?.confirmed ?? false)}
            className="px-3 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:z-10 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-200 transition-colors border-r border-gray-300"
            title="减少"
          >
            −
          </button>
          <input
            type="number"
            step={step}
            min="0"
            value={qty}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyPress={handleKeyPress}
            disabled={item.order?.confirmed ?? false}
            className="w-24 px-3 py-2 border-0 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:z-10 disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder={item.suggestedQty > 0 ? item.suggestedQty.toFixed(isBox ? 0 : 2) : '0'}
          />
          <button
            type="button"
            onClick={handleIncrease}
            disabled={item.order?.confirmed ?? false}
            className="px-3 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:z-10 transition-colors border-l border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-200"
            title="增加"
          >
            +
          </button>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        {item.order ? (
          <span
            className={`px-2 py-1 rounded-full text-xs ${
              item.order.confirmed
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {item.order.confirmed ? '已确认' : '待确认'}
          </span>
        ) : (
          <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
            未添加
          </span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        {item.order ? (
          <div className="flex gap-2">
            {item.order.confirmed ? (
              <button
                onClick={() => onCancel(item.order!.id)}
                className="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 text-xs"
              >
                取消
              </button>
            ) : (
              <>
                <button
                  onClick={() => onConfirm(item.order!.id)}
                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                >
                  确认
                </button>
                <button
                  onClick={() => onDelete(item.order!.id)}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                >
                  删除
                </button>
              </>
            )}
          </div>
        ) : (
          <span className="text-xs text-gray-400">-</span>
        )}
      </td>
    </tr>
  )
}
