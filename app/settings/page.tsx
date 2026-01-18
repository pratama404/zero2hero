'use client'
import { useState, useEffect } from 'react'
import { User, Mail, Phone, MapPin, Save, Loader, Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getUserByEmail, getUserProfile, updateUserProfile, updateUserName } from '@/utils/db/actions'
import { toast } from 'react-hot-toast'

type UserSettings = {
  name: string
  email: string
  phone: string
  address: string
  notifications: boolean
  profileImage?: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>({
    name: '',
    email: '',
    phone: '',
    address: '',
    notifications: true,
    profileImage: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userEmail = localStorage.getItem('userEmail')
        if (userEmail) {
          const userData = await getUserByEmail(userEmail)
          if (userData) {
            setUser(userData)

            // Get profile data
            const profileData = await getUserProfile(userData.id)

            setSettings({
              name: userData.name || '',
              email: userData.email || '',
              phone: profileData?.phone || '',
              address: profileData?.address || '',
              notifications: profileData?.notifications ?? true,
              profileImage: profileData?.profileImage || ''
            })
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error)
        toast.error('Failed to load user data')
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const reader = new FileReader()
      reader.onload = (e) => {
        setSettings(prev => ({
          ...prev,
          profileImage: e.target?.result as string
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      toast.error('User not found')
      return
    }

    setSaving(true)
    try {
      // Update user name in Users table
      if (settings.name !== user.name) {
        await updateUserName(user.id, settings.name)
      }

      // Update profile data in UserProfiles table
      await updateUserProfile(user.id, {
        phone: settings.phone,
        address: settings.address,
        notifications: settings.notifications,
        profileImage: settings.profileImage
      })

      toast.success('Settings updated successfully!')
      // Trigger a custom event to notify the Header component
      window.dispatchEvent(new CustomEvent('userNameUpdated', { detail: settings.name }));
    } catch (error) {
      console.error('Error updating settings:', error)
      toast.error('Failed to update settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="animate-spin h-8 w-8 text-gray-600" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-semibold mb-6 text-gray-800">Account Settings</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Image */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              {settings.profileImage ? (
                <img src={settings.profileImage} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-gray-400" />
              )}
            </div>
            <label className="absolute bottom-0 right-0 bg-green-500 rounded-full p-2 cursor-pointer hover:bg-green-600">
              <Camera className="w-4 h-4 text-white" />
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
          </div>
          <p className="text-sm text-gray-500 mt-2">Click camera icon to change photo</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <div className="relative">
              <input
                type="text"
                id="name"
                name="name"
                value={settings.name}
                onChange={handleInputChange}
                className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                placeholder="Enter your full name"
              />
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <div className="relative">
              <input
                type="email"
                id="email"
                name="email"
                value={settings.email}
                onChange={handleInputChange}
                className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 bg-gray-50"
                placeholder="Enter your email"
                readOnly
              />
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            </div>
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
          <div className="relative">
            <input
              type="tel"
              id="phone"
              name="phone"
              value={settings.phone}
              onChange={handleInputChange}
              className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
              placeholder="Enter your phone number"
            />
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          </div>
        </div>

        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <div className="relative">
            <input
              type="text"
              id="address"
              name="address"
              value={settings.address}
              onChange={handleInputChange}
              className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
              placeholder="Enter your address"
            />
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="notifications"
            name="notifications"
            checked={settings.notifications}
            onChange={handleInputChange}
            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
          />
          <label htmlFor="notifications" className="ml-2 block text-sm text-gray-700">
            Receive email notifications
          </label>
        </div>

        <Button
          type="submit"
          className="w-full bg-green-500 hover:bg-green-600 text-white"
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </form>
    </div>
  )
}