import React from "react";
import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import {
  getKpis,
  getTicketsByStatus,
  getTicketsByCategory,
  getResolutionTrends,
  getAgentPerformance,
  KpisResponse,
  TicketsByStatusResponse,
  CategoryCount,
  ResolutionTrendsResponse,
  AgentPerformanceResponse,
  AnalyticsFilters,
  TrendData,
} from "../../services/analyticsService";
import { getDepartments, Department } from "../../services/departmentService";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  AlertTriangle,
  CalendarDays,
  Filter,
  TrendingUp,
  PieChart as PieIcon,
  BarChart2 as BarIcon,
  Layers as CategoryIcon,
  LineChart as LineChartIcon,
  Users as UsersIcon,
  Building,
  CheckCircle,
  Settings,
  SlidersHorizontal,
} from "lucide-react";
import toast from "react-hot-toast";
import { Navigate } from "react-router-dom";

// Helper for date formatting
const formatDateForApi = (date: Date): string =>
  date.toISOString().split("T")[0];

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82ca9d",
  "#ffc658",
  "#a4de6c",
  "#d0ed57",
  "#ffc658",
];

interface AdminAnalyticsDashboardPageProps {}

const AdminAnalyticsDashboardPage: React.FC<
  AdminAnalyticsDashboardPageProps
> = () => {
  const { user } = useAuthStore();
  const today = new Date();
  const thirtyDaysAgo = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - 30
  );

  const adminCompanyId = useMemo(() => user?.company_id || undefined, [user]);

  const [filters, setFilters] = useState<AnalyticsFilters>(() => ({
    startDate: formatDateForApi(thirtyDaysAgo),
    endDate: formatDateForApi(today),
    companyId: adminCompanyId,
    departmentId: undefined,
    interval: "day",
  }));

  useEffect(() => {
    if (adminCompanyId) {
      setFilters((f) => ({
        ...f,
        companyId: adminCompanyId,
        departmentId: undefined,
      }));
    }
  }, [adminCompanyId]);

  const handleFilterChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value || undefined,
    }));
  };

  const queryOptions = {
    enabled: !!user && user.role === "admin" && !!filters.companyId,
  };

  const {
    data: kpiData,
    isLoading: isLoadingKpis,
    error: kpiError,
  } = useQuery<KpisResponse, Error>({
    queryKey: ["adminAnalyticsKpis", filters],
    queryFn: () => getKpis(filters),
    ...queryOptions,
  });

  const {
    data: ticketsByStatusData,
    isLoading: isLoadingStatus,
    error: statusError,
  } = useQuery<TicketsByStatusResponse, Error>({
    queryKey: ["adminAnalyticsTicketsByStatus", filters],
    queryFn: () => getTicketsByStatus(filters),
    ...queryOptions,
  });

  const {
    data: ticketsByCategoryData,
    isLoading: isLoadingCategory,
    error: categoryError,
  } = useQuery<CategoryCount[], Error>({
    queryKey: ["adminAnalyticsTicketsByCategory", filters],
    queryFn: () => getTicketsByCategory(filters),
    ...queryOptions,
  });

  const {
    data: resolutionTrendsData,
    isLoading: isLoadingTrends,
    error: trendsError,
  } = useQuery<ResolutionTrendsResponse, Error>({
    queryKey: ["adminAnalyticsResolutionTrends", filters],
    queryFn: () => getResolutionTrends(filters),
    ...queryOptions,
  });

  const {
    data: agentPerformanceData,
    isLoading: isLoadingAgents,
    error: agentsError,
  } = useQuery<AgentPerformanceResponse, Error>({
    queryKey: ["adminAnalyticsAgentPerformance", filters],
    queryFn: () => getAgentPerformance(filters),
    ...queryOptions,
  });

  const { data: departmentsData, isLoading: isLoadingDepartments } = useQuery<
    Department[],
    Error
  >({
    queryKey: ["adminCompanyDepartments", filters.companyId],
    queryFn: () =>
      getDepartments({ company_id: filters.companyId as string, limit: 1000 }),
    enabled: !!filters.companyId && user?.role === "admin",
  });

  const statusChartData = useMemo(() => {
    if (!ticketsByStatusData) return [];
    return Object.entries(ticketsByStatusData).map(([name, value]) => ({
      name: name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      value,
    }));
  }, [ticketsByStatusData]);

  const categoryChartData = useMemo(() => {
    if (!ticketsByCategoryData) return [];
    return ticketsByCategoryData.map((item) => ({
      name: (item.category || "Uncategorized")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase()),
      value: item.count,
    }));
  }, [ticketsByCategoryData]);

  const trendsChartData = useMemo(() => {
    if (!resolutionTrendsData) return [];
    return resolutionTrendsData.map((d) => ({
      name: d.date,
      "AI Resolved": d.ai_solved_count,
      "Manually Resolved": d.manually_solved_count,
      "Total Resolved": d.resolved_count,
    }));
  }, [resolutionTrendsData]);

  if (user?.role !== "admin") {
    toast.error("Access Denied. You must be an Admin to view this page.");
    return <Navigate to="/login" replace />;
  }

  if (!filters.companyId && !isLoadingDepartments) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-yellow-400" />
        <h3 className="mt-2 text-lg font-medium text-gray-900">
          Analytics Not Available
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Your admin account is not associated with a company. Please contact
          support.
        </p>
      </div>
    );
  }

  // Placeholder for TrendingDownIcon, or use a specific one from lucide-react if available
  const TrendingDownIcon = () => (
    <TrendingUp className="transform rotate-180" />
  );

  const renderKpiCard = (
    title: string,
    value: string | number | undefined,
    icon: React.ReactNode,
    trend?: TrendData,
    isLoading?: boolean,
    colorClass?: string
  ) => {
    const TrendIcon =
      trend?.direction === "up"
        ? TrendingUp
        : trend?.direction === "down"
        ? TrendingDownIcon
        : null;
    const trendColor =
      trend?.direction === "up"
        ? "text-green-600"
        : trend?.direction === "down"
        ? "text-red-600"
        : "text-gray-500";
    const trendText =
      trend?.direction === "up"
        ? "increase"
        : trend?.direction === "down"
        ? "decrease"
        : "change";

    return (
      <div
        className={`p-5 shadow-lg rounded-xl border border-gray-200 dark:border-gray-600 flex flex-col justify-between transition-colors duration-300 ${colorClass}`}
      >
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
              {title}
            </h3>
            <div className="p-2 bg-white/50 dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 rounded-lg">
              {icon}
            </div>
          </div>
          <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-gray-100">
            {isLoading ? "..." : value ?? "N/A"}
          </p>
        </div>
        {trend && TrendIcon && (
          <p className={`mt-2 text-xs flex items-center ${trendColor}`}>
            <TrendIcon className={`h-4 w-4 mr-1`} />
            {trend.value}% {trendText}
          </p>
        )}
      </div>
    );
  };

  const Card: React.FC<{
    title: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    titleClassName?: string;
  }> = ({ title, icon, children, className, titleClassName }) => (
    <div
      className={`bg-white dark:bg-gray-700 p-5 shadow-lg rounded-xl border border-gray-200 dark:border-gray-600 transition-colors duration-300 ${className}`}
    >
      <h3
        className={`text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center ${titleClassName}`}
      >
        {icon &&
          React.cloneElement(icon as React.ReactElement, {
            className: "h-5 w-5 mr-2",
          })}
        {title}
      </h3>
      {children}
    </div>
  );
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800/50 transition-colors duration-300">
      <div className="p-4 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
            <BarIcon className="h-8 w-8 mr-2 text-primary dark:text-accent" />{" "}
            Company Analytics Dashboard
          </h1>
        </div>

        {/* Filters Section */}
        <Card
          title="Filters"
          icon={
            <SlidersHorizontal className="text-gray-600 dark:text-gray-400" />
          }
          titleClassName="text-gray-600 dark:text-gray-400"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <label
                htmlFor="startDate"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Start Date
              </label>
              <input
                type="date"
                name="startDate"
                id="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 bg-white dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label
                htmlFor="endDate"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                End Date
              </label>
              <input
                type="date"
                name="endDate"
                id="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 bg-white dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label
                htmlFor="departmentId"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Department
              </label>
              <select
                name="departmentId"
                id="departmentId"
                value={filters.departmentId || ""}
                onChange={handleFilterChange}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 bg-white dark:bg-gray-800 dark:text-white"
                disabled={
                  isLoadingDepartments ||
                  !departmentsData ||
                  departmentsData.length === 0
                }
              >
                <option value="">All Departments</option>
                {departmentsData?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="interval"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Trend Interval
              </label>
              <select
                name="interval"
                id="interval"
                value={filters.interval || "day"}
                onChange={handleFilterChange}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 bg-white dark:bg-gray-800 dark:text-white"
              >
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
              </select>
            </div>
          </div>
        </Card>

        {/* KPIs Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
          {renderKpiCard(
            "Total Tickets",
            kpiData?.total_tickets,
            <Building size={20} />,
            kpiData?.totalTrend,
            isLoadingKpis,
            "bg-blue-100 dark:bg-blue-900 dark:text-white text-blue-800"
          )}
          {renderKpiCard(
            "Pending Tickets",
            kpiData?.pending_tickets,
            <CalendarDays size={20} />,
            kpiData?.pendingTrend,
            isLoadingKpis,
            "bg-yellow-100 dark:bg-yellow-900 dark:text-white text-yellow-800"
          )}
          {renderKpiCard(
            "AI Solved",
            kpiData?.ai_solved,
            <CheckCircle size={20} />,
            kpiData?.aiSolvedTrend,
            isLoadingKpis,
            "bg-green-100 dark:bg-green-900 dark:text-white text-green-800"
          )}
          {renderKpiCard(
            "Manually Solved",
            kpiData?.manually_solved,
            <UsersIcon size={20} />,
            kpiData?.manualSolvedTrend,
            isLoadingKpis,
            "bg-indigo-100 dark:bg-indigo-900 dark:text-white text-indigo-800"
          )}
          {renderKpiCard(
            "Critical Tickets",
            kpiData?.critical_tickets,
            <AlertTriangle size={20} />,
            kpiData?.criticalTrend,
            isLoadingKpis,
            "bg-red-100 dark:bg-red-900 dark:text-white text-red-800"
          )}
          {kpiData &&
            renderKpiCard(
              "Avg. Resolution (hrs)",
              kpiData.avg_resolution_time_hours?.toFixed(1),
              <Filter size={20} />,
              kpiData.avgResolutionTimeTrend,
              isLoadingKpis,
              "bg-purple-100 dark:bg-purple-900 dark:text-white text-purple-800"
            )}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card
            title="Tickets by Status"
            icon={<PieIcon className="text-blue-500" />}
            className="h-[450px]"
          >
            {isLoadingStatus && (
              <p className="text-center py-4 text-gray-600">
                Loading status chart...
              </p>
            )}
            {statusError && (
              <p className="text-red-500 text-center py-4">
                Error: {statusError.message}
              </p>
            )}
            {!isLoadingStatus && !statusError && statusChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="88%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={110}
                    labelLine={false}
                    label={({
                      cx,
                      cy,
                      midAngle,
                      innerRadius,
                      outerRadius,
                      percent,
                      index,
                    }) => {
                      const RADIAN = Math.PI / 180;
                      const radius =
                        innerRadius + (outerRadius - innerRadius) * 0.5;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      return percent * 100 > 3 ? ( // Only show label if slice is > 3%
                        <text
                          x={x}
                          y={y}
                          fill="white"
                          textAnchor={x > cx ? "start" : "end"}
                          dominantBaseline="central"
                          fontSize="12px"
                        >
                          {`${(percent * 100).toFixed(0)}%`}
                        </text>
                      ) : null;
                    }}
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                        strokeWidth={0}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value} tickets`} />
                  <Legend
                    wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              !isLoadingStatus &&
              !statusError && (
                <p className="text-center text-gray-500 pt-10">
                  No status data to display.
                </p>
              )
            )}
          </Card>

          <Card
            title="Tickets by Category"
            icon={<CategoryIcon className="text-green-500" />}
            className="h-[450px]"
          >
            {isLoadingCategory && (
              <p className="text-center py-4 text-gray-600">
                Loading category chart...
              </p>
            )}
            {categoryError && (
              <p className="text-red-500 text-center py-4">
                Error: {categoryError.message}
              </p>
            )}
            {!isLoadingCategory &&
            !categoryError &&
            categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="88%">
                <RechartsBarChart
                  data={categoryChartData}
                  margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize="12px" tickMargin={5} />
                  <YAxis allowDecimals={false} fontSize="12px" />
                  <Tooltip formatter={(value) => `${value} tickets`} />
                  <Legend
                    wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                  />
                  <Bar dataKey="value" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                </RechartsBarChart>
              </ResponsiveContainer>
            ) : (
              !isLoadingCategory &&
              !categoryError && (
                <p className="text-center text-gray-500 pt-10">
                  No category data to display.
                </p>
              )
            )}
          </Card>
        </div>

        {/* Resolution Trends Section - Chart and Table */}
        <Card
          title={`Resolution Trends (${filters.interval})`}
          icon={<LineChartIcon className="text-purple-500" />}
          className="min-h-[480px]"
        >
          {isLoadingTrends && (
            <p className="text-center py-4 text-gray-600">
              Loading trends chart...
            </p>
          )}
          {trendsError && (
            <p className="text-red-500 text-center py-4">
              Error: {trendsError.message}
            </p>
          )}
          {!isLoadingTrends && !trendsError && trendsChartData.length > 0 ? (
            <>
              <div className="h-[300px] mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={trendsChartData}
                    margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize="12px" />
                    <YAxis allowDecimals={false} fontSize="12px" />
                    <Tooltip />
                    <Legend
                      wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="AI Resolved"
                      stroke="#8884d8"
                      strokeWidth={2}
                      activeDot={{ r: 6 }}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Manually Resolved"
                      stroke="#82ca9d"
                      strokeWidth={2}
                      activeDot={{ r: 6 }}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Total Resolved"
                      stroke="#0088FE"
                      strokeWidth={2}
                      activeDot={{ r: 6 }}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <h4 className="text-md font-semibold text-gray-600 dark:text-gray-300 mb-3 mt-4">
                Detailed Data
              </h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-md">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      >
                        Date
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      >
                        AI Resolved
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      >
                        Manually Resolved
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      >
                        Total Resolved
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {trendsChartData.map((item) => (
                      <tr
                        key={item.name}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-800 dark:text-gray-200">
                          {item.name}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {item["AI Resolved"]}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {item["Manually Resolved"]}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {item["Total Resolved"]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            !isLoadingTrends &&
            !trendsError && (
              <p className="text-center text-gray-500 pt-10">
                No resolution trend data to display.
              </p>
            )
          )}
        </Card>

        {/* Agent Performance Table */}
        <Card
          title="Agent Performance"
          icon={<UsersIcon className="text-teal-500" />}
          className="overflow-x-auto"
        >
          {isLoadingAgents && (
            <p className="text-center py-4 text-gray-600">
              Loading agent performance...
            </p>
          )}
          {agentsError && (
            <p className="text-red-500 text-center py-4">
              Error: {agentsError.message}
            </p>
          )}
          {!isLoadingAgents &&
          !agentsError &&
          agentPerformanceData &&
          agentPerformanceData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-md">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      Agent
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      Email
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      Department
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      Assigned
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      Solved
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      Avg. Res. (hrs)
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      Res. Rate
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-700 divide-y divide-gray-200 dark:divide-gray-600">
                  {agentPerformanceData.map((agent) => (
                    <tr
                      key={agent.user_id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-800 dark:text-gray-200">
                        {agent.username}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {agent.email}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {agent.department}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 text-center">
                        {agent.tickets_assigned}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 text-center">
                        {agent.tickets_solved}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 text-center">
                        {agent.avg_resolution_time !== null &&
                        typeof agent.avg_resolution_time === "number"
                          ? agent.avg_resolution_time.toFixed(1)
                          : "N/A"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 text-center">
                        {/* Corrected resolution_rate display */}
                        {agent.resolution_rate !== null &&
                        typeof agent.resolution_rate === "number"
                          ? `${agent.resolution_rate.toFixed(1)}%`
                          : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            !isLoadingAgents &&
            !agentsError && (
              <p className="text-center text-gray-500 pt-10">
                No agent performance data.
              </p>
            )
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminAnalyticsDashboardPage;
