'use client'

import { useEffect, useState } from 'react'
import { format, addDays } from 'date-fns'

interface Suggestion {
  itemId: string
  itemName: string
  unit: string
  currentStock: number
  parLevel: number
  avgUsage: number
  suggestedQty: number
}

export default function SuggestionsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [selectedDate, setSelectedDate] = useState(
    format(addDays(new Date(), 1), 'yyyy-MM-dd')
  )
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState('')

  useEffect(() => {
    fetchSuggestions()
  }, [selectedDate])

  const fetchSuggestions = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/suggestions?date=${selectedDate}`)
      const data = await response.json()
      setSuggestions(data.suggestions || [])
      setDate(data.date || selectedDate)
    } catch (error) {
      console.error('获取采购建议失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePurchaseOrder = async (itemId: string, qty: number) => {
    try {
      const response = await fetch('/api/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          itemId,
          plannedQty: qty,
          confirmed: false,
        }),
      })

      if (response.ok) {
        alert('采购计划已创建')
      }
    } catch (error) {
      console.error('创建采购计划失败:', error)
      alert('创建采购计划失败')
    }
  }

  const handleBatchCreate = async () => {
    // 只创建建议采购量大于0的采购计划
    const promises = suggestions
      .filter((s) => s.suggestedQty > 0)
      .map((s) => handleCreatePurchaseOrder(s.itemId, s.suggestedQty))
    await Promise.all(promises)
    alert('批量创建采购计划成功')
  }

  if (loading) {
    return <div className="p-8">加载中...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">采购建议</h1>
          {suggestions.some((s) => s.suggestedQty > 0) && (
            <button
              onClick={handleBatchCreate}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
              批量创建采购计划
            </button>
          )}
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
            <h2 className="text-xl font-semibold">采购建议列表</h2>
            <p className="text-sm text-gray-600 mt-1">
              基于 Par Level 和平均消耗量生成的采购建议
            </p>
          </div>
          {suggestions.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              暂无物料，请先添加物料
            </div>
          ) : (
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
                    Par Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    平均日耗
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    建议采购量
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {suggestions.map((suggestion) => {
                  // 判断单位是否为箱
                  const unitLower = suggestion.unit.toLowerCase().trim()
                  const isBox =
                    unitLower === '箱' ||
                    unitLower === 'box' ||
                    unitLower === '箱装'

                  return (
                    <tr key={suggestion.itemId}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {suggestion.itemName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {suggestion.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {suggestion.currentStock.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {suggestion.parLevel > 0
                          ? suggestion.parLevel.toFixed(2)
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {suggestion.avgUsage > 0
                          ? suggestion.avgUsage.toFixed(2)
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                        {suggestion.suggestedQty > 0 ? (
                          <span className="text-blue-600">
                            {isBox
                              ? suggestion.suggestedQty.toFixed(0)
                              : suggestion.suggestedQty.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {suggestion.suggestedQty > 0 ? (
                          <button
                            onClick={() =>
                              handleCreatePurchaseOrder(
                                suggestion.itemId,
                                suggestion.suggestedQty
                              )
                            }
                            className="text-blue-600 hover:text-blue-800">
                            创建采购计划
                          </button>
                        ) : (
                          <span className="text-gray-400">无需采购</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
