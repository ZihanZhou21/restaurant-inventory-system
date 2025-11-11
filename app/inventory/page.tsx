'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'

interface Item {
  id: string
  name: string
  unit: string
}

interface InventoryRecord {
  id: string
  date: string
  itemId: string
  startQty: number
  receivedQty: number
  endQty: number | null
  usage: number | null
  item: Item
}

export default function InventoryPage() {
  const [records, setRecords] = useState<InventoryRecord[]>([])
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchRecords()
  }, [selectedDate])

  const fetchRecords = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/inventory?date=${selectedDate}`)
      const data = await response.json()
      setRecords(data)
    } catch (error) {
      console.error('获取库存记录失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEndQtyChange = async (recordId: string, itemId: string, endQty: number | null) => {
    const record = records.find((r) => r.id === recordId)
    if (!record) return

    // 实时计算消耗量
    const usage = endQty !== null && endQty !== undefined 
      ? (record.startQty || 0) + (record.receivedQty || 0) - endQty 
      : null

    // 立即更新本地状态，实现实时显示
    setRecords(prevRecords => 
      prevRecords.map(r => 
        r.id === recordId 
          ? { ...r, endQty: endQty, usage }
          : r
      )
    )

    // 如果输入为空，不保存到后端
    if (endQty === null || endQty === undefined) {
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          itemId,
          startQty: record.startQty,
          receivedQty: record.receivedQty,
          endQty: endQty,
        }),
      })

      if (response.ok) {
        const updatedRecord = await response.json()
        // 只更新当前记录，不重新获取所有数据
        setRecords(prevRecords => 
          prevRecords.map(r => 
            r.id === recordId 
              ? { ...r, ...updatedRecord, item: record.item }
              : r
          )
        )
      } else {
        // 如果保存失败，恢复原值
        setRecords(prevRecords => 
          prevRecords.map(r => 
            r.id === recordId 
              ? { ...r, endQty: record.endQty, usage: record.usage }
              : r
          )
        )
        alert('更新库存记录失败')
      }
    } catch (error) {
      console.error('更新库存记录失败:', error)
      // 如果保存失败，恢复原值
      setRecords(prevRecords => 
        prevRecords.map(r => 
          r.id === recordId 
            ? { ...r, endQty: record.endQty, usage: record.usage }
            : r
        )
      )
      alert('更新库存记录失败')
    } finally {
      setSaving(false)
    }
  }

  const initializeRecords = async () => {
    try {
      const response = await fetch('/api/inventory/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
        }),
      })

      if (response.ok) {
        fetchRecords()
      } else {
        alert('初始化失败，请重试')
      }
    } catch (error) {
      console.error('初始化库存记录失败:', error)
      alert('初始化失败，请重试')
    }
  }

  if (loading) {
    return <div className="p-8">加载中...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">日终盘点</h1>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                盘点日期
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={initializeRecords}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              初始化今日记录
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">库存盘点表</h2>
            <p className="text-sm text-gray-600 mt-1">
              输入期末实盘数量，系统将自动计算消耗量
            </p>
          </div>
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
                  期初库存
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  今日采购
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  期末实盘
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  消耗量
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    暂无库存记录，请先初始化今日记录
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {record.item.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.item.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.startQty.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.receivedQty.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={record.endQty ?? ''}
                        onChange={(e) => {
                          const inputValue = e.target.value
                          if (inputValue === '') {
                            // 输入为空时，设置为null并实时更新显示
                            handleEndQtyChange(record.id, record.itemId, null)
                            return
                          }
                          const value = parseFloat(inputValue)
                          if (!isNaN(value) && value >= 0) {
                            handleEndQtyChange(record.id, record.itemId, value)
                          }
                        }}
                        className="w-24 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="输入数量"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {record.usage !== null ? (
                        <span className={record.usage < 0 ? 'text-red-600' : 'text-gray-900'}>
                          {record.usage.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-gray-400">待盘点</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {saving && (
          <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded shadow-lg">
            保存中...
          </div>
        )}
      </div>
    </div>
  )
}

