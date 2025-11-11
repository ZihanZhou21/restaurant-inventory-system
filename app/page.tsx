import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            后厨备货系统
          </h1>
          <p className="text-lg text-gray-600">
            简洁高效的后厨库存管理系统
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            href="/items"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <h2 className="text-2xl font-semibold mb-2 text-gray-800">
              物料管理
            </h2>
            <p className="text-gray-600">
              添加、编辑和管理物料信息
            </p>
          </Link>

          <Link
            href="/purchase"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <h2 className="text-2xl font-semibold mb-2 text-gray-800">
              采购登记
            </h2>
            <p className="text-gray-600">
              登记每日采购记录
            </p>
          </Link>

          <Link
            href="/inventory"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <h2 className="text-2xl font-semibold mb-2 text-gray-800">
              日终盘点
            </h2>
            <p className="text-gray-600">
              录入实际库存，自动计算消耗量
            </p>
          </Link>

          <Link
            href="/suggestions"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <h2 className="text-2xl font-semibold mb-2 text-gray-800">
              采购建议
            </h2>
            <p className="text-gray-600">
              查看次日采购建议
            </p>
          </Link>

          <Link
            href="/reports"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <h2 className="text-2xl font-semibold mb-2 text-gray-800">
              报表分析
            </h2>
            <p className="text-gray-600">
              查看日/周/月消耗报表
            </p>
          </Link>
        </div>
      </div>
    </main>
  )
}

