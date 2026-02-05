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
import Header from '../shared/Header'
import UncategorizedTransactions from './UncategorizedTransactions'
import FlaggedTransactions from './FlaggedTransactions'
import CategoryRulesButton from '../shared/RulesButton'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

interface CategoryStat {
  category: string
  total_amount: number
  count: number
}

interface FlagStat {
  flag: string
  count: number
  total_amount: number
}

interface Stats {
  categories: CategoryStat[]
  flags: FlagStat[]
  summary: {
    total_count: number
    total_amount: number
  }
}

const CATEGORY_COLORS: Record<string, string> = {
  Shopping: '#3B82F6',
  Meals: '#F97316',
  Transportation: '#8B5CF6',
  Entertainment: '#EC4899',
  Utilities: '#6B7280',
  Healthcare: '#10B981',
  Travel: '#06B6D4',
  Groceries: '#84CC16',
  Uncategorized: '#4B5563',
}

const FLAG_COLORS: Record<string, string> = {
  'High Value': '#FBBF24',
  'Review Required': '#F59E0B',
  Urgent: '#EF4444',
  Suspicious: '#DC2626',
  Recurring: '#8B5CF6',
  Valid: '#22C55E',
  None: '#6B7280',
}

function getColor(key: string, colorMap: Record<string, string>, index: number): string {
  if (colorMap[key]) return colorMap[key]
  const fallbackColors = ['#6366F1', '#14B8A6', '#F43F5E', '#A855F7', '#0EA5E9']
  return fallbackColors[index % fallbackColors.length]
}

type ExpandedSection = 'uncategorized' | 'flagged' | null

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSection, setExpandedSection] = useState<ExpandedSection>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleTransactionChange = () => {
    fetchStats()
    setRefreshKey(prev => prev + 1)
  }

  const toggleSection = (section: 'uncategorized' | 'flagged') => {
    setExpandedSection(prev => prev === section ? null : section)
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:3000/transactions/stats')
      if (!response.ok) throw new Error('Failed to fetch stats')
      const data = await response.json()
    console.log("stats***", stats)
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  if (loading) {
    return (
      <Header currentPage="Dashboard">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-400">Loading...</p>
        </div>
      </Header>
    )
  }

  if (error || !stats) {
    return (
      <Header currentPage="Dashboard">
        <div className="flex items-center justify-center h-64">
          <p className="text-red-400">{error || 'Failed to load stats'}</p>
        </div>
      </Header>
    )
  }

  const categoryLabels = stats.categories.map(c => c.category)
  const categoryValues = stats.categories.map(c => c.total_amount)
  const categoryColors = categoryLabels.map((label, i) => getColor(label, CATEGORY_COLORS, i))

  const flagLabels = stats.flags.map(f => f.flag)
  const flagValues = stats.flags.map(f => f.count)
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

  const { total_count, total_amount } = stats.summary
  const flaggedAmount = stats.flags
    .filter(f => f.flag !== 'Valid')
    .reduce((sum, f) => sum + f.total_amount, 0)

  return (
    <Header currentPage="Dashboard">
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-black">Dashboard</h1>
          <CategoryRulesButton onRulesChange={fetchStats} onTransactionsChange={fetchStats} />
        </div>
        {!expandedSection && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-2">
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Total Transactions</p>
                <p className="text-2xl font-bold text-white">{total_count.toLocaleString()}</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Total Amount</p>
                <p className="text-2xl font-bold text-green-400">${total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Flagged Amount</p>
                <p className="text-2xl font-bold text-red-400">${flaggedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>
          </>
        )}
        <div className="sticky top-0 z-50 grid grid-cols-2 gap-2">
          <div className="bg-gray-800 rounded-lg p-4 h-80">
            <Bar data={barChartData} options={barOptions} />
          </div>
          <div className="bg-gray-800 rounded-lg p-4 h-80">
            <Pie data={pieChartData} options={pieOptions} />
          </div>
        </div>
        <UncategorizedTransactions
          onCategorized={handleTransactionChange}
          expanded={expandedSection === 'uncategorized'}
          onToggle={() => toggleSection('uncategorized')}
          refreshKey={refreshKey}
        />
        <FlaggedTransactions
          onChanged={handleTransactionChange}
          expanded={expandedSection === 'flagged'}
          onToggle={() => toggleSection('flagged')}
          refreshKey={refreshKey}
        />
      </div>
    </Header>
  )
}
