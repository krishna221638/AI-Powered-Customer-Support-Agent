import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  Department,
} from "../../services/departmentService";
// Using registerEmployee and RegisterEmployeePayload instead of team lead specific ones
import {
  registerEmployee,
  RegisterEmployeePayload,
  User as AuthUser,
} from "../../services/authService";
import {
  getUsersInDepartment,
  User as UserServiceUser,
  deleteUser,
} from "../../services/userService";
import {
  Briefcase,
  PlusCircle,
  Edit3,
  Trash2,
  UserPlus,
  Users as UsersIcon,
  Building,
  XCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import toast from "react-hot-toast";
import { Navigate } from "react-router-dom";

// Reusable Modal Component
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-800">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircle size={24} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const AdminTeamManagementPage = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [showCreateDeptForm, setShowCreateDeptForm] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");

  const [editingDepartment, setEditingDepartment] = useState<Department | null>(
    null
  );
  const [editDeptName, setEditDeptName] = useState("");
  const [deletingDepartment, setDeletingDepartment] =
    useState<Department | null>(null);

  // State for adding a new employee
  const [selectedDepartmentForEmployee, setSelectedDepartmentForEmployee] =
    useState<Department | null>(null);
  const [employeeUsername, setEmployeeUsername] = useState("");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [employeePassword, setEmployeePassword] = useState("");

  const [viewingUsersInDepartmentId, setViewingUsersInDepartmentId] = useState<
    string | null
  >(null);

  // State for deleting a user
  const [deletingUser, setDeletingUser] = useState<UserServiceUser | null>(
    null
  );
  const [showConfirmDeleteUserModal, setShowConfirmDeleteUserModal] =
    useState(false);

  const adminCompanyId = useMemo(() => user?.company_id, [user]);

  // Fetch departments for the admin's company
  const {
    data: departmentsResponse,
    isLoading: isLoadingDepartments,
    error: departmentsError,
  } = useQuery<Department[], Error>({
    queryKey: ["departmentsForAdminCompany", adminCompanyId],
    queryFn: () =>
      getDepartments({ company_id: adminCompanyId as string, limit: 100 }),
    enabled: !!adminCompanyId && user?.role === "admin",
  });

  // Fetch users for a selected department
  const { data: usersInDepartmentResponse, isLoading: isLoadingUsersInDept } =
    useQuery<UserServiceUser[], Error>({
      queryKey: [
        "usersInDepartment",
        viewingUsersInDepartmentId,
        adminCompanyId,
      ],
      queryFn: () =>
        getUsersInDepartment({
          departmentId: viewingUsersInDepartmentId!,
          limit: 50,
        }),
      enabled: !!viewingUsersInDepartmentId && !!adminCompanyId,
    });

  // Mutations for Departments
  const createDeptMutation = useMutation({
    mutationFn: (data: { name: string; company_id: string }) =>
      createDepartment(data),
    onSuccess: () => {
      toast.success("Department created successfully!");
      queryClient.invalidateQueries({
        queryKey: ["departmentsForAdminCompany", adminCompanyId],
      });
      setNewDeptName("");
      setShowCreateDeptForm(false);
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.detail || "Failed to create department.";
      toast.error(
        typeof message === "string" ? message : JSON.stringify(message)
      );
    },
  });

  const updateDeptMutation = useMutation({
    mutationFn: (data: { id: string; name: string; company_id: string }) =>
      updateDepartment(data.id, data),
    onSuccess: () => {
      toast.success("Department updated successfully!");
      queryClient.invalidateQueries({
        queryKey: ["departmentsForAdminCompany", adminCompanyId],
      });
      setEditingDepartment(null);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.detail || "Failed to update department."
      );
    },
  });

  const deleteDeptMutation = useMutation({
    mutationFn: deleteDepartment,
    onSuccess: () => {
      toast.success("Department deleted successfully!");
      queryClient.invalidateQueries({
        queryKey: ["departmentsForAdminCompany", adminCompanyId],
      });
      const previousDeletingDeptId = deletingDepartment?.id;
      setDeletingDepartment(null);
      if (viewingUsersInDepartmentId === previousDeletingDeptId)
        setViewingUsersInDepartmentId(null);
      if (selectedDepartmentForEmployee?.id === previousDeletingDeptId)
        setSelectedDepartmentForEmployee(null);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.detail || "Failed to delete department."
      );
    },
  });

  // Mutation for registering Employee
  const registerEmployeeMutation = useMutation({
    mutationFn: registerEmployee,
    onSuccess: (newEmployee) => {
      toast.success(
        `Employee '${newEmployee.username}' registered successfully!`
      );
      setSelectedDepartmentForEmployee(null);
      setEmployeeUsername("");
      setEmployeeEmail("");
      setEmployeePassword("");
      queryClient.invalidateQueries({
        queryKey: [
          "usersInDepartment",
          selectedDepartmentForEmployee?.id,
          adminCompanyId,
        ],
      });
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.detail || "Failed to register employee.";
      toast.error(
        typeof message === "string" ? message : JSON.stringify(message)
      );
    },
  });

  // Mutation for Deleting User
  const deleteUserMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      toast.success("User deleted successfully!");
      queryClient.invalidateQueries({
        queryKey: [
          "usersInDepartment",
          deletingUser?.department_id,
          adminCompanyId,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: ["departmentsForAdminCompany", adminCompanyId],
      });
      setDeletingUser(null);
      setShowConfirmDeleteUserModal(false);
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || "Failed to delete user.";
      toast.error(
        typeof message === "string" ? message : JSON.stringify(message)
      );
      setShowConfirmDeleteUserModal(false);
    },
  });

  // Department Handlers
  const handleCreateDepartment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newDeptName.trim() || !adminCompanyId) return;
    createDeptMutation.mutate({
      name: newDeptName.trim(),
      company_id: adminCompanyId,
    });
  };

  const handleEditDepartment = (dept: Department) => {
    setEditingDepartment(dept);
    setEditDeptName(dept.name);
  };
  const handleUpdateDeptSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (editingDepartment && editDeptName.trim() && adminCompanyId) {
      updateDeptMutation.mutate({
        id: editingDepartment.id,
        name: editDeptName.trim(),
        company_id: adminCompanyId,
      });
    }
  };
  const handleDeleteDepartment = (dept: Department) =>
    setDeletingDepartment(dept);
  const confirmDeleteDept = () => {
    if (deletingDepartment) deleteDeptMutation.mutate(deletingDepartment.id);
  };

  // Employee Handlers
  const handleOpenEmployeeForm = (dept: Department) => {
    setSelectedDepartmentForEmployee(dept);
    setEmployeeUsername("");
    setEmployeeEmail("");
    setEmployeePassword("");
  };

  const handleRegisterEmployee = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (
      !employeeUsername.trim() ||
      !employeeEmail.trim() ||
      !employeePassword ||
      !selectedDepartmentForEmployee ||
      !adminCompanyId
    ) {
      toast.error("All fields are required for employee registration.");
      return;
    }
    const payload: RegisterEmployeePayload = {
      username: employeeUsername.trim(),
      email: employeeEmail.trim(),
      password: employeePassword,
      department_id: selectedDepartmentForEmployee.id,
      company_id: adminCompanyId,
      role: "employee",
    };
    registerEmployeeMutation.mutate(payload);
  };

  const handleViewUsers = (deptId: string) => {
    setViewingUsersInDepartmentId((prevId) =>
      prevId === deptId ? null : deptId
    );
  };

  // User Deletion Handlers
  const handleOpenDeleteUserModal = (userToDelete: UserServiceUser) => {
    setDeletingUser(userToDelete);
    setShowConfirmDeleteUserModal(true);
  };

  const handleConfirmDeleteUser = () => {
    if (deletingUser) {
      deleteUserMutation.mutate(deletingUser.id);
    }
  };

  if (user?.role !== "admin") {
    toast.error("Access Denied. You must be an Admin.");
    return <Navigate to="/admin/dashboard" replace />;
  }
  if (!adminCompanyId) {
    return (
      <div className="p-6 text-center text-red-500">
        Admin is not associated with a company. Please contact support.
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
            <Building className="h-8 w-8 mr-3 text-indigo-600" /> Department &
            Employee Management
          </h1>
          <button
            onClick={() => setShowCreateDeptForm(!showCreateDeptForm)}
            className="px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center"
          >
            <PlusCircle className="h-5 w-5 mr-2" />{" "}
            {showCreateDeptForm ? "Cancel" : "New Department"}
          </button>
        </div>

        {showCreateDeptForm && (
          <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 transition-colors duration-300">
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">
              Create New Department
            </h2>
            <form onSubmit={handleCreateDepartment} className="space-y-3">
              <div>
                <label
                  htmlFor="newDeptName"
                  className="block text-sm font-medium text-gray-600 dark:text-gray-300"
                >
                  Department Name
                </label>
                <input
                  id="newDeptName"
                  type="text"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-gray-100"
                  placeholder="Enter new department name"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={createDeptMutation.isPending || !newDeptName.trim()}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
              >
                {createDeptMutation.isPending
                  ? "Creating..."
                  : "Create Department"}
              </button>
            </form>
          </div>
        )}

        {/* Departments List - Enhanced UI */}
        <div className="space-y-6">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">
              Departments in Your Company
            </h2>
          </div>
          {isLoadingDepartments && (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              Loading departments...
            </div>
          )}
          {departmentsError && (
            <div className="p-6 text-center text-red-500 dark:text-red-400">
              Error: {(departmentsError as Error).message}
            </div>
          )}

          {departmentsResponse &&
            departmentsResponse.length === 0 &&
            !isLoadingDepartments && (
              <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 text-center text-gray-500 dark:text-gray-400 transition-colors duration-300">
                No departments found. Create one to get started.
              </div>
            )}

          {departmentsResponse &&
            departmentsResponse.map((dept) => (
              <div
                key={dept.id}
                className="bg-white dark:bg-gray-800 shadow-lg rounded-xl border border-gray-200 dark:border-gray-700 transition-colors duration-300"
              >
                <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <h3 className="text-xl font-semibold text-indigo-700">
                      {dept.name}
                    </h3>
                    <div className="flex space-x-2 flex-wrap gap-2">
                      <button
                        onClick={() => handleViewUsers(dept.id)}
                        className="px-3 py-1.5 text-xs font-medium rounded-md text-white bg-blue-500 hover:bg-blue-600 flex items-center transition-colors"
                      >
                        {viewingUsersInDepartmentId === dept.id ? (
                          <EyeOff size={14} className="mr-1.5" />
                        ) : (
                          <Eye size={14} className="mr-1.5" />
                        )}
                        {viewingUsersInDepartmentId === dept.id
                          ? "Hide Users"
                          : "View Users"}
                      </button>
                      <button
                        onClick={() => handleOpenEmployeeForm(dept)}
                        className="px-3 py-1.5 text-xs font-medium rounded-md text-white bg-green-500 hover:bg-green-600 flex items-center transition-colors"
                      >
                        <UserPlus size={14} className="mr-1.5" /> Add Employee
                      </button>
                      <button
                        onClick={() => handleEditDepartment(dept)}
                        className="p-2 text-yellow-600 hover:text-yellow-700 bg-yellow-100 hover:bg-yellow-200 rounded-md transition-colors"
                        title="Edit Department"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteDepartment(dept)}
                        className="p-2 text-red-600 hover:text-red-700 bg-red-100 hover:bg-red-200 rounded-md transition-colors"
                        title="Delete Department"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {viewingUsersInDepartmentId === dept.id && (
                  <div className="p-5">
                    {isLoadingUsersInDept && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 py-3">
                        Loading users...
                      </p>
                    )}
                    {usersInDepartmentResponse &&
                      usersInDepartmentResponse.length > 0 && (
                        <ul className="space-y-2">
                          {usersInDepartmentResponse.map((emp) => (
                            <li
                              key={emp.id}
                              className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                            >
                              <div>
                                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                  {emp.username}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                  ({emp.email})
                                </span>
                              </div>
                              <button
                                onClick={() => handleOpenDeleteUserModal(emp)}
                                className="p-1.5 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                                title="Delete User"
                              >
                                <Trash2 size={15} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    {usersInDepartmentResponse &&
                      usersInDepartmentResponse.length === 0 &&
                      !isLoadingUsersInDept && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 py-3">
                          No users in this department.
                        </p>
                      )}
                  </div>
                )}
              </div>
            ))}
        </div>

        {/* Edit Department Modal */}
        <Modal
          isOpen={!!editingDepartment}
          onClose={() => setEditingDepartment(null)}
          title="Edit Department"
        >
          <form onSubmit={handleUpdateDeptSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="editDeptName"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Department Name
              </label>
              <input
                id="editDeptName"
                type="text"
                value={editDeptName}
                onChange={(e) => setEditDeptName(e.target.value)}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-gray-100"
                required
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setEditingDepartment(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-md border border-gray-300 dark:border-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateDeptMutation.isPending || !editDeptName.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm disabled:bg-gray-400"
              >
                {updateDeptMutation.isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </Modal>

        {/* Confirm Delete Department Modal */}
        <Modal
          isOpen={!!deletingDepartment}
          onClose={() => setDeletingDepartment(null)}
          title="Confirm Delete Department"
        >
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to delete the department "
            <strong>{deletingDepartment?.name}</strong>"? This action cannot be
            undone. Users in this department will need to be reassigned.
          </p>
          <div className="flex justify-end space-x-3 pt-3">
            <button
              type="button"
              onClick={() => setDeletingDepartment(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-md border border-gray-300 dark:border-gray-500"
            >
              Cancel
            </button>
            <button
              onClick={confirmDeleteDept}
              disabled={deleteDeptMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md shadow-sm disabled:bg-gray-400"
            >
              {deleteDeptMutation.isPending
                ? "Deleting..."
                : "Delete Department"}
            </button>
          </div>
        </Modal>

        {/* Add Employee Modal */}
        <Modal
          isOpen={!!selectedDepartmentForEmployee}
          onClose={() => setSelectedDepartmentForEmployee(null)}
          title={`Add Employee to ${selectedDepartmentForEmployee?.name}`}
        >
          <form onSubmit={handleRegisterEmployee} className="space-y-3">
            <div>
              <label
                htmlFor="employeeUsername"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Username
              </label>
              <input
                id="employeeUsername"
                type="text"
                value={employeeUsername}
                onChange={(e) => setEmployeeUsername(e.target.value)}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-gray-100"
                required
              />
            </div>
            <div>
              <label
                htmlFor="employeeEmail"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Email
              </label>
              <input
                id="employeeEmail"
                type="email"
                value={employeeEmail}
                onChange={(e) => setEmployeeEmail(e.target.value)}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-gray-100"
                required
              />
            </div>
            <div>
              <label
                htmlFor="employeePassword"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Password
              </label>
              <input
                id="employeePassword"
                type="password"
                value={employeePassword}
                onChange={(e) => setEmployeePassword(e.target.value)}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-gray-100"
                required
              />
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedDepartmentForEmployee(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-md border border-gray-300 dark:border-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={registerEmployeeMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md shadow-sm disabled:bg-gray-400"
              >
                {registerEmployeeMutation.isPending
                  ? "Adding Employee..."
                  : "Add Employee"}
              </button>
            </div>
          </form>
        </Modal>

        {/* Confirm Delete User Modal */}
        <Modal
          isOpen={showConfirmDeleteUserModal}
          onClose={() => setShowConfirmDeleteUserModal(false)}
          title="Confirm Delete User"
        >
          {deletingUser && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Are you sure you want to delete the user "
              <strong>
                {deletingUser.username} ({deletingUser.email})
              </strong>
              "? This action cannot be undone.
            </p>
          )}
          <div className="flex justify-end space-x-3 pt-3">
            <button
              type="button"
              onClick={() => setShowConfirmDeleteUserModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-md border border-gray-300 dark:border-gray-500"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDeleteUser}
              disabled={deleteUserMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md shadow-sm disabled:bg-gray-400"
            >
              {" "}
              {deleteUserMutation.isPending
                ? "Deleting User..."
                : "Delete User"}
            </button>
          </div>{" "}
        </Modal>
      </div>
    </div>
  );
};

export default AdminTeamManagementPage;
