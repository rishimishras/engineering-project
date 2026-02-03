import { useState, useEffect } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar, Pie } from 'react-chartjs-2'
import Layout from '../Layout'
import type { Transaction } from '../transactions/TransactionTable'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

const CATEGORY_COLORS: Record<string, string> = {
  Shopping: '#3B82F6',
  Meals: '#F97316',
  Transportation: '#8B5CF6',
  Entertainment: '#EC4899',
  Utilities: '#6B7280',
  Healthcare: '#10B981',
  Travel: '#06B6D4',
  Groceries: '#84CC16',
  'High Value': '#EAB308',
}

const FLAG_COLORS: Record<string, string> = {
  'High Value': '#FBBF24',
  'Review Required': '#F59E0B',
  Urgent: '#EF4444',
  Suspicious: '#DC2626',
  Recurring: '#8B5CF6',
  Valid: '#22C55E',
}

function getColor(key: string, colorMap: Record<string, string>, index: number): string {
  if (colorMap[key]) return colorMap[key]
  const fallbackColors = ['#6366F1', '#14B8A6', '#F43F5E', '#A855F7', '#0EA5E9']
  return fallbackColors[index % fallbackColors.length]
}

export default function Dashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await fetch('http://localhost:3000/transactions')
        if (!response.ok) throw new Error('Failed to fetch transactions')
        const data = await response.json()
        setTransactions(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }
    fetchTransactions()
  }, [])

  const categoryData = transactions.reduce((acc, t) => {
    const cat = t.category || 'Uncategorized'
    acc[cat] = (acc[cat] || 0) + Math.abs(t.amount)
    return acc
  }, {} as Record<string, number>)

  const flagData = transactions.reduce((acc, t) => {
    const flag = t.flag || 'None'
    acc[flag] = (acc[flag] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const categoryLabels = Object.keys(categoryData)
  const categoryValues = Object.values(categoryData)
  const categoryColors = categoryLabels.map((label, i) => getColor(label, CATEGORY_COLORS, i))

  const flagLabels = Object.keys(flagData)
  const flagValues = Object.values(flagData)
  const flagColors = flagLabels.map((label, i) => getColor(label, FLAG_COLORS, i))

  const barChartData = {
    labels: categoryLabels,
    datasets: [
      {
        label: 'Amount ($)',
        data: categoryValues,
        backgroundColor: categoryColors,
        borderRadius: 4,
      },
    ],
  }

  const pieChartData = {
    labels: flagLabels,
    datasets: [
      {
        data: flagValues,
        backgroundColor: flagColors,
        borderWidth: 2,
        borderColor: '#1F2937',
      },
    ],
  }

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Spending by Category', color: '#F3F4F6', font: { size: 16 } },
    },
    scales: {
      x: { ticks: { color: '#9CA3AF' }, grid: { display: false } },
      y: { ticks: { color: '#9CA3AF' }, grid: { color: '#374151' } },
    },
  }

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right' as const, labels: { color: '#F3F4F6' } },
      title: { display: true, text: 'Transactions by Flag', color: '#F3F4F6', font: { size: 16 } },
    },
  }

  if (loading) {
    return (
      <Layout currentPage="Dashboard">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-400">Loading...</p>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout currentPage="Dashboard">
        <div className="flex items-center justify-center h-64">
          <p className="text-red-400">{error}</p>
        </div>
      </Layout>
    )
  }

  const totalAmount = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const avgAmount = transactions.length ? totalAmount / transactions.length : 0

  return (
    <Layout currentPage="Dashboard">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Total Transactions</p>
            <p className="text-2xl font-bold text-white">{transactions.length}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Total Amount</p>
            <p className="text-2xl font-bold text-green-400">${totalAmount.toFixed(2)}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Average Transaction</p>
            <p className="text-2xl font-bold text-blue-400">${avgAmount.toFixed(2)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-lg p-4 h-80">
            <Bar data={barChartData} options={barOptions} />
          </div>
          <div className="bg-gray-800 rounded-lg p-4 h-80">
            <Pie data={pieChartData} options={pieOptions} />
          </div>
        </div>
      </div>
    </Layout>
  )
}
