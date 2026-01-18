'use client'
import { useState, useEffect } from 'react'
import { getAllRewards, getUserByEmail } from '@/utils/db/actions'
import { Loader, Award, User, Trophy, Crown, MapPin, Trash } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'

type Reward = {
  id: number
  userId: number
  points: number
  level: number
  createdAt: Date
  userName: string | null
  reportCount: number
  collectCount: number
}

export default function LeaderboardPage() {
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ id: number; email: string; name: string } | null>(null)
  const [filter, setFilter] = useState<'points' | 'reports' | 'collected'>('points')

  // Sort rewards based on filter
  const sortedRewards = [...rewards].sort((a, b) => {
    if (filter === 'reports') return b.reportCount - a.reportCount
    if (filter === 'collected') return b.collectCount - a.collectCount
    return b.points - a.points // Default to points
  })

  useEffect(() => {
    const fetchRewardsAndUser = async () => {
      setLoading(true)
      try {
        const fetchedRewards = await getAllRewards()
        setRewards(fetchedRewards)

        const userEmail = localStorage.getItem('userEmail')
        if (userEmail) {
          const fetchedUser = await getUserByEmail(userEmail)
          if (fetchedUser) {
            setUser(fetchedUser)
          } else {
            toast.error('User not found. Please log in again.')
          }
        } else {
          toast.error('User not logged in. Please log in.')
        }
      } catch (error) {
        console.error('Error fetching rewards and user:', error)
        toast.error('Failed to load leaderboard. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchRewardsAndUser()
  }, [])

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-semibold mb-6 text-gray-800">Leaderboard</h1>

        {/* Filter Tabs */}
        <div className="flex justify-center mb-8 space-x-2 sm:space-x-4">
          <button
            onClick={() => setFilter('points')}
            className={`flex items-center px-4 py-2 sm:px-6 sm:py-3 rounded-full transition-all duration-300 ${filter === 'points' ? 'bg-green-600 text-white shadow-lg scale-105' : 'bg-white text-gray-600 hover:bg-green-50'}`}
          >
            <Award className="w-5 h-5 mr-2" />
            Top Earners
          </button>
          <button
            onClick={() => setFilter('reports')}
            className={`flex items-center px-4 py-2 sm:px-6 sm:py-3 rounded-full transition-all duration-300 ${filter === 'reports' ? 'bg-blue-600 text-white shadow-lg scale-105' : 'bg-white text-gray-600 hover:bg-blue-50'}`}
          >
            <Crown className="w-5 h-5 mr-2" />
            Top Reporters
          </button>
          <button
            onClick={() => setFilter('collected')}
            className={`flex items-center px-4 py-2 sm:px-6 sm:py-3 rounded-full transition-all duration-300 ${filter === 'collected' ? 'bg-purple-600 text-white shadow-lg scale-105' : 'bg-white text-gray-600 hover:bg-purple-50'}`}
          >
            <Trophy className="w-5 h-5 mr-2" />
            Top Collectors
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader className="animate-spin h-8 w-8 text-gray-600" />
          </div>
        ) : (
          <div className="bg-white shadow-xl rounded-2xl overflow-hidden mb-20">
            <div className={`p-6 ${filter === 'points' ? 'bg-gradient-to-r from-green-500 to-green-600' : filter === 'reports' ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gradient-to-r from-purple-500 to-purple-600'}`}>
              <div className="flex justify-between items-center text-white">
                <Trophy className="h-10 w-10 opacity-80" />
                <span className="text-2xl font-bold">
                  {filter === 'points' ? 'Top Earners' : filter === 'reports' ? 'Top Reporters' : 'Top Collectors'}
                </span>
                <Award className="h-10 w-10 opacity-80" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Rank</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      {filter === 'points' ? 'Points' : filter === 'reports' ? 'Reports Submitted' : 'Waste Collected'}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedRewards.length > 0 ? (
                    sortedRewards.map((reward, index) => (
                      <tr key={reward.id} className={`${user && user.id === reward.userId ? 'bg-green-50' : ''} hover:bg-gray-50 transition-colors`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {index < 3 ? (
                              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${index === 0 ? 'bg-yellow-100 text-yellow-600' : index === 1 ? 'bg-gray-100 text-gray-600' : 'bg-orange-100 text-orange-600'}`}>
                                <Crown className="h-5 w-5" />
                              </div>
                            ) : (
                              <span className="text-sm font-bold text-gray-600 ml-2">{index + 1}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <User className="h-full w-full rounded-full bg-gray-200 text-gray-500 p-2" />
                            </div>
                            <div className="ml-4">
                              <div className={`text-sm font-semibold ${user && user.id === reward.userId ? 'text-green-700' : 'text-gray-900'}`}>
                                {reward.userName || 'Anonymous User'}
                                {user && user.id === reward.userId && " (You)"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {filter === 'points' ? (
                              <>
                                <Award className="h-4 w-4 text-green-500 mr-2" />
                                <span className="text-sm font-bold text-gray-900">{reward.points.toLocaleString()}</span>
                              </>
                            ) : filter === 'reports' ? (
                              <>
                                <MapPin className="h-4 w-4 text-blue-500 mr-2" />
                                <span className="text-sm font-bold text-gray-900">{reward.reportCount.toLocaleString()}</span>
                                <span className="ml-1 text-xs text-gray-500">reports</span>
                              </>
                            ) : (
                              <>
                                <Trash className="h-4 w-4 text-purple-500 mr-2" />
                                <span className="text-sm font-bold text-gray-900">{reward.collectCount.toLocaleString()}</span>
                                <span className="ml-1 text-xs text-gray-500">kg</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${reward.level >= 5 ? 'bg-purple-100 text-purple-800' : reward.level >= 3 ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                            Level {reward.level}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center">
                          <Trophy className="h-16 w-16 text-gray-300 mb-4" />
                          <p className="text-xl font-medium text-gray-600">No leaderboard data yet</p>
                          <p className="text-sm text-gray-500 mt-2">Start reporting waste to earn your spot!</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* User Rank Sticky Footer */}
      {user && sortedRewards.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-search p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0 h-10 w-10 md:h-12 md:w-12">
                <User className="h-full w-full rounded-full bg-green-100 text-green-600 p-2" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Your Rank</p>
                <p className="text-lg md:text-xl font-bold text-gray-900">
                  #{sortedRewards.findIndex(r => r.userId === user.id) + 1}
                </p>
              </div>
            </div>
            <div className="flex items-center">
              {filter === 'points' && (
                <>
                  <Award className="h-6 w-6 text-green-500 mr-2" />
                  <span className="text-lg md:text-xl font-bold text-gray-900">{sortedRewards.find(r => r.userId === user.id)?.points || 0}</span>
                  <span className="ml-1 text-sm text-gray-500 hidden sm:inline">points</span>
                </>
              )}
              {filter === 'reports' && (
                <>
                  <MapPin className="h-6 w-6 text-blue-500 mr-2" />
                  <span className="text-lg md:text-xl font-bold text-gray-900">{sortedRewards.find(r => r.userId === user.id)?.reportCount || 0}</span>
                  <span className="ml-1 text-sm text-gray-500 hidden sm:inline">reports</span>
                </>
              )}
              {filter === 'collected' && (
                <>
                  <Trash className="h-6 w-6 text-purple-500 mr-2" />
                  <span className="text-lg md:text-xl font-bold text-gray-900">{sortedRewards.find(r => r.userId === user.id)?.collectCount || 0}</span>
                  <span className="ml-1 text-sm text-gray-500 hidden sm:inline">kg</span>
                </>
              )}
            </div>
            <Button className="bg-green-600 hover:bg-green-700 text-white ml-4" onClick={() => window.location.href = filter === 'collected' ? '/collect' : '/report'}>
              {filter === 'collected' ? 'Collect More' : 'Report More'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}