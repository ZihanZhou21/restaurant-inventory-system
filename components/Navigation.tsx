'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navigation() {
  const pathname = usePathname()

  const navItems = [
    { href: '/', label: '首页' },
    { href: '/items', label: '物料管理' },
    { href: '/purchase', label: '采购登记' },
    { href: '/inventory', label: '日终盘点' },
    { href: '/suggestions', label: '采购建议' },
    { href: '/reports', label: '报表分析' },
  ]

  return (
    <nav className="bg-white shadow-md mb-6">
      <div className="container mx-auto px-4">
        <div className="flex space-x-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                pathname === item.href
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}

