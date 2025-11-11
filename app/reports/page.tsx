'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'

interface Record {
  date: string
  usage: number
  startQty: number
  receivedQty: number
  endQty: number | null
}

interface ItemStat {
  itemId: string
  itemName: string
  unit: string
  totalUsage: number
  avgUsage: number
  records: Record[]
}

interface ReportData {
  type: string
  startDate: string
  endDate: string
  stats: ItemStat[]
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState<'day' | 'week' | 'month'>('day')
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<string>('')

  useEffect(() => {
    fetchReport()
  }, [reportType, selectedDate, selectedItemId])

  const fetchReport = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        type: reportType,
        date: selectedDate,
      })
      if (selectedItemId) {
        params.append('itemId', selectedItemId)
      }

      const response = await fetch(`/api/reports?${params}`)
      const data = await response.json()
      setReportData(data)
    } catch (error) {
      console.error('获取报表数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDateInputType = () => {
    switch (reportType) {
      case 'week':
        return 'week'
      case 'month':
        return 'month'
      default:
        return 'date'
    }
  }

  if (loading) {
    return <div className="p-8">加载中...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">报表分析</h1>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                报表类型
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as 'day' | 'week' | 'month')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="day">日报表</option>
                <option value="week">周报表</option>
                <option value="month">月报表</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                日期
              </label>
              <input
                type={getDateInputType()}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                物料筛选（可选）
              </label>
              <input
                type="text"
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                placeholder="输入物料ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {reportData && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">
                {reportType === 'day' ? '日' : reportType === 'week' ? '周' : '月'}报表
              </h2>
              <p className="text-gray-600 mb-4">
                时间范围：{reportData.startDate} 至 {reportData.endDate}
              </p>
            </div>

            {reportData.stats.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
                暂无数据
              </div>
            ) : (
              reportData.stats.map((stat) => (
                <div key={stat.itemId} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold">{stat.itemName}</h3>
                    <p className="text-sm text-gray-600">单位：{stat.unit}</p>
                  </div>
                  <div className="px-6 py-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">总消耗量</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {stat.totalUsage.toFixed(2)} {stat.unit}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">平均日耗</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {stat.avgUsage.toFixed(2)} {stat.unit}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">记录天数</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {stat.records.length} 天
                        </p>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              日期
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              期初库存
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              采购量
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              期末库存
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              消耗量
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {stat.records.map((record, idx) => (
                            <tr key={idx}>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {record.date}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">
                                {record.startQty.toFixed(2)}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">
                                {record.receivedQty.toFixed(2)}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">
                                {record.endQty !== null ? record.endQty.toFixed(2) : '-'}
                              </td>
                              <td className="px-4 py-2 text-sm font-medium text-gray-900">
                                {record.usage.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

