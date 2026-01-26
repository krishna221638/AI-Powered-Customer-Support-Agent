import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { getAllCompanies, Company } from "../../services/companyService"; // Updated to companyService
import { Building } from "lucide-react";
import toast from "react-hot-toast";

const SelectCompanyPage = () => {
  const navigate = useNavigate();
  // Updated to use selectedCompanyId and setSelectedCompanyId
  const { user, setSelectedCompanyId, selectedCompanyId } = useAuthStore();

  const {
    data: companiesResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["allCompanies"], // Changed queryKey
    queryFn: getAllCompanies, // Changed queryFn
    enabled: user?.role === "superAdmin",
  });

  const handleCompanySelect = (company: Company) => {
    // Renamed parameter and type
    setSelectedCompanyId(company.id); // Updated to use setSelectedCompanyId
    toast.success(`Operating in context of ${company.name}`);
    navigate("/admin/company-dashboard"); // Updated navigation path
  };

  useEffect(() => {
    if (user?.role !== "superAdmin") {
      toast.error(
        "Access denied. You must be a SuperAdmin to select a company."
      );
      navigate("/admin/dashboard"); // Or login page, or a generic admin dashboard
    }
    // Optional: If a superadmin somehow lands here with a company context already set, redirect them.
    // else if (selectedCompanyId) {
    //   navigate('/admin/company-dashboard');
    // }
  }, [user, navigate, selectedCompanyId]);

  if (user?.role !== "superAdmin") {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-xl text-gray-700">
          Access Denied. You must be a SuperAdmin.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
        <p className="ml-4 text-xl text-gray-700">Loading Companies...</p>{" "}
        {/* Updated text */}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen p-4">
        <p className="text-xl text-red-600">Failed to load companies.</p>{" "}
        {/* Updated text */}
        <p className="text-md text-gray-500">
          {(error as Error).message || "Please try again later."}
        </p>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <Building className="mx-auto h-12 w-12 text-blue-600" />
          <h1 className="mt-4 text-4xl font-extrabold text-gray-900 dark:text-gray-100 sm:text-5xl">
            Select Company Context {/* Updated text */}
          </h1>
          <p className="mt-3 text-xl text-gray-500 dark:text-gray-400">
            As a SuperAdmin, please choose a company to manage its resources.{" "}
            {/* Updated text */}
          </p>
        </div>

        {/* Updated to use companiesResponse and company object properties */}
        {companiesResponse && companiesResponse.companies.length > 0 ? (
          <ul className="space-y-4">
            {companiesResponse.companies.map((company) => (
              <li key={company.id}>
                <button
                  onClick={() => handleCompanySelect(company)}
                  className="w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 hover:bg-blue-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 ease-in-out"
                >
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                      <Building className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-lg font-medium text-gray-900 dark:text-gray-100 text-left">
                        {company.name}
                      </p>
                      {/* Add more company details here if needed, e.g., company.max_tokens */}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center bg-white dark:bg-gray-800 shadow rounded-lg p-10">
            <Building className="mx-auto h-10 w-10 text-gray-400" />
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
              No companies found or you may not have permission to view them.{" "}
              {/* Updated text */}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              If you believe this is an error, please contact support.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SelectCompanyPage;
