'use client'
import { useState, useEffect } from 'react'
import { Coins, ArrowUpRight, ArrowDownRight, Gift, AlertCircle, Loader, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getUserByEmail, getRewardTransactions, getAvailableRewards, redeemReward, createTransaction, createUser } from '@/utils/db/actions'
import { toast } from 'react-hot-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Transaction = {
  id: number
  type: 'earned_report' | 'earned_collect' | 'redeemed'
  amount: number
  description: string
  date: string
}

type Reward = {
  id: number
  name: string
  cost: number
  description: string | null
  collectionInfo: string
}

export default function RewardsPage() {
  const [user, setUser] = useState<{ id: number; email: string; name: string } | null>(null)
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [redeemedItem, setRedeemedItem] = useState<{ type: string; code?: string; message: string } | null>(null)

  useEffect(() => {
    const fetchUserDataAndRewards = async () => {
      setLoading(true)
      try {
        const userEmail = localStorage.getItem('userEmail')
        const userName = localStorage.getItem('userName') || 'Anonymous User'

        if (userEmail) {
          let fetchedUser = await getUserByEmail(userEmail)

          if (!fetchedUser) {
            fetchedUser = await createUser(userEmail, userName)
          }

          if (fetchedUser) {
            setUser(fetchedUser)
            const fetchedTransactions = await getRewardTransactions(fetchedUser.id)
            setTransactions(fetchedTransactions as Transaction[])
            const fetchedRewards = await getAvailableRewards(fetchedUser.id)
            setRewards(fetchedRewards.filter(r => r.cost > 0))
            const calculatedBalance = fetchedTransactions.reduce((acc, transaction) => {
              return transaction.type.startsWith('earned') ? acc + transaction.amount : acc - transaction.amount
            }, 0)
            setBalance(Math.max(calculatedBalance, 0))
          } else {
            toast.error('Failed to load user data. Please try logging in again.')
          }
        }
      } catch (error) {
        console.error('Error fetching user data and rewards:', error)
        toast.error('Failed to load rewards data. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchUserDataAndRewards()

    const handleUserLogin = () => fetchUserDataAndRewards()
    window.addEventListener('userLoggedIn', handleUserLogin)
    return () => window.removeEventListener('userLoggedIn', handleUserLogin)
  }, [])

  const refreshUserData = async () => {
    if (user) {
      const fetchedUser = await getUserByEmail(user.email);
      if (fetchedUser) {
        const fetchedTransactions = await getRewardTransactions(fetchedUser.id);
        setTransactions(fetchedTransactions as Transaction[]);
        const fetchedRewards = await getAvailableRewards(fetchedUser.id);
        setRewards(fetchedRewards.filter(r => r.cost > 0));

        const calculatedBalance = fetchedTransactions.reduce((acc, transaction) => {
          return transaction.type.startsWith('earned') ? acc + transaction.amount : acc - transaction.amount
        }, 0)
        setBalance(Math.max(calculatedBalance, 0))
      }
    }
  }

  const handleRedeemCustom = async (type: string, cost: number) => {
    if (!user) {
      toast.error('Please log in to redeem rewards.');
      return;
    }

    if (balance < cost) {
      toast.error(`You need ${cost} points but only have ${balance} points.`);
      return;
    }

    try {
      await createTransaction(user.id, 'redeemed', cost, `Redeemed ${type}`);

      setBalance(prev => prev - cost);
      setTransactions(prev => [{
        id: Date.now(),
        type: 'redeemed',
        amount: cost,
        description: `Redeemed ${type}`,
        date: new Date().toISOString().split('T')[0]
      }, ...prev]);

      await refreshUserData();

      // Handle different reward types
      let message = '';
      let code = '';

      if (type === 'voucher') {
        code = 'ECO-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        message = 'Use this code at checkout for your discount.';
      } else if (type === 'tree') {
        code = 'TREE-' + Math.floor(Math.random() * 10000);
        message = 'Thank you! A new tree has been scheduled directly for planting.';
      } else if (type === 'badge') {
        message = "You've unlocked the Eco Champion Badge! It will appear on your profile.";
      }

      setRedeemedItem({ type: type === 'tree' ? 'Plant a Tree' : type === 'voucher' ? 'Recycling Voucher' : 'Eco Champion Badge', code, message });
      setShowSuccessModal(true);

    } catch (error) {
      console.error('Error redeeming:', error);
      toast.error('Failed to redeem. Please try again.');
    }
  };

  const handleRedeemAllPoints = async () => {
    if (!user) {
      toast.error('Please log in to redeem points.');
      return;
    }

    if (balance > 0) {
      try {
        await createTransaction(user.id, 'redeemed', balance, 'Cashed out all points');

        setBalance(0);
        setTransactions(prev => [{
          id: Date.now(),
          type: 'redeemed',
          amount: balance,
          description: 'Cashed out all points',
          date: new Date().toISOString().split('T')[0]
        }, ...prev]);

        await refreshUserData();

        setRedeemedItem({
          type: 'Cash Out',
          message: `Successfully processed withdrawal for ${balance} points. Funds will be transferred within 24 hours.`
        });
        setShowSuccessModal(true);
      } catch (error) {
        console.error('Error cashing out:', error);
        toast.error('Failed to cash out. Please try again.');
      }
    } else {
      toast.error('No points available to cash out');
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">
      <Loader className="animate-spin h-8 w-8 text-gray-600" />
    </div>
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-semibold mb-6 text-gray-800">Rewards</h1>

      <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col justify-between h-full border-l-4 border-green-500 mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Reward Balance</h2>
        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center">
            <Coins className="w-10 h-10 mr-3 text-green-500" />
            <div>
              <span className="text-4xl font-bold text-green-500">{balance}</span>
              <p className="text-sm text-gray-500">Available Points</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <div>
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">Recent Transactions</h2>
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            {transactions.length > 0 ? (
              transactions.map(transaction => (
                <div key={transaction.id} className="flex items-center justify-between p-4 border-b border-gray-200 last:border-b-0">
                  <div className="flex items-center">
                    {transaction.type === 'earned_report' ? (
                      <ArrowUpRight className="w-5 h-5 text-green-500 mr-3" />
                    ) : transaction.type === 'earned_collect' ? (
                      <ArrowUpRight className="w-5 h-5 text-blue-500 mr-3" />
                    ) : (
                      <ArrowDownRight className="w-5 h-5 text-red-500 mr-3" />
                    )}
                    <div>
                      <p className="font-medium text-gray-800">{transaction.description}</p>
                      <p className="text-sm text-gray-500">{transaction.date}</p>
                    </div>
                  </div>
                  <span className={`font-semibold ${transaction.type.startsWith('earned') ? 'text-green-500' : 'text-red-500'}`}>
                    {transaction.type.startsWith('earned') ? '+' : '-'}{transaction.amount}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">No transactions yet</div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">Available Rewards</h2>
          <div className="space-y-4">
            <div className="bg-gray-50 p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-300">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center">
                  <Gift className="w-5 h-5 mr-2 text-green-600" />
                  Plant a Tree
                </h3>
                <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded">50 pts</span>
              </div>
              <p className="text-gray-600 text-sm mb-4">Contribute to global reforestation. We'll plant a tree in your name.</p>
              <Button
                onClick={() => handleRedeemCustom('tree', 50)}
                className="w-full bg-green-600 hover:bg-green-700 text-white transition-colors"
                disabled={balance < 50}
              >
                Redeem
              </Button>
            </div>

            <div className="bg-gray-50 p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-300">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center">
                  <Gift className="w-5 h-5 mr-2 text-blue-600" />
                  Recycling Voucher
                </h3>
                <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">30 pts</span>
              </div>
              <p className="text-gray-600 text-sm mb-4">20% off at our partner eco-stores.</p>
              <Button
                onClick={() => handleRedeemCustom('voucher', 30)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                disabled={balance < 30}
              >
                Redeem
              </Button>
            </div>

            <div className="bg-gray-50 p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-300">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center">
                  <Gift className="w-5 h-5 mr-2 text-purple-600" />
                  Eco Champion Badge
                </h3>
                <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2.5 py-0.5 rounded">100 pts</span>
              </div>
              <p className="text-gray-600 text-sm mb-4">Showcase your commitment with an exclusive profile badge.</p>
              <Button
                onClick={() => handleRedeemCustom('badge', 100)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white transition-colors"
                disabled={balance < 100}
              >
                Redeem
              </Button>
            </div>

            <div className="bg-gray-50 p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-300">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center">
                  <Coins className="w-5 h-5 mr-2 text-yellow-600" />
                  Cash Out
                </h3>
                <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2.5 py-0.5 rounded">All pts</span>
              </div>
              <p className="text-gray-600 text-sm mb-4">Convert your hard-earned points into real cash.</p>
              <Button
                onClick={handleRedeemAllPoints}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white transition-colors"
                disabled={balance === 0}
              >
                Cash Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {showSuccessModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-2xl relative animate-fadeIn scale-100 transition-transform">
            <button
              onClick={() => setShowSuccessModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              <X className="h-6 w-6" />
            </button>
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Redemption Successful!</h3>
              <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-100">
                <p className="text-sm text-gray-500 mb-2">You have successfully redeemed:</p>
                <p className="text-lg font-semibold text-gray-800 mb-3">{redeemedItem?.type}</p>
                {redeemedItem?.code && (
                  <div className="bg-white border border-dashed border-gray-300 p-3 rounded mb-2">
                    <p className="text-xs text-gray-500 mb-1">YOUR CODE</p>
                    <p className="text-xl font-mono font-bold tracking-wider text-green-600 selection:bg-green-100">
                      {redeemedItem.code}
                    </p>
                  </div>
                )}
                <p className="text-sm text-gray-600 mt-3">{redeemedItem?.message}</p>
              </div>
              <Button
                onClick={() => setShowSuccessModal(false)}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}