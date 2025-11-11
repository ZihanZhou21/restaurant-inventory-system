'use client'

import { useEffect, useState } from 'react'

interface Item {
  id: string
  name: string
  unit: string
  parLevel: number
  safetyStock: number
}

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    unit: '',
    parLevel: '',
    safetyStock: '',
  })

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/items')
      const data = await response.json()
      setItems(data)
    } catch (error) {
      console.error('获取物料列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingId) {
        // 更新物料
        const response = await fetch(`/api/items/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            unit: formData.unit,
            parLevel: parseFloat(formData.parLevel) || 0,
            safetyStock: parseFloat(formData.safetyStock) || 0,
          }),
        })

        if (response.ok) {
          resetForm()
          fetchItems()
        } else {
          alert('更新物料失败')
        }
      } else {
        // 创建物料
        const response = await fetch('/api/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            unit: formData.unit,
            parLevel: parseFloat(formData.parLevel) || 0,
            safetyStock: parseFloat(formData.safetyStock) || 0,
          }),
        })

        if (response.ok) {
          resetForm()
          fetchItems()
        } else {
          alert('创建物料失败')
        }
      }
    } catch (error) {
      console.error(editingId ? '更新物料失败' : '创建物料失败:', error)
      alert(editingId ? '更新物料失败' : '创建物料失败')
    }
  }

  const resetForm = () => {
    setFormData({ name: '', unit: '', parLevel: '', safetyStock: '' })
    setShowForm(false)
    setEditingId(null)
  }

  const handleEdit = (item: Item) => {
    setFormData({
      name: item.name,
      unit: item.unit,
      parLevel: item.parLevel.toString(),
      safetyStock: item.safetyStock.toString(),
    })
    setEditingId(item.id)
    setShowForm(true)
    // 滚动到表单位置
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancel = () => {
    resetForm()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个物料吗？')) return

    try {
      const response = await fetch(`/api/items/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchItems()
      }
    } catch (error) {
      console.error('删除物料失败:', error)
      alert('删除物料失败')
    }
  }

  if (loading) {
    return <div className="p-8">加载中...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">物料管理</h1>
          <button
            onClick={() => {
              if (showForm) {
                handleCancel()
              } else {
                setShowForm(true)
                setEditingId(null)
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {showForm ? '取消' : '添加物料'}
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingId ? '编辑物料' : '添加新物料'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  物料名称 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  单位 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="如：kg, 个, 箱"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Par Level（预设库存下限）
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.parLevel}
                    onChange={(e) => setFormData({ ...formData, parLevel: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    安全库存
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.safetyStock}
                    onChange={(e) => setFormData({ ...formData, safetyStock: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {editingId ? '更新物料' : '创建物料'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
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
                  Par Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  安全库存
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    暂无物料，请添加物料
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.parLevel}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.safetyStock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex gap-4">
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

