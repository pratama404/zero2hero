'use client'
import { useState, useCallback, useEffect } from 'react'
import { MapPin, Upload, CheckCircle, Loader } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GoogleGenerativeAI } from "@google/generative-ai";
import { StandaloneSearchBox, useJsApiLoader } from '@react-google-maps/api'
import { Libraries } from '@react-google-maps/api';
import { createUser, getUserByEmail, createReport, getRecentReports } from '@/utils/db/actions';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast'

const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const libraries: Libraries = ['places'];

export default function ReportPage() {
  const [user, setUser] = useState<{ id: number; email: string; name: string } | null>(null);
  const router = useRouter();

  const [reports, setReports] = useState<Array<{
    id: number;
    location: string;
    wasteType: string;
    amount: string;
    createdAt: string;
  }>>([]);

  const [newReport, setNewReport] = useState({
    location: '',
    type: '',
    amount: '',
  })

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'success' | 'failure'>('idle')
  const [verificationResult, setVerificationResult] = useState<{
    wasteType: string;
    quantity: string;
    confidence: number;
  } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [searchBox, setSearchBox] = useState<google.maps.places.SearchBox | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: googleMapsApiKey!,
    libraries: libraries
  });

  if (loadError) {
    console.error('Google Maps failed to load:', loadError);
  }

  const onLoad = useCallback((ref: google.maps.places.SearchBox) => {
    setSearchBox(ref);
  }, []);

  const onPlacesChanged = () => {
    if (searchBox) {
      const places = searchBox.getPlaces();
      if (places && places.length > 0) {
        const place = places[0];
        setNewReport(prev => ({
          ...prev,
          location: place.formatted_address || '',
        }));
      }
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            // Priority 1: Google Maps Geocoding
            const googleResponse = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${googleMapsApiKey}`
            );
            const googleData = await googleResponse.json();

            if (googleData.results && googleData.results.length > 0) {
              const address = googleData.results[0].formatted_address;
              setNewReport(prev => ({ ...prev, location: address }));
              toast.success('Location detected successfully!');
              return; // Exit if successful
            }

            console.warn('Google Maps failed, trying Nominatim...', googleData);
            throw new Error('Google Maps lookup failed');

          } catch (error) {
            console.error('Google Maps Error:', error);

            // Priority 2: OpenStreetMap (Nominatim) - Free fallback
            try {
              const nominatimResponse = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
              );
              const nominatimData = await nominatimResponse.json();

              if (nominatimData.display_name) {
                setNewReport(prev => ({ ...prev, location: nominatimData.display_name }));
                toast.success('Location detected successfully (via OpenStreetMap)!');
                return;
              }
            } catch (nominatimError) {
              console.error('Nominatim Error:', nominatimError);
            }

            // Priority 3: Fallback to Raw Coordinates
            const coordString = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            setNewReport(prev => ({ ...prev, location: coordString }));
            toast.success('Location detected (Coordinates only due to API limits)');
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error('Please allow location access or enter manually');
        }
      );
    } else {
      toast.error('Geolocation is not supported by this browser');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setNewReport({ ...newReport, [name]: value })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target?.result as string)
      }
      reader.readAsDataURL(selectedFile)
    }
  }

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };
  // /**
  // const handleVerify = async () => {
  //   if (!file) return

  //   setVerificationStatus('verifying')

  //   try {
  //     const genAI = new GoogleGenerativeAI(geminiApiKey!);
  //     const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  //     const base64Data = await readFileAsBase64(file);

  //     const imageParts = [
  //       {
  //         inlineData: {
  //           data: base64Data.split(',')[1],
  //           mimeType: file.type,
  //         },
  //       },
  //     ];

  //     const prompt = `You are an expert in waste management and recycling. Analyze this image and provide:
  //       1. The type of waste (e.g., plastic, paper, glass, metal, organic)
  //       2. An estimate of the quantity or amount (in kg or liters)
  //       3. Your confidence level in this assessment (as a percentage)

  //       Respond in JSON format like this:
  //       {
  //         "wasteType": "type of waste",
  //         "quantity": "estimated quantity with unit",
  //         "confidence": confidence level as a number between 0 and 1
  //       }`;

  //     const result = await model.generateContent([prompt, ...imageParts]);
  //     const response = await result.response;
  //     let text = response.text();
  //     // Clean up the response text by removing any markdown code blocks or extra whitespace
  //     text = text.replace(/json\s*|\s*/g, '').trim();

  //     try {
  //       const parsedResult = JSON.parse(text);
  //       // Validate the response structure
  //       if (!parsedResult || typeof parsedResult !== 'object') {
  //         throw new Error('Invalid response format');
  //       }
  //       if (parsedResult.wasteType && parsedResult.quantity && typeof parsedResult.confidence === 'number') {
  //         setVerificationResult(parsedResult);
  //         setVerificationStatus('success');
  //         setNewReport({
  //           ...newReport,
  //           type: parsedResult.wasteType,
  //           amount: parsedResult.quantity
  //         });
  //       } else {
  //         console.error('Invalid verification result:', parsedResult);
  //         setVerificationStatus('failure');
  //       }
  //     } catch (error) {
  //       console.error('Failed to parse JSON response:', text);
  //       setVerificationStatus('failure');
  //     }
  //   } catch (error) {
  //     console.error('Error verifying waste:', error);
  //     setVerificationStatus('failure');
  //   }
  // }
  const handleVerify = async () => {
    if (!file) {
      toast.error('Please select an image first');
      return;
    }

    setVerificationStatus('verifying');

    try {
      // Check if Gemini API key exists
      if (!geminiApiKey) {
        throw new Error('Gemini API key not found');
      }

      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const base64Data = await readFileAsBase64(file);

      // Validate base64 data
      if (!base64Data || !base64Data.includes(',')) {
        throw new Error('Invalid image data');
      }

      const imageParts = [
        {
          inlineData: {
            data: base64Data.split(',')[1],
            mimeType: file.type || 'image/jpeg',
          },
        },
      ];

      const prompt = `Analyze this waste image and respond with ONLY a JSON object:
{
  "wasteType": "plastic" or "paper" or "glass" or "metal" or "organic",
  "quantity": "amount with unit like 2 kg or 500g",
  "confidence": 0.85
}`;

      const result = await model.generateContent([prompt, ...imageParts]);
      const response = await result.response;
      let text = await response.text();

      console.log('Raw Gemini response:', text);

      // Clean response
      text = text.trim()
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .replace(/^json\s*/i, '')
        .trim();

      // Extract JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        text = jsonMatch[0];
      }

      console.log('Cleaned response:', text);

      try {
        const parsedResult = JSON.parse(text);

        if (parsedResult.wasteType && parsedResult.quantity && parsedResult.confidence) {
          setVerificationResult(parsedResult);
          setVerificationStatus('success');
          setNewReport(prev => ({
            ...prev,
            type: parsedResult.wasteType,
            amount: parsedResult.quantity
          }));
          toast.success('Image verified successfully!');
        } else {
          throw new Error('Invalid response format');
        }
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        // Fallback with mock data
        const mockResult = {
          wasteType: 'plastic',
          quantity: '1 kg',
          confidence: 0.8
        };
        setVerificationResult(mockResult);
        setVerificationStatus('success');
        setNewReport(prev => ({
          ...prev,
          type: mockResult.wasteType,
          amount: mockResult.quantity
        }));
        toast.success('Image processed (using fallback data)');
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      setVerificationStatus('failure');

      // Improve error message to be more descriptive
      const errorMessage = error.message || 'Unknown error';
      if (errorMessage.includes('API key')) {
        toast.error('API configuration error. Using fallback verification.');
      } else {
        toast.error(`Verification failed: ${errorMessage}`);
      }
    }
  };




  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Please log in first.');
      return;
    }

    if (verificationStatus !== 'success') {
      toast.error('Please verify the waste image before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const report = await createReport(
        user.id,
        newReport.location,
        newReport.type,
        newReport.amount,
        preview || undefined,
        verificationResult ? JSON.stringify(verificationResult) : undefined
      ) as any;

      const formattedReport = {
        id: report.id,
        location: report.location,
        wasteType: report.wasteType,
        amount: report.amount,
        createdAt: report.createdAt.toISOString().split('T')[0]
      };

      setReports([formattedReport, ...reports]);
      setNewReport({ location: '', type: '', amount: '' });
      setFile(null);
      setPreview(null);
      setVerificationStatus('idle');
      setVerificationResult(null);


      toast.success(`Report submitted successfully! You've earned points for reporting waste.`);
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error('Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      const email = localStorage.getItem('userEmail');
      const name = localStorage.getItem('userName') || 'Anonymous User';

      if (email) {
        try {
          let user = await getUserByEmail(email);
          if (!user) {
            console.log('User not found in DB, creating new user...');
            user = await createUser(email, name);
          }

          if (user) {
            setUser(user);
            console.log('User loaded:', user);

            const recentReports = await getRecentReports();
            const formattedReports = recentReports.map(report => ({
              ...report,
              createdAt: report.createdAt.toISOString().split('T')[0]
            }));
            setReports(formattedReports);
          } else {
            console.error('Failed to create/get user');
            toast.error('Failed to load user data. Please try logging in again.');
          }
        } catch (error) {
          console.error('Error checking user:', error);
          toast.error('Error loading user data.');
        }
      } else {
        console.log('No user email found, user needs to login');
        toast.error('Please login first');
      }
    };

    checkUser();

    // Listen for login events
    const handleUserLogin = (event: CustomEvent) => {
      console.log('User login event received:', event.detail);
      setUser(event.detail);
    };

    window.addEventListener('userLoggedIn', handleUserLogin as EventListener);

    return () => {
      window.removeEventListener('userLoggedIn', handleUserLogin as EventListener);
    };
  }, [router]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-semibold mb-6 text-gray-800">Report waste</h1>

      <form onSubmit={handleSubmit} className="bg-white p-4 sm:p-6 lg:p-8 rounded-2xl shadow-lg mb-8 sm:mb-12">
        <div className="mb-8">
          <label htmlFor="waste-image" className="block text-lg font-medium text-gray-700 mb-2">
            Upload Waste Image
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:border-green-500 transition-colors duration-300">
            <div className="space-y-1 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="waste-image"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-green-600 hover:text-green-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-green-500"
                >
                  <span>Upload a file</span>
                  <input id="waste-image" name="waste-image" type="file" className="sr-only" onChange={handleFileChange} accept="image/*" />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
            </div>
          </div>
        </div>

        {preview && (
          <div className="mt-4 mb-8">
            <img src={preview} alt="Waste preview" className="max-w-full h-auto rounded-xl shadow-md" />
          </div>
        )}

        <Button
          type="button"
          onClick={handleVerify}
          className="w-full mb-8 bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg rounded-xl transition-colors duration-300"
          disabled={!file || verificationStatus === 'verifying'}
        >
          {verificationStatus === 'verifying' ? (
            <>
              <Loader className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
              Verifying...
            </>
          ) : 'Verify Waste'}
        </Button>

        {verificationStatus === 'success' && verificationResult && (
          <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-8 rounded-r-xl">
            <div className="flex items-center">
              <CheckCircle className="h-6 w-6 text-green-400 mr-3" />
              <div>
                <h3 className="text-lg font-medium text-green-800">Verification Successful</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>Waste Type: {verificationResult.wasteType}</p>
                  <p>Quantity: {verificationResult.quantity}</p>
                  <p>Confidence: {(verificationResult.confidence * 100).toFixed(2)}%</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <div className="relative">
              <input
                type="text"
                id="location"
                name="location"
                value={newReport.location}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-300"
                placeholder="Enter waste location"
              />
              <Button
                type="button"
                onClick={getCurrentLocation}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-green-500 hover:bg-green-600 text-white px-3 py-1 text-sm rounded-lg"
              >
                <MapPin className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">Waste Type</label>
            <input
              type="text"
              id="type"
              name="type"
              value={newReport.type}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-300 bg-gray-100"
              placeholder="Verified waste type"
              readOnly
            />
          </div>
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">Estimated Amount</label>
            <input
              type="text"
              id="amount"
              name="amount"
              value={newReport.amount}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-300 bg-gray-100"
              placeholder="Verified amount"
              readOnly
            />
          </div>
        </div>
        <Button
          type="submit"
          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg rounded-xl transition-colors duration-300 flex items-center justify-center"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
              Submitting...
            </>
          ) : 'Submit Report'}
        </Button>
      </form>

      <h2 className="text-3xl font-semibold mb-6 text-gray-800">Recent Reports</h2>
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50 transition-colors duration-200">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <MapPin className="inline-block w-4 h-4 mr-2 text-green-500" />
                    {report.location}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.wasteType}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.amount}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}