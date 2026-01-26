import { FC, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowRight, ArrowLeft, Building, User, FileText, Database } from 'lucide-react';
import UploadDropzone from './UploadDropzone';
import { registerAdmin, login } from '../services/authService';
import { createCompany } from '../services/companyService';
import { updateUser } from '../services/userService';

interface FormData {
  companyName: string;
  adminName: string;
  email: string;
  password: string;
  confirmPassword: string;
  companyProfile: File | null;
}

const SignUpStepper: FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    companyName: '',
    adminName: '',
    email: '',
    password: '',
    confirmPassword: '',
    companyProfile: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  const [errors, setErrors] = useState<{
    companyName?: string;
    adminName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    companyProfile?: string;
  }>({});

  const validateStep1 = (): boolean => {
    const newErrors: {
      companyName?: string;
      adminName?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    }

    if (!formData.adminName.trim()) {
      newErrors.adminName = 'Admin name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: { companyProfile?: string } = {};

    if (!formData.companyProfile) {
      newErrors.companyProfile = 'Company profile document is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear error when typing
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleCompanyProfileSelect = (file: File) => {
    setFormData((prev) => ({ ...prev, companyProfile: file }));
    setErrors((prev) => ({ ...prev, companyProfile: undefined }));
  };

  const nextStep = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateStep2()) {
      setIsLoading(true);
      setSubmitError(null);

      try {
        // Step 1: Register Admin
        const adminUser = await registerAdmin({
          email: formData.email,
          username: formData.adminName,
          password: formData.password,
          company_name: formData.companyName,
        });
        console.log('Admin registered:', adminUser);

        // Step 2: Create Company
        if (adminUser && adminUser.id) {
          // const company = await createCompany({ name: formData.companyName });
          // console.log('Company created:', company);

          // In a real application, you would create a FormData object and submit to your API
          // The file uploads are still handled via FormData for now.
          // The backend will need to associate these files with the created company/user.
          const submitData = new FormData();
          submitData.append('companyName', formData.companyName);
          submitData.append('adminName', formData.adminName);
          submitData.append('email', formData.email);
          submitData.append('password', formData.password); // Consider if password should be sent again
                                                          // or if backend uses the already registered admin.
                                                          // For now, keeping it as per original logic.
          
          if (formData.companyProfile) {
            submitData.append('companyProfile', formData.companyProfile);
          }
          
          // Further actions after successful company creation and file preparation
          // e.g., associating files with the company, or uploading departments.
          // This part might need more specific API calls depending on backend implementation.

          console.log('Form submitted with data for file upload:', formData);
          
          // Mock API call success (or actual API call for file uploads)
          // For now, we'll assume the backend handles file association based on the FormData.
          // If there are specific endpoints for file uploads, they should be called here.

          setTimeout(() => {
            setIsLoading(false);
            navigate('/login');
          }, 1000);
        } else {
          // Handle case where admin registration failed or didn't return expected data
          setSubmitError("Failed to register admin or retrieve admin ID.");
          setIsLoading(false);
        }
        
      } catch (error: any) {
        console.error('Error submitting form:', error);
        setSubmitError(error.message || 'An unexpected error occurred.');
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full bg-white rounded-xl shadow-md overflow-hidden">
      {/* Progress Steps */}
      <div className="px-6 pt-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center w-full">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
              currentStep >= 1 ? 'bg-blue-600' : 'bg-gray-200'
            } transition-colors`}>
              {currentStep > 1 ? (
                <Check className="h-6 w-6 text-white" />
              ) : (
                <Building className={`h-6 w-6 ${currentStep >= 1 ? 'text-white' : 'text-gray-500'}`} />
              )}
            </div>
            <div className={`flex-1 h-1 mx-2 ${
              currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'
            } transition-colors`}></div>
            
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
              currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'
            } transition-colors`}>
              <Database className={`h-6 w-6 ${currentStep >= 2 ? 'text-white' : 'text-gray-500'}`} />
            </div>
          </div>
        </div>
        
        <div className="flex justify-between text-sm mb-2">
          <span className={`${currentStep === 1 ? 'font-medium text-blue-600' : 'text-gray-500'}`}>
            Company Info
          </span>
          <span className={`${currentStep === 2 ? 'font-medium text-blue-600' : 'text-gray-500'}`}>
            Upload Profile
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        {/* Step 1: Company Info */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h2>
            
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
                Company Name
              </label>
              <input
                type="text"
                id="companyName"
                name="companyName"
                value={formData.companyName}
                onChange={handleInputChange}
                className={`block w-full px-3 py-2 border ${
                  errors.companyName ? 'border-red-300' : 'border-gray-300'
                } rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500`}
              />
              {errors.companyName && (
                <p className="mt-1 text-sm text-red-600">{errors.companyName}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="adminName" className="block text-sm font-medium text-gray-700 mb-1">
                Admin Name
              </label>
              <input
                type="text"
                id="adminName"
                name="adminName"
                value={formData.adminName}
                onChange={handleInputChange}
                className={`block w-full px-3 py-2 border ${
                  errors.adminName ? 'border-red-300' : 'border-gray-300'
                } rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500`}
              />
              {errors.adminName && (
                <p className="mt-1 text-sm text-red-600">{errors.adminName}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Work Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`block w-full px-3 py-2 border ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                } rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500`}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`block w-full px-3 py-2 border ${
                  errors.password ? 'border-red-300' : 'border-gray-300'
                } rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500`}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={`block w-full px-3 py-2 border ${
                  errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                } rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500`}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>
          </div>
        )}
        
        {/* Step 2: Company Profile Upload */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Company Profile Document</h2>
            <p className="text-sm text-gray-600 mb-6">
              Upload a PDF document containing your company profile, organization structure, and support policies.
            </p>
            
            <UploadDropzone
              accept={['.pdf', 'application/pdf']}
              onFileSelect={handleCompanyProfileSelect}
              fileName={formData.companyProfile?.name || null}
              fileSize={formData.companyProfile?.size || null}
              error={errors.companyProfile || submitError || null}
              label="Upload Company Profile"
              description="Drag and drop your PDF file here or click to browse"
              icon={<FileText size={36} className="text-gray-400" />}
            />
          </div>
        )}
        
        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={prevStep}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </button>
          ) : (
            <div></div> // Empty div to maintain layout
          )}
          
          {currentStep < 2 ? (
            <button
              type="button"
              onClick={nextStep}
              className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              disabled={isLoading}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </button>
          ) : (
            <button
              type="submit"
              className="flex items-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? 'Submitting...' : 'Submit'}
              {!isLoading && <Check className="h-4 w-4 ml-2" />}
            </button>
          )}
        </div>
        {submitError && (
          <p className="mt-4 text-sm text-red-600 text-center">{submitError}</p>
        )}
      </form>
    </div>
  );
};

export default SignUpStepper;