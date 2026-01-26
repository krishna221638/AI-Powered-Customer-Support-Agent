import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import {
  BarChart2,
  AlertCircle,
  Loader2,
  ListChecks,
  TrendingUp,
  LayoutGrid,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import {
  getKpis,
  getTicketsByStatus,
  getTicketsByCategory,
  getResolutionTrends,
  KpisResponse,
  TicketsByStatusResponse,
  ResolutionTrendsResponse,
  AnalyticsFilters,
  TrendData,
  getDetailedCompanyTokenUsage,
  DetailedCompanyTokenUsageResponse,
} from "../../services/analyticsService";

// Interface to match backend for Tickets by Category
interface CategoryCount {
  category: string | null;
  count: number;
}

const CompanyDashboard = () => {
  const navigate = useNavigate();
  const { user, selectedCompanyId } = useAuthStore();

  useEffect(() => {
    if (!selectedCompanyId && user?.role === "superAdmin") {
      toast.error("No company selected. Redirecting to select a company.");
      navigate("/admin/select-company");
    } else if (user?.role !== "superAdmin") {
      toast.error("Access Denied. You must be a SuperAdmin.");
      navigate("/login");
    }
  }, [user, selectedCompanyId, navigate]);

  const analyticsFilters: AnalyticsFilters = {
    companyId: selectedCompanyId || undefined,
  };

  const {
    data: kpis,
    isLoading: isLoadingKpis,
    error: errorKpis,
  } = useQuery<KpisResponse, Error>({
    queryKey: ["companyKpis", selectedCompanyId],
    queryFn: () => getKpis(analyticsFilters),
    enabled: !!selectedCompanyId && user?.role === "superAdmin",
  });

  const {
    data: ticketsByStatus,
    isLoading: isLoadingStatus,
    error: errorStatus,
  } = useQuery<TicketsByStatusResponse, Error>({
    queryKey: ["ticketsByStatus", selectedCompanyId],
    queryFn: () => getTicketsByStatus(analyticsFilters),
    enabled: !!selectedCompanyId && user?.role === "superAdmin",
  });

  const {
    data: ticketsByCategory,
    isLoading: isLoadingCategory,
    error: errorCategory,
  } = useQuery<CategoryCount[], Error>({
    queryKey: ["ticketsByCategory", selectedCompanyId],
    queryFn: () => getTicketsByCategory(analyticsFilters),
    enabled: !!selectedCompanyId && user?.role === "superAdmin",
  });

  const {
    data: resolutionTrends,
    isLoading: isLoadingTrends,
    error: errorTrends,
  } = useQuery<ResolutionTrendsResponse, Error>({
    queryKey: ["resolutionTrends", selectedCompanyId],
    queryFn: () => getResolutionTrends(analyticsFilters),
    enabled: !!selectedCompanyId && user?.role === "superAdmin",
  });

  // Fetch detailed token usage for the company
  const {
    data: tokenUsage,
    isLoading: isLoadingTokenUsage,
    error: errorTokenUsage,
  } = useQuery<DetailedCompanyTokenUsageResponse, Error>({
    queryKey: ["detailedCompanyTokenUsage", selectedCompanyId],
    queryFn: () => getDetailedCompanyTokenUsage(selectedCompanyId!),
    enabled: !!selectedCompanyId && user?.role === "superAdmin",
  });

  if (user?.role !== "superAdmin" || !selectedCompanyId) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="ml-4 text-xl text-gray-700">
          Loading or Access Denied...
        </p>
      </div>
    );
  }

  const renderLoading = (text: string) => (
    <div className="flex items-center text-gray-500">
      <Loader2 className="h-5 w-5 animate-spin mr-2" />
      {text}
    </div>
  );

  const renderError = (error: Error | null, context: string) => (
    <div className="flex items-center text-red-500">
      <AlertCircle className="h-5 w-5 mr-2" />
      Error loading {context}: {error?.message || "Unknown error"}
    </div>
  );

  const renderKpiTrend = (trend: TrendData | undefined) => {
    if (!trend) return null;
    const isUp = trend.direction === "up";
    const trendColor = isUp ? "text-green-500" : "text-red-500";
    const TrendIcon = isUp ? ArrowUpRight : ArrowDownRight;

    return (
      <span className={`ml-2 flex items-center text-xs ${trendColor}`}>
        <TrendIcon className="h-3 w-3 mr-0.5" />
        {trend.value}%
      </span>
    );
  };
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800/50 transition-colors duration-300">
      <div className="relative z-10 p-4">
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Company Analytics Dashboard
          </h1>
          <p className="text-gray-700 dark:text-gray-300">
            Displaying analytics for Company ID:{" "}
            <span className="font-semibold text-primary dark:text-accent">
              {selectedCompanyId}
            </span>
          </p>
        </header>

        {/* KPIs Section */}
        <section className="mb-6 p-4 md:p-6 bg-white dark:bg-gray-700 rounded-lg shadow-md transition-colors duration-300">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <BarChart2 className="h-6 w-6 text-primary dark:text-accent mr-3" />{" "}
            Key Performance Indicators
          </h2>
          {isLoadingKpis && renderLoading("KPIs...")}
          {errorKpis && renderError(errorKpis, "KPIs")}
          {kpis && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
              <div className="p-3 rounded-md transition-colors duration-300 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-white">
                <p className="text-text dark:text-white">Total Tickets</p>
                <p className="text-2xl font-semibold flex items-center">
                  {kpis.total_tickets}
                  {renderKpiTrend(kpis.totalTrend)}
                </p>
              </div>
              <div className="p-3 rounded-md transition-colors duration-300 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-white">
                <p className="text-text dark:text-white">Pending Tickets</p>
                <p className="text-2xl font-semibold flex items-center">
                  {kpis.pending_tickets}
                  {renderKpiTrend(kpis.pendingTrend)}
                </p>
              </div>
              <div className="p-3 rounded-md transition-colors duration-300 bg-green-100 text-green-800 dark:bg-green-900 dark:text-white">
                <p className="text-text dark:text-white">AI Solved</p>
                <p className="text-2xl font-semibold flex items-center">
                  {kpis.ai_solved}
                  {renderKpiTrend(kpis.aiSolvedTrend)}
                </p>
              </div>
              <div className="p-3 rounded-md transition-colors duration-300 bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-white">
                <p className="text-text dark:text-white">Manually Solved</p>
                <p className="text-2xl font-semibold flex items-center">
                  {kpis.manually_solved}
                  {renderKpiTrend(kpis.manualSolvedTrend)}
                </p>
              </div>
              <div className="p-3 rounded-md transition-colors duration-300 bg-red-100 text-red-800 dark:bg-red-900 dark:text-white">
                <p className="text-text dark:text-white">Critical Tickets</p>
                <p className="text-2xl font-semibold flex items-center">
                  {kpis.critical_tickets}
                  {renderKpiTrend(kpis.criticalTrend)}
                </p>
              </div>
              <div className="p-3 rounded-md transition-colors duration-300 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-white">
                <p className="text-text dark:text-white">
                  Avg. Resolution (hrs)
                </p>
                <p className="text-2xl font-semibold flex items-center">
                  {kpis.avg_resolution_time_hours !== null
                    ? kpis.avg_resolution_time_hours.toFixed(1)
                    : "N/A"}
                  {renderKpiTrend(kpis.avgResolutionTimeTrend)}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Token Usage Section */}
        <section className="mb-6 p-4 md:p-6 bg-white dark:bg-gray-700 rounded-lg shadow-md transition-colors duration-300">
          <h2 className="text-xl font-semibold text-text dark:text-text-dark mb-4 flex items-center">
            <TrendingUp className="h-6 w-6 text-accent dark:text-primary mr-3" />{" "}
            Token Usage
          </h2>
          {isLoadingTokenUsage && renderLoading("token usage...")}
          {errorTokenUsage && renderError(errorTokenUsage, "token usage")}
          {tokenUsage && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="p-3 bg-accent-light dark:bg-accent-dark rounded-md transition-colors duration-300">
                <p className="text-text dark:text-text-dark">Tokens Today</p>
                <p className="text-2xl font-semibold text-accent dark:text-accent-light">
                  {tokenUsage.tokens_today.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-primary-light dark:bg-primary-dark rounded-md transition-colors duration-300">
                <p className="text-text dark:text-text-dark">
                  Tokens This Month
                </p>
                <p className="text-2xl font-semibold text-primary dark:text-primary-light">
                  {tokenUsage.tokens_this_month.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-white dark:bg-gray-700 rounded-md transition-colors duration-300">
                <p className="text-text dark:text-text-dark">Tokens Lifetime</p>
                <p className="text-2xl font-semibold text-text dark:text-text-dark">
                  {tokenUsage.tokens_lifetime.toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Tickets by Status Section */}
          <section className="p-4 md:p-6 bg-white dark:bg-gray-700 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <ListChecks className="h-6 w-6 text-green-500 mr-3" /> Tickets by
              Status
            </h2>
            {isLoadingStatus && renderLoading("status data...")}
            {errorStatus && renderError(errorStatus, "status data")}
            {ticketsByStatus && (
              <ul className="space-y-1 text-sm">
                {Object.entries(ticketsByStatus).map(([status, count]) => (
                  <li
                    key={status}
                    className="flex justify-between p-2 bg-gray-50 rounded"
                  >
                    <span className="capitalize text-gray-700">
                      {status.replace(/_/g, " ")}
                    </span>
                    <span className="font-semibold text-green-600">
                      {count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Tickets by Category Section */}
          <section className="p-4 md:p-6 bg-white dark:bg-gray-700 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <LayoutGrid className="h-6 w-6 text-indigo-500 mr-3" /> Tickets by
              Category
            </h2>
            {isLoadingCategory && renderLoading("category data...")}
            {errorCategory && renderError(errorCategory, "category data")}
            {ticketsByCategory && (
              <ul className="space-y-1 text-sm">
                {ticketsByCategory.map((item, index) => (
                  <li
                    key={item.category || `unknown-category-${index}`}
                    className="flex justify-between p-2 bg-gray-50 rounded"
                  >
                    <span className="capitalize text-gray-700">
                      {(item.category || "Uncategorized").replace(/_/g, " ")}
                    </span>
                    <span className="font-semibold text-indigo-600">
                      {item.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Resolution Trends Section */}
        <section className="mb-6 p-4 md:p-6 bg-white dark:bg-gray-700 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <TrendingUp className="h-6 w-6 text-accent dark:text-primary mr-3" />{" "}
            Resolution Trends
          </h2>
          {isLoadingTrends && renderLoading("resolution trends...")}
          {errorTrends && renderError(errorTrends, "resolution trends")}
          {resolutionTrends && resolutionTrends.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                  <tr>
                    <th scope="col" className="px-4 py-2">
                      Date
                    </th>
                    <th scope="col" className="px-4 py-2 text-center">
                      AI Solved
                    </th>
                    <th scope="col" className="px-4 py-2 text-center">
                      Manual Solved
                    </th>
                    <th scope="col" className="px-4 py-2 text-center">
                      Total Resolved
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {resolutionTrends.map((trend, index) => (
                    <tr
                      key={index}
                      className="bg-white border-b hover:bg-gray-50"
                    >
                      <td className="px-4 py-2 font-medium text-gray-900 whitespace-nowrap">
                        {new Date(trend.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {trend.ai_solved_count}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {trend.manually_solved_count}
                      </td>
                      <td className="px-4 py-2 text-center font-semibold">
                        {trend.resolved_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            resolutionTrends && (
              <p className="text-gray-500">
                No resolution trend data available for the selected period.
              </p>
            )
          )}
        </section>

        <div className="mt-12 text-center">
          <button
            onClick={() => navigate("/admin/select-company")}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition duration-150 ease-in-out"
          >
            Select Another Company
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompanyDashboard;
